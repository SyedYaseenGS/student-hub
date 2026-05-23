/*
 * Nexa — Simple Voice Assistant (Lightweight Edition)
 * - Uses browser SpeechRecognition API to listen for commands
 * - Simple, fast, and easy for anyone (including kids) to use
 * - No background listening, no lag, just click → speak → get result
 *
 * Initialize from the dashboard by calling:
 *   window.initializeVoiceAssistant(api)
 */

(function () {
  window.initializeVoiceAssistant = function (api) {
    if (!api || typeof api.getTasks !== 'function') {
      console.warn('VoiceAssistant: missing API, skipping initialization.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    const synth = window.speechSynthesis || null;
    let recognition = null;
    let listening = false;

    const ASSISTANT_NAME = 'Nexa';

    // Simple floating mic button
    const micButton = document.createElement('button');
    micButton.id = 'va-mic-btn';
    micButton.className = 'voice-mic-btn';
    micButton.title = `${ASSISTANT_NAME} — click to speak`;
    micButton.setAttribute('aria-label', `${ASSISTANT_NAME} voice assistant`);
    micButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M12 1v11"></path>
        <path d="M19 11a7 7 0 01-14 0"></path>
        <path d="M5 21h14"></path>
      </svg>
    `;
    document.body.appendChild(micButton);

    document.body.appendChild(micButton);

    micButton.addEventListener('click', () => {
      if (!SpeechRecognition) {
        api.showToast && api.showToast(`${ASSISTANT_NAME}: Microphone not supported.`, 'warning');
        return;
      }
      if (!listening) {
        startListening();
      } else {
        stopListening();
      }
    });

    function speak(text) {
      if (!synth) return;
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        synth.speak(u);
      } catch (e) {
        console.error('Speech error:', e);
      }
    }

    function startListening() {
      try {
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false; // disable interim to reduce lag
        recognition.maxAlternatives = 1;
        recognition.continuous = false; // single session only

        recognition.onstart = () => {
          listening = true;
          micButton.classList.add('active');
          api.showToast && api.showToast(`${ASSISTANT_NAME}: Listening...`, 'info');
        };

        recognition.onresult = (ev) => {
          const result = ev.results[ev.results.length - 1];
          const text = result[0].transcript || '';
          if (result.isFinal && text) {
            processCommand(text);
          }
        };

        recognition.onerror = (ev) => {
          api.showToast && api.showToast(`${ASSISTANT_NAME}: I didn't catch that.`, 'warning');
        };

        recognition.onend = () => {
          listening = false;
          micButton.classList.remove('active');
        };

        recognition.start();
      } catch (e) {
        console.error('Listen failed:', e);
        api.showToast && api.showToast(`${ASSISTANT_NAME}: Error.`, 'error');
      }
    }

    function stopListening() {
      try {
        if (recognition) recognition.stop();
      } catch (e) {
        /* ignore */
      }
      listening = false;
      micButton.classList.remove('active');
    }

    async function processCommand(raw) {
      const text = (raw || '').toLowerCase().trim();
      if (!text) return;

      // Helper: find task by title
      function findTaskByTitle(q) {
        const tasks = (api.getTasks && api.getTasks()) || [];
        const cleaned = q.toLowerCase().replace(/["']/g, '').trim();
        let candidate = tasks.find(t => !t.completed && t.title && t.title.toLowerCase() === cleaned);
        if (candidate) return candidate;
        candidate = tasks.find(t => !t.completed && t.title && t.title.toLowerCase().includes(cleaned));
        if (candidate) return candidate;
        const words = cleaned.split(/\s+/).filter(Boolean);
        candidate = tasks.find(t => !t.completed && t.title && words.every(w => t.title.toLowerCase().includes(w)));
        return candidate || null;
      }

      // 1. Add task
      if (text.includes('add task') || text.includes('create task')) {
        let title = text.replace(/^.*(?:add|create)\s+task[s]?\s*/i, '').trim();
        if (api.openAddTaskModal) api.openAddTaskModal(title || undefined);
        speak(`${ASSISTANT_NAME}: New task dialog opened.`);
        return;
      }

      // 2. Show pending tasks
      if (text.includes('show') || text.includes('pending')) {
        api.showPendingTasks && api.showPendingTasks();
        const n = (api.getTasks && api.getTasks().filter(t => !t.completed).length) || 0;
        speak(`${ASSISTANT_NAME}: You have ${n} pending task${n !== 1 ? 's' : ''}.`);
        return;
      }

      // 3. Mark task complete
      if (/(?:mark|complete|done|finish)/.test(text)) {
        let title = text.replace(/(?:mark|task|complete|completed|done|finish)/gi, '').trim();
        const candidate = findTaskByTitle(title);
        if (candidate && api.markTaskCompleteByTitle) {
          await api.markTaskCompleteByTitle(candidate.title);
          speak(`${ASSISTANT_NAME}: Marked ${candidate.title} complete.`);
        } else {
          speak(`${ASSISTANT_NAME}: I couldn't find that task.`);
        }
        return;
      }

      // 4. Next priority task
      if (text.includes('next') || text.includes('priority')) {
        const next = api.getNextPriorityTask && api.getNextPriorityTask();
        if (next) {
          speak(`${ASSISTANT_NAME}: Next task is ${next.title}.`);
        } else {
          speak(`${ASSISTANT_NAME}: No pending tasks.`);
        }
        return;
      }

      // Unknown command
      speak(`${ASSISTANT_NAME}: Sorry, I didn't understand that.`);
    }

    // Return simple control
    return {
      stop: () => stopListening()
    };
  };
})();
