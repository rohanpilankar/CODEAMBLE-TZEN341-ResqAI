// ── Enterprise Theme Controller ───────────────────────────────────────────────
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
    const validTheme = theme === 'light' ? 'light' : 'dark';
    
    // Enterprise Zero-DOM-Traversal rule: set data-theme attribute on root element only
    document.documentElement.setAttribute('data-theme', validTheme);
    document.body.setAttribute('data-theme', validTheme);
    localStorage.setItem(this.THEME_KEY, validTheme);

    if (syncBackend) {
      this.saveToBackend(validTheme);
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
  themeService.bindToggleButtons();
  try {
    const initialTheme = localStorage.getItem(themeService.THEME_KEY) || 'dark';
    themeService.setTheme(initialTheme, false);
  } catch (e) {}
}
