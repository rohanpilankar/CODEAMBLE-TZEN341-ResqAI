import { storageService } from '../services/storageService.js';

export function renderNavbar(user, title = 'Dashboard') {
  return `
    <header class="topbar">
      <div class="d-flex align-items-center gap-3">
        <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Toggle Sidebar">
          <i class="fa fa-bars"></i>
        </button>
        <div class="topbar-title">${title}</div>
      </div>

      <div class="topbar-actions">
        <button class="topbar-icon-btn" id="btn-notifications" title="Notifications">
          <i class="fa fa-bell"></i>
          <span class="notification-dot" id="notif-dot" style="display: none;"></span>
        </button>

        <div class="d-flex align-items-center gap-2">
          <div class="user-avatar-sm" style="width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary-light)); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white;">
            ${user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span class="d-none d-md-inline font-weight-600" style="font-size: 0.9rem;">${user?.full_name || 'User'}</span>
        </div>
      </div>
    </header>
  `;
}
