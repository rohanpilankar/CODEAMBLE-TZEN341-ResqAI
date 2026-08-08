import { apiClient } from './client.js';

export const publicApi = {
  getNews: () => apiClient.get('/public/news'),
  getEmergencyContacts: () => apiClient.get('/public/emergency-contacts'),
  submitContact: (data) => apiClient.post('/public/contact', data),
  getShelters: (isActive = true) => apiClient.get(`/shelters${isActive ? '?is_active=true' : ''}`),
};
