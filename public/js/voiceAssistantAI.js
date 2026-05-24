/**
 * ==========================================
 * NEXA - Conversational AI Voice Assistant
 * ChatGPT-like smart assistant for productivity
 * ==========================================
 * 
 * Features:
 * - Natural conversation understanding
 * - Continuous listening with wake word
 * - Speech-to-text (Web Speech API)
 * - AI responses (OpenAI/Gemini)
 * - Text-to-speech (SpeechSynthesis)
 * - Task awareness
 * - Conversation history
 * - Modern futuristic UI
 */

(function () {
  window.initializeVoiceAssistantAI = function (api) {
    if (!api || typeof api.getTasks !== 'function') {
      console.warn('VoiceAssistantAI: Missing API, skipping initialization.');
      return;
    }

    // ==================== CONFIG ====================
    const ASSISTANT_NAME = 'Nexa';
    const WAKE_PHRASE = 'hey nexa';
    const CHAT_HISTORY_KEY = 'nexa_chat_history';
    const MAX_HISTORY = 20;
    const PAUSE_DETECTION_TIME = 1500; // ms
    const MAX_CONTINUOUS_LISTENING = 60000; // 1 minute

    // ==================== API DETECTION ====================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    const synth = window.speechSynthesis || null;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser');
      return;
    }

    // ==================== STATE MANAGEMENT ====================
    let recognition = null;
    let listening = false;
    let speaking = false;
    let listeningTimeout = null;
    let pauseTimeout = null;
    let lastTranscriptTime = 0;
    let currentSessionTranscript = '';
    let wakeWordDetected = false;
    let manualListeningStarted = false;
    
    let conversationHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');

    // ==================== UI STRUCTURE ====================
    const createUI = () => {
      const container = document.createElement('div');
      container.id = 'nexa-ai-container';
      container.className = 'nexa-ai-container';
      container.innerHTML = `
        <!-- Floating AI Orb -->
        <div class="nexa-orb-wrapper">
          <button id="nexa-orb" class="nexa-orb" title="Activate ${ASSISTANT_NAME}" aria-label="${ASSISTANT_NAME} voice assistant">
            <svg class="nexa-orb-icon" viewBox="0 0 100 100" width="100%" height="100%">
              <defs>
                <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="40" fill="url(#orbGradient)" class="nexa-orb-bg" />
              <g class="nexa-orb-icon-inner">
                <path d="M50 30 L50 70 M30 50 L70 50" stroke="white" stroke-width="3" stroke-linecap="round" />
                <circle cx="50" cy="50" r="8" fill="white" />
              </g>
              <circle cx="50" cy="50" r="40" fill="none" stroke="white" stroke-width="2" class="nexa-orb-pulse" />
            </svg>
            <div class="nexa-pulse-ring"></div>
            <div class="nexa-wave-container">
              <div class="nexa-wave"></div>
              <div class="nexa-wave"></div>
              <div class="nexa-wave"></div>
            </div>
            <div class="nexa-orb-status">Ready</div>
          </button>
        </div>

        <!-- Chat Panel -->
        <div id="nexa-chat-panel" class="nexa-chat-panel hidden">
          <div class="nexa-chat-header">
            <div class="nexa-chat-header-content">
              <h3 class="nexa-chat-title">${ASSISTANT_NAME}</h3>
              <p class="nexa-chat-subtitle">Your AI Study Assistant</p>
            </div>
            <button id="nexa-close-chat" class="nexa-close-btn" aria-label="Close chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Transcript Area -->
          <div id="nexa-chat-transcript" class="nexa-chat-transcript">
            <div class="nexa-welcome-message">
              <div class="nexa-welcome-icon">🎤</div>
              <p>Hey there! I'm <strong>${ASSISTANT_NAME}</strong></p>
              <p>Say "<strong>Hey ${ASSISTANT_NAME}</strong>" to start chatting, or click the mic button below.</p>
            </div>
          </div>

          <!-- Live Transcript -->
          <div id="nexa-live-transcript" class="nexa-live-transcript hidden">
            <span class="nexa-listening-indicator"></span>
            <span id="nexa-interim-text">Listening...</span>
          </div>

          <!-- Input Area -->
          <div class="nexa-input-area">
            <div class="nexa-input-group">
              <button id="nexa-mic-btn" class="nexa-mic-btn" title="Click to speak" aria-label="Voice input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1v11"></path>
                  <path d="M19 11a7 7 0 01-14 0"></path>
                  <path d="M5 21h14"></path>
                </svg>
              </button>
              <input type="text" id="nexa-text-input" class="nexa-text-input" placeholder="Type or use voice..." />
              <button id="nexa-send-btn" class="nexa-send-btn" title="Send message" aria-label="Send">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16390247 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99721575 L3.03521743,10.4382088 C3.03521743,10.5953061 3.19218622,10.7524035 3.50612381,10.7524035 L16.6915026,11.5378905 C16.6915026,11.5378905 17.1624089,11.5378905 17.1624089,12.0091827 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Status Bar -->
          <div class="nexa-status-bar">
            <span id="nexa-status-text" class="nexa-status-text">Ready to listen</span>
            <span id="nexa-token-count" class="nexa-token-count"></span>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      return {
        orbButton: document.getElementById('nexa-orb'),
        chatPanel: document.getElementById('nexa-chat-panel'),
        chatTranscript: document.getElementById('nexa-chat-transcript'),
        liveTranscript: document.getElementById('nexa-live-transcript'),
        interimText: document.getElementById('nexa-interim-text'),
        textInput: document.getElementById('nexa-text-input'),
        micBtn: document.getElementById('nexa-mic-btn'),
        sendBtn: document.getElementById('nexa-send-btn'),
        closeBtn: document.getElementById('nexa-close-chat'),
        statusText: document.getElementById('nexa-status-text'),
        tokenCount: document.getElementById('nexa-token-count'),
        orbStatus: document.querySelector('.nexa-orb-status')
      };
    };

    const DOM = createUI();

    // ==================== CORE FUNCTIONS ====================

    /**
     * Text-to-Speech with proper handling
     */
    function speak(text) {
      if (!synth || !text) return;
      
      try {
        synth.cancel();
        speaking = true;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
          speaking = false;
        };
        
        utterance.onerror = (e) => {
          console.error('Speech synthesis error:', e);
          speaking = false;
        };
        
        synth.speak(utterance);
      } catch (e) {
        console.error('Speech error:', e);
        speaking = false;
      }
    }

    /**
     * Add message to chat transcript
     */
    function addMessageToTranscript(role, text, metadata = {}) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `nexa-message nexa-message-${role}`;
      
      let contentHTML = `<span class="nexa-message-text">${escapeHtml(text)}</span>`;
      
      msgDiv.innerHTML = contentHTML;
      DOM.chatTranscript.appendChild(msgDiv);
      DOM.chatTranscript.scrollTop = DOM.chatTranscript.scrollHeight;
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Update status
     */
    function setStatus(text, type = 'info') {
      DOM.statusText.textContent = text;
      DOM.statusText.className = `nexa-status-text nexa-status-${type}`;
      DOM.orbStatus.textContent = text.split(' ')[0]; // Short version for orb
    }

    /**
     * Toggle chat panel
     */
    function toggleChatPanel(show) {
      if (show) {
        DOM.chatPanel.classList.remove('hidden');
        DOM.textInput.focus();
      } else {
        DOM.chatPanel.classList.add('hidden');
      }
    }

    /**
     * Stop any ongoing speech
     */
    function stopSpeaking() {
      if (synth) {
        synth.cancel();
      }
      speaking = false;
    }

    /**
     * Clear conversation history
     */
    function clearHistory() {
      conversationHistory = [];
      localStorage.removeItem(CHAT_HISTORY_KEY);
      DOM.chatTranscript.innerHTML = '';
      const welcomeMsg = document.createElement('div');
      welcomeMsg.className = 'nexa-welcome-message';
      welcomeMsg.innerHTML = `
        <div class="nexa-welcome-icon">🎤</div>
        <p>Hey there! I'm <strong>${ASSISTANT_NAME}</strong></p>
        <p>Say "<strong>Hey ${ASSISTANT_NAME}</strong>" to start chatting, or click the mic button below.</p>
      `;
      DOM.chatTranscript.appendChild(welcomeMsg);
    }

    /**
     * Send message and get AI response
     */
    async function sendMessage(userText) {
      if (!userText || !userText.trim()) return;

      const trimmedText = userText.trim();
      
      // Add user message to transcript
      addMessageToTranscript('user', trimmedText);
      conversationHistory.push({ role: 'user', content: trimmedText });
      DOM.textInput.value = '';

      setStatus('🤔 Thinking...', 'loading');

      try {
        const response = await fetch('/api/voiceAI/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: trimmedText,
            conversationHistory: conversationHistory.slice(-16)
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to get AI response');
        }

        const aiResponse = data.response;
        
        // Add AI response to transcript
        addMessageToTranscript('assistant', aiResponse);
        
        conversationHistory.push({ role: 'assistant', content: aiResponse });

        // Maintain history limit
        if (conversationHistory.length > MAX_HISTORY) {
          conversationHistory = conversationHistory.slice(-MAX_HISTORY);
        }

        // Save history
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversationHistory));

        // Show token usage
        if (data.usage) {
          DOM.tokenCount.textContent = `Tokens: ${data.usage.prompt_tokens + data.usage.completion_tokens}`;
        }

        // Auto-speak response
        speak(aiResponse);
        setStatus('Speaking...', 'info');

      } catch (error) {
        console.error('AI Error:', error);
        const errorMsg = 'Sorry, I encountered an issue. Please check your API configuration or try again.';
        addMessageToTranscript('error', errorMsg);
        setStatus('Error', 'error');
      }
    }

    /**
     * Start listening with advanced controls
     */
    function startListening() {
      if (!SpeechRecognition || listening || speaking) return;

      try {
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = true;

        listening = true;
        manualListeningStarted = true;
        currentSessionTranscript = '';
        
        DOM.orbButton.classList.add('listening');
        DOM.liveTranscript.classList.remove('hidden');
        setStatus('Listening...', 'info');

        // Auto-stop after max listening time
        listeningTimeout = setTimeout(() => {
          stopListening();
          setStatus('Max listening time reached', 'warning');
        }, MAX_CONTINUOUS_LISTENING);

        recognition.onstart = () => {
          lastTranscriptTime = Date.now();
        };

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          currentSessionTranscript = finalTranscript || interimTranscript;
          lastTranscriptTime = Date.now();

          // Show interim transcript
          DOM.interimText.textContent = currentSessionTranscript || interimTranscript || 'Listening...';

          // If we have final result, check for wake word or process
          if (finalTranscript) {
            const lower = finalTranscript.toLowerCase();

            // Check for wake word if not manually started
            if (!manualListeningStarted && lower.includes(WAKE_PHRASE)) {
              wakeWordDetected = true;
              setStatus('👋 Wake word detected!', 'success');
              DOM.interimText.textContent = 'Go ahead, I\'m listening...';
              return;
            }

            // If manual listening or wake word detected, process
            if (manualListeningStarted || wakeWordDetected) {
              if (finalTranscript.toLowerCase() !== WAKE_PHRASE.toLowerCase()) {
                // Clear wake word from transcript if present
                let cleanText = finalTranscript.toLowerCase().replace(WAKE_PHRASE, '').trim();
                if (!cleanText) {
                  cleanText = finalTranscript;
                }
                
                clearTimeout(pauseTimeout);
                pauseTimeout = setTimeout(() => {
                  stopListening();
                  if (cleanText.trim()) {
                    sendMessage(cleanText);
                  }
                }, PAUSE_DETECTION_TIME);
              }
            }
          }
        };

        recognition.onerror = (event) => {
          console.error('Recognition error:', event.error);
          
          if (event.error === 'network') {
            setStatus('Network error - check internet', 'error');
          } else if (event.error === 'no-speech') {
            setStatus('No speech detected', 'warning');
          } else {
            setStatus(`Error: ${event.error}`, 'error');
          }
        };

        recognition.onend = () => {
          listening = false;
          DOM.orbButton.classList.remove('listening');
          DOM.liveTranscript.classList.add('hidden');
          
          clearTimeout(listeningTimeout);
          clearTimeout(pauseTimeout);
        };

        recognition.start();
      } catch (e) {
        console.error('Listen failed:', e);
        setStatus('Error starting listener', 'error');
        listening = false;
      }
    }

    /**
     * Stop listening
     */
    function stopListening() {
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          // ignore
        }
      }
      
      listening = false;
      manualListeningStarted = false;
      wakeWordDetected = false;
      DOM.orbButton.classList.remove('listening');
      DOM.liveTranscript.classList.add('hidden');
      
      clearTimeout(listeningTimeout);
      clearTimeout(pauseTimeout);
    }

    // ==================== EVENT LISTENERS ====================

    // Orb button - toggle listening and chat
    DOM.orbButton.addEventListener('click', () => {
      if (!DOM.chatPanel.classList.contains('hidden')) {
        // If chat is open, toggle listening
        if (!listening) {
          startListening();
        } else {
          stopListening();
        }
      } else {
        // If chat is closed, open it
        toggleChatPanel(true);
        startListening();
      }
    });

    // Close chat button
    DOM.closeBtn.addEventListener('click', () => {
      stopListening();
      toggleChatPanel(false);
    });

    // Send button
    DOM.sendBtn.addEventListener('click', () => {
      if (DOM.textInput.value.trim()) {
        stopSpeaking(); // Stop speaking before sending new message
        sendMessage(DOM.textInput.value);
      }
    });

    // Text input - Enter to send
    DOM.textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (DOM.textInput.value.trim()) {
          stopSpeaking();
          sendMessage(DOM.textInput.value);
        }
      }
    });

    // Mic button
    DOM.micBtn.addEventListener('click', () => {
      if (!listening) {
        startListening();
      } else {
        stopListening();
      }
    });

    // Load previous chat history
    if (conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-6);
      const welcomeDiv = DOM.chatTranscript.querySelector('.nexa-welcome-message');
      if (welcomeDiv) {
        welcomeDiv.remove();
      }
      
      recentMessages.forEach(msg => {
        addMessageToTranscript(msg.role, msg.content);
      });
    }

    // Initial greeting
    const initialGreeting = `Hi! I'm ${ASSISTANT_NAME}, your smart study assistant. Say "Hey ${ASSISTANT_NAME}" or click the mic to get started. I can help you with your tasks, notes, and keep you motivated! 🚀`;
    if (conversationHistory.length === 0) {
      addMessageToTranscript('assistant', initialGreeting);
    }

    setStatus('Ready', 'success');

    // ==================== CLEANUP ====================
    window.addEventListener('beforeunload', () => {
      stopListening();
      stopSpeaking();
    });

    // ==================== PUBLIC API ====================
    return {
      stop: () => stopListening(),
      speak: (text) => speak(text),
      send: (text) => sendMessage(text),
      clearHistory: () => clearHistory(),
      togglePanel: (show) => toggleChatPanel(show),
      getHistory: () => conversationHistory
    };
    };
  };
})();
