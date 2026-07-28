import { authApi } from './api/authApi.js';
import { storageService } from './services/storageService.js';
import { notificationService } from './services/notificationService.js';
import { validationService } from './services/validationService.js';

export const authHandler = {
  selectedRole: 'Citizen',

  init() {
    this.bindRoleTabs();
    this.bindLoginForm();
    this.bindRegisterForm();
    this.bindDemoQuickFill();
  },

  bindRoleTabs() {
    document.querySelectorAll('.role-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.role-tab').forEach((t) => t.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        this.selectedRole = target.dataset.role;

        // Auto fill demo email for convenience
        const emailInput = document.getElementById('login-email');
        if (emailInput) {
          const demoEmails = {
            Citizen: 'citizen@resqai.com',
            'Rescue Team': 'rescue@resqai.com',
            'Government Authority': 'gov@resqai.com',
            Admin: 'admin@resqai.com',
          };
          emailInput.value = demoEmails[this.selectedRole] || '';
        }
      });
    });
  },

  bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value;

      const { valid, errors } = validationService.validate(
        { email, password },
        {
          email: { required: true, email: true, label: 'Email Address' },
          password: { required: true, label: 'Password' },
        }
      );

      if (!valid) {
        validationService.showErrors(errors, form);
        return;
      }

      try {
        const submitBtn = document.getElementById('login-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Authenticating...';
        }

        const res = await authApi.login(email, password);
        const data = res.data || res;
        storageService.setSession(data.access_token, data.refresh_token, data.user);

        notificationService.success('Welcome Back!', `Logged in as ${data.user?.full_name || 'User'} (${data.user?.role || 'Citizen'})`);

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      } catch (err) {
        notificationService.error('Login Failed', err.response?.data?.detail || 'Invalid email or password.');
      } finally {
        const submitBtn = document.getElementById('login-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Sign In to Dashboard';
        }
      }
    });
  },

  bindRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const full_name = form.full_name.value.trim();
      const email = form.email.value.trim();
      const phone_number = form.phone_number.value.trim();
      const password = form.password.value;

      try {
        const submitBtn = document.getElementById('register-submit-btn');
        if (submitBtn) submitBtn.disabled = true;

        const res = await authApi.register(email, password, full_name, phone_number, 'Citizen');
        const data = res.data || res;
        storageService.setSession(data.access_token, data.refresh_token, data.user);

        notificationService.success('Registration Complete!', 'Citizen account created successfully.');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      } catch (err) {
        notificationService.error('Registration Error', err.response?.data?.detail || 'Could not complete registration.');
      } finally {
        const submitBtn = document.getElementById('register-submit-btn');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  },

  bindDemoQuickFill() {
    document.querySelectorAll('.btn-demo-fill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const email = e.currentTarget.dataset.email;
        const role = e.currentTarget.dataset.role;

        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        if (emailInput) emailInput.value = email;
        if (passInput) passInput.value = 'password123';

        // Update active tab
        document.querySelectorAll('.role-tab').forEach((t) => {
          t.classList.toggle('active', t.dataset.role === role);
        });
        this.selectedRole = role;
      });
    });
  },
};
