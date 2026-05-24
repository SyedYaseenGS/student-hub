/**
 * Voice AI Assistant API Route
 * Handles conversational AI responses using OpenAI or Google Gemini API
 * Backend proxies requests to keep API keys secure
 * 
 * Requires:
 * - OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in environment
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const TASKS_FILE = path.join(__dirname, '../data/tasks.json');
const NOTES_FILE = path.join(__dirname, '../data/notes.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Initialize AI clients
let openai = null;
let googleAI = null;

// Try to initialize OpenAI
try {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAI } = require('openai');
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI API initialized');
  }
} catch (e) {
  console.warn('⚠️ OpenAI not configured:', e.message);
}

// Try to initialize Google Gemini
try {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    googleAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log('✅ Google Gemini API initialized');
  }
} catch (e) {
  console.warn('⚠️ Google Gemini not configured:', e.message);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Read JSON file safely
 */
const readJsonFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return [];
};

/**
 * Build comprehensive context about user's tasks
 */
const buildTaskContext = () => {
  const tasks = readJsonFile(TASKS_FILE);
  const notes = readJsonFile(NOTES_FILE);
  const pending = tasks.filter(t => !t.completed);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Categorize tasks
  const todaysTasks = pending.filter(t => {
    if (!t.dueDate) return false;
    try {
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime();
    } catch (e) {
      return false;
    }
  });

  const overdue = pending.filter(t => {
    if (!t.dueDate) return false;
    try {
      const due = new Date(t.dueDate);
      return due < today;
    } catch (e) {
      return false;
    }
  });

  const upcoming = pending.filter(t => {
    if (!t.dueDate) return false;
    try {
      const due = new Date(t.dueDate);
      return due > today;
    } catch (e) {
      return false;
    }
  });

  // Build priority summary
  const prioritySummary = {
    high: pending.filter(t => t.priority === 'high').length,
    medium: pending.filter(t => t.priority === 'medium').length,
    low: pending.filter(t => t.priority === 'low').length
  };

  // Build context string
  let context = `**USER'S PRODUCTIVITY CONTEXT**\n\n`;
  
  context += `📊 **Task Summary:**\n`;
  context += `• Total pending tasks: ${pending.length}\n`;
  context += `• Tasks due today: ${todaysTasks.length}\n`;
  context += `• Overdue tasks: ${overdue.length} ⚠️\n`;
  context += `• Upcoming tasks: ${upcoming.length}\n`;
  context += `• Priority breakdown: High(${prioritySummary.high}) Medium(${prioritySummary.medium}) Low(${prioritySummary.low})\n`;
  context += `• Active notes: ${notes.length}\n\n`;

  // Top priority tasks
  if (pending.length > 0) {
    context += `📝 **High Priority Tasks (Top 5):**\n`;
    const sorted = pending.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Sort by due date if priority is same
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return 0;
    });
    
    sorted.slice(0, 5).forEach((t, i) => {
      const due = t.dueDate ? ` (due: ${new Date(t.dueDate).toLocaleDateString()})` : ' (no due date)';
      const completed = t.completed ? '✅' : '⭕';
      context += `${i + 1}. ${completed} ${t.title} [${t.priority || 'normal'}]${due}\n`;
    });
  }

  // Overdue urgent tasks
  if (overdue.length > 0) {
    context += `\n🚨 **URGENT - Overdue Tasks:**\n`;
    overdue.slice(0, 3).forEach((t, i) => {
      const daysOverdue = Math.floor((today - new Date(t.dueDate)) / (1000 * 60 * 60 * 24));
      context += `${i + 1}. ${t.title} (${daysOverdue} days overdue!)\n`;
    });
  }

  // Tasks due today
  if (todaysTasks.length > 0) {
    context += `\n🎯 **Due Today:**\n`;
    todaysTasks.slice(0, 3).forEach((t, i) => {
      context += `${i + 1}. ${t.title}\n`;
    });
  }

  context += `\n---\n`;
  context += `**Current Date & Time:** ${new Date().toLocaleString()}\n`;

  return context;
};

/**
 * Call OpenAI API
 */
const callOpenAI = async (systemPrompt, messages) => {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    max_tokens: 300,
    temperature: 0.7,
    top_p: 0.9
  });

  return {
    text: response.choices[0]?.message?.content || 'I did not understand that. Could you repeat?',
    usage: response.usage
  };
};

