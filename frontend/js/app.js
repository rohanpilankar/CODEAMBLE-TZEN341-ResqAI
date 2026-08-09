import { storageService } from './services/storageService.js';
import { themeService } from './services/themeService.js';
import { dashboardManager } from './dashboard.js';

let firebaseService = null;

// Initialize the application after the DOM is ready
async function initApp() {
  // Apply saved theme and bind theme-toggle buttons on every app page
  try { themeService.init(); } catch (e) { console.warn('Theme service init skipped:', e.message); }

  // Load Firebase (optional) WITHOUT blocking the dashboard from rendering:
  // a slow/unreachable CDN (https://www.gstatic.com) must not hold the spinner.
  import('./services/firebaseService.js')
    .then((mod) => {
      firebaseService = mod.firebaseService;
      try { firebaseService?.init(); } catch (e) { console.warn('Firebase init skipped:', e.message); }
    })
    .catch((e) => console.warn('Firebase unavailable, continuing without it:', e.message));

  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  if (path.endsWith('login.html')) {
    // Only auto-redirect if autologin parameter is set
    if (params.get('autologin') === 'true' && storageService.isLoggedIn()) {
      window.location.href = 'dashboard.html';
    }
  } else if (document.getElementById('app-root') || path.includes('dashboard')) {
    // Guard: ensure a logged‑in session exists before loading the dashboard
    if (!storageService.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    dashboardManager.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
