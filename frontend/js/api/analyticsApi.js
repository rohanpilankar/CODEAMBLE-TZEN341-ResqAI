import { apiClient } from './client.js';

export const analyticsApi = {
  getOverview() {
    return apiClient.get('/analytics/overview');
  },
};
