/**
 * CommandCenter — Orchestrates the AI Disaster Command Center dashboard.
 * Each section is a self-contained render function that fetches from mockDataService.
 */
import { mockDataService } from './services/mockDataService.js';
import { relativeTime } from './utils/date.js';
import { debounce } from './utils/helpers.js';
import { CONFIG } from './config.js';
import { storageService } from './services/storageService.js';
import { notificationService } from './services/notificationService.js';
import { MapController } from './maps.js';
import { incidentApi } from './api/incidentApi.js';
import { shelterApi } from './api/shelterApi.js';

const REFRESH = CONFIG.REFRESH_INTERVALS || {};
let refreshTimers = [];

function clearAllTimers() {
  refreshTimers.forEach(t => clearInterval(t));
  refreshTimers = [];
}

function addTimer(fn, ms) {
  const id = setInterval(fn, ms);
  refreshTimers.push(id);
  return id;
}

function severityClass(s) {
  return (s || '').toLowerCase();
}

function forecastLevel(pct) {
  if (pct >= 70) return 'crit';
  if (pct >= 50) return 'high';
  if (pct >= 30) return 'medium';
  return 'low';
}

function statusClass(s) {
  return (s || '').toLowerCase().replace(/\s+/g, '-');
}

function animateCounter(el, target) {
  const duration = 800;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  if (diff === 0) return;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function sparklineSVG(data, color = 'rgba(230,57,70,0.5)') {
  if (!data || data.length === 0) return '';
  const max = Math.max(...data, 1);
  const bars = data.map(v => {
    const h = Math.max(3, (v / max) * 28);
    return `<div class="spark-bar" style="height:${h}px"></div>`;
  }).join('');
  return `<div class="cc-stat-sparkline">${bars}</div>`;
}

function skeletonCards(count) {
  return Array.from({ length: count }, () => '<div class="cc-skeleton cc-skeleton-stat"></div>').join('');
}

function skeletonPanel() {
  return '<div class="cc-skeleton cc-skeleton-panel"></div>';
}

function roleAllows(feature) {
  const role = storageService.getUserRole();
  const map = {
    systemStatus: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.GOVT],
    quickActions: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.GOVT, CONFIG.ROLES.RESCUE],
    aiCommand: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.GOVT, CONFIG.ROLES.RESCUE],
    priorityQueue: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.GOVT, CONFIG.ROLES.RESCUE],
    citizenFeed: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.GOVT],
    missions: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.GOVT, CONFIG.ROLES.RESCUE],
    forecast: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.GOVT, CONFIG.ROLES.RESCUE],
    insights: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.GOVT],
  };
  if (!map[feature]) return true;
  return map[feature].includes(role);
}

