import { apiClient } from './client.js';

export const notificationApi = {
  getNotifications() {
    return apiClient.get('/notifications');
  },
  createNotification(data) {
    return apiClient.post('/notifications', data);
  },
  markAsRead(id) {
    return apiClient.put(`/notifications/${id}/read`);
  },
  getSystemLogs() {
    return apiClient.get('/notifications/system-logs');
  },
  broadcastAlert(data) {
    return apiClient.post('/notifications/broadcast', data);
  },
};

