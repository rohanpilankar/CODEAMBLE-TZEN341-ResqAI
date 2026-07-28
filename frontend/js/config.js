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
    TILE_URL: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    PRESETS: {
      VOYAGER: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      LIGHT: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      STREETS: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    }
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
    VOLUNTEER: 'Volunteer',
    RESCUE:  'Rescue Team',
    GOVT:    'Government Authority',
    ADMIN:   'Admin',
  },

  // Dashboard auto-refresh intervals (ms)
  REFRESH_INTERVALS: {
    stats: 30000,
    aiCommand: 45000,
    priorityQueue: 20000,
    resources: 60000,
    shelters: 60000,
    citizenFeed: 15000,
    missions: 25000,
    forecast: 60000,
    weather: 120000,
    notifications: 30000,
    timeline: 45000,
    insights: 60000,
    systemStatus: 30000,
  },

  // Disaster type to icon mapping
  DISASTER_ICONS: {
    Flood:                'fa-water',
    Earthquake:           'fa-house-damage',
    Fire:                 'fa-fire',
    Hurricane:            'fa-wind',
    Cyclone:              'fa-wind',
    Landslide:            'fa-mountain',
    'Gas Leak':           'fa-skull-crossbones',
    'Power Outage':       'fa-plug',
    'Building Collapse':  'fa-building',
    'Road Accident':      'fa-car-crash',
    'Medical Emergency':  'fa-heartbeat',
    Other:                'fa-exclamation-triangle',
  },

  // Severity colours (for dynamic styling)
  SEVERITY_COLORS: {
    CRITICAL: '#ff0038',
    HIGH:     '#ff6b00',
    MEDIUM:   '#f59e0b',
    LOW:      '#10b981',
  },

  DISASTER_TYPES: [
    'Flood', 'Earthquake', 'Fire', 'Hurricane', 'Landslide',
    'Gas Leak', 'Power Outage', 'Building Collapse', 'Road Accident', 'Other',
  ],

  // Firebase Configuration
  FIREBASE: {
    apiKey: "AIzaSyDEBS6epmc8ulbT7zHu-hdMyNv2uI0qhGk",
    authDomain: "resqai-68e0d.firebaseapp.com",
    databaseURL: "https://resqai-68e0d-default-rtdb.firebaseio.com",
    projectId: "resqai-68e0d",
    storageBucket: "resqai-68e0d.firebasestorage.app",
    messagingSenderId: "1002198829104",
    appId: "1:1002198829104:web:dc3eedb3ae913b244505f5",
    measurementId: "G-KWHYQMK1SS"
  },
};
