/*
 * Lightweight Voice Assistant & Smart Reminder System
 * - Uses browser SpeechRecognition & SpeechSynthesis for voice I/O
 * - Uses Notifications + custom popups + WebAudio alarm for reminders
 * - Minimal, modular and runs entirely in the browser (no heavy libs)
 *
 * Initialize from the dashboard by calling:
 *   window.initializeVoiceAssistant(api)
 *
 * Expected `api` object (small surface):
 * - getTasks(): Array of tasks
 * - openAddTaskModal(): opens add task modal
 * - showPendingTasks(): navigate to tasks with pending filter
 * - switchSection(id): navigate to section (e.g. 'notes-section')
 * - markTaskCompleteByTitle(title): try to mark a task completed by title
 * - getNextPriorityTask(): returns next important pending task
 * - readTodaysTasks(): returns tasks due today
 * - showToast(message, type): UI toast helper
 */

(function () {
  function friendlyLog(...args) { if (window.DEBUG_VA) console.log('[VA]', ...args); }

  window.initializeVoiceAssistant = function (api) {
    if (!api || typeof api.getTasks !== 'function') {
      console.warn('VoiceAssistant: missing API object, initialization aborted.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    const synth = window.speechSynthesis || null;
    let recognition = null;
    let listening = false;
    let userStopRequested = false;
    let silenceTimer = null;
    const SILENCE_TIMEOUT_MS = 5000; // auto-stop after 5 seconds of silence
    const ASSISTANT_NAME = 'Nexa';
    const QUIET_MODE = true; // minimal speech by default
    const remindersSent = JSON.parse(localStorage.getItem('va_reminded') || '{}');
    const CHECK_INTERVAL = 2 * 60 * 1000; // every 2 minutes
    const LOOKAHEAD_HOURS = 24; // remind for tasks due within 24 hours

    // Create floating mic button
    const micButton = document.createElement('button');
    micButton.id = 'va-mic-btn';
    micButton.className = 'voice-mic-btn';
    micButton.title = `${ASSISTANT_NAME} — click to speak`;
    micButton.setAttribute('aria-label', ASSISTANT_NAME + ' voice assistant');
    micButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 1v11"></path><path d="M19 11a7 7 0 01-14 0"></path><path d="M5 21h14"></path></svg>
      <span class="va-pulse" aria-hidden="true"></span>
    `;
    document.body.appendChild(micButton);

    // (Focus mode removed per user request)

    // Toggle mic listening
    micButton.addEventListener('click', () => {
      if (!SpeechRecognition) {
        api.showToast && api.showToast(`${ASSISTANT_NAME}: SpeechRecognition not supported in this browser.`, 'warning');
        return;
      }
      if (!listening) startListening(); else stopListening();
    });

    function resetSilenceTimer() {
      try {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          friendlyLog('Silence timeout reached — stopping recognition');
          userStopRequested = true; // prevent auto-restart
          try { if (recognition) recognition.stop(); } catch (e) { /* ignore */ }
          listening = false;
          micButton.classList.remove('active');
        }, SILENCE_TIMEOUT_MS);
      } catch (e) { /* ignore */ }
    }

    function clearSilenceTimer() {
      try { if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; } } catch (e) { }
    }

    function startListening() {
      try {
        userStopRequested = false;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        // Allow interim results to detect speech quickly; act on final results only
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = true;

        recognition.onstart = () => {
          listening = true;
          micButton.classList.add('active');
          friendlyLog('Recognition started');
        };

        recognition.onresult = (ev) => {
          // Reset silence timer on any partial or final speech
          resetSilenceTimer();
          // Process only final results to avoid duplicate handling
          const result = ev.results[ev.results.length - 1];
          const isFinal = !!result.isFinal;
          const text = (result && result[0] && result[0].transcript) ? result[0].transcript : '';
          friendlyLog('Heard (final=' + isFinal + '):', text);
          if (isFinal && text) processCommand(text || '', { direct: true });
        };

        recognition.onerror = (ev) => {
          friendlyLog('Recognition error', ev.error);
          api.showToast && api.showToast(`${ASSISTANT_NAME}: Voice recognition error: ${ev.error}`, 'error');
        };

        recognition.onend = () => {
          friendlyLog('Recognition ended');
          clearSilenceTimer();
          // Auto-restart if user did not request stop (keeps listening)
          if (!userStopRequested) {
            try {
              setTimeout(() => {
                recognition && recognition.start();
              }, 300);
            } catch (e) {
              friendlyLog('Auto-restart failed', e);
              listening = false;
              micButton.classList.remove('active');
            }
          } else {
            listening = false;
            micButton.classList.remove('active');
          }
        };

        recognition.start();
        // start silence timer so it auto-stops if user doesn't speak
        resetSilenceTimer();
      } catch (e) {
        console.error('VA startListening failed', e);
        api.showToast && api.showToast(`${ASSISTANT_NAME}: Voice assistant failed to start.`, 'error');
      }
    }

    function stopListening() {
      try {
        userStopRequested = true;
        if (recognition) recognition.stop();
      } catch (e) { /* ignore */ }
      listening = false;
      clearSilenceTimer();
      micButton.classList.remove('active');
    }

    function speak(text) {
      if (!synth) return api.showToast && api.showToast(text, 'info');
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        synth.speak(u);
      } catch (e) {
        console.error('SpeechSynthesis error', e);
      }
    }

    function speakIfAllowed(text, force = false) {
      if (!text) return;
      if (force) return speak(text);
      if (!QUIET_MODE) speak(text);
    }

    // Small multi-beep alarm using WebAudio
    function playAlarm() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const beep = (t, freq) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq || 880;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.value = 0.0001;
          o.start();
          g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.35);
          o.stop(ctx.currentTime + 0.36 + (t || 0));
        };
        beep(0, 880);
        setTimeout(() => beep(0, 660), 220);
        setTimeout(() => beep(0, 990), 460);
      } catch (e) {
        console.warn('Alarm play failed', e);
      }
    }

    // Reminder check routine
    async function checkReminders() {
      try {
        const tasks = (api.getTasks && api.getTasks()) || [];
        const now = new Date();

        tasks.forEach(task => {
          if (!task || task.completed || !task.dueDate) return;

          // Normalize date string (treat date-only as end-of-day)
          let due = null;
          try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
              due = new Date(task.dueDate + 'T23:59:00');
            } else {
              due = new Date(task.dueDate);
            }
          } catch (e) {
            due = new Date(task.dueDate);
          }

          const ms = due - now;
          const hours = ms / (1000 * 60 * 60);

          // Skip if already reminded recently
          if (remindersSent[task.id]) return;

          if (ms <= 0) {
            // Overdue or due now
            triggerReminder(task, 'now');
            remindersSent[task.id] = Date.now();
          } else if (hours <= LOOKAHEAD_HOURS) {
            // Due within lookahead window
            triggerReminder(task, hours);
            remindersSent[task.id] = Date.now();
          }
        });

        // Persist reminders to localStorage to avoid repeated notifications
        localStorage.setItem('va_reminded', JSON.stringify(remindersSent));
      } catch (err) {
        console.error('Reminder check failed', err);
      }
    }

    function triggerReminder(task, hours) {
      const title = task.title || 'Untitled task';
      let message = '';
      if (hours === 'now') message = `Reminder: ${title} is due now or overdue.`;
      else if (hours < 1) message = `Reminder: ${title} is due in less than an hour.`;
      else {
        const h = Math.round(hours);
        message = `Reminder: ${title} is due in ${h} hour${h>1?'s':''}.`;
      }

      // Use Web Notification if available
      try {
        if (window.Notification && Notification.permission === 'granted') {
          new Notification('Task Reminder', { body: message });
        } else if (window.Notification && Notification.permission !== 'denied') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') new Notification('Task Reminder', { body: message });
          });
        }
      } catch (e) {
        // ignore
      }

      // Visual toast + voice (prefix with assistant name). Reminders always speak.
      api.showToast && api.showToast(`${ASSISTANT_NAME}: ${message}`, 'warning');
      speak(`${ASSISTANT_NAME}: ${message.replace('Reminder: ', '')}`);
      playAlarm();
    }

    // Wire task completion event to suggest next priority task
    document.addEventListener('taskCompleted', (ev) => {
      try {
        const pending = (ev.detail && ev.detail.pendingTasks) || [];
        if (pending.length > 0) {
          const next = pending[0];
          const response = `Great job. Next: ${next.title}.`;
          api.showToast && api.showToast(`${ASSISTANT_NAME}: ${response}`, 'success');
          speakIfAllowed(`${ASSISTANT_NAME}: ${response}`);
        } else {
          api.showToast && api.showToast(`${ASSISTANT_NAME}: All tasks complete.`, 'success');
          speakIfAllowed(`${ASSISTANT_NAME}: All tasks complete.`);
        }
      } catch (e) {
        console.error('taskCompleted handler error', e);
      }
    });

    // Command processing
    async function processCommand(raw, opts = {}) {
      const direct = !!(opts && opts.direct);
      const text = (raw || '').toLowerCase().trim();
      if (!text) return;
      friendlyLog('Processing command:', text, 'direct=' + direct);

      // Helper: find best matching pending task by title
      function findTaskByTitle(q) {
        if (!q) return null;
        const tasks = (api.getTasks && api.getTasks()) || [];
        const cleaned = q.toLowerCase().replace(/["']/g, '').trim();
        // exact
        let candidate = tasks.find(t => !t.completed && t.title && t.title.toLowerCase() === cleaned);
        if (candidate) return candidate;
        // substring
        candidate = tasks.find(t => !t.completed && t.title && t.title.toLowerCase().includes(cleaned));
        if (candidate) return candidate;
        // all-words match
        const words = cleaned.split(/\s+/).filter(Boolean);
        candidate = tasks.find(t => !t.completed && t.title && words.every(w => t.title.toLowerCase().includes(w)));
        return candidate || null;
      }

      // Add task (optionally: "add task <title>")
      if (text.includes('add task') || text.includes('create task')) {
        // extract title after phrase if present
        let title = text.replace(/^.*(?:add|create)\s+task[s]?\s*/i, '').trim();
        if (!title) title = '';
        if (api.openAddTaskModal) api.openAddTaskModal(title || undefined);
        api.showToast && api.showToast(`${ASSISTANT_NAME}: Opened add-task dialog.`, 'info');
        speakIfAllowed(`${ASSISTANT_NAME}: Opened add-task dialog.`, direct);
        return;
      }

      // Show pending tasks
      if (text.includes('show pending') || text.includes('pending tasks')) {
        api.showPendingTasks && api.showPendingTasks();
        const n = (api.getTasks && api.getTasks().filter(t => !t.completed).length) || 0;
        api.showToast && api.showToast(`${ASSISTANT_NAME}: ${n} pending task${n!==1?'s':''}.`, 'info');
        speakIfAllowed(`${ASSISTANT_NAME}: ${n} pending task${n!==1?'s':''}.`, direct);
        return;
      }

      // Read today's tasks (quiet mode: show toast instead of verbose reading)
      if (text.includes('read') && (text.includes('today') || text.includes("today's"))) {
        const todays = api.readTodaysTasks ? api.readTodaysTasks() : [];
        if (!todays || todays.length === 0) {
          api.showToast && api.showToast(`${ASSISTANT_NAME}: No tasks due today.`, 'info');
          speakIfAllowed(`${ASSISTANT_NAME}: You have no tasks due today.`, direct);
        } else {
          const titles = todays.map(t => t.title).filter(Boolean).slice(0, 6).join('; ');
          api.showToast && api.showToast(`${ASSISTANT_NAME}: Tasks today: ${titles}`, 'info');
          // only speak full list if not quiet
          if (!QUIET_MODE) speak(`${ASSISTANT_NAME}: You have ${todays.length} tasks due today. ${titles}`);
        }
        return;
      }

      // Open sticky notes
      if (text.includes('open sticky') || text.includes('open notes') || text.includes('sticky notes')) {
        api.switchSection && api.switchSection('notes-section');
        api.showToast && api.showToast(`${ASSISTANT_NAME}: Opening notes.`, 'info');
        speakIfAllowed(`${ASSISTANT_NAME}: Opening notes.`, direct);
        return;
      }

      // Mark task complete (support many phrasings)
      if (/(?:mark|set|make)?\s*(?:task)?\s*(?:complete|completed|done|finish)|\bdone\b|\bcomplete\b/.test(text)) {
        // Try to extract the title via multiple heuristics
        let title = null;
        // patterns like "mark <title> complete"
        let m = text.match(/mark\s+(.+?)\s+complete$/i);
        if (m) title = m[1];
        // patterns like "complete <title>"
        if (!title) {
          m = text.match(/(?:complete|done|finish)\s+(.+)/i);
          if (m) title = m[1];
        }
        // fallback: remove keywords
        if (!title) {
          title = text.replace(/(?:mark|task|complete|completed|done|finish)/gi, '').trim();
        }

        const candidate = findTaskByTitle(title);
        if (candidate && api.markTaskCompleteByTitle) {
          await api.markTaskCompleteByTitle(candidate.title);
          api.showToast && api.showToast(`${ASSISTANT_NAME}: Marked '${candidate.title}' complete.`, 'success');
          speakIfAllowed(`${ASSISTANT_NAME}: Marked ${candidate.title} complete.`, direct);
        } else {
          api.showToast && api.showToast(`${ASSISTANT_NAME}: Could not find matching pending task.`, 'warning');
          speakIfAllowed(`${ASSISTANT_NAME}: I couldn't find that task.`, direct);
        }
        return;
      }

      // Next priority task
      if (text.includes('next priority') || text.includes('what is my next') || text.includes('next important')) {
        const next = api.getNextPriorityTask && api.getNextPriorityTask();
        if (next) {
          const resp = `Your next priority task is ${next.title}${next.dueDate ? ' due ' + (new Date(next.dueDate)).toLocaleDateString() : ''}.`;
          api.showToast && api.showToast(`${ASSISTANT_NAME}: ${resp}`, 'info');
          speakIfAllowed(`${ASSISTANT_NAME}: ${resp}`, direct);
        } else {
          api.showToast && api.showToast(`${ASSISTANT_NAME}: You have no pending tasks.`, 'info');
          speakIfAllowed(`${ASSISTANT_NAME}: You have no pending tasks.`, direct);
        }
        return;
      }

      // Unknown command fallback (quiet)
      api.showToast && api.showToast(`${ASSISTANT_NAME}: Command not recognized. Try: add task, show pending, mark task complete, next priority, or open notes.`, 'warning');
      speakIfAllowed(`${ASSISTANT_NAME}: Sorry, I did not understand that.`, direct);
    }

    // Start the periodic reminders check
    checkReminders();
    const intervalHandle = setInterval(checkReminders, CHECK_INTERVAL);

    // Expose a small cleanup API if needed
    return {
      stop: () => {
        clearInterval(intervalHandle);
        stopListening();
      }
    };
  };
})();
