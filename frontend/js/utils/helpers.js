import { CONFIG } from '../config.js';

function apiOrigin() {
  try {
    return new URL(CONFIG.API_BASE_URL).origin;
  } catch {
    return CONFIG.API_BASE_URL.split('/').slice(0, 3).join('/');
  }
}

export function resolveMediaUrl(url) {
  if (!url) return url;
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return apiOrigin() + url;
  }
  return url;
}

export function pickMediaUrl(inc) {
  const candidates = [];
  if (inc.media_url) candidates.push(inc.media_url);
  if (Array.isArray(inc.images)) {
    inc.images.forEach((img) => candidates.push(typeof img === 'string' ? img : (img && img.image_url)));
  }
  const real = candidates.find((c) => c && !c.startsWith('data:'));
  return real || candidates.find(Boolean) || null;
}

export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

export function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
