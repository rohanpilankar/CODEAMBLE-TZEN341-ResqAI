import { apiClient } from './client.js';

export const shelterApi = {
  getShelters(is_active = true) {
    return apiClient.get('/shelters', { params: { is_active } });
  },
  getShelterById(id) {
    return apiClient.get(`/shelters/${id}`);
  },
  createShelter(data) {
    return apiClient.post('/shelters', data);
  },
  updateShelter(id, data) {
    return apiClient.put(`/shelters/${id}`, data);
  },
  getOccupancy() {
    return apiClient.get('/shelters/occupancy');
  },
};

