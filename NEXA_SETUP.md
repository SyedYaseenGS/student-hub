# Nexa - AI Voice Assistant Setup Guide

## 🎤 What is Nexa?

Nexa is a conversational AI-powered voice assistant built into your Student Task & Notes Manager. It works just like ChatGPT's voice mode but is fully integrated with your productivity system.

### Key Features
- 🗣️ **Natural Conversation** - Talk naturally, not with commands
- 🎯 **Task Aware** - Understands your tasks, deadlines, and priorities
- 🔄 **Continuous Listening** - Wake word detection ("Hey Nexa")
- 💬 **Live Transcript** - See what you're saying as you speak
- 🚀 **Lightweight** - No heavy offline models, API-based only
- 📱 **Browser-Based** - Works in any modern browser
- 🌙 **Works Everywhere** - Can be deployed on shared servers like Render

---

## 📋 Quick Start (5 Minutes)

### 1. Get an API Key

**Option A: OpenAI API (Recommended)**
- Visit: https://platform.openai.com/api-keys
- Sign up or log in
- Create a new API key
- Copy and save it securely

**Option B: Google Gemini API (Free)**
- Visit: https://makersuite.google.com/app/apikey
- Sign up or log in
- Create a new API key
- Copy and save it securely

### 2. Setup Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
# Option A (OpenAI):
OPENAI_API_KEY=sk-your-api-key-here

# OR Option B (Gemini):
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key-here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Server

```bash
npm start
```

Your application should now run on `http://localhost:3000`

### 5. Test Nexa

1. Go to your dashboard
2. Look for the **purple floating orb** in the bottom-right corner
3. Click it and say "Hey Nexa, what tasks do I have?"

---

## 🔐 API Key Security

### Best Practices
- ✅ Never commit `.env` to Git
- ✅ Use `.gitignore` to exclude `.env` file
- ✅ Rotate keys regularly
- ✅ Use environment variables for production
- ✅ Keep keys private and secure

### For Production (Render, Heroku, etc.)

1. Go to your hosting platform's environment settings
2. Add environment variables:
   - `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`
   - `PORT` (if required)
   - `NODE_ENV=production`

3. Deploy as usual

---

## 🎯 Using Nexa

### Voice Commands (Natural Examples)

**Talk naturally! Nexa understands context.**

```
"Hey Nexa, what's due today?"
→ Nexa reads your today's tasks

"I'm feeling overwhelmed"
→ Nexa checks your tasks and gives motivation

"What should I work on?"
→ Nexa suggests your highest priority task

"How many tasks do I have?"
→ Nexa gives a summary

"Read my important reminders"
→ Nexa reads high-priority tasks

"I think I'm forgetting something"
→ Nexa mentions overdue tasks

"Motivate me to study"
→ Nexa provides encouragement based on your progress
```

### Using the Chat Panel

1. **Click the Orb** - Opens the chat panel
2. **Speak or Type** - Use mic button or type message
3. **Press Enter** - Send typed messages
4. **View History** - Chat persists in your browser

---

## 🛠️ Technical Details

### Architecture

```
Frontend (Browser)
├── voiceAssistantAI.js - Main UI & Voice Recognition
├── SpeechRecognition API - Convert speech to text
└── SpeechSynthesis API - Read responses aloud

Backend (Node.js/Express)
├── /routes/voiceAI.js - AI request handler
├── OpenAI API ← or → Google Gemini API
└── Task/Notes Database - Context awareness

Storage
└── localStorage - Chat history (client-side)
```

### File Structure

```
public/
├── js/
│   ├── voiceAssistantAI.js      ← Main AI assistant (NEW)
│   ├── voiceAssistant.js        ← Legacy (for compatibility)
│   ├── dashboard.js              ← Integration point
│   └── utils.js
├── css/
│   └── style.css                 ← New UI styles added
└── pages/
    └── dashboard.html            ← Added voiceAssistantAI.js script

routes/
└── voiceAI.js                    ← Backend AI integration (UPDATED)

.env.example                      ← Configuration template (NEW)
package.json                      ← Updated dependencies

data/
├── tasks.json
├── notes.json
└── users.json
```

### New Dependencies

```json
{
  "openai": "^4.47.1",              // For OpenAI API
  "@google/generative-ai": "^0.3.1", // For Gemini API
  "dotenv": "^16.4.5"               // For environment variables
}
```

---

## 🔊 Speech Features

### Speech Recognition (Web Speech API)
- **Language**: English (en-US)
- **Continuous**: Listens and detects pauses (1.5 seconds)
- **Interim Results**: Shows live transcript as you speak
- **Max Duration**: 60 seconds per session

### Speech Synthesis (SpeechSynthesis API)
- **Voice**: System default English
- **Rate**: 0.95x (natural speed)
- **Auto-play**: Responses are spoken automatically
- **Interrupt**: Stopped if you start speaking again

---

## 🐛 Troubleshooting