export const commandCenter = {

  mapController: null,

  async renderAll(containerEl) {
    clearAllTimers();

    containerEl.innerHTML = `
      <div class="cc-fade-in">
        <!-- Page Header -->
        <div class="page-header d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h1><i class="fa fa-satellite-dish text-danger me-2"></i>AI Disaster Command Center</h1>
            <div class="page-subtitle">Real-time situational awareness, AI analysis & emergency coordination</div>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div class="cc-global-search" id="cc-global-search">
              <i class="fa fa-search search-icon"></i>
              <input type="text" id="cc-search-input" placeholder="Search incidents, shelters, resources..." aria-label="Global search" />
              <div class="cc-search-results" id="cc-search-results"></div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="cc-live-dot"></span>
              <span class="font-size-sm color-muted">LIVE</span>
            </div>
          </div>
        </div>

        <!-- Row 1: Smart Stats -->
        <div class="cc-row cc-row-4" id="cc-stats-row">
          ${skeletonCards(4)}
        </div>

        <!-- Row 2: AI Command + Map + Priority Queue -->
        <div class="cc-section-divider">
          <div class="cc-section-divider-line"></div>
          <span class="cc-section-divider-label">Command & Operations</span>
          <div class="cc-section-divider-line"></div>
        </div>

        ${roleAllows('aiCommand') ? '<div class="cc-row cc-row-1" id="cc-ai-command-row"></div>' : ''}

        <div class="cc-row cc-row-map" id="cc-map-queue-row">
          <div class="cc-panel" id="cc-map-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-map-marked-alt text-primary"></i> Live Command Map</span>
              <span class="badge badge-resolved"><i class="fa fa-sync-alt fa-spin me-1"></i>Live</span>
            </div>
            <div class="cc-map-filters" id="cc-map-filters"></div>
            <div id="cc-map-container" style="height:440px;width:100%;position:relative;"></div>
          </div>
          ${roleAllows('priorityQueue') ? '<div class="cc-panel" id="cc-priority-panel"><div class="cc-panel-header"><span class="cc-panel-title"><i class="fa fa-sort-amount-down text-warning"></i> AI Priority Queue</span></div><div class="cc-panel-body-scroll" id="cc-priority-body"></div></div>' : ''}
        </div>

        <!-- Row 3: Resources + Shelters -->
        <div class="cc-section-divider">
          <div class="cc-section-divider-line"></div>
          <span class="cc-section-divider-label">Resources & Shelters</span>
          <div class="cc-section-divider-line"></div>
        </div>
        <div class="cc-row cc-row-2" id="cc-res-shelter-row">
          <div class="cc-panel" id="cc-resource-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-cubes text-info"></i> Resource Utilization</span>
            </div>
            <div class="cc-panel-body" id="cc-resource-body"></div>
          </div>
          <div class="cc-panel" id="cc-shelter-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-campground text-success"></i> Shelter Occupancy</span>
            </div>
            <div class="cc-panel-body" id="cc-shelter-body"></div>
          </div>
        </div>

        <!-- Row 4: Citizen Feed + Active Missions -->
        <div class="cc-section-divider">
          <div class="cc-section-divider-line"></div>
          <span class="cc-section-divider-label">Field Operations</span>
          <div class="cc-section-divider-line"></div>
        </div>
        <div class="cc-row cc-row-2" id="cc-feed-missions-row">
          ${roleAllows('citizenFeed') ? `
          <div class="cc-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-users text-warning"></i> Citizen Emergency Feed</span>
              <span class="badge badge-verified"><i class="fa fa-rss me-1"></i>Realtime</span>
            </div>
            <div class="cc-panel-body-scroll" id="cc-citizen-feed"></div>
          </div>` : '<div></div>'}
          ${roleAllows('missions') ? `
          <div class="cc-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-helicopter text-danger"></i> Active Rescue Missions</span>
            </div>
            <div class="cc-panel-body-scroll" id="cc-missions-body"></div>
          </div>` : '<div></div>'}
        </div>

        <!-- Row 5: Forecast + Weather -->
        <div class="cc-section-divider">
          <div class="cc-section-divider-line"></div>
          <span class="cc-section-divider-label">Predictions & Environment</span>
          <div class="cc-section-divider-line"></div>
        </div>
        <div class="cc-row cc-row-2" id="cc-forecast-weather-row">
          ${roleAllows('forecast') ? `
          <div class="cc-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-brain text-purple"></i> AI Disaster Forecast</span>
              <span class="badge badge-info">Next 1 Hour</span>
            </div>
            <div class="cc-panel-body" id="cc-forecast-body"></div>
          </div>` : '<div></div>'}
          <div class="cc-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-cloud-sun-rain text-info"></i> Emergency Weather</span>
            </div>
            <div class="cc-panel-body" id="cc-weather-body"></div>
          </div>
        </div>

        <!-- Row 6: Notifications + Timeline + AI Insights + System Status -->
        <div class="cc-section-divider">
          <div class="cc-section-divider-line"></div>
          <span class="cc-section-divider-label">Intelligence & System</span>
          <div class="cc-section-divider-line"></div>
        </div>
        <div class="cc-row cc-row-2" id="cc-notif-timeline-row">
          <div class="cc-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-bell text-warning"></i> Notifications Center</span>
              <button class="cc-pq-btn" id="cc-mark-all-read" aria-label="Mark all as read"><i class="fa fa-check-double me-1"></i>Mark all read</button>
            </div>
            <div class="cc-panel-body" id="cc-notif-body"></div>
          </div>
          <div class="cc-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-stream text-success"></i> Activity Timeline</span>
            </div>
            <div class="cc-panel-body-scroll" id="cc-timeline-body"></div>
          </div>
        </div>

        <div class="cc-row cc-row-2" id="cc-insights-status-row">
          ${roleAllows('insights') ? `
          <div class="cc-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-lightbulb text-warning"></i> AI Insights</span>
            </div>
            <div class="cc-panel-body" id="cc-insights-body"></div>
          </div>` : '<div></div>'}
          ${roleAllows('systemStatus') ? `
          <div class="cc-panel">
            <div class="cc-panel-header">
              <span class="cc-panel-title"><i class="fa fa-server text-info"></i> System Status</span>
            </div>
            <div class="cc-panel-body" id="cc-system-body"></div>
          </div>` : '<div></div>'}
        </div>
      </div>

      <!-- Quick Actions FAB -->
      ${roleAllows('quickActions') ? `
      <div class="cc-quick-actions" id="cc-quick-actions">
        <div class="cc-quick-menu" id="cc-quick-menu">
          <button class="cc-quick-item" data-action="report"><i class="fa fa-exclamation-triangle"></i> Report Emergency</button>
          <button class="cc-quick-item" data-action="broadcast"><i class="fa fa-bullhorn"></i> Broadcast Alert</button>
          <button class="cc-quick-item" data-action="shelter"><i class="fa fa-campground"></i> Create Shelter</button>
          <button class="cc-quick-item" data-action="deploy"><i class="fa fa-truck"></i> Deploy Resources</button>
          <button class="cc-quick-item" data-action="volunteer"><i class="fa fa-hand-holding-heart"></i> Add Volunteer</button>
          <button class="cc-quick-item" data-action="call"><i class="fa fa-phone-alt"></i> Emergency Call</button>
          <button class="cc-quick-item" data-action="download"><i class="fa fa-file-download"></i> Download Report</button>
          <button class="cc-quick-item" data-action="export"><i class="fa fa-chart-line"></i> Export Analytics</button>
        </div>
        <button class="cc-quick-toggle" id="cc-quick-toggle" aria-label="Quick actions"><i class="fa fa-plus"></i></button>
      </div>` : ''}
    `;

    this.bindEvents();
    await this.loadAllSections();
    this.startAutoRefresh();
  },

  bindEvents() {
    const toggle = document.getElementById('cc-quick-toggle');
    const menu = document.getElementById('cc-quick-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('open');
        menu.classList.toggle('open');
      });
    }

    document.querySelectorAll('.cc-quick-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleQuickAction(action);
        toggle?.classList.remove('open');
        menu?.classList.remove('open');
      });
    });

    const searchInput = document.getElementById('cc-search-input');
    if (searchInput) {
      const debouncedSearch = debounce((q) => this.handleSearch(q), 300);
      searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
          document.getElementById('cc-search-results')?.classList.add('open');
        }
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#cc-global-search')) {
          document.getElementById('cc-search-results')?.classList.remove('open');
        }
      });
    }

    document.getElementById('cc-mark-all-read')?.addEventListener('click', () => {
      document.querySelectorAll('.cc-notif-item.unread').forEach(el => el.classList.remove('unread'));
      notificationService.info('Notifications', 'All notifications marked as read.');
    });

    this.bindMapFilters();
  },

  bindMapFilters() {
    const filtersEl = document.getElementById('cc-map-filters');
    if (!filtersEl) return;

    const types = ['All', ...CONFIG.DISASTER_TYPES.slice(0, 6)];
    filtersEl.innerHTML = types.map((t, i) =>
      `<button class="cc-map-filter-chip ${i === 0 ? 'active' : ''}" data-filter="${t}" aria-label="Filter by ${t}">${t}</button>`
    ).join('');

    filtersEl.querySelectorAll('.cc-map-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        filtersEl.querySelectorAll('.cc-map-filter-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });
  },

  async loadAllSections() {
    await Promise.allSettled([
      this.loadStats(),
      this.loadAICommand(),
      this.loadMap(),
      this.loadPriorityQueue(),
      this.loadResources(),
      this.loadShelters(),
      this.loadCitizenFeed(),
      this.loadMissions(),
      this.loadForecast(),
      this.loadWeather(),
      this.loadNotifications(),
      this.loadTimeline(),
      this.loadInsights(),
      this.loadSystemStatus(),
    ]);
  },

  startAutoRefresh() {
    addTimer(() => this.loadStats(), REFRESH.stats || 30000);
    addTimer(() => this.loadAICommand(), REFRESH.aiCommand || 45000);
    addTimer(() => this.loadPriorityQueue(), REFRESH.priorityQueue || 20000);
    addTimer(() => this.loadResources(), REFRESH.resources || 60000);
    addTimer(() => this.loadShelters(), REFRESH.shelters || 60000);
    addTimer(() => this.loadCitizenFeed(), REFRESH.citizenFeed || 15000);
    addTimer(() => this.loadMissions(), REFRESH.missions || 25000);
    addTimer(() => this.loadForecast(), REFRESH.forecast || 60000);
    addTimer(() => this.loadWeather(), REFRESH.weather || 120000);
    addTimer(() => this.loadNotifications(), REFRESH.notifications || 30000);
    addTimer(() => this.loadTimeline(), REFRESH.timeline || 45000);
    addTimer(() => this.loadInsights(), REFRESH.insights || 60000);
    addTimer(() => this.loadSystemStatus(), REFRESH.systemStatus || 30000);
  },

  destroy() { clearAllTimers(); },

  /* ───── Row 1: Smart Stats ──────────────────────────────────── */
  async loadStats() {
    const row = document.getElementById('cc-stats-row');
    if (!row) return;

    try {
      const data = await mockDataService.getDashboardStats();
      const trendDir = (v) => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
      const trendIcon = (v) => v > 0 ? '↑' : v < 0 ? '↓' : '—';

      row.innerHTML = `
        <div class="cc-stat-card cc-fade-in cc-stagger-1">
          <div class="cc-stat-header">
            <div class="cc-stat-icon red cc-tooltip" data-tooltip="Total emergency incidents tracked"><i class="fa fa-exclamation-circle"></i></div>
            <span class="cc-stat-trend ${trendDir(data.incidents.weeklyChange)}">${trendIcon(data.incidents.weeklyChange)} ${Math.abs(data.incidents.weeklyChange)}%</span>
          </div>
          <div class="cc-stat-value" data-target="${data.incidents.total}">0</div>
          <div class="cc-stat-label">Total Incidents</div>
          <div class="cc-stat-meta">
            <span class="cc-stat-sub"><i class="fa fa-clock me-1"></i>${data.incidents.today} today</span>
            <span class="cc-stat-sub">vs last week</span>
          </div>
          ${sparklineSVG(data.incidents.trend)}
        </div>

        <div class="cc-stat-card cc-fade-in cc-stagger-2">
          <div class="cc-stat-header">
            <div class="cc-stat-icon orange cc-tooltip" data-tooltip="Currently active rescue operations"><i class="fa fa-helicopter"></i></div>
            <span class="badge badge-in-progress" style="font-size:0.68rem">${data.missions.successRate}% success</span>
          </div>
          <div class="cc-stat-value" data-target="${data.missions.active}">0</div>
          <div class="cc-stat-label">Active Rescue Missions</div>
          <div class="cc-stat-meta">
            <span class="cc-stat-sub"><i class="fa fa-stopwatch me-1"></i>Avg ${data.missions.avgResponseTime} min</span>
          </div>
        </div>

        <div class="cc-stat-card cc-fade-in cc-stagger-3">
          <div class="cc-stat-header">
            <div class="cc-stat-icon green cc-tooltip" data-tooltip="Available emergency shelters"><i class="fa fa-campground"></i></div>
            <span class="cc-stat-sub">${data.shelters.avgOccupancy}% avg occ.</span>
          </div>
          <div class="cc-stat-value" data-target="${data.shelters.active}">0</div>
          <div class="cc-stat-label">Available Shelters</div>
          <div class="cc-stat-meta">
            <span class="cc-stat-sub"><i class="fa fa-building me-1"></i>${data.shelters.total} total centers</span>
          </div>
          <div class="progress-bar-wrapper" style="margin-top:4px">
            <div class="progress-bar-fill ${data.shelters.avgOccupancy > 80 ? 'red' : data.shelters.avgOccupancy > 60 ? 'orange' : 'green'}" style="width:${data.shelters.avgOccupancy}%"></div>
          </div>
        </div>

        <div class="cc-stat-card cc-fade-in cc-stagger-4">
          <div class="cc-stat-header">
            <div class="cc-stat-icon blue cc-tooltip" data-tooltip="Emergency resources ready for deployment"><i class="fa fa-cubes"></i></div>
          </div>
          <div class="cc-stat-value" data-target="${data.resources.ambulances.available + data.resources.boats.available + data.resources.medicalTeams.available}">0</div>
          <div class="cc-stat-label">Resources Ready</div>
          <div class="cc-stat-meta" style="flex-wrap:wrap;gap:6px">
            <span class="cc-stat-sub"><i class="fa fa-ambulance me-1"></i>${data.resources.ambulances.available}</span>
            <span class="cc-stat-sub"><i class="fa fa-ship me-1"></i>${data.resources.boats.available}</span>
            <span class="cc-stat-sub"><i class="fa fa-user-md me-1"></i>${data.resources.medicalTeams.available}</span>
            <span class="cc-stat-sub"><i class="fa fa-fire-extinguisher me-1"></i>${data.resources.fireTrucks.available}</span>
            <span class="cc-stat-sub"><i class="fa fa-helicopter me-1"></i>${data.resources.helicopters.available}</span>
          </div>
        </div>
      `;

      row.querySelectorAll('.cc-stat-value[data-target]').forEach(el => {
        animateCounter(el, parseInt(el.dataset.target));
      });
    } catch (err) {
      row.innerHTML = '<div class="alert-banner alert-danger" role="alert">Failed to load dashboard statistics</div>';
    }
  },

  /* ───── AI Command Center ───────────────────────────────────── */
  async loadAICommand() {
    const row = document.getElementById('cc-ai-command-row');
    if (!row) return;

    try {
      const ai = await mockDataService.getAICommandData();
      const riskClass = severityClass(ai.riskLevel);

      row.innerHTML = `
        <div class="cc-panel cc-fade-in">
          <div class="cc-panel-header">
            <span class="cc-panel-title"><i class="fa fa-robot text-info"></i> AI Command Center</span>
            <div class="d-flex align-items-center gap-2">
              <span class="cc-ai-risk-badge ${riskClass}"><i class="fa fa-exclamation-triangle"></i> ${ai.riskLevel} RISK</span>
              <span class="font-size-sm color-muted">Updated ${relativeTime(ai.lastAnalysisTime)}</span>
            </div>
          </div>
          <div class="cc-panel-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="cc-confidence-meter" style="flex:1">
                <span class="font-size-sm color-muted">AI Confidence</span>
                <div class="cc-confidence-bar"><div class="cc-confidence-fill" style="width:${ai.confidence}%"></div></div>
                <span class="cc-confidence-pct">${ai.confidence}%</span>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="cc-ai-field"><div class="cc-ai-field-icon"><i class="fa fa-broadcast-tower"></i></div><span class="cc-ai-field-label">Situation</span><span class="cc-ai-field-value">${ai.currentSituation}</span></div>
                <div class="cc-ai-field"><div class="cc-ai-field-icon"><i class="fa fa-chart-line"></i></div><span class="cc-ai-field-label">Severity</span><span class="cc-ai-field-value"><span class="badge badge-${riskClass}">${ai.predictedSeverity}</span></span></div>
                <div class="cc-ai-field"><div class="cc-ai-field-icon"><i class="fa fa-hand-point-right"></i></div><span class="cc-ai-field-label">Response</span><span class="cc-ai-field-value">${ai.recommendedResponse}</span></div>
                <div class="cc-ai-field"><div class="cc-ai-field-icon"><i class="fa fa-boxes"></i></div><span class="cc-ai-field-label">Resources Needed</span><span class="cc-ai-field-value">${ai.requiredResources.ambulances} Amb, ${ai.requiredResources.boats} Boats, ${ai.requiredResources.medicalTeams} Med, ${ai.requiredResources.fireTrucks} Fire, ${ai.requiredResources.helicopters} Heli</span></div>
              </div>
              <div class="col-md-6">
                <div class="cc-ai-field"><div class="cc-ai-field-icon"><i class="fa fa-clock"></i></div><span class="cc-ai-field-label">Rescue ETA</span><span class="cc-ai-field-value">${ai.estimatedRescueTime}</span></div>
                <div class="cc-ai-field"><div class="cc-ai-field-icon"><i class="fa fa-campground"></i></div><span class="cc-ai-field-label">Nearest Shelter</span><span class="cc-ai-field-value">${ai.nearestShelter.name} (${ai.nearestShelter.distance}) — ${ai.nearestShelter.availableBeds} beds</span></div>
                <div class="cc-ai-field"><div class="cc-ai-field-icon"><i class="fa fa-road"></i></div><span class="cc-ai-field-label">Blocked Roads</span><span class="cc-ai-field-value">${ai.blockedRoads} blocked</span></div>
                <div class="cc-ai-field"><div class="cc-ai-field-icon"><i class="fa fa-route"></i></div><span class="cc-ai-field-label">Alt Route</span><span class="cc-ai-field-value">${ai.alternativeRouteAvailable ? '<span class="text-success"><i class="fa fa-check-circle me-1"></i>Available</span>' : '<span class="text-danger"><i class="fa fa-times-circle me-1"></i>Unavailable</span>'}</span></div>
              </div>
            </div>

            <div class="cc-ai-reasoning">
              <div class="cc-ai-reasoning-title"><i class="fa fa-brain"></i> Why AI Generated This Recommendation</div>
              ${ai.reasoning}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      row.innerHTML = '<div class="alert-banner alert-danger" role="alert">AI Command Center unavailable</div>';
    }
  },

  /* ───── Live Map ────────────────────────────────────────────── */
  async loadMap() {
    const container = document.getElementById('cc-map-container');
    if (!container) return;

    try {
      this.mapController = new MapController('cc-map-container');
      this.mapController.init();

      const [incidents, shelters] = await Promise.allSettled([
        incidentApi.getIncidents(),
        shelterApi.getShelters(),
      ]);

      if (incidents.status === 'fulfilled') {
        this.mapController.renderIncidents(incidents.value);
      }
      if (shelters.status === 'fulfilled') {
        this.mapController.renderShelters(shelters.value);
      }
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><i class="fa fa-map-marked-alt empty-icon"></i><h3>Map unavailable</h3><p>Could not initialize the map view.</p></div>';
    }
  },

  /* ───── Priority Queue ──────────────────────────────────────── */
  async loadPriorityQueue() {
    const body = document.getElementById('cc-priority-body');
    if (!body) return;

    try {
      const queue = await mockDataService.getPriorityQueue();
      if (!queue || queue.length === 0) {
        body.innerHTML = '<div class="empty-state"><i class="fa fa-check-circle empty-icon"></i><h3>Queue Clear</h3><p>No pending incidents</p></div>';
        return;
      }

      body.innerHTML = queue.map(item => {
        const rankClass = item.aiPriority <= 1 ? 'p1' : item.aiPriority <= 3 ? 'p2' : item.aiPriority <= 6 ? 'p3' : 'p4';
        return `
          <div class="cc-pq-item" data-id="${item.id}">
            <div class="d-flex align-items-start gap-10" style="gap:10px">
              <div class="cc-pq-rank ${rankClass}">${item.aiPriority}</div>
              <div style="flex:1;min-width:0">
                <div class="cc-pq-title">${item.title}</div>
                <div class="cc-pq-meta">
                  <span><i class="fa fa-map-marker-alt me-1"></i>${item.location}</span>
                  <span class="badge badge-${severityClass(item.severity)}">${item.severity}</span>
                  <span><i class="fa fa-clock me-1"></i>${relativeTime(item.time)}</span>
                </div>
                <div class="cc-pq-meta" style="margin-top:2px">
                  <span><i class="fa fa-user me-1"></i>${item.reporter}</span>
                  ${item.assignedTeam ? `<span><i class="fa fa-users me-1"></i>${item.assignedTeam}</span>` : '<span class="text-muted">Unassigned</span>'}
                  ${item.responseEta ? `<span><i class="fa fa-stopwatch me-1"></i>ETA ${item.responseEta}</span>` : ''}
                </div>
                <div class="cc-pq-actions">
                  <button class="cc-pq-btn primary" aria-label="Assign team"><i class="fa fa-user-plus me-1"></i>Assign</button>
                  <button class="cc-pq-btn" aria-label="View incident"><i class="fa fa-eye me-1"></i>View</button>
                  <button class="cc-pq-btn" aria-label="Navigate to incident"><i class="fa fa-route me-1"></i>Navigate</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Failed to load priority queue</div>';
    }
  },

  /* ───── Resources ───────────────────────────────────────────── */
  async loadResources() {
    const body = document.getElementById('cc-resource-body');
    if (!body) return;

    try {
      const resources = await mockDataService.getResourceUtilization();
      body.innerHTML = resources.map(r => {
        const availPct = (r.available / r.total * 100).toFixed(0);
        const busyPct = (r.busy / r.total * 100).toFixed(0);
        const maintPct = (r.maintenance / r.total * 100).toFixed(0);
        return `
          <div class="cc-resource-row">
            <div class="cc-resource-icon"><i class="fa ${r.icon}"></i></div>
            <div class="cc-resource-name">${r.name}</div>
            <div class="cc-resource-bar-wrapper">
              <div class="cc-resource-segment available" style="width:${availPct}%" title="${r.available} available"></div>
              <div class="cc-resource-segment busy" style="width:${busyPct}%" title="${r.busy} busy"></div>
              <div class="cc-resource-segment maintenance" style="width:${maintPct}%" title="${r.maintenance} maintenance"></div>
            </div>
            <div class="cc-resource-counts">
              <span><span class="cc-resource-dot avail"></span>${r.available}</span>
              <span><span class="cc-resource-dot busy"></span>${r.busy}</span>
              <span><span class="cc-resource-dot maint"></span>${r.maintenance}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Failed to load resources</div>';
    }
  },

  /* ───── Shelters ────────────────────────────────────────────── */
  async loadShelters() {
    const body = document.getElementById('cc-shelter-body');
    if (!body) return;

    try {
      const shelters = await mockDataService.getShelterOccupancy();
      body.innerHTML = `<div class="cc-shelter-grid">${shelters.map(s => {
        const fillClass = s.occupancyPercent > 85 ? 'danger' : s.occupancyPercent > 60 ? 'warning' : 'safe';
        const powerInd = s.powerStatus === 'Active' ? 'on' : s.powerStatus === 'Generator' ? 'mid' : 'off';
        const netInd = s.internetStatus === 'Online' ? 'on' : s.internetStatus === 'Limited' ? 'mid' : 'off';

        return `
          <div class="cc-shelter-card ${s.overflowWarning ? 'overflow' : ''}">
            <div class="d-flex justify-content-between align-items-start">
              <div class="cc-shelter-name"><i class="fa fa-campground text-success me-1"></i>${s.name}</div>
              ${s.overflowWarning ? '<span class="cc-overflow-badge"><i class="fa fa-exclamation-triangle"></i> Overflow</span>' : ''}
            </div>
            <div class="d-flex justify-content-between font-size-sm"><span>${s.occupied}/${s.capacity}</span><strong>${s.occupancyPercent}%</strong></div>
            <div class="cc-shelter-progress"><div class="cc-shelter-fill ${fillClass}" style="width:${s.occupancyPercent}%"></div></div>
            <div class="cc-shelter-stats">
              <span><i class="fa fa-bed me-1"></i>${s.availableBeds} beds</span>
              <span><i class="fa fa-user-md me-1"></i>${s.medicalStaff} staff</span>
              <span><span class="cc-shelter-indicator ${s.foodAvailable ? 'on' : 'off'}"></span> Food</span>
              <span><span class="cc-shelter-indicator ${s.waterAvailable ? 'on' : 'off'}"></span> Water</span>
              <span><span class="cc-shelter-indicator ${powerInd}"></span> Power: ${s.powerStatus}</span>
              <span><span class="cc-shelter-indicator ${netInd}"></span> Net: ${s.internetStatus}</span>
            </div>
          </div>
        `;
      }).join('')}</div>`;
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Failed to load shelter data</div>';
    }
  },

  /* ───── Citizen Feed ────────────────────────────────────────── */
  async loadCitizenFeed() {
    const body = document.getElementById('cc-citizen-feed');
    if (!body) return;

    try {
      const reports = await mockDataService.getCitizenFeed();
      if (!reports || reports.length === 0) {
        body.innerHTML = '<div class="empty-state"><i class="fa fa-inbox empty-icon"></i><h3>No Reports</h3><p>No citizen reports at this time.</p></div>';
        return;
      }

      body.innerHTML = reports.map(r => `
        <div class="cc-feed-item">
          <div class="cc-feed-avatar">${r.reporter.charAt(0)}</div>
          <div class="cc-feed-body">
            <div class="cc-feed-title">${r.reporter}</div>
            <div class="cc-feed-desc">${r.description}</div>
            <div class="cc-feed-meta">
              <span><i class="fa fa-map-marker-alt me-1"></i>${r.location}</span>
              <span><i class="fa fa-clock me-1"></i>${relativeTime(r.time)}</span>
              <span class="badge badge-${severityClass(r.severity)}">${r.severity}</span>
              <span class="badge ${r.verificationStatus === 'Verified' || r.verificationStatus === 'AI Verified' ? 'badge-resolved' : 'badge-reported'}">${r.verificationStatus}</span>
              <span title="AI Spam Score: ${r.aiSpamScore}%">🛡️ ${r.aiSpamScore}%</span>
            </div>
            <div class="cc-feed-actions">
              <button class="cc-pq-btn primary" aria-label="Accept report"><i class="fa fa-check me-1"></i>Accept</button>
              <button class="cc-pq-btn" aria-label="Reject report"><i class="fa fa-times me-1"></i>Reject</button>
              <button class="cc-pq-btn" aria-label="View report details"><i class="fa fa-eye me-1"></i>View</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Failed to load citizen feed</div>';
    }
  },

  /* ───── Active Missions ─────────────────────────────────────── */
  async loadMissions() {
    const body = document.getElementById('cc-missions-body');
    if (!body) return;

    try {
      const missions = await mockDataService.getActiveMissions();
      if (!missions || missions.length === 0) {
        body.innerHTML = '<div class="empty-state"><i class="fa fa-helicopter empty-icon"></i><h3>No Active Missions</h3><p>All rescue missions completed.</p></div>';
        return;
      }

      body.innerHTML = missions.map(m => `
        <div class="cc-mission-card">
          <div class="d-flex justify-content-between align-items-start">
            <div class="cc-mission-name">${m.name}</div>
            <span class="cc-mission-status-badge ${statusClass(m.status)}"><span class="cc-live-dot" style="width:6px;height:6px"></span> ${m.status}</span>
          </div>
          <div class="cc-mission-meta">
            <span><i class="fa fa-user-shield me-1"></i>${m.commander}</span>
            <span><i class="fa fa-users me-1"></i>${m.teamMembers} members</span>
            <span><i class="fa fa-truck me-1"></i>${m.vehicles.join(', ')}</span>
            <span><i class="fa fa-stopwatch me-1"></i>ETA ${m.eta}</span>
            <span><i class="fa fa-road me-1"></i>${m.distanceRemaining}</span>
            <span><i class="fa fa-clock me-1"></i>${relativeTime(m.startTime)}</span>
          </div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="font-size-sm color-muted">Progress</span>
            <span class="font-size-sm font-weight-bold" style="color:var(--text-primary)">${m.progress}%</span>
          </div>
          <div class="cc-mission-progress"><div class="cc-mission-progress-fill" style="width:${m.progress}%"></div></div>
          <div class="d-flex gap-2 mt-2">
            <button class="cc-pq-btn" aria-label="Contact team"><i class="fa fa-headset me-1"></i>Comms</button>
            <button class="cc-pq-btn" aria-label="View mission log"><i class="fa fa-clipboard-list me-1"></i>Log</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Failed to load missions</div>';
    }
  },

  /* ───── AI Forecast ─────────────────────────────────────────── */
  async loadForecast() {
    const body = document.getElementById('cc-forecast-body');
    if (!body) return;

    try {
      const data = await mockDataService.getAIForecast();
      const trendIcon = (t) => t === 'rising' ? '↑' : t === 'falling' ? '↓' : '—';

      body.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="font-size-sm color-muted">Predictions for next <strong>${data.timeframe}</strong></span>
          <span class="badge badge-info">Confidence: ${data.overallConfidence}%</span>
        </div>
        ${data.predictions.map(p => `
          <div class="cc-forecast-row">
            <div class="cc-forecast-name">${p.name}</div>
            <div class="cc-forecast-bar"><div class="cc-forecast-fill ${forecastLevel(p.probability)}" style="width:${p.probability}%"></div></div>
            <div class="cc-forecast-pct">${p.probability}%</div>
            <div class="cc-forecast-trend ${p.trend}">${trendIcon(p.trend)}</div>
          </div>
        `).join('')}
      `;
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Forecast unavailable</div>';
    }
  },

  /* ───── Weather ─────────────────────────────────────────────── */
  async loadWeather() {
    const body = document.getElementById('cc-weather-body');
    if (!body) return;

    try {
      const data = await mockDataService.getWeatherData();
      body.innerHTML = `
        <div class="cc-weather-current">
          <i class="fa ${data.current.icon} cc-weather-icon"></i>
          <div>
            <div class="cc-weather-temp">${data.current.temperature}°C</div>
            <div class="cc-weather-condition">${data.current.condition}</div>
          </div>
        </div>
        <div class="cc-weather-grid">
          <div class="cc-weather-field"><i class="fa fa-tint text-info"></i> Rainfall: <strong>${data.current.rainfall}mm</strong></div>
          <div class="cc-weather-field"><i class="fa fa-wind"></i> Wind: <strong>${data.current.windSpeed} km/h ${data.current.windDirection}</strong></div>
          <div class="cc-weather-field"><i class="fa fa-temperature-high"></i> Humidity: <strong>${data.current.humidity}%</strong></div>
          <div class="cc-weather-field"><i class="fa fa-eye"></i> Visibility: <strong>${data.current.visibility} km</strong></div>
        </div>
        ${data.alerts.length > 0 ? `
          <div class="font-size-sm font-weight-bold mb-2" style="color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em">Weather Alerts</div>
          ${data.alerts.map(a => `
            <div class="cc-weather-alert ${a.level === 'Emergency' ? 'emergency' : a.level === 'Warning' ? 'warning' : 'advisory'}">
              <i class="fa fa-exclamation-triangle"></i>
              <span>${a.type} — <strong>${a.level}</strong></span>
            </div>
          `).join('')}
        ` : '<div class="font-size-sm color-muted"><i class="fa fa-check-circle text-success me-1"></i>No active weather alerts</div>'}
      `;
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Weather data unavailable</div>';
    }
  },

  /* ───── Notifications Center ────────────────────────────────── */
  async loadNotifications() {
    const body = document.getElementById('cc-notif-body');
    if (!body) return;

    try {
      const data = await mockDataService.getNotificationsCenter();
      const { categories, unreadCount } = data;

      const renderItems = (items) => items.map(n => `
        <div class="cc-notif-item ${n.read ? '' : 'unread'}">
          <div class="cc-notif-title">${n.title}</div>
          <div class="cc-notif-msg">${n.message}</div>
          <div class="cc-notif-time">${relativeTime(n.time)}</div>
        </div>
      `).join('');

      body.innerHTML = `
        <div class="cc-notif-tabs">
          <button class="cc-notif-tab active" data-cat="all">All <span class="cc-notif-count">${unreadCount}</span></button>
          <button class="cc-notif-tab" data-cat="critical" style="color:var(--severity-critical)">Critical <span class="cc-notif-count">${categories.critical.length}</span></button>
          <button class="cc-notif-tab" data-cat="warning" style="color:var(--warning)">Warning</button>
          <button class="cc-notif-tab" data-cat="info" style="color:var(--info)">Info</button>
        </div>
        <div id="cc-notif-list" style="max-height:300px;overflow-y:auto">
          ${renderItems([...categories.critical, ...categories.warning, ...categories.info])}
        </div>
      `;

      body.querySelectorAll('.cc-notif-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          body.querySelectorAll('.cc-notif-tab').forEach(t => t.classList.remove('active'));
          e.currentTarget.classList.add('active');
          const cat = e.currentTarget.dataset.cat;
          const list = document.getElementById('cc-notif-list');
          if (!list) return;
          if (cat === 'all') {
            list.innerHTML = renderItems([...categories.critical, ...categories.warning, ...categories.info]);
          } else {
            list.innerHTML = renderItems(categories[cat] || []);
          }
        });
      });
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Notifications unavailable</div>';
    }
  },

  /* ───── Timeline ────────────────────────────────────────────── */
  async loadTimeline() {
    const body = document.getElementById('cc-timeline-body');
    if (!body) return;

    try {
      const events = await mockDataService.getActivityTimeline();
      body.innerHTML = `<div class="cc-timeline">${events.map(e => `
        <div class="cc-timeline-item">
          <div class="cc-timeline-dot" style="background:${e.color};color:#fff"><i class="fa ${e.icon}"></i></div>
          <div class="cc-timeline-title">${e.title}</div>
          <div class="cc-timeline-desc">${e.description}</div>
          <div class="cc-timeline-meta"><i class="fa fa-user me-1"></i>${e.user} · ${relativeTime(e.time)}</div>
        </div>
      `).join('')}</div>`;
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">Timeline unavailable</div>';
    }
  },

  /* ───── AI Insights ─────────────────────────────────────────── */
  async loadInsights() {
    const body = document.getElementById('cc-insights-body');
    if (!body) return;

    try {
      const data = await mockDataService.getAIInsights();
      const fields = [
        { label: 'Top Risk District', value: data.topRiskDistrict, icon: 'fa-map-pin' },
        { label: 'Most Common Disaster', value: data.mostCommonDisaster, icon: 'fa-fire' },
        { label: 'Highest Resource Use', value: data.highestResourceConsumption, icon: 'fa-truck' },
        { label: 'Avg Response Time', value: data.avgResponseTime, icon: 'fa-stopwatch' },
        { label: 'Predicted High Risk', value: data.predictedHighRiskArea, icon: 'fa-bullseye' },
        { label: 'Resource Shortage', value: data.resourceShortageAlert, icon: 'fa-exclamation-circle' },
        { label: 'Population at Risk', value: data.populationAtRisk, icon: 'fa-users' },
        { label: 'Preventive Action', value: data.suggestedPreventiveAction, icon: 'fa-shield-alt' },
      ];

      body.innerHTML = `<div class="cc-insight-grid">${fields.map(f => `
        <div class="cc-insight-item">
          <div class="cc-insight-label"><i class="fa ${f.icon} me-1"></i>${f.label}</div>
          <div class="cc-insight-value">${f.value}</div>
        </div>
      `).join('')}</div>`;
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">AI Insights unavailable</div>';
    }
  },

  /* ───── System Status ───────────────────────────────────────── */
  async loadSystemStatus() {
    const body = document.getElementById('cc-system-body');
    if (!body) return;

    try {
      const data = await mockDataService.getSystemStatus();
      body.innerHTML = `
        ${data.services.map(s => `
          <div class="cc-status-row">
            <div class="cc-status-name"><span class="cc-status-indicator ${s.status}"></span>${s.name}</div>
            <div class="cc-status-latency">${s.latency}</div>
          </div>
        `).join('')}
        <div class="cc-status-metrics">
          <div class="cc-metric-card"><div class="cc-metric-value">${data.metrics.apiLatency}</div><div class="cc-metric-label">API Latency</div></div>
          <div class="cc-metric-card"><div class="cc-metric-value">${data.metrics.serverUptime}</div><div class="cc-metric-label">Uptime</div></div>
          <div class="cc-metric-card"><div class="cc-metric-value">${data.metrics.memoryUsage}</div><div class="cc-metric-label">Memory</div></div>
          <div class="cc-metric-card"><div class="cc-metric-value">${data.metrics.cpuUsage}</div><div class="cc-metric-label">CPU</div></div>
        </div>
      `;
    } catch (err) {
      body.innerHTML = '<div class="alert-banner alert-danger" role="alert">System status unavailable</div>';
    }
  },

  /* ───── Global Search ───────────────────────────────────────── */
  async handleSearch(query) {
    const resultsEl = document.getElementById('cc-search-results');
    if (!resultsEl) return;

    if (!query || query.trim().length < 2) {
      resultsEl.classList.remove('open');
      return;
    }

    const q = query.toLowerCase();
    const results = [];

    const mockSearchItems = [
      { type: 'Incident', text: 'Flash flood in Dharavi Sector 4', id: 4521 },
      { type: 'Incident', text: 'Building fire in Andheri West', id: 4518 },
      { type: 'Shelter', text: 'Andheri Relief Center', id: 1 },
      { type: 'Shelter', text: 'Bandra Community Hall', id: 2 },
      { type: 'Resource', text: 'Ambulance Fleet Alpha', id: 10 },
      { type: 'Resource', text: 'Rescue Boat Unit B-04', id: 12 },
      { type: 'Team', text: 'Alpha Squad — Flood Rescue', id: 'T1' },
      { type: 'Team', text: 'Bravo Unit — Fire Containment', id: 'T2' },
      { type: 'District', text: 'Dharavi', id: 'D1' },
      { type: 'District', text: 'Andheri West', id: 'D2' },
      { type: 'Citizen', text: 'Rajesh Kumar — Reporter', id: 'C1' },
    ];

    mockSearchItems.forEach(item => {
      if (item.text.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)) {
        results.push(item);
      }
    });

    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="cc-search-result-item" style="color:var(--text-muted)">No results found</div>';
    } else {
      resultsEl.innerHTML = results.slice(0, 8).map(r =>
        `<div class="cc-search-result-item"><span class="result-type">${r.type}</span>${r.text}</div>`
      ).join('');
    }
    resultsEl.classList.add('open');
  },

  /* ───── Quick Actions ───────────────────────────────────────── */
  handleQuickAction(action) {
    const actions = {
      report: () => notificationService.info('Quick Action', 'Navigating to Report Emergency form...'),
      broadcast: () => notificationService.warning('Broadcast', 'Emergency broadcast alert initiated.'),
      shelter: () => notificationService.info('Shelter', 'Opening shelter creation form...'),
      deploy: () => notificationService.info('Deploy', 'Opening resource deployment panel...'),
      volunteer: () => notificationService.info('Volunteer', 'Opening volunteer registration...'),
      call: () => { window.open('tel:112', '_self'); },
      download: () => notificationService.success('Download', 'Generating incident report PDF...'),
      export: () => notificationService.success('Export', 'Exporting analytics data to CSV...'),
    };
    (actions[action] || (() => {}))();
  },
};
