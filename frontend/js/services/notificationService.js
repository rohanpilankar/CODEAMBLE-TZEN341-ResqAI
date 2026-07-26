// ── Notification Service (Toasts) ─────────────────────────────────────────────
let container = null;

function ensureContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  }
}

function show(type, title, message, duration = 4000) {
  ensureContainer();

  const icons = {
    success: 'fa-check-circle',
    error:   'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info:    'fa-info-circle',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa ${icons[type] || icons.info}"></i></div>
    <div>
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

export const notificationService = {
  success: (title, msg, dur) => show('success', title, msg, dur),
  error:   (title, msg, dur) => show('error',   title, msg, dur),
  warning: (title, msg, dur) => show('warning', title, msg, dur),
  info:    (title, msg, dur) => show('info',    title, msg, dur),
};
