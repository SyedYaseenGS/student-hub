/**
 * Student Task & Notes Manager - Core Workspace Client Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Session check on page load
  const token = localStorage.getItem('student_app_token');
  const userJson = localStorage.getItem('student_app_user');
  
  if (!token || !userJson) {
    localStorage.removeItem('student_app_token');
    localStorage.removeItem('student_app_user');
    window.location.replace('/pages/login.html');
    return;
  }

  const currentUser = JSON.parse(userJson);

  // 2. State management variables
  let appTasks = [];
  let appNotes = [];
  let activeSection = 'overview-section';
  let currentTaskFilter = 'all'; // all, pending, completed
  let currentPriorityFilter = 'all'; // all, High, Medium, Low
  let globalSearchQuery = '';

  // Auto-save debounce store for notes (maps noteId -> timeoutId)
  const noteSaveDebounceTimeouts = {};

  // Pastel Color Theme Hex List
  const NOTE_PASTEL_COLORS = [
    { name: 'yellow', hex: '#ffd166', var: 'var(--note-pastel-yellow)' },
    { name: 'blue', hex: '#a8dadc', var: 'var(--note-pastel-blue)' },
    { name: 'green', hex: '#a7c957', var: 'var(--note-pastel-green)' },
    { name: 'purple', hex: '#c8b6ff', var: 'var(--note-pastel-purple)' },
    { name: 'pink', hex: '#ffccd5', var: 'var(--note-pastel-pink)' },
    { name: 'orange', hex: '#f4a261', var: 'var(--note-pastel-orange)' },
    { name: 'teal', hex: '#81b29a', var: 'var(--note-pastel-teal)' }
  ];

  // ====================================================================
  // DOM ELEMENT SELECTORS
  // ====================================================================
  
  // Theme and profile drop
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const settingsThemeToggle = document.getElementById('dropdown-settings-theme-toggle');
  const logoutBtn = document.getElementById('logout-btn');
  const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
  const dropdownDeleteAccountBtn = document.getElementById('dropdown-delete-account-btn');
  
  const profileMenuTrigger = document.getElementById('profile-menu-trigger');
  const profileDropdownList = document.getElementById('profile-dropdown-list');
  const headerUsername = document.getElementById('header-username');
  const headerUserAvatar = document.getElementById('header-user-avatar');
  const mobileAvatar = document.getElementById('mobile-avatar');
  const dropdownName = document.getElementById('dropdown-name');
  const dropdownEmail = document.getElementById('dropdown-email');
  
  const welcomeTitle = document.getElementById('welcome-title');
  const currentDateDisplay = document.getElementById('current-date-display');
  const headerSearchBar = document.getElementById('header-search-bar');
  const globalSearchInput = document.getElementById('global-search-input');
  
  // Sidebar links
  const sidebarLinks = document.querySelectorAll('.menu-link');
  const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
  const sidebarDrawer = document.getElementById('sidebar-drawer');
  
  // Tasks elements
  const openAddTaskModalBtn = document.getElementById('open-add-task-modal-btn');
  const taskModalOverlay = document.getElementById('task-modal-overlay');
  const closeTaskModalBtn = document.getElementById('close-task-modal-btn');
  const cancelTaskModalBtn = document.getElementById('cancel-task-modal-btn');
  const taskModalForm = document.getElementById('task-modal-form');
  const saveTaskBtn = document.getElementById('save-task-btn');
  const taskModalTitle = document.getElementById('task-modal-title');
  
  const taskFormId = document.getElementById('task-form-id');
  const taskFormTitle = document.getElementById('task-form-title');
  const taskFormDesc = document.getElementById('task-form-desc');
  const taskFormPriority = document.getElementById('task-form-priority');
  const taskFormDate = document.getElementById('task-form-date');
  
  const taskFilterBtns = document.querySelectorAll('.filter-btn[data-filter]');
  const taskPriorityFilter = document.getElementById('task-priority-filter');
  const workspaceTasksList = document.getElementById('workspace-tasks-list');
  
  // Task selection toolbar elements
  const taskSelectionToolbar = document.getElementById('task-selection-toolbar');
  const selectAllTasksCheckbox = document.getElementById('select-all-tasks-checkbox');
  const deleteSelectedTasksBtn = document.getElementById('delete-selected-tasks-btn');
  const selectedCountSpan = document.getElementById('selected-count');
  const totalCountSpan = document.getElementById('total-count');
  
  // Notes elements
  const addNewNoteBtn = document.getElementById('add-new-note-btn');
  const workspaceNotesGrid = document.getElementById('workspace-notes-grid');
  
  // Dashboard indicators
  const statTotalTasks = document.getElementById('stat-total-tasks');
  const statCompletedTasks = document.getElementById('stat-completed-tasks');
  const statPendingTasks = document.getElementById('stat-pending-tasks');
  const statTotalNotes = document.getElementById('stat-total-notes');
  const dashboardTasksContainer = document.getElementById('dashboard-tasks-container');
  const dashboardNotesContainer = document.getElementById('dashboard-notes-container');
  
  const dashboardViewTasksLink = document.getElementById('dashboard-view-tasks-link');
  const dashboardViewNotesLink = document.getElementById('dashboard-view-notes-link');

  // ====================================================================
  // INIT LAYOUT & METRIC GREETINGS
  // ====================================================================
  
  // Set User Profile Details
  const userInitials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  headerUsername.textContent = currentUser.name;
  headerUserAvatar.textContent = userInitials;
  mobileAvatar.textContent = userInitials;
  dropdownName.textContent = currentUser.name;
  dropdownEmail.textContent = currentUser.email;

  // Set modern date presentation
  const today = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDateDisplay.textContent = today.toLocaleDateString('en-US', dateOptions);
  
  // Dynamic Welcome greetings
  const currentHour = today.getHours();
  let timeGreeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 18) {
    timeGreeting = 'Good afternoon';
  } else if (currentHour >= 18) {
    timeGreeting = 'Good evening';
  }
  welcomeTitle.textContent = `${timeGreeting}, ${currentUser.name.split(' ')[0]}!`;

  // ====================================================================
  // DYNAMIC SECTION SPA NAVIGATION
  // ====================================================================
  
  function switchSection(targetSectionId) {
    // Hide mobile drawer if active
    sidebarDrawer.classList.remove('active');
    
    // Toggle Section views
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
    });
    
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.add('active');
      activeSection = targetSectionId;
    }

    // Toggle Menu Link styles
    sidebarLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-target') === targetSectionId) {
        link.classList.add('active');
      }
    });

    // Control search bar visibility (only on Tasks & Notes tabs)
    if (targetSectionId === 'tasks-section' || targetSectionId === 'notes-section') {
      headerSearchBar.classList.add('active');
      if (targetSectionId === 'tasks-section') {
        globalSearchInput.placeholder = 'Search tasks by title or description...';
      } else {
        globalSearchInput.placeholder = 'Search sticky notes...';
      }
    } else {
      headerSearchBar.classList.remove('active');
    }
  }

  // Hook sidebar navigation links
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-target');
      switchSection(target);
    });
  });

  // Sidebar redirect linkages on dashboard dashboard
  dashboardViewTasksLink.addEventListener('click', () => switchSection('tasks-section'));
  dashboardViewNotesLink.addEventListener('click', () => switchSection('notes-section'));

  // Mobile navigation drawers
  mobileSidebarToggle.addEventListener('click', () => {
    sidebarDrawer.classList.toggle('active');
  });
  
  mobileAvatar.addEventListener('click', () => {
    profileDropdownList.classList.toggle('active');
  });

  // Close drawers on body clicking outside
  document.addEventListener('click', (e) => {
    if (!sidebarDrawer.contains(e.target) && !mobileSidebarToggle.contains(e.target)) {
      sidebarDrawer.classList.remove('active');
    }
    if (!profileMenuTrigger.contains(e.target) && !mobileAvatar.contains(e.target)) {
      profileDropdownList.classList.remove('active');
    }
  });

  // Profile Dropdown Toggle
  profileMenuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdownList.classList.toggle('active');
  });

  // ====================================================================
  // THEME SWITCH & UTILS LOGOUT CONTROLLERS
  // ====================================================================
  
  // Theme toggle icons only (do not shadow window.icons from utils.js)
  const themeIcons = {
    sun: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px; height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1m-16 0H1m15.364 1.636l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
    moon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px; height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>'
  };
  
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    renderThemeToggleIcon(isDark);
    showToast(`${isDark ? 'Dark Mode' : 'Light Mode'} activated!`, 'success');
  }

  function renderThemeToggleIcon(isDark) {
    const icon = isDark ? themeIcons.sun : themeIcons.moon;
    themeToggleBtn.innerHTML = icon;
  }

  themeToggleBtn.addEventListener('click', toggleTheme);
  settingsThemeToggle.addEventListener('click', toggleTheme);

  // Initialize correct theme icon representation
  const initialDark = document.body.classList.contains('dark');
  renderThemeToggleIcon(initialDark);

  // Logouts handlers
  function handleLogout() {
    showConfirmModal('Log Out', 'Are you sure you want to log out of your workspace session?', () => {
      localStorage.removeItem('student_app_token');
      localStorage.removeItem('student_app_user');
      showToast('Logged out successfully. Good bye!', 'success');
      setTimeout(() => {
        window.location.href = '/pages/login.html';
      }, 1000);
    });
  }

  logoutBtn.addEventListener('click', handleLogout);
  dropdownLogoutBtn.addEventListener('click', handleLogout);

  // Delete account handler
  function handleDeleteAccount() {
    showConfirmModal(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone. All your tasks and notes will also be deleted.',
      async () => {
        try {
          const res = await apiFetch('/api/auth/delete-account', {
            method: 'DELETE',
            body: JSON.stringify({ userId: currentUser.id })
          });

          if (res.success) {
            localStorage.removeItem('student_app_token');
            localStorage.removeItem('student_app_user');
            showToast('Account deleted successfully. Redirecting...', 'success');
            setTimeout(() => {
              window.location.href = '/pages/login.html';
            }, 1500);
          }
        } catch (err) {
          showToast('Failed to delete account. Please try again.', 'error');
        }
      }
    );
  }

  dropdownDeleteAccountBtn.addEventListener('click', handleDeleteAccount);

  // ====================================================================
  // GLOBAL SEARCH ROUTER
  // ====================================================================
  
  globalSearchInput.addEventListener('input', (e) => {
    globalSearchQuery = e.target.value.toLowerCase().trim();
    if (activeSection === 'tasks-section') {
      renderTasks();
    } else if (activeSection === 'notes-section') {
      renderNotes();
    }
  });

  // ====================================================================
  // BACKEND INTEGRATED DATAFETCHERS
  // ====================================================================
  
  async function fetchAllWorkspaceData() {
    try {
      // Fetch tasks and notes in parallel
      const [tasksRes, notesRes] = await Promise.all([
        apiFetch('/api/tasks'),
        apiFetch('/api/notes')
      ]);

      appTasks = tasksRes.tasks || [];
      appNotes = notesRes.notes || [];

      // Calculate statistics, dashboard items, and page elements
      updateWorkspaceMetrics();
      renderTasks();
      renderNotes();

    } catch (error) {
      console.error('Failed to boot initial dashboard data:', error);
      showToast('Connection failed: could not sync server database.', 'error');
    }
  }

  // Calculate & Refresh metrics dashboard widgets
  function updateWorkspaceMetrics() {
    const total = appTasks.length;
    const completed = appTasks.filter(t => t.completed).length;
    const pending = total - completed;
    const notesCount = appNotes.length;

    statTotalTasks.textContent = total;
    statCompletedTasks.textContent = completed;
    statPendingTasks.textContent = pending;
    statTotalNotes.textContent = notesCount;

    // Render Recent tasks inside dashboard card
    const urgentTasks = appTasks
      .filter(t => !t.completed)
      .sort((a,b) => {
        // High priority first, then dueDate
        if (a.priority === 'High' && b.priority !== 'High') return -1;
        if (a.priority !== 'High' && b.priority === 'High') return 1;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      })
      .slice(0, 3); // Take top 3 urgent

    if (urgentTasks.length === 0) {
      dashboardTasksContainer.innerHTML = `
        <div class="empty-state" style="padding: 20px 0;">
          <p class="empty-title">All Caught Up!</p>
          <p class="empty-desc" style="font-size:12px;">You have no pending high priority tasks.</p>
        </div>
      `;
    } else {
      dashboardTasksContainer.innerHTML = urgentTasks.map(t => createTaskRowHtml(t)).join('');
      // Assign quick checkbox togglers to dashboard rows
      dashboardTasksContainer.querySelectorAll('.task-checkbox-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const taskId = btn.getAttribute('data-id');
          await toggleTaskCompletionStatus(taskId);
        });
      });
    }

    // Render Recent 2 notes inside dashboard card
    const recentNotes = [...appNotes]
      .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 2);

    if (recentNotes.length === 0) {
      dashboardNotesContainer.innerHTML = `
        <div class="empty-state" style="padding: 20px 0;">
          <p class="empty-title">No Notes Saved</p>
          <p class="empty-desc" style="font-size:12px;">Create some notes to keep track of ideas.</p>
        </div>
      `;
    } else {
      dashboardNotesContainer.innerHTML = recentNotes.map(n => `
        <div class="note-item-card" style="background-color: ${getPastelVarHex(n.color)}; min-height: 120px; padding: 15px; margin-bottom:10px; pointer-events: none;">
          <h4 style="margin-bottom:6px; font-size:14px; font-weight:700;">${escapeHtml(n.title) || 'Untitled Note'}</h4>
          <p style="font-size:12px; line-height:1.4; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(n.content) || '<i>Empty body</i>'}
          </p>
        </div>
      `).join('');
    }
  }

  // Safe HTML escaper helper
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getPastelVarHex(colorNameOrHex) {
    const found = NOTE_PASTEL_COLORS.find(c => c.name === colorNameOrHex || c.hex === colorNameOrHex);
    return found ? found.var : colorNameOrHex || 'var(--note-pastel-yellow)';
  }

  // ====================================================================
  // TASKS CRUD INTERACTION SERVICES
  // ====================================================================
  
  function createTaskRowHtml(task) {
    const isCompleted = task.completed;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date().setHours(0,0,0,0) && !isCompleted;
    
    // Format friendly date
    let dateStr = '';
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return `
      <div class="task-item-card ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
        <div class="task-left">
          <input type="checkbox" class="task-select-checkbox" data-id="${task.id}" aria-label="Select Task">
          <button class="task-checkbox-btn" data-id="${task.id}" aria-label="Toggle Complete">
            ${icons.check}
          </button>
          <div class="task-info-block">
            <span class="task-title-text">${escapeHtml(task.title)}</span>
            ${task.description ? `<p class="task-desc-text">${escapeHtml(task.description)}</p>` : ''}
          </div>
        </div>
        <div class="task-right">
          <div class="task-metadata">
            <span class="badge-priority ${(task.priority || 'Medium').toLowerCase()}">${task.priority || 'Medium'}</span>
            ${task.dueDate ? `
              <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                ${icons.calendar}
                <span>${dateStr}${isOverdue ? ' (Overdue)' : ''}</span>
              </span>
            ` : ''}
          </div>
          <div class="task-actions">
            <button class="task-action-btn edit-task-btn" data-id="${task.id}" aria-label="Edit Task">
              ${icons.edit}
            </button>
            <button class="task-action-btn delete delete-task-btn" data-id="${task.id}" aria-label="Delete Task">
              ${icons.trash}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderTasks() {
    let filtered = appTasks;

    // 1. Apply status filter buttons
    if (currentTaskFilter === 'pending') {
      filtered = filtered.filter(t => !t.completed);
    } else if (currentTaskFilter === 'completed') {
      filtered = filtered.filter(t => t.completed);
    }

    // 2. Apply priority dropdown filter
    if (currentPriorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === currentPriorityFilter);
    }

    // 3. Apply global navbar query
    if (globalSearchQuery) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(globalSearchQuery) || 
        (t.description || '').toLowerCase().includes(globalSearchQuery)
      );
    }

    // Sort order: Uncompleted high priority first, then date
    filtered.sort((a,b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filtered.length === 0) {
      workspaceTasksList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-illustration" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p class="empty-title">No tasks found</p>
          <p class="empty-desc">Create your first task or change your filters to see more entries!</p>
        </div>
      `;
      return;
    }

    workspaceTasksList.innerHTML = filtered.map(t => createTaskRowHtml(t)).join('');

    // Attach Event Listeners to rows dynamically
    workspaceTasksList.querySelectorAll('.task-checkbox-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-id');
        await toggleTaskCompletionStatus(taskId);
      });
    });

    workspaceTasksList.querySelectorAll('.edit-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-id');
        openTaskModal(taskId);
      });
    });

    workspaceTasksList.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-id');
        deleteTaskRequest(taskId);
      });
    });
  }

  // Toggle Task Completed Parameter API endpoint
  async function toggleTaskCompletionStatus(id) {
    const task = appTasks.find(t => t.id === id);
    if (!task) return;
    
    const updatedStatus = !task.completed;

    try {
      const res = await apiFetch(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed: updatedStatus })
      });

      if (res.success) {
        task.completed = updatedStatus;
        if (updatedStatus) {
          const pendingTasks = appTasks.filter(t => !t.completed);
          showTaskCompletionReminder(task, pendingTasks, {
            onViewTasks: () => switchSection('tasks-section')
          });
        } else {
          hideTaskCompletionReminder();
          showToast('Task set back to active.', 'success');
        }
        updateWorkspaceMetrics();
        renderTasks();
      }
    } catch (err) {
      showToast('Failed to modify task completion status.', 'error');
    }
  }

  // Trigger task deletion with custom modal
  function deleteTaskRequest(id) {
    showConfirmModal('Delete Task', 'Are you sure you want to permanently delete this task?', async () => {
      try {
        const res = await apiFetch(`/api/tasks/${id}`, {
          method: 'DELETE'
        });

        if (res.success) {
          appTasks = appTasks.filter(t => t.id !== id);
          showToast('Task deleted successfully!', 'success');
          updateWorkspaceMetrics();
          renderTasks();
        }
      } catch (err) {
        showToast('Could not complete task deletion.', 'error');
      }
    });
  }

  // Open/Close Task Modal for Add/Edit
  function openTaskModal(taskIdToEdit = null) {
    taskModalOverlay.classList.add('active');
    taskModalForm.reset();

    if (taskIdToEdit) {
      // Setup Editing mode
      const task = appTasks.find(t => t.id === taskIdToEdit);
      if (!task) return;

      taskModalTitle.textContent = 'Edit Task';
      saveTaskBtn.textContent = 'Save Changes';
      taskFormId.value = task.id;
      taskFormTitle.value = task.title;
      taskFormDesc.value = task.description || '';
      taskFormPriority.value = task.priority;
      
      if (task.dueDate) {
        // format ISO date to YYYY-MM-DD
        taskFormDate.value = task.dueDate.split('T')[0];
      } else {
        taskFormDate.value = '';
      }
    } else {
      // Setup Creating Mode
      taskModalTitle.textContent = 'Add New Task';
      saveTaskBtn.textContent = 'Create Task';
      taskFormId.value = '';
      taskFormDate.value = '';
    }
    taskFormTitle.focus();
  }

  function closeTaskModal() {
    taskModalOverlay.classList.remove('active');
  }

  openAddTaskModalBtn.addEventListener('click', () => openTaskModal(null));
  closeTaskModalBtn.addEventListener('click', closeTaskModal);
  cancelTaskModalBtn.addEventListener('click', closeTaskModal);

  // Form submission handler (POST & PUT API routers)
  taskModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = taskFormTitle.value.trim();
    const description = taskFormDesc.value.trim();
    const priority = taskFormPriority.value;
    const dueDate = taskFormDate.value || null;
    const editingId = taskFormId.value;

    if (!title) {
      showToast('Task title is required!', 'warning');
      return;
    }

    try {
      if (editingId) {
        // Trigger Edit PUT
        const res = await apiFetch(`/api/tasks/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ title, description, priority, dueDate })
        });

        if (res.success) {
          const idx = appTasks.findIndex(t => t.id === editingId);
          appTasks[idx] = res.task;
          showToast('Task updated successfully!', 'success');
        }
      } else {
        // Trigger Create POST
        const res = await apiFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({ title, description, priority, dueDate })
        });

        if (res.success) {
          appTasks.push(res.task);
          showToast('New task added successfully!', 'success');
        }
      }

      closeTaskModal();
      updateWorkspaceMetrics();
      renderTasks();
    } catch (err) {
      showToast(err.message || 'Error occurred while saving task!', 'error');
    }
  });

  // Bind priority & status filters
  taskFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      taskFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTaskFilter = btn.getAttribute('data-filter');
      renderTasks();
    });
  });

  taskPriorityFilter.addEventListener('change', (e) => {
    currentPriorityFilter = e.target.value;
    renderTasks();
  });

  // ====================================================================
  // NOTES CRUD & AUTO-SAVE DEBOUNCE SERVICES
  // ====================================================================
  
  function renderNotes() {
    let filtered = appNotes;

    // Apply global live search
    if (globalSearchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(globalSearchQuery) ||
        n.content.toLowerCase().includes(globalSearchQuery)
      );
    }

    // Sort: newest notes at top
    filtered.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (filtered.length === 0) {
      workspaceNotesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg class="empty-illustration" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
          </svg>
          <p class="empty-title">No sticky notes found</p>
          <p class="empty-desc">Create one, jot down high school parameters, and let auto-save handle the rest!</p>
        </div>
      `;
      return;
    }

    workspaceNotesGrid.innerHTML = filtered.map(note => createNoteCardHtml(note)).join('');

    // Attach Dynamic Actions to Note Cards
    attachNoteEvents();
  }

  function createNoteCardHtml(note) {
    const activeColor = NOTE_PASTEL_COLORS.find(c => c.name === note.color || c.hex === note.color) || NOTE_PASTEL_COLORS[0];
    const cardColorVar = activeColor.var;

    // Build color options circles
    const colorOptionsHtml = NOTE_PASTEL_COLORS.map(c => `
      <button class="color-option-btn" data-color="${c.name}" style="background-color: ${c.var};" title="Pastel ${c.name}"></button>
    `).join('');

    const formattedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="note-item-card" id="note-card-${note.id}" data-id="${note.id}" style="background-color: ${cardColorVar};">
        <span class="note-auto-save-indicator" id="save-indicator-${note.id}">Saving...</span>
        
        <!-- Editable title -->
        <input class="note-card-title-input" id="note-title-${note.id}" data-id="${note.id}" type="text" value="${escapeHtml(note.title)}" placeholder="Untitled Note" autocomplete="off">
        
        <!-- Editable body content -->
        <textarea class="note-card-body-textarea" id="note-content-${note.id}" data-id="${note.id}" placeholder="Jot something down (auto-saves)...">${escapeHtml(note.content)}</textarea>
        
        <div class="note-card-footer">
          <span class="note-card-date">${formattedDate}</span>
          <div class="note-card-actions">
            
            <!-- Color picker widget -->
            <div class="note-color-picker-container">
              <button class="note-color-trigger-btn color-trigger" data-id="${note.id}" aria-label="Choose Note Color">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              </button>
              
              <div class="note-color-palette-popover" id="color-popover-${note.id}">
                ${colorOptionsHtml}
              </div>
            </div>

            <!-- Delete note -->
            <button class="task-action-btn delete delete-note-btn" data-id="${note.id}" aria-label="Delete Note">
              ${icons.trash}
            </button>

          </div>
        </div>
      </div>
    `;
  }

  function attachNoteEvents() {
    const cards = workspaceNotesGrid.querySelectorAll('.note-item-card');

    cards.forEach(card => {
      const noteId = card.getAttribute('data-id');
      const titleInput = card.querySelector('.note-card-title-input');
      const contentTextarea = card.querySelector('.note-card-body-textarea');
      const colorTrigger = card.querySelector('.color-trigger');
      const popover = card.querySelector('.note-color-palette-popover');
      const deleteBtn = card.querySelector('.delete-note-btn');

      // 1. Real-time resize of body textareas
      const resizeTextarea = () => {
        contentTextarea.style.height = 'auto';
        contentTextarea.style.height = `${contentTextarea.scrollHeight}px`;
      };
      contentTextarea.addEventListener('input', resizeTextarea);
      resizeTextarea(); // trigger initial layout heights

      // 2. Debounced auto-save triggers on keystroke inputs
      const triggerAutoSave = () => {
        const indicator = document.getElementById(`save-indicator-${noteId}`);
        indicator.textContent = 'Saving...';
        indicator.classList.add('visible');

        // Cancel previous pending save action
        if (noteSaveDebounceTimeouts[noteId]) {
          clearTimeout(noteSaveDebounceTimeouts[noteId]);
        }

        // Delay writing notes to backend by 1.2s of idle typing
        noteSaveDebounceTimeouts[noteId] = setTimeout(async () => {
          const tVal = titleInput.value.trim();
          const cVal = contentTextarea.value;
          
          try {
            const res = await apiFetch(`/api/notes/${noteId}`, {
              method: 'PUT',
              body: JSON.stringify({ title: tVal, content: cVal })
            });

            if (res.success) {
              // Update local state record
              const noteIdx = appNotes.findIndex(n => n.id === noteId);
              appNotes[noteIdx] = res.note;
              
              indicator.textContent = 'Auto-saved!';
              updateWorkspaceMetrics();
              
              // Hide saved banner shortly after success
              setTimeout(() => {
                indicator.classList.remove('visible');
              }, 1000);
            }
          } catch (err) {
            indicator.textContent = 'Save failed!';
            showToast('Note auto-save failed.', 'error');
          }
        }, 1200);
      };

      titleInput.addEventListener('input', triggerAutoSave);
      contentTextarea.addEventListener('input', triggerAutoSave);

      // 3. Color Picker Popover triggers
      colorTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close other open popovers first
        document.querySelectorAll('.note-color-palette-popover').forEach(p => {
          if (p !== popover) p.classList.remove('active');
        });
        
        popover.classList.toggle('active');
      });

      // 4. Color Option button clicks
      popover.querySelectorAll('.color-option-btn').forEach(opt => {
        opt.addEventListener('click', async (e) => {
          e.stopPropagation();
          popover.classList.remove('active');

          const chosenColor = opt.getAttribute('data-color');
          
          try {
            const res = await apiFetch(`/api/notes/${noteId}`, {
              method: 'PUT',
              body: JSON.stringify({ color: chosenColor })
            });

            if (res.success) {
              const noteIdx = appNotes.findIndex(n => n.id === noteId);
              appNotes[noteIdx] = res.note;
              
              // Apply dynamic color style variables instantly
              const colorVar = getPastelVarHex(chosenColor);
              card.style.backgroundColor = colorVar;
              showToast('Note theme updated.', 'success');
              updateWorkspaceMetrics();
            }
          } catch (err) {
            showToast('Failed to modify note theme.', 'error');
          }
        });
      });

      // 5. Note deletion hook
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmModal('Delete Note', 'Are you sure you want to permanently delete this sticky note?', async () => {
          try {
            const res = await apiFetch(`/api/notes/${noteId}`, {
              method: 'DELETE'
            });

            if (res.success) {
              appNotes = appNotes.filter(n => n.id !== noteId);
              showToast('Note deleted successfully!', 'success');
              updateWorkspaceMetrics();
              renderNotes();
            }
          } catch (err) {
            showToast('Could not complete note deletion.', 'error');
          }
        });
      });
    });

    // Close any color picker popovers when user clicks anywhere on document body
    document.addEventListener('click', () => {
      document.querySelectorAll('.note-color-palette-popover').forEach(p => p.classList.remove('active'));
    });
  }

  // Create empty new note item directly in backend API
  addNewNoteBtn.addEventListener('click', async () => {
    // Show spinner/disable button
    addNewNoteBtn.disabled = true;
    const text = addNewNoteBtn.innerHTML;
    addNewNoteBtn.innerHTML = 'Creating Note...';

    try {
      const res = await apiFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title: '', content: '', color: 'yellow' })
      });

      if (res.success) {
        appNotes.unshift(res.note); // place at top of list
        showToast('Created new note! Double-click to edit.', 'success');
        updateWorkspaceMetrics();
        renderNotes();

        // Focus title input on new card instantly
        setTimeout(() => {
          const firstTitle = document.getElementById(`note-title-${res.note.id}`);
          if (firstTitle) {
            firstTitle.focus();
          }
        }, 100);
      }
    } catch (err) {
      showToast('Could not save new note.', 'error');
    } finally {
      addNewNoteBtn.disabled = false;
      addNewNoteBtn.innerHTML = text;
    }
  });

  // ====================================================================
  // START INVOCATION & DATA SYNC
  // ====================================================================
  
  // Trigger initial database fetch routines
  fetchAllWorkspaceData().then(() => {
    const voiceAPI = {
      getTasks: () => appTasks,
      openAddTaskModal: (title) => {
        openTaskModal(null);
        if (title) {
          // Prefill the title input shortly after modal opens
          setTimeout(() => {
            try {
              taskFormTitle.value = title;
              taskFormTitle.focus();
            } catch (e) {
              // ignore if elements not available
            }
          }, 140);
        }
      },
      showPendingTasks: () => {
        currentTaskFilter = 'pending';
        renderTasks();
        switchSection('tasks-section');
      },
      switchSection,
      markTaskCompleteByTitle: async (title) => {
        if (!title) return null;
        const candidate = appTasks.find(t => !t.completed && t.title && t.title.toLowerCase().includes((title || '').toLowerCase()));
        if (candidate) {
          await toggleTaskCompletionStatus(candidate.id);
          return candidate;
        }
        return null;
      },
      getNextPriorityTask: () => {
        const pending = appTasks.filter(t => !t.completed);
        if (!pending.length) return null;
        pending.sort((a,b) => {
          if (a.priority === 'High' && b.priority !== 'High') return -1;
          if (a.priority !== 'High' && b.priority === 'High') return 1;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        return pending[0];
      },
      readTodaysTasks: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        return appTasks.filter(t => !t.completed && t.dueDate && (t.dueDate.split('T')[0] === todayStr || t.dueDate === todayStr));
      },
      showToast
    };

    // Initialize legacy voice assistant (optional, for compatibility)
    if (window.initializeVoiceAssistant) {
      try {
        window.initializeVoiceAssistant(voiceAPI);
      } catch (err) {
        console.error('Voice Assistant initialization failed:', err);
      }
    }

    // Initialize new AI voice assistant (Nexa)
    if (window.initializeVoiceAssistantAI) {
      try {
        window.initializeVoiceAssistantAI(voiceAPI);
        console.log('✅ Nexa AI Voice Assistant initialized successfully');
      } catch (err) {
        console.error('❌ Nexa AI Voice Assistant initialization failed:', err);
      }
    }
  });
});
