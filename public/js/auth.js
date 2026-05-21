/**
 * Student Task & Notes Manager - Authentication Controller Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Password Visibility Toggler
  const togglePasswordBtns = document.querySelectorAll('.btn-toggle-password');
  togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height: 18px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
        `;
      } else {
        input.type = 'password';
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height: 18px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        `;
      }
    });
  });

  // 2. Signup Form Submission
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value.trim();
      const submitBtn = signupForm.querySelector('.btn-submit');

      // Validation check
      if (!name || !email || !password) {
        showToast('Please fill out all fields.', 'warning');
        return;
      }

      if (name.length < 2) {
        showToast('Name must be at least 2 characters long.', 'warning');
        return;
      }

      if (password.length < 6) {
        showToast('Password must be at least 6 characters long.', 'warning');
        return;
      }

      // Show loader on button
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      try {
        const responseData = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password })
        });

        showToast(responseData.message || 'Account registered successfully!', 'success');
        
        // Clear fields and redirect
        signupForm.reset();
        setTimeout(() => {
          window.location.href = '/pages/login.html';
        }, 1500);

      } catch (error) {
        showToast(error.message || 'Registration failed. Try again!', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // 3. Login Form Submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      const submitBtn = loginForm.querySelector('.btn-submit');

      if (!email || !password) {
        showToast('Please enter both email and password.', 'warning');
        return;
      }

      // Show loader on button
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging In...';

      try {
        const responseData = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        // Store Token & User Info
        localStorage.setItem('student_app_token', responseData.token);
        localStorage.setItem('student_app_user', JSON.stringify(responseData.user));

        showToast('Welcome back! Logging in...', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/pages/dashboard.html';
        }, 1000);

      } catch (error) {
        showToast(error.message || 'Invalid email or password!', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
});