/**
 * Call Google Gemini API
 */
const callGemini = async (systemPrompt, messages) => {
  if (!googleAI) {
    throw new Error('Google Gemini not configured');
  }

  const model = googleAI.getGenerativeModel({ model: 'gemini-pro' });
  
  // Format messages for Gemini
  let fullPrompt = systemPrompt + '\n\n';
  
  messages.slice(-10).forEach(msg => {
    if (msg.role === 'user') {
      fullPrompt += `User: ${msg.content}\n`;
    } else if (msg.role === 'assistant') {
      fullPrompt += `Assistant: ${msg.content}\n`;
    }
  });
  
  fullPrompt += 'Assistant: ';

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text() || 'I did not understand that. Could you repeat?';

  return {
    text: text,
    usage: null // Gemini doesn't provide token counts in this API
  };
};

// ==================== API ENDPOINTS ====================

/**
 * POST /api/voiceAI/chat
 * Send user message and get AI response
 * Body: { userMessage: string, conversationHistory: Array }
 */
router.post('/chat', async (req, res) => {
  try {
    const { userMessage, conversationHistory = [] } = req.body;

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'User message is required'
      });
    }

    // Check if any AI is configured
    if (!openai && !googleAI) {
      return res.status(503).json({
        success: false,
        message: 'AI service not configured. Please set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.'
      });
    }

    // Build system prompt with task context
    const taskContext = buildTaskContext();
    const systemPrompt = `You are Nexa, an intelligent and friendly AI study assistant integrated with a productivity system.

**Your Core Traits:**
- Warm, conversational, and supportive tone (like ChatGPT)
- Naturally understands context and flexible language
- Never robotic or overly formal
- Helps with task management, motivation, and productivity
- Can provide encouragement and motivation for studying
- Knowledgeable about general topics but focused on productivity

**Your Knowledge:**
${taskContext}

**Important Guidelines:**
1. Keep responses natural and conversational (1-3 sentences for voice)
2. When users ask about tasks/reminders, provide specific information from their actual data
3. Be encouraging about overdue tasks - help them recover with positivity
4. When asked "What should I do?", suggest their highest priority task
5. If asked about motivation, remind them of their progress and goals
6. Can discuss general topics but gently steer back to productivity when appropriate
7. Never make up task details - only reference what's in their system
8. If there are no tasks, be encouraging about the clean slate
9. Respond naturally to greetings and casual conversation
10. Be a true assistant - anticipate needs and offer suggestions`;

    // Prepare messages for AI
    const messages = [];
    
    // Include relevant conversation history
    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-10).forEach(msg => {
        messages.push({
          role: msg.role || 'user',
          content: msg.content || ''
        });
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Call appropriate AI service
    let aiResult;
    const aiService = process.env.AI_SERVICE || 'openai'; // Default to OpenAI

    if (aiService === 'gemini' && googleAI) {
      aiResult = await callGemini(systemPrompt, messages);
    } else if (openai) {
      aiResult = await callOpenAI(systemPrompt, messages);
    } else if (googleAI) {
      aiResult = await callGemini(systemPrompt, messages);
    } else {
      throw new Error('No AI service available');
    }

    res.json({
      success: true,
      response: aiResult.text,
      usage: aiResult.usage || { prompt_tokens: 0, completion_tokens: 0 }
    });

  } catch (error) {
    console.error('Voice AI Error:', error);
    
    let statusCode = 500;
    let message = 'Error processing AI response';
    
    if (error.message.includes('not configured')) {
      statusCode = 503;
      message = 'AI service not configured';
    } else if (error.message.includes('rate')) {
      statusCode = 429;
      message = 'API rate limit exceeded. Please try again later.';
    } else if (error.message.includes('authentication')) {
      statusCode = 401;
      message = 'AI service authentication failed';
    }

    res.status(statusCode).json({
      success: false,
      message: message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/voiceAI/status
 * Check which AI services are available
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    services: {
      openai: !!openai,
      gemini: !!googleAI
    },
    active: process.env.AI_SERVICE || 'openai'
  });
});

/**
 * POST /api/voiceAI/context
 * Get current user context for debugging
 */
router.post('/context', (req, res) => {
  const context = buildTaskContext();
  res.json({
    success: true,
    context: context
  });
});

module.exports = router;
