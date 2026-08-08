import { apiClient } from './client.js';

export const userApi = {
  getUsers(params = {}) {
    return apiClient.get('/users', { params });
  },
  getUserById(id) {
    return apiClient.get(`/users/${id}`);
  },
  updateUser(id, data) {
    return apiClient.put(`/users/${id}`, data);
  },
  triggerSOS(data = {}) {
    return apiClient.post('/users/sos', data);
  },
  getFamilySafe() {
    return apiClient.get('/users/family-safe');
  },
  updateFamilySafe(data) {
    return apiClient.post('/users/family-safe', data);
  },
  updateLocation(data) {
    return apiClient.post('/users/location', data);
  },
  getLatestLocation() {
    return apiClient.get('/users/location');
  },
};


