/**
 * Student Task & Notes Manager - Frontend Utilities & API Wrapper
 */

// 1. Sleek Toast Notification Injector
window.showToast = function(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  // Select SVG icon based on toast type
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close-btn" onclick="this.parentElement.remove()">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  `;

  container.appendChild(toast);

  // Auto remove toast after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
};

// 2. Custom Delete/Action Confirmation Modal Hook
window.showConfirmModal = function(title, text, onConfirm) {
  let overlay = document.querySelector('#confirm-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3 id="confirm-modal-title">Confirm Action</h3>
          <button class="modal-close-btn" id="confirm-modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="modal-body">
          <p id="confirm-modal-text" style="color: var(--text-secondary); font-size: 14px; line-height: 1.5;"></p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="confirm-modal-cancel">Cancel</button>
          <button class="btn-submit" id="confirm-modal-proceed" style="margin-top:0; width:auto; padding: 10px 20px; background-color: var(--danger); box-shadow: none;">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-text').textContent = text;

  const closeBtn = document.getElementById('confirm-modal-close');
  const cancelBtn = document.getElementById('confirm-modal-cancel');
  const proceedBtn = document.getElementById('confirm-modal-proceed');

  const closeModal = () => {
    overlay.classList.remove('active');
  };

  overlay.classList.add('active');

  // Handle buttons clean-up & triggers
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  
  proceedBtn.onclick = () => {
    closeModal();
    if (typeof onConfirm === 'function') onConfirm();
  };
};

// 3. API Fetch Wrapper that manages dynamic JWT Injection and session handling
window.apiFetch = async function(url, options = {}) {
  const token = localStorage.getItem('student_app_token');
  
  // Set up Authorization headers automatically
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // Auto logout on unauthorized or expired tokens
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('student_app_token');
      localStorage.removeItem('student_app_user');
      showToast('Session expired. Please log in again.', 'warning');
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login.html') && !currentPath.includes('signup.html')) {
          window.location.href = '/pages/login.html';
        }
      }, 1500);
      throw new Error('Session Expired');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (error) {
    if (error.message !== 'Session Expired') {
      console.error(`API Fetch Error [${url}]:`, error);
      throw error;
    }
  }
};

// 4. Persistent on-screen reminder when a task is completed
function escapeReminderHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.hideTaskCompletionReminder = function() {
  const panel = document.getElementById('task-completion-reminder');
  if (panel) {
    panel.classList.remove('active');
  }
};

window.showTaskCompletionReminder = function(completedTask, pendingTasks = [], options = {}) {
  const maxList = 5;
  const sortedPending = [...pendingTasks].sort((a, b) => {
    if (a.priority === 'High' && b.priority !== 'High') return -1;
    if (a.priority !== 'High' && b.priority === 'High') return 1;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  const visiblePending = sortedPending.slice(0, maxList);
  const extraCount = sortedPending.length - visiblePending.length;

  let panel = document.getElementById('task-completion-reminder');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'task-completion-reminder';
    panel.className = 'task-completion-reminder';
    panel.setAttribute('role', 'alert');
    panel.setAttribute('aria-live', 'polite');
    document.body.appendChild(panel);
  }

  const completedTitle = escapeReminderHtml(completedTask.title || 'Untitled task');
  const priority = escapeReminderHtml(completedTask.priority || 'Medium');

  let pendingSection = '';
  if (sortedPending.length === 0) {
    pendingSection = `
      <p class="task-reminder-all-done">All tasks are complete. Great work!</p>
    `;
  } else {
    const listItems = visiblePending.map(t => {
      const due = t.dueDate
        ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';
      const pri = (t.priority || 'Medium').toLowerCase();
      return `
        <li class="task-reminder-pending-item">
          <span class="task-reminder-pending-title">${escapeReminderHtml(t.title)}</span>
          <span class="task-reminder-pending-meta">
            <span class="badge-priority ${pri}">${escapeReminderHtml(t.priority || 'Medium')}</span>
            ${due ? `<span class="task-reminder-due">${due}</span>` : ''}
          </span>
        </li>
      `;
    }).join('');

    pendingSection = `
      <div class="task-reminder-pending-block">
        <p class="task-reminder-pending-label">
          Still on your list <span class="task-reminder-count">(${sortedPending.length})</span>
        </p>
        <ul class="task-reminder-pending-list">${listItems}</ul>
        ${extraCount > 0 ? `<p class="task-reminder-more">+ ${extraCount} more pending task${extraCount > 1 ? 's' : ''}</p>` : ''}
      </div>
    `;
  }

  panel.innerHTML = `
    <div class="task-reminder-header">
      <div class="task-reminder-header-left">
        <div class="task-reminder-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="task-reminder-kicker">Task completed</p>
          <h4 class="task-reminder-title">${completedTitle}</h4>
        </div>
      </div>
      <button type="button" class="task-reminder-close" id="task-reminder-close-btn" aria-label="Dismiss reminder">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <p class="task-reminder-completed-meta">
      Marked done · <span class="badge-priority ${priority.toLowerCase()}">${priority}</span> priority
    </p>
    ${pendingSection}
    <div class="task-reminder-actions">
      ${sortedPending.length > 0 ? '<button type="button" class="btn-secondary task-reminder-view-btn" id="task-reminder-view-btn">View pending tasks</button>' : ''}
      <button type="button" class="btn-submit task-reminder-dismiss-btn" id="task-reminder-dismiss-btn">Got it</button>
    </div>
  `;

  panel.classList.add('active');

  // Notify other modules (voice assistant) that a task was completed
  try {
    document.dispatchEvent(new CustomEvent('taskCompleted', { detail: { completedTask, pendingTasks: sortedPending } }));
  } catch (e) {
    // ignore dispatch errors in older browsers
  }

  document.getElementById('task-reminder-close-btn').onclick = hideTaskCompletionReminder;
  document.getElementById('task-reminder-dismiss-btn').onclick = hideTaskCompletionReminder;

  const viewBtn = document.getElementById('task-reminder-view-btn');
  if (viewBtn && typeof options.onViewTasks === 'function') {
    viewBtn.onclick = () => {
      hideTaskCompletionReminder();
      options.onViewTasks();
    };
  }
};

// 5. SVG icons library helper
window.icons = {
  plus: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`,
  checkbox: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
  checkboxEmpty: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5a2 2 0 012-2h6a2 2 0 012 2v0a2 2 0 01-2 2h-6a2 2 0 01-2-2v0z" /></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5v14a2 2 0 002 2h6a2 2 0 002-2V5" /></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>`
};
