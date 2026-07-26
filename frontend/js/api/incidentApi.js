import { apiClient } from './client.js';

export const incidentApi = {
  getIncidents(params = {}) {
    return apiClient.get('/incidents', { params });
  },
  getIncidentById(id) {
    return apiClient.get(`/incidents/${id}`);
  },
  createIncident(data) {
    return apiClient.post('/incidents', data);
  },
  updateIncident(id, data) {
    return apiClient.put(`/incidents/${id}`, data);
  },
  deleteIncident(id) {
    return apiClient.delete(`/incidents/${id}`);
  },
  uploadImage(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/incidents/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