### "Microphone not supported"
- Use Chrome, Edge, or Safari browsers
- Firefox has limited support
- Enable microphone permissions

### "AI service not configured"
- Check `.env` file has API key
- Restart the server: `npm start`
- Verify API key is valid (test in API dashboard)

### "API rate limit exceeded"
- You've made too many requests
- Free tier: 3 requests/minute
- Paid tier: Higher limits
- Wait a moment and try again

### "No speech detected"
- Speak louder and clearer
- Check microphone volume
- Allow microphone permission in browser

### Nexa is not responding
1. Check browser console (F12) for errors
2. Check server logs (terminal where you ran `npm start`)
3. Verify API key is correct
4. Restart the server

---

## 📊 API Usage & Costs

### OpenAI Pricing (as of 2024)
- **gpt-3.5-turbo**: ~$0.0005 per 1K tokens
- Typical request: 200-300 tokens
- Cost per message: ~$0.0001-$0.0002
- $5 free credits (new accounts)

### Google Gemini Pricing
- **Free tier**: 60 requests/minute, limited TPM
- **Pro tier**: Pay for higher usage
- Cost: ~$0.00001 per 1K tokens (very cheap)

### Tips to Save Costs
- Use Gemini API (cheaper than OpenAI)
- Fewer conversation history exchanges (keep it short)
- Batch similar questions
- Monitor usage in API dashboard

---

## 🚀 Deployment Guide

### Deploying to Render

1. **Connect your GitHub repo to Render**
2. **Add Environment Variables** (Render > Environment)
   ```
   OPENAI_API_KEY=your-key
   NODE_ENV=production
   PORT=3000
   ```
3. **Deploy** - Render auto-deploys on Git push

### Deploying to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Add environment variables
heroku config:set OPENAI_API_KEY=your-key

# Deploy
git push heroku main
```

### Deploying to Your Own Server

```bash
# SSH into your server
ssh user@your-server.com

# Install Node.js if needed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repo
git clone https://github.com/your-repo.git
cd your-repo

# Setup environment
npm install
cp .env.example .env
# Edit .env with your API keys

# Run with PM2 (keeps app running)
npm install -g pm2
pm2 start server.js --name "student-app"
pm2 startup
pm2 save
```

---

## 🤝 Integration Examples

### Using Nexa with Your Tasks

**In your code:**
```javascript
// Nexa automatically reads your tasks
// The backend builds task context from your JSON files
// It understands:
// - What's due today
// - What's overdue (urgent!)
// - Priority levels
// - Task completion status
```

### Custom System Prompt

To customize Nexa's personality, edit `/routes/voiceAI.js`:

```javascript
const systemPrompt = `You are Nexa, your custom description here...`;
```

---

## 📝 Features Roadmap

### Currently Implemented ✅
- Natural conversation understanding
- Continuous listening with wake word
- Task awareness and context
- Real-time transcript display
- Modern futuristic UI
- Chat history
- OpenAI & Gemini support

### Coming Soon 🔜
- Multi-language support
- Custom voice selection
- Meeting scheduling through voice
- Collaborative task discussions
- Voice reminders (daily briefings)
- Emotion detection from voice tone
- Custom wake words

---

## 🆘 Getting Help

### Check These First
1. Browser console errors (F12 → Console)
2. Server logs (terminal)
3. `.env` file is set up correctly
4. API key is valid
5. Browser has microphone permission

### Common Issues Checklist

| Issue | Solution |
|-------|----------|
| "Cannot find module 'openai'" | Run `npm install` |
| "API key not found" | Check `.env` file exists and has correct key |
| "Mic not working" | Check browser permission for microphone |
| "Nexa not speaking" | Browser may have muted speech synthesis - check settings |
| "CORS error" | Server restarted? Try refreshing the page |

### Debug Mode

Add this to `.env`:
```
NODE_ENV=development
```

This shows detailed error messages in the console.

---

## 📚 Documentation Files

- **voiceAssistantAI.js** - Frontend AI assistant logic
- **voiceAI.js** - Backend API handler
- **style.css** - UI styling and animations
- **.env.example** - Environment configuration

---

## 🎓 Learning Resources

### Voice Recognition
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- https://github.com/mdn/samples/tree/master/web-speech-api

### AI APIs
- **OpenAI Docs**: https://platform.openai.com/docs/
- **Gemini Docs**: https://ai.google.dev/

### Express.js
- https://expressjs.com/

---

## 📄 License

This project is MIT licensed. See LICENSE file for details.

---

## 🎉 You're All Set!

Your Nexa AI Voice Assistant is ready to use. Start chatting naturally with your assistant!

**Next Steps:**
1. Run `npm install` (if not done)
2. Configure `.env` with your API key
3. Run `npm start`
4. Open http://localhost:3000 in your browser
5. Click the purple orb and say "Hey Nexa!"

Enjoy your AI-powered productivity! 🚀
