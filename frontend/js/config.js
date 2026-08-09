// ── ResQAI Centralized Configuration ─────────────────────────────────────────
export const CONFIG = {
  APP_NAME: 'ResQAI',
  APP_TAGLINE: 'Smart Disaster Response & Emergency Coordination Platform',

  // API
  API_BASE_URL: (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? `${window.location.origin}/api/v1`
    : 'http://localhost:8000/api/v1',
  API_TIMEOUT: 15000,
  API_RETRY_ATTEMPTS: 2,

  // WebSocket
  WS_BASE_URL: (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : 'ws://localhost:8000/ws',
  WS_RECONNECT_DELAY: 3000,

  // Weather API Configuration
  OPEN_METEO_API_KEY: '979ab1e38db18f596c7da16d60721135',
  OPEN_METEO_BASE_URL: 'https://api.open-meteo.com/v1',

  // Map Defaults (Mumbai, India)
  MAP: {
    DEFAULT_LAT: 19.0760,
    DEFAULT_LNG: 72.8777,
    DEFAULT_ZOOM: 11,
    TILE_URL: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=ldasQ9G5fINrzvKswfXk',
    TILE_ATTRIBUTION: '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    PRESETS: {
      STREETS: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=ldasQ9G5fINrzvKswfXk',
      VOYAGER: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      LIGHT: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      DARK: 'https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=ldasQ9G5fINrzvKswfXk',
    }
  },

  // MapTiler Configuration
  MAPTILER: {
    API_KEY: 'ldasQ9G5fINrzvKswfXk',
    TILE_URL: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=ldasQ9G5fINrzvKswfXk',
    SATELLITE_URL: 'https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=ldasQ9G5fINrzvKswfXk',
    DARK_URL: 'https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=ldasQ9G5fINrzvKswfXk',
    ATTRIBUTION: '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  },

  // Session
  ACCESS_TOKEN_KEY: 'resqai_access_token',
  REFRESH_TOKEN_KEY: 'resqai_refresh_token',
  USER_KEY: 'resqai_user',

  // Pagination
  DEFAULT_PAGE_SIZE: 20,

  // Roles (matches backend Role names exactly)
  ROLES: {
    CITIZEN:   'Citizen',
    VOLUNTEER: 'Volunteer',
    RESCUE:    'Rescue Team',
    GOVT:      'Government Authority',
    NGO:       'NGO',
    ADMIN:     'Admin',
  },

  // Tab prefix groups (for role-aware routing)
  TAB_GROUPS: {
    CITIZEN:    'citizen-',
    RESCUE:     'rescue-',
    GOV:        'gov-',
    NGO:        'ngo-',
    ADMIN:      'admin-',
    BLOCKCHAIN: 'blockchain-',
    AI:         'ai-',
    SHARED:     'shared-',
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

  // Firebase Configuration for project "resqai1" (Account: pilankarrohan@gmail.com)
  FIREBASE: {
    apiKey: "AIzaSyBcLN3QFBCulL9ZCr2aKkbrS-kGV49NWnA",
    authDomain: "resqai1.firebaseapp.com",
    databaseURL: "https://resqai1-default-rtdb.firebaseio.com",
    projectId: "resqai1",
    storageBucket: "resqai1.firebasestorage.app",
    messagingSenderId: "781424970444",
    appId: "1:781424970444:web:cc1fedacbc3d910dcdd069",
    measurementId: "G-6VJJMGKLCW"
  },
};
