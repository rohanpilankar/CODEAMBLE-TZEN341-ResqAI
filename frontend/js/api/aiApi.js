import { apiClient } from './client.js';

export const aiApi = {
  analyzeIncident(data) {
    return apiClient.post('/ai/analyze-incident', data);
  },
  predictSeverity(title, description, disaster_type) {
    return apiClient.post('/ai/predict-severity', { title, description, disaster_type });
  },
  detectDuplicate(latitude, longitude) {
    return apiClient.post('/ai/detect-duplicate', { latitude, longitude });
  },
  recommendResources(severity, disaster_type) {
    return apiClient.post('/ai/recommend-resources', { severity, disaster_type });
  },
  optimizeRoute(origin_lat, origin_lng, dest_lat, dest_lng) {
    return apiClient.post('/ai/optimize-route', { origin_lat, origin_lng, dest_lat, dest_lng });
  },
};
