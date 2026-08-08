import { CONFIG } from '../config.js';
import { storageService } from '../services/storageService.js';
import { notificationService } from '../services/notificationService.js';

// ── Queue for 401 token refresh ───────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ── Lazy axios client factory ─────────────────────────────────────────────────
// axios is loaded via CDN <script> tag — we defer instantiation to first use
// so the module can be imported before the CDN script finishes executing.
let _client = null;

function buildClient() {
  if (typeof axios === 'undefined') {
    throw new Error(
      'Axios is not available. Please check your internet connection so the CDN script can load.'
    );
  }

  const instance = axios.create({
    baseURL: CONFIG.API_BASE_URL,
    timeout: CONFIG.API_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
  });

  // ── Request: attach JWT ───────────────────────────────────────────────────
  instance.interceptors.request.use(
    (config) => {
      const token = storageService.getAccessToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;

      // Let the browser generate the correct multipart boundary for file uploads:
      // a default application/json Content-Type would corrupt FormData requests.
      const isFormData =
        config.data instanceof FormData ||
        Object.prototype.toString.call(config.data) === '[object FormData]';
      if (isFormData && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ── Response: unwrap data, handle 401 token refresh ──────────────────────
  instance.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = storageService.getRefreshToken();
        if (!refreshToken) {
          storageService.clearSession();
          if (!window.location.pathname.endsWith('login.html') &&
              !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'login.html';
          }
          isRefreshing = false;
          return Promise.reject(error);
        }

        try {
          const res = await axios.post(`${CONFIG.API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: new_refresh_token, user } = res.data;
          storageService.setSession(access_token, new_refresh_token, user);
          instance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          processQueue(null, access_token);
          return instance(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          storageService.clearSession();
          if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      const errorMsg =
        error.response?.data?.detail || error.message || 'An unexpected network error occurred.';
      notificationService.error('API Error', errorMsg);
      return Promise.reject(error);
    }
  );

  return instance;
}

// ── Proxy: transparent pass-through that defers client creation to first call ─
export const apiClient = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_client) _client = buildClient();
      const value = _client[prop];
      return typeof value === 'function' ? value.bind(_client) : value;
    },
    set(_, prop, value) {
      if (!_client) _client = buildClient();
      _client[prop] = value;
      return true;
    },
  }
);
