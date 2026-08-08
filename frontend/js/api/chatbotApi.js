import { apiClient } from './client.js';

export const chatbotApi = {
  sendMessage(message, history = [], latitude = 19.0760, longitude = 72.8777) {
    return apiClient.post('/ai/chatbot', {
      message,
      history,
      latitude,
      longitude
    });
  },
  getPresets() {
    return apiClient.get('/ai/chatbot/presets');
  }
};
