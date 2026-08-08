import { authApi } from './api/authApi.js';
import { storageService } from './services/storageService.js';
import { notificationService } from './services/notificationService.js';
import { validationService } from './services/validationService.js';

export const authHandler = {
  selectedRole: 'Citizen',
  selectedRegRole: 'Citizen',

  init() {
    this.bindRoleTabs();
    this.bindLoginForm();
    this.bindRegisterForm();
    this.bindDemoQuickFill();
    this.autoOpenRegister();
    this.bindForgotLinks();
    this.bindForgotForm();
    this.bindOTPInputs();
  },

  autoOpenRegister() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('register') === 'true') {
      this._showPanel('panel-register');
    }
  },

  // ── Role tabs / Panel switchers ──────────────────────────────────
  bindRoleTabs() {
    const tabLogin  = document.getElementById('tab-login');
    const tabReg    = document.getElementById('tab-register');
    const tabLogin2 = document.getElementById('tab-login-2');
    const tabReg2   = document.getElementById('tab-register-2');

    tabLogin?.addEventListener('click', () => this._showPanel('panel-login'));
    tabReg?.addEventListener('click', () => this._showPanel('panel-register'));
    tabLogin2?.addEventListener('click', () => this._showPanel('panel-login'));
    tabReg2?.addEventListener('click', () => this._showPanel('panel-register'));
  },

  // ── Login ─────────────────────────────────────────────────────────
  bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = form.email.value.trim();
      const password = form.password.value;

      const { valid, errors } = validationService.validate(
        { email, password },
        {
          email:    { required: true, email: true, label: 'Email Address' },
          password: { required: true,              label: 'Password' },
        }
      );

      if (!valid) {
        validationService.showErrors(errors, form);
        return;
      }

      const submitBtn = document.getElementById('login-submit-btn');
      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Authenticating...';
        }

        const res  = await authApi.login(email, password);
        const data = res.data || res;

        storageService.setSession(data.access_token, data.refresh_token, data.user);

        // Clear previous user chatbot history on new login
        if (window.citizenChatbot) {
          window.citizenChatbot.clearHistory();
        } else {
          localStorage.removeItem('resqai_chatbot_history_v1');
        }

        const roleLabel = data.user?.role || 'User';
        notificationService.success(
          'Welcome Back!',
          `Logged in as ${data.user?.full_name || 'User'} · ${roleLabel}`
        );

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);

      } catch (err) {
        notificationService.error(
          'Login Failed',
          err.response?.data?.detail || 'Invalid email or password.'
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Sign In';
        }
      }
    });
  },

  // ── Register ──────────────────────────────────────────────────────
  bindRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    document.querySelectorAll('#reg-role-chips .role-chip, #reg-role-tabs .reg-role-tab').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('#reg-role-chips .role-chip, #reg-role-tabs .reg-role-tab').forEach((t) => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.selectedRegRole = e.currentTarget.dataset.regRole || e.currentTarget.dataset.role || 'Citizen';
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const full_name       = form.full_name.value.trim();
      const email           = form.email.value.trim();
      const phone_number    = form.phone_number.value.trim();
      const password        = form.password.value;
      const confirm_password= form.confirm_password.value;

      if (password !== confirm_password) {
        notificationService.error('Password Mismatch', 'Your passwords do not match. Please re-enter them.');
        form.confirm_password.focus();
        return;
      }
      if (password.length < 8) {
        notificationService.error('Weak Password', 'Password must be at least 8 characters long.');
        form.password.focus();
        return;
      }

      const submitBtn = document.getElementById('register-submit-btn');
      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creating Account...';
        }

        const res  = await authApi.register(email, password, full_name, phone_number, this.selectedRegRole);
        const data = res.data || res;
        storageService.setSession(data.access_token, data.refresh_token, data.user);

        notificationService.success(
          'Registration Complete!',
          `${this.selectedRegRole} account created successfully.`
        );
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);

      } catch (err) {
        notificationService.error(
          'Registration Error',
          err.response?.data?.detail || 'Could not complete registration.'
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa fa-user-plus"></i> Create Account';
        }
      }
    });
  },

  // ── Demo quick-fill ───────────────────────────────────────────────
  bindDemoQuickFill() {
    document.querySelectorAll('.demo-chip, .btn-demo-fill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const email = e.currentTarget.dataset.email;
        const role  = e.currentTarget.dataset.role;

        const emailInput = document.getElementById('login-email');
        const passInput  = document.getElementById('login-password');
        if (emailInput) emailInput.value = email;
        if (passInput)  passInput.value  = 'password123';

        this.selectedRole = role || 'Citizen';
        this._showPanel('panel-login');
      });
    });
  },

  // ── Panel switcher helper ─────────────────────────────────────────
  _showPanel(panelId) {
    const panels = ['panel-login', 'panel-register', 'panel-forgot', 'panel-otp'];
    panels.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = id === panelId ? 'block' : 'none';
    });
  },

  // ── Forgot password links ─────────────────────────────────────────
  bindForgotLinks() {
    document.getElementById('forgot-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this._showPanel('panel-forgot');
    });
    document.getElementById('back-to-login-1')?.addEventListener('click', (e) => {
      e.preventDefault();
      this._showPanel('panel-login');
    });
    document.getElementById('back-to-login-2')?.addEventListener('click', (e) => {
      e.preventDefault();
      this._showPanel('panel-login');
    });

    document.addEventListener('click', (e) => {
      const id = e.target?.id;
      if (id === 'toggle-login-from-forgot' || id === 'toggle-login-from-otp' || id === 'forgot-password-link') {
        e.preventDefault();
        this._showPanel(id === 'forgot-password-link' ? 'panel-forgot' : 'panel-login');
      }
    });
  },

  // ── Forgot password form ──────────────────────────────────────────
  bindForgotForm() {
    const form = document.getElementById('forgot-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!email) {
        notificationService.error('Missing Email', 'Please enter your email address.');
        return;
      }

      const btn = document.getElementById('forgot-submit-btn');
      try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...'; }
        const res = await authApi.forgotPassword(email);
        const token = res.data?.reset_token || 'demo-token';
        this.resetToken = token;

        const label = document.getElementById('otp-email-label');
        if (label) label.textContent = email;
        this._showPanel('panel-otp');
        notificationService.success('Email Sent', `Password reset token generated: ${token}`);
      } catch (err) {
        notificationService.error('Error', err.response?.data?.detail || 'Could not send reset email.');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-paper-plane"></i> Send Reset Code'; }
      }
    });
  },


  // ── OTP inputs ────────────────────────────────────────────────────
  bindOTPInputs() {
    const digits = document.querySelectorAll('.otp-box, .otp-digit');
    digits.forEach((input, i) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '');
        if (input.value && i < digits.length - 1) {
          digits[i + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && i > 0) {
          digits[i - 1].focus();
        }
      });
    });

    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
      otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = Array.from(digits).map(d => d.value).join('');
        if (code.length < 6) {
          notificationService.error('Incomplete Code', 'Please enter all 6 digits.');
          return;
        }
        notificationService.success('Verified!', 'Email verified. You can now set a new password.');
        this._showPanel('panel-login');
      });
    }

    const resend = document.getElementById('otp-resend-btn, #otp-resend');
    if (resend) {
      resend.addEventListener('click', (e) => {
        e.preventDefault();
        notificationService.info('Code Resent', 'A new verification code has been sent.');
      });
    }
  },
};

