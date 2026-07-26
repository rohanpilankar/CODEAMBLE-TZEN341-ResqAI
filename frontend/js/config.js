// ── ResQAI Centralized Configuration ─────────────────────────────────────────
export const CONFIG = {
  APP_NAME: 'ResQAI',
  APP_TAGLINE: 'Smart Disaster Response Platform',

  // API
  API_BASE_URL: 'http://localhost:8000/api/v1',
  API_TIMEOUT: 15000,
  API_RETRY_ATTEMPTS: 2,

  // WebSocket
  WS_BASE_URL: 'ws://localhost:8000/ws',
  WS_RECONNECT_DELAY: 3000,

  // Map Defaults (Mumbai, India)
  MAP: {
    DEFAULT_LAT: 19.0760,
    DEFAULT_LNG: 72.8777,
    DEFAULT_ZOOM: 11,
    TILE_URL: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },

  // Session
  ACCESS_TOKEN_KEY: 'resqai_access_token',
  REFRESH_TOKEN_KEY: 'resqai_refresh_token',
  USER_KEY: 'resqai_user',

  // Pagination
  DEFAULT_PAGE_SIZE: 20,

  // Roles (matches backend Role names exactly)
  ROLES: {
    CITIZEN: 'Citizen',
    RESCUE:  'Rescue Team',
    GOVT:    'Government Authority',
    ADMIN:   'Admin',
  },

  // Severity colours (for dynamic styling)
  SEVERITY_COLORS: {
    CRITICAL: '#ff0038',
    HIGH:     '#ff6b00',
    MEDIUM:   '#f59e0b',
    LOW:      '#10b981',
  },

  // Disaster type options for forms
  DISASTER_TYPES: [
    'Flood', 'Earthquake', 'Fire', 'Hurricane', 'Landslide',
    'Gas Leak', 'Power Outage', 'Building Collapse', 'Road Accident', 'Other',
  ],
};
