import { apiClient } from './client.js';

export const resourceApi = {
  getResources(params = {}) {
    return apiClient.get('/resources', { params });
  },
  createResource(data) {
    return apiClient.post('/resources', data);
  },
  updateResource(id, data) {
    return apiClient.put(`/resources/${id}`, data);
  },
  getRescueTeams() {
    return apiClient.get('/resources/teams');
  },
  assignResource(data) {
    return apiClient.post('/resources/assign', data);
  },
};
