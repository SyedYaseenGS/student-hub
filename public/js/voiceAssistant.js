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
    const ASSISTANT_NAME = 'Nexa';
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

    // Focus Mode Card (Pomodoro)
    const focusCard = document.createElement('div');
    focusCard.className = 'focus-mode-card';
    focusCard.innerHTML = `
      <div class="focus-header">
        <strong>Focus Mode</strong>
        <button class="focus-close" title="Close">✕</button>
      </div>
      <div class="focus-body">
        <div class="focus-timer" id="va-focus-timer">25:00</div>
        <div class="focus-controls">
          <button class="btn-secondary" id="va-focus-start">Start</button>
          <button class="btn-secondary" id="va-focus-pause">Pause</button>
          <button class="btn-secondary" id="va-focus-reset">Reset</button>
        </div>
      </div>
    `;
    document.body.appendChild(focusCard);

    const timerDisplay = focusCard.querySelector('#va-focus-timer');
    const btnStart = focusCard.querySelector('#va-focus-start');
    const btnPause = focusCard.querySelector('#va-focus-pause');
    const btnReset = focusCard.querySelector('#va-focus-reset');
    const btnClose = focusCard.querySelector('.focus-close');

    let focusDuration = 25 * 60; // seconds
    let remaining = focusDuration;
    let focusInterval = null;

    function formatTime(s) {
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    }

    function updateTimerDisplay() {
      timerDisplay.textContent = formatTime(remaining);
    }

    function startFocus() {
      if (focusInterval) return;
      focusInterval = setInterval(() => {
        remaining -= 1;
        updateTimerDisplay();
        if (remaining <= 0) {
          clearInterval(focusInterval);
          focusInterval = null;
          remaining = focusDuration;
          updateTimerDisplay();
          speak(`${ASSISTANT_NAME}: Focus session completed. Take a short break.`);
          playAlarm();
        }
      }, 1000);
    }

    function pauseFocus() {
      if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
      }
    }

    function resetFocus() {
      pauseFocus();
      remaining = focusDuration;
      updateTimerDisplay();
    }

    btnStart.addEventListener('click', () => { startFocus(); speak(`${ASSISTANT_NAME}: Focus session started for 25 minutes.`); });
    btnPause.addEventListener('click', () => { pauseFocus(); speak(`${ASSISTANT_NAME}: Focus session paused.`); });
    btnReset.addEventListener('click', () => { resetFocus(); speak(`${ASSISTANT_NAME}: Focus session reset.`); });
    btnClose.addEventListener('click', () => { focusCard.classList.toggle('hidden'); });

    // Toggle mic listening
    micButton.addEventListener('click', () => {
      if (!SpeechRecognition) {
        api.showToast && api.showToast('SpeechRecognition not supported in this browser.', 'warning');
        return;
      }
      if (!listening) startListening(); else stopListening();
    });

    function startListening() {
      try {
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (ev) => {
          const text = ev.results[0][0].transcript;
          friendlyLog('Heard:', text);
          processCommand(text || '');
        };

        recognition.onerror = (ev) => {
          friendlyLog('Recognition error', ev.error);
          api.showToast && api.showToast('Voice recognition error: ' + ev.error, 'error');
        };

        recognition.onend = () => {
          listening = false;
          micButton.classList.remove('active');
        };

        recognition.start();
        listening = true;
        micButton.classList.add('active');
      } catch (e) {
        console.error('VA startListening failed', e);
        api.showToast && api.showToast('Voice assistant failed to start.', 'error');
      }
    }

    function stopListening() {
      try {
        if (recognition) recognition.stop();
      } catch (e) { /* ignore */ }
      listening = false;
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

      // Visual toast + voice (prefix with assistant name)
      api.showToast && api.showToast(`${ASSISTANT_NAME}: ${message}`, 'warning');
      speak(`${ASSISTANT_NAME}: ${message.replace('Reminder: ', '')}`); // speak shorter text with assistant name
      playAlarm();
    }

    // Wire task completion event to suggest next priority task
    document.addEventListener('taskCompleted', (ev) => {
      try {
        const pending = (ev.detail && ev.detail.pendingTasks) || [];
        if (pending.length > 0) {
          const next = pending[0];
          const response = `${ASSISTANT_NAME}: Great job. Your next important task is ${next.title}.`;
          api.showToast && api.showToast(response, 'success');
          speak(response);
        } else {
          speak(`${ASSISTANT_NAME}: Great job. All tasks are complete.`);
        }
      } catch (e) {
        console.error('taskCompleted handler error', e);
      }
    });

    // Command processing
    async function processCommand(raw) {
      const text = (raw || '').toLowerCase().trim();
      if (!text) return;
      friendlyLog('Processing command:', text);

      // Add task
      if (text.includes('add task') || text.includes('create task')) {
        api.openAddTaskModal && api.openAddTaskModal();
        speak(`${ASSISTANT_NAME}: Opening the add task dialog.`);
        return;
      }

      // Show pending tasks
      if (text.includes('show pending') || text.includes('pending tasks')) {
        api.showPendingTasks && api.showPendingTasks();
        const n = (api.getTasks && api.getTasks().filter(t => !t.completed).length) || 0;
        speak(`${ASSISTANT_NAME}: You have ${n} pending task${n!==1?'s':''}.`);
        return;
      }

      // Read today's tasks
      if (text.includes('read') && (text.includes('today') || text.includes("today's"))) {
        const todays = api.readTodaysTasks ? api.readTodaysTasks() : [];
        if (!todays || todays.length === 0) {
          speak(`${ASSISTANT_NAME}: You have no tasks due today.`);
        } else {
          speak(`${ASSISTANT_NAME}: You have ${todays.length} tasks due today. I'll read them now.`);
          for (let i = 0; i < todays.length; i++) {
            const t = todays[i];
            speak(`${i+1}. ${t.title}`);
          }
        }
        return;
      }

      // Open sticky notes
      if (text.includes('open sticky') || text.includes('open notes') || text.includes('sticky notes')) {
        api.switchSection && api.switchSection('notes-section');
        speak(`${ASSISTANT_NAME}: Opening sticky notes.`);
        return;
      }

      // Mark task complete (optionally with title following phrase)
      if (text.includes('mark task complete') || text.includes('complete task')) {
        // Try to extract the title mentioned after the phrase
        const after = text.replace('mark task complete', '').replace('complete task', '').trim();
        if (after && api.markTaskCompleteByTitle) {
          const found = await api.markTaskCompleteByTitle(after);
          if (found) {
            speak(`${ASSISTANT_NAME}: Marked ${found.title} as complete.`);
          } else {
            speak(`${ASSISTANT_NAME}: I couldn't find a matching task. Please try saying the task title more clearly.`);
          }
        } else if (api.getTasks) {
          // if no title provided, suggest the most recent pending
          const pending = (api.getTasks().filter(t => !t.completed) || []);
          if (pending.length === 0) { speak(`${ASSISTANT_NAME}: You have no pending tasks to mark complete.`); }
          else { await api.markTaskCompleteByTitle && api.markTaskCompleteByTitle(pending[0].title); speak(`${ASSISTANT_NAME}: Marked ${pending[0].title} as complete.`); }
        }
        return;
      }

      // Next priority task
      if (text.includes('next priority') || text.includes('what is my next') || text.includes('next important')) {
        const next = api.getNextPriorityTask && api.getNextPriorityTask();
        if (next) {
          const resp = `${ASSISTANT_NAME}: Your next priority task is ${next.title}${next.dueDate ? ' due ' + (new Date(next.dueDate)).toLocaleDateString() : ''}.`;
          speak(resp);
          api.showToast && api.showToast(resp, 'info');
        } else {
          speak(`${ASSISTANT_NAME}: You have no pending tasks.`);
        }
        return;
      }

      // Focus mode commands
      if (text.includes('start focus') || text.includes('start pomodoro') || text.includes('start focus mode')) {
        startFocus();
        speak(`${ASSISTANT_NAME}: Starting a 25 minute focus session.`);
        return;
      }
      if (text.includes('pause focus') || text.includes('pause timer')) { pauseFocus(); speak(`${ASSISTANT_NAME}: Paused the focus timer.`); return; }
      if (text.includes('reset focus') || text.includes('reset timer')) { resetFocus(); speak(`${ASSISTANT_NAME}: Reset the focus timer.`); return; }

      // Unknown command fallback
      speak(`${ASSISTANT_NAME}: Sorry, I did not understand that. Try: add task, show pending tasks, read today\'s tasks, open sticky notes, mark task complete, next priority task, or start focus mode.`);
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
