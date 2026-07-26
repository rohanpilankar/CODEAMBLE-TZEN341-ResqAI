import { CONFIG } from './config.js';
import { storageService } from './services/storageService.js';
import { notificationService } from './services/notificationService.js';

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
  }

  connect() {
    const user = storageService.getUser();
    const clientId = user ? `user_${user.id}` : `anon_${Math.random().toString(36).substr(2, 9)}`;
    const url = `${CONFIG.WS_BASE_URL}/${clientId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket Connected:', clientId);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleMessage(payload);
        } catch (e) {
          console.error('WebSocket payload error:', e);
        }
      };

      this.ws.onclose = () => {
        console.warn('WebSocket connection closed. Reconnecting...');
        this.reconnectTimer = setTimeout(() => this.connect(), CONFIG.WS_RECONNECT_DELAY);
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    } catch (e) {
      console.error('WebSocket init error:', e);
    }
  }

  handleMessage(payload) {
    const { event_type, data, target_user_id } = payload;
    const currentUser = storageService.getUser();

    if (target_user_id && currentUser && currentUser.id !== target_user_id) {
      return; // Ignore personal message meant for another user
    }

    // Trigger registered callback listeners
    if (this.listeners.has(event_type)) {
      this.listeners.get(event_type).forEach((callback) => callback(data));
    }
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach((callback) => callback(payload));
    }

    // Default Toast alert notifications
    if (event_type === 'INCIDENT_CREATED') {
      notificationService.warning('New Emergency Reported!', `${data.title} (${data.severity})`, 6000);
    } else if (event_type === 'INCIDENT_UPDATED') {
      notificationService.info('Incident Updated', `Incident #${data.id} status changed to ${data.status}`);
    } else if (event_type === 'RESOURCE_ASSIGNED') {
      notificationService.success('Resource Dispatched', `Rescue team/resources assigned to incident #${data.incident_id}`);
    } else if (event_type === 'SHELTER_UPDATED') {
      notificationService.info('Shelter Update', `Shelter ${data.name} occupancy updated to ${data.current_occupancy}`);
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const filtered = this.listeners.get(eventType).filter((cb) => cb !== callback);
      this.listeners.set(eventType, filtered);
    }
  }
}

export const wsClient = new WebSocketClient();
