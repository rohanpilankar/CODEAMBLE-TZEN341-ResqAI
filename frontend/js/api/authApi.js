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
};
