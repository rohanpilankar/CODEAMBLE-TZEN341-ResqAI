// ── Theme Service ────────────────────────────────────────────────────────────
export const themeService = {
  THEME_KEY: 'resq_app_theme',
  _isBound: false,

  init() {
    const savedTheme = localStorage.getItem(this.THEME_KEY) || 'dark';
    this.setTheme(savedTheme, false);
    this.bindToggleButtons();
    this.syncFromBackend();
  },

  setTheme(theme, syncBackend = true) {
    const isLight = theme === 'light';
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);

    if (isLight) {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');

      root.style.setProperty('--bg-base', '#f1f5f9', 'important');
      root.style.setProperty('--bg-surface', '#ffffff', 'important');
      root.style.setProperty('--bg-dark', '#f8fafc', 'important');
      root.style.setProperty('--bg-card', '#ffffff', 'important');
      root.style.setProperty('--glass-border', '#cbd5e1', 'important');
      root.style.setProperty('--text-primary', '#0f172a', 'important');
      root.style.setProperty('--text-secondary', '#334155', 'important');
      root.style.setProperty('--text-muted', '#64748b', 'important');
    } else {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');

      root.style.removeProperty('--bg-base');
      root.style.removeProperty('--bg-surface');
      root.style.removeProperty('--bg-dark');
      root.style.removeProperty('--bg-card');
      root.style.removeProperty('--glass-border');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--text-muted');
    }

    localStorage.setItem(this.THEME_KEY, theme);

    if (syncBackend) {
      this.saveToBackend(theme);
    }
  },

  toggle() {
    const current = localStorage.getItem(this.THEME_KEY) || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next, true);
  },

  bindToggleButtons() {
    if (this._isBound) return;
    this._isBound = true;

    // Global document event delegation for dynamic elements
    document.addEventListener('click', (evt) => {
      const toggleBtn = evt.target.closest('[data-theme-toggle], .theme-toggle-btn');
      if (toggleBtn) {
        evt.preventDefault();
        evt.stopPropagation();
        this.toggle();
      }
    });
  },

  async saveToBackend(theme) {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) return;

    try {
      await fetch('/api/v1/users/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme })
      });
    } catch (e) {
      console.warn('Theme backend sync failed:', e);
    }
  },

  async syncFromBackend() {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch('/api/v1/users/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data?.success && data?.data?.theme) {
        this.setTheme(data.data.theme, false);
      }
    } catch (e) {
      console.warn('Theme backend fetch failed:', e);
    }
  }
};

if (typeof window !== 'undefined') {
  window.themeService = themeService;
  window.toggleTheme = () => themeService.toggle();
  // Bind the toggle listener eagerly so it works on every page, even before init()
  themeService.bindToggleButtons();
  // Apply saved theme as soon as the module loads (DOM not required for attribs)
  try { themeService.setTheme(localStorage.getItem(themeService.THEME_KEY) || 'dark', false); } catch (e) {}
}
