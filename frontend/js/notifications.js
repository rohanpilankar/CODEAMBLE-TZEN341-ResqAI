import { notificationApi } from './api/notificationApi.js';
import { formatDate } from './utils/date.js';

export const notificationHandler = {
  async renderNotificationList(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    try {
      const notifs = await notificationApi.getNotifications();

      if (!notifs || notifs.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fa fa-bell-slash empty-icon"></i><h3>No Unread Notifications</h3></div>';
        return;
      }

      const items = notifs.map(n => `
        <div class="card mb-2 ${n.is_read ? 'opacity-75' : ''}" style="padding: 14px 18px;">
          <div class="d-flex justify-content-between align-items-start">
            <h5 style="font-size: 0.92rem; margin: 0;">${n.title}</h5>
            <span style="font-size: 0.72rem; color: var(--text-muted);">${formatDate(n.created_at)}</span>
          </div>
          <p style="font-size: 0.82rem; margin: 4px 0 0; color: var(--text-secondary);">${n.message}</p>
        </div>
      `).join('');

      el.innerHTML = items;
    } catch (err) {
      el.innerHTML = `<div class="text-danger font-size-sm">Could not load notifications.</div>`;
    }
  }
};
