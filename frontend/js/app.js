import { storageService } from './services/storageService.js';
import { authHandler } from './auth.js';
import { dashboardManager } from './dashboard.js';
import { firebaseService } from './services/firebaseService.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase Firestore & Realtime Database
  firebaseService.init();

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
