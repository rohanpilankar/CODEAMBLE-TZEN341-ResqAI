import { storageService } from './services/storageService.js';
import { authHandler } from './auth.js';
import { dashboardManager } from './dashboard.js';

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.endsWith('login.html')) {
    if (storageService.isLoggedIn()) {
      window.location.href = 'dashboard.html';
      return;
    }
    authHandler.init();
  } else if (path.endsWith('dashboard.html')) {
    if (!storageService.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    dashboardManager.init();
  }
});
