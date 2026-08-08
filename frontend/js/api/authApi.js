import { apiClient } from './client.js';

export const authApi = {
  login(email, password) {
    return apiClient.post('/auth/login', { email, password });
  },
  register(email, password, full_name, phone_number, role = 'Citizen') {
    return apiClient.post('/auth/register', { email, password, full_name, phone_number, role });
  },
  refreshToken(refreshToken) {
    return apiClient.post('/auth/refresh', { refresh_token: refreshToken });
  },
  getCurrentUser() {
    return apiClient.get('/auth/me');
  },
  forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email });
  },
  resetPassword(token, new_password) {
    return apiClient.post('/auth/reset-password', { token, new_password });
  },
};

