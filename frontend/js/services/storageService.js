// ── Storage Service ───────────────────────────────────────────────────────────
import { CONFIG } from '../config.js';

export const storageService = {
  getAccessToken() {
    return localStorage.getItem(CONFIG.ACCESS_TOKEN_KEY);
  },
  getRefreshToken() {
    return localStorage.getItem(CONFIG.REFRESH_TOKEN_KEY);
  },
  getUser() {
    const raw = localStorage.getItem(CONFIG.USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  setSession(accessToken, refreshToken, user) {
    localStorage.setItem(CONFIG.ACCESS_TOKEN_KEY,  accessToken);
    localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(CONFIG.ACCESS_TOKEN_KEY);
    localStorage.removeItem(CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
  },
  isLoggedIn() {
    return !!this.getAccessToken() && !!this.getUser();
  },
  getUserRole() {
    const user = this.getUser();
    if (!user) return null;
    if (typeof user.role === 'object' && user.role !== null) return user.role.name || null;
    return user.role || null;
  },
  setAccessToken(token) {
    localStorage.setItem(CONFIG.ACCESS_TOKEN_KEY, token);
  },
};
