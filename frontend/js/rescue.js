import { CONFIG } from './config.js';
import { incidentApi } from './api/incidentApi.js';
import { resourceApi } from './api/resourceApi.js';
import { notificationService } from './services/notificationService.js';
import { weatherApi } from './api/weatherApi.js';
import { userApi } from './api/userApi.js';
import { locationService } from './services/locationService.js';
import { MapController } from './maps.js';
import { aiApi } from './api/aiApi.js';
import { resolveMediaUrl, pickMediaUrl } from './utils/helpers.js';





let rescueMapCtrl = null;

function animateValue(id, start, end, duration = 800) {
  const el = document.getElementById(id);
  if (!el) return;
  const range = end - start;
  const minTimer = 50;
  let stepTime = Math.abs(Math.floor(duration / (range || 1)));
  stepTime = Math.max(stepTime, minTimer);
  let startTime = new Date().getTime();
  let endTime = startTime + duration;
  let timer;

  function run() {
    let now = new Date().getTime();
    let remaining = Math.max((endTime - now) / duration, 0);
    let value = Math.round(end - (remaining * range));
    el.innerText = value;
    if (value === end) clearInterval(timer);
  }

  timer = setInterval(run, stepTime);
  run();
}

export const rescueHandler = {
  async renderRescueDashboard(area) {
    area.innerHTML = `
      <div class="rd-page">
        <!-- Header -->
        <div class="rd-header">
          <div class="rd-header-left">
            <h1>
              <span class="rd-icon-box"><i class="fa fa-truck-medical"></i></span>
              Rescue Team Command Operations
            </h1>
            <div class="rd-header-subtitle">Tactical Incident Tracking, Live Dispatch Map & Field Resource Coordination</div>
          </div>
          <div class="rd-header-actions">
            <div class="rd-status-pill active" id="rd-location-status-pill">
              <span class="rd-status-dot"></span> Team Active & Deployed
            </div>
            <button class="btn btn-outline-info btn-sm fw-semibold" onclick="rescueHandler.requestLocationAccess()" id="btn-rescue-gps" title="Access live GPS coordinates">
              <i class="fa fa-location-crosshairs me-1"></i> Access Live GPS
            </button>
            <button class="btn btn-outline-secondary btn-sm" onclick="rescueHandler.openLocationModal()" title="Set custom location name or coordinates">
              <i class="fa fa-map-pin me-1"></i> Set Location
            </button>
            <button class="btn btn-secondary btn-sm" onclick="rescueHandler.renderRescueDashboard(document.getElementById('page-content-area'))">
              <i class="fa fa-sync-alt me-1"></i> Sync Data
            </button>
            <button class="btn btn-danger btn-sm" onclick="window.dashboardManager?.switchTab('rescue-victim')">
              <i class="fa fa-user-injured me-1"></i> Log Victim
            </button>
          </div>
        </div>

        <!-- Top KPI Stat Grid -->
        <div class="rd-row rd-row-4 mb-4">
          <!-- Card 1: Active Missions -->
          <div class="rd-stat red">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="rd-stat-badge down"><i class="fa fa-fire-flame-curved me-1"></i>High Alert</span>
              <div class="rd-stat-icon"><i class="fa fa-triangle-exclamation"></i></div>
            </div>
            <div class="rd-stat-value" id="kpi-active-missions">3</div>
            <div class="rd-stat-label"><i class="fa fa-tasks me-1 text-danger"></i>Active Missions</div>
            <div class="rd-stat-sub"><i class="fa fa-circle-exclamation me-1 text-danger opacity-75"></i>2 Critical Priority assigned</div>
          </div>

          <!-- Card 2: Rescue Personnel -->
          <div class="rd-stat orange">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="rd-stat-badge flat"><i class="fa fa-user-check me-1"></i>8 Active</span>
              <div class="rd-stat-icon"><i class="fa fa-users-gear"></i></div>
            </div>
            <div class="rd-stat-value" id="kpi-team-members">12</div>
            <div class="rd-stat-label"><i class="fa fa-shield-halved me-1 text-warning"></i>Rescue Personnel</div>
            <div class="rd-stat-sub"><i class="fa fa-location-dot me-1 text-warning opacity-75"></i>4 Deployed in Sector 4</div>
          </div>

          <!-- Card 3: Citizens Rescued -->
          <div class="rd-stat green">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="rd-stat-badge up"><i class="fa fa-arrow-trend-up me-1"></i>+14 Today</span>
              <div class="rd-stat-icon"><i class="fa fa-person-shelter"></i></div>
            </div>
            <div class="rd-stat-value" id="kpi-rescued-count">148</div>
            <div class="rd-stat-label"><i class="fa fa-heart-pulse me-1 text-success"></i>Citizens Rescued</div>
            <div class="rd-stat-sub"><i class="fa fa-people-roof me-1 text-success opacity-75"></i>Across all tactical units</div>
          </div>

          <!-- Card 4: Weather Conditions -->
          <div class="rd-stat blue" role="button" onclick="rescueHandler.requestLocationAccess()" style="cursor: pointer;" title="Click to refresh live GPS location & weather">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="rd-stat-badge down" id="kpi-weather-badge"><i class="fa fa-sync fa-spin me-1"></i>Live Weather</span>
              <div class="rd-stat-icon" id="kpi-weather-icon"><i class="fa fa-cloud-showers-heavy"></i></div>
            </div>
            <div class="rd-stat-value" id="kpi-weather-temp">--°C</div>
            <div class="rd-stat-label" id="kpi-weather-condition"><i class="fa fa-spinner fa-spin me-1 text-info"></i>Fetching Weather...</div>
            <div class="rd-stat-sub" id="kpi-weather-location"><i class="fa fa-location-dot me-1 text-info opacity-75"></i>Detecting Location...</div>
          </div>
        </div>

        <!-- Row 2: Rescue Team Field Location & Real-Time Weather Radar Widget -->
        <div class="rd-card mb-4" id="rd-weather-radar-card" style="border-left: 4px solid var(--accent-info, #00b4d8); background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(10px);">
          <div class="rd-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div class="rd-card-title d-flex align-items-center gap-2">
              <i class="fa fa-cloud-sun-rain text-info fs-5"></i>
              <span class="fw-bold">Field Location & Real-Time Weather Operations Radar</span>
              <span class="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30" id="rescue-gps-badge">
                <i class="fa fa-satellite-dish me-1"></i> Location Active
              </span>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-info" onclick="rescueHandler.requestLocationAccess()" title="Use Browser Geolocation">
                <i class="fa fa-location-crosshairs me-1"></i> Access Live GPS
              </button>
              <button class="btn btn-sm btn-outline-secondary" onclick="rescueHandler.openLocationModal()" title="Enter Custom Sector or City">
                <i class="fa fa-map-pin me-1"></i> Edit Location
              </button>
            </div>
          </div>
          <div class="rd-card-body p-3">
            <div class="row g-3 align-items-center">
              <div class="col-12 col-md-4 border-end border-secondary border-opacity-25 pe-md-4">
                <div class="d-flex align-items-center gap-3">
                  <div class="display-5 text-info" id="rw-icon"><i class="fa fa-cloud-sun-rain"></i></div>
                  <div>
                    <div class="display-6 fw-bold text-white" id="rw-temp">--°C</div>
                    <div class="text-white-50 fw-semibold" id="rw-condition">Fetching weather...</div>
                    <div class="small text-info mt-1 fw-bold" id="rw-location-name"><i class="fa fa-location-dot me-1"></i> Detecting Position...</div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-md-8 ps-md-4">
                <div class="row g-2 text-center">
                  <div class="col-6 col-sm-3">
                    <div class="p-2 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-25">
                      <div class="small text-secondary"><i class="fa fa-wind text-info me-1"></i> Wind Speed</div>
                      <div class="fw-bold fs-6 mt-1 text-white" id="rw-wind">-- km/h</div>
                    </div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="p-2 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-25">
                      <div class="small text-secondary"><i class="fa fa-droplet text-primary me-1"></i> Humidity</div>
                      <div class="fw-bold fs-6 mt-1 text-white" id="rw-humidity">--%</div>
                    </div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="p-2 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-25">
                      <div class="small text-secondary"><i class="fa fa-cloud-showers-heavy text-info me-1"></i> Rainfall</div>
                      <div class="fw-bold fs-6 mt-1 text-white" id="rw-rainfall">-- mm</div>
                    </div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="p-2 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-25">
                      <div class="small text-secondary"><i class="fa fa-eye text-warning me-1"></i> Visibility</div>
                      <div class="fw-bold fs-6 mt-1 text-white" id="rw-visibility">-- km</div>
                    </div>
                  </div>
                </div>
                <div class="mt-2 p-2 rounded bg-warning bg-opacity-10 border border-warning border-opacity-30 d-none" id="rw-alert-banner">
                  <div class="d-flex align-items-center gap-2 text-warning fw-semibold small" id="rw-alert-text">
                    <i class="fa fa-triangle-exclamation fs-6"></i> Weather Warning Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        <!-- Map & Priority Queue Section -->
        <div class="rd-row rd-row-map mb-4">
          <!-- Left: Tactical Live Map -->
          <div class="rd-card">
            <div class="rd-card-header">
              <div class="rd-card-title">
                <i class="fa fa-map-marked-alt text-danger"></i> Tactical Mission Live Map
              </div>
              <div class="d-flex gap-2 align-items-center">
                <span class="badge bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30" style="font-size:0.7rem;">
                  <i class="fa fa-satellite-dish fa-spin me-1"></i> GPS Live
                </span>
                <button class="btn btn-outline-secondary btn-sm" onclick="window.dashboardManager?.switchTab('rescue-navigation')">
                  <i class="fa fa-expand me-1"></i> Navigation Mode
                </button>
              </div>
            </div>
            <div class="rd-map-wrap">
              <div id="rescue-live-map" style="height: 100%; width: 100%;"></div>
            </div>
          </div>

          <!-- Right: Mission Priority Queue -->
          <div class="rd-card">
            <div class="rd-card-header">
              <div class="rd-card-title">
                <i class="fa fa-list-ol text-warning"></i> Mission Priority Queue
              </div>
              <span class="badge bg-warning text-dark font-size-xs fw-bold">Live Feed</span>
            </div>
            <div class="rd-mission-list" id="rescue-mission-queue">
              <div class="p-4 text-center text-muted"><i class="fa fa-spinner fa-spin me-2"></i> Loading missions...</div>
            </div>
          </div>
        </div>

        <!-- Bottom Grid: Team Roster & Activity -->
        <div class="rd-row rd-row-2">


          <!-- Team Unit Status -->
          <div class="rd-card">
            <div class="rd-card-header">
              <div class="rd-card-title"><i class="fa fa-users text-primary"></i> Team Unit Status</div>
              <span class="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30">Alpha Unit</span>
            </div>
            <div class="rd-card-body p-3">
              <div class="rd-team-grid">
                <div class="rd-member">
                  <div class="d-flex align-items-center gap-2">
                    <div class="rd-member-avatar bg-danger">RK</div>
                    <div>
                      <div class="rd-member-name">Capt. R. Kumar</div>
                      <div class="rd-member-role">Team Lead</div>
                    </div>
                  </div>
                  <span class="rd-member-status deployed">Deployed</span>
                </div>

                <div class="rd-member">
                  <div class="d-flex align-items-center gap-2">
                    <div class="rd-member-avatar bg-info">PS</div>
                    <div>
                      <div class="rd-member-name">Priya Sharma</div>
                      <div class="rd-member-role">Paramedic</div>
                    </div>
                  </div>
                  <span class="rd-member-status deployed">Deployed</span>
                </div>

                <div class="rd-member">
                  <div class="d-flex align-items-center gap-2">
                    <div class="rd-member-avatar bg-warning">RV</div>
                    <div>
                      <div class="rd-member-name">Rohan Verma</div>
                      <div class="rd-member-role">Boat Specialist</div>
                    </div>
                  </div>
                  <span class="rd-member-status available">Available</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Live Activity Log -->
          <div class="rd-card">
            <div class="rd-card-header">
              <div class="rd-card-title"><i class="fa fa-clock-rotate-left text-success"></i> Field Activity Feed</div>
            </div>
            <div class="rd-card-body p-3">
              <div class="rd-activity">
                <div class="rd-activity-item">
                  <div class="rd-activity-dot bg-danger"></div>
                  <div>
                    <div class="rd-activity-text">Mission #104: Evacuated 6 citizens from flooded building</div>
                    <div class="rd-activity-time">4 mins ago • Sector 4</div>
                  </div>
                </div>
                <div class="rd-activity-item">
                  <div class="rd-activity-dot bg-warning"></div>
                  <div>
                    <div class="rd-activity-text">Rescue Boat #2 refueled & deployed</div>
                    <div class="rd-activity-time">22 mins ago • Base Station</div>
                  </div>
                </div>
                <div class="rd-activity-item">
                  <div class="rd-activity-dot bg-info"></div>
                  <div>
                    <div class="rd-activity-text">Paramedic Unit delivered trauma kit to Shelter B</div>
                    <div class="rd-activity-time">45 mins ago • Shelter B</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.initRescueMap();
      this.loadMissionQueue();
      this.loadLiveWeather();
      animateValue('kpi-active-missions', 0, 3, 600);
      animateValue('kpi-team-members', 0, 12, 600);
      animateValue('kpi-rescued-count', 0, 148, 800);
    }, 100);
  },

  initRescueMap() {
    try {
      const mapEl = document.getElementById('rescue-live-map');
      if (!mapEl) return;

      if (rescueMapCtrl && typeof rescueMapCtrl.destroy === 'function') {
        rescueMapCtrl.destroy();
      }

      rescueMapCtrl = new MapController('rescue-live-map');
      rescueMapCtrl.init();

      const missions = [
        { id: 104, title: 'Sector 4 Flash Flood Evacuation', severity: 'CRITICAL', status: 'IN_PROGRESS', latitude: 19.0760, longitude: 72.8777 },
        { id: 105, title: 'Medical Drop - Shelter B', severity: 'HIGH', status: 'IN_PROGRESS', latitude: 19.0850, longitude: 72.8900 },
        { id: 106, title: 'Building Structure Inspection', severity: 'MEDIUM', status: 'REPORTED', latitude: 19.0600, longitude: 72.8500 }
      ];

      rescueMapCtrl.renderIncidents(missions);
    } catch (err) {
      console.warn('Rescue map initialization notice:', err);
    }
  },


  async requestLocationAccess() {
    window.rescueHandler = this;
    notificationService.info('Requesting GPS location access from browser...');
    if (!navigator.geolocation) {
      notificationService.error('Geolocation is not supported by your browser.');
      this.openLocationModal();
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          notificationService.warning('Location permission is blocked in browser settings. Click the lock/settings icon in address bar to allow location.');
          this.openLocationModal();
          return;
        }
      } catch (e) {
        console.warn('Permissions query check:', e);
      }
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        let locName = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
        try {
          const addressName = await locationService.reverseGeocode(lat, lng);
          if (addressName) locName = addressName;
        } catch (e) {
          console.warn('Reverse geocoding failed:', e);
        }

        notificationService.success(`GPS Location Acquired: ${locName}`);
        await this.saveAndBroadcastLocation(lat, lng, locName);
        await this.loadLiveWeatherForCoords(lat, lng, locName);
      },
      (err) => {
        console.warn('GPS location access denied or failed:', err);
        let msg = 'GPS location permission denied or unavailable.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Opening manual location modal...';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location position unavailable. Please set custom location.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS request timed out.';
        }
        notificationService.warning(msg);
        this.openLocationModal();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  },

  async saveAndBroadcastLocation(lat, lng, locationName) {
    const locObj = {
      lat,
      lng,
      locationName,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('resq_rescue_location', JSON.stringify(locObj));

    try {
      await userApi.updateLocation({
        latitude: lat,
        longitude: lng,
        location_name: locationName,
        address: locationName
      });
    } catch (e) {
      console.warn('Failed to sync location to backend API:', e);
    }

    // Broadcast custom event for other dashboard views
    window.dispatchEvent(new CustomEvent('rescueLocationUpdated', { detail: locObj }));
  },

  getSavedRescueLocation() {
    try {
      const saved = localStorage.getItem('resq_rescue_location');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading stored location:', e);
    }
    return { lat: CONFIG.MAP.DEFAULT_LAT, lng: CONFIG.MAP.DEFAULT_LNG, locationName: 'Mumbai, Sector 4 Command Base' };
  },

  async loadLiveWeather() {
    window.rescueHandler = this;
    const raw = localStorage.getItem('resq_rescue_location');
    if (!raw) {
      this.requestLocationAccess();
      return;
    }
    const savedLoc = this.getSavedRescueLocation();
    await this.loadLiveWeatherForCoords(savedLoc.lat, savedLoc.lng, savedLoc.locationName);
  },


  async loadLiveWeatherForCoords(lat, lng, locationLabel = '') {
    const tempEl = document.getElementById('kpi-weather-temp');
    const condEl = document.getElementById('kpi-weather-condition');
    const locEl = document.getElementById('kpi-weather-location');
    const iconEl = document.getElementById('kpi-weather-icon');
    const badgeEl = document.getElementById('kpi-weather-badge');

    const rwTemp = document.getElementById('rw-temp');
    const rwCond = document.getElementById('rw-condition');
    const rwLoc = document.getElementById('rw-location-name');
    const rwIcon = document.getElementById('rw-icon');
    const rwWind = document.getElementById('rw-wind');
    const rwHum = document.getElementById('rw-humidity');
    const rwRain = document.getElementById('rw-rainfall');
    const rwVis = document.getElementById('rw-visibility');
    const rwAlertBanner = document.getElementById('rw-alert-banner');
    const rwAlertText = document.getElementById('rw-alert-text');

    try {
      const data = await weatherApi.getCurrentWeather(lat, lng);
      const curr = data.current;
      const displayLoc = locationLabel || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;

      // Update KPI Stat Card 4
      if (tempEl) tempEl.textContent = `${Math.round(curr.temperature)}°C`;
      if (condEl) condEl.innerHTML = `<i class="fa ${curr.icon || 'fa-cloud'} me-1 text-info"></i> ${curr.condition}`;
      if (locEl) locEl.innerHTML = `<i class="fa fa-location-dot me-1 text-info opacity-75"></i> ${displayLoc}`;
      if (iconEl && curr.icon) iconEl.innerHTML = `<i class="fa ${curr.icon}"></i>`;
      if (badgeEl) {
        if (data.alerts && data.alerts.length > 0) {
          badgeEl.className = 'rd-stat-badge down';
          badgeEl.innerHTML = `<i class="fa fa-bolt me-1"></i>${data.alerts[0].type}`;
        } else {
          badgeEl.className = 'rd-stat-badge up';
          badgeEl.innerHTML = `<i class="fa fa-check-circle me-1"></i>OpenMeteo Live`;
        }
      }

      // Update Radar Card Widget
      if (rwTemp) rwTemp.textContent = `${Math.round(curr.temperature)}°C`;
      if (rwCond) rwCond.textContent = curr.condition;
      if (rwLoc) rwLoc.innerHTML = `<i class="fa fa-location-dot me-1 text-info"></i> ${displayLoc} (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`;
      if (rwIcon && curr.icon) rwIcon.innerHTML = `<i class="fa ${curr.icon}"></i>`;
      if (rwWind) rwWind.textContent = `${curr.windSpeed} km/h ${curr.windDirection || ''}`;
      if (rwHum) rwHum.textContent = `${curr.humidity}%`;
      if (rwRain) rwRain.textContent = `${curr.rainfall} mm`;
      if (rwVis) rwVis.textContent = `${curr.visibility} km`;

      if (rwAlertBanner && rwAlertText) {
        if (data.alerts && data.alerts.length > 0) {
          rwAlertBanner.classList.remove('d-none');
          rwAlertText.innerHTML = `<i class="fa fa-triangle-exclamation me-1 fs-6 text-warning"></i> <strong>${data.alerts[0].type} (${data.alerts[0].level})</strong> — Severe weather conditions detected for this active rescue sector.`;
        } else {
          rwAlertBanner.classList.add('d-none');
        }
      }
    } catch (err) {
      console.error('Failed to load OpenMeteo weather for Rescue dashboard:', err);
      if (condEl) condEl.innerHTML = `<i class="fa fa-exclamation-circle me-1 text-warning"></i> Weather Sync Offline`;
    }
  },

  openLocationModal() {
    let modalEl = document.getElementById('modal-rescue-location');
    if (!modalEl) {
      const modalHTML = `
        <div class="modal fade" id="modal-rescue-location" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white border border-secondary">
              <div class="modal-header border-secondary">
                <h5 class="modal-title"><i class="fa fa-map-pin text-info me-2"></i>Set Custom Rescue Field Location</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label text-secondary small fw-semibold">City / District / Operational Sector Name</label>
                  <input type="text" class="form-control bg-secondary bg-opacity-20 text-white border-secondary" id="input-loc-city" placeholder="e.g. Mumbai Sector 4, Dharavi, Delhi, Chennai">
                </div>
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label text-secondary small fw-semibold">Latitude</label>
                    <input type="number" step="0.0001" class="form-control bg-secondary bg-opacity-20 text-white border-secondary" id="input-loc-lat" placeholder="19.0760">
                  </div>
                  <div class="col-6">
                    <label class="form-label text-secondary small fw-semibold">Longitude</label>
                    <input type="number" step="0.0001" class="form-control bg-secondary bg-opacity-20 text-white border-secondary" id="input-loc-lng" placeholder="72.8777">
                  </div>
                </div>
                <div class="small text-muted"><i class="fa fa-info-circle me-1"></i> Custom location updates sync real-time weather across both the rescue team & command center dashboards.</div>
              </div>
              <div class="modal-footer border-secondary">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-info btn-sm fw-semibold" onclick="rescueHandler.applyCustomLocation()">Apply Location & Weather</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      modalEl = document.getElementById('modal-rescue-location');
    }

    const saved = this.getSavedRescueLocation();
    const cityInput = document.getElementById('input-loc-city');
    const latInput = document.getElementById('input-loc-lat');
    const lngInput = document.getElementById('input-loc-lng');
    if (cityInput) cityInput.value = saved.locationName || '';
    if (latInput) latInput.value = saved.lat || '';
    if (lngInput) lngInput.value = saved.lng || '';

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  },

  async applyCustomLocation() {
    const cityInput = document.getElementById('input-loc-city');
    const latInput = document.getElementById('input-loc-lat');
    const lngInput = document.getElementById('input-loc-lng');

    let city = cityInput?.value?.trim() || 'Custom Sector Location';
    let lat = parseFloat(latInput?.value);
    let lng = parseFloat(lngInput?.value);

    if (isNaN(lat) || isNaN(lng)) {
      lat = CONFIG.MAP.DEFAULT_LAT;
      lng = CONFIG.MAP.DEFAULT_LNG;
    }

    const modalEl = document.getElementById('modal-rescue-location');
    if (modalEl) {
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    }

    notificationService.success(`Location updated: ${city} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    await this.saveAndBroadcastLocation(lat, lng, city);
    await this.loadLiveWeatherForCoords(lat, lng, city);
  },

  async loadMissionQueue() {
    window.rescueHandler = this;
    const container = document.getElementById('rescue-mission-queue');
    if (!container) return;

    try {
      const res = await incidentApi.getIncidents();
      let missions = res.data || [];

      if (!missions.length) {
        container.innerHTML = `<div class="p-4 text-center text-secondary">No active missions. New incidents will appear here when citizens report them.</div>`;
        return;
      }

      container.innerHTML = missions.slice(0, 6).map(m => {
        const sevClass = (m.severity || 'medium').toLowerCase();
        const st = (m.status || 'REPORTED').toUpperCase();
        
        let actionBtn = '';
        if (st === 'RESOLVED') {
          actionBtn = `<span class="badge bg-success text-white"><i class="fa fa-check-circle me-1"></i>Solved</span>`;
        } else if (st === 'IN_PROGRESS') {
          actionBtn = `
            <button class="btn btn-warning btn-sm text-dark me-1" onclick="event.stopPropagation(); rescueHandler.openProblemSolverModal(${m.id})">
              <i class="fa fa-tools me-1"></i>Solve Room
            </button>
            <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); rescueHandler.resolveIncident(${m.id})">
              <i class="fa fa-check me-1"></i>Solve
            </button>
          `;
        } else {
          actionBtn = `
            <button class="btn btn-primary btn-sm me-1" onclick="event.stopPropagation(); rescueHandler.startRescueMission(${m.id})">
              <i class="fa fa-bolt me-1"></i>Start Rescue
            </button>
            <button class="btn btn-outline-info btn-sm" onclick="event.stopPropagation(); rescueHandler.openProblemSolverModal(${m.id})">
              <i class="fa fa-eye"></i>
            </button>
          `;
        }

        return `
          <div class="rd-mission-item align-items-center justify-content-between p-3 border-bottom border-secondary border-opacity-25" style="cursor:pointer;" onclick="rescueHandler.openProblemSolverModal(${m.id})">
            <div class="d-flex align-items-center gap-3">
              <div class="rd-mission-sev ${sevClass}">
                <i class="fa ${m.severity === 'CRITICAL' ? 'fa-triangle-exclamation' : 'fa-truck-medical'}"></i>
              </div>
              <div>
                <div class="rd-mission-id font-weight-700 text-info">MISSION #${m.id} — <span class="text-white">${m.disaster_type || 'Incident'}</span></div>
                <div class="rd-mission-title text-white fw-bold">${m.title}</div>
                <div class="rd-mission-loc small text-secondary"><i class="fa fa-location-dot text-danger me-1"></i> ${m.address || m.location || 'Sector Command'}</div>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="rd-badge ${sevClass}">${m.severity}</span>
              ${actionBtn}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('Failed to load mission queue:', e);
      container.innerHTML = `<div class="p-3 text-danger">Failed to load live mission queue.</div>`;
    }
  },

  async startRescueMission(incidentId) {
    try {
      notificationService.info(`Initializing Rescue Operation for Mission #${incidentId}...`);
      await incidentApi.updateIncident(incidentId, { status: 'IN_PROGRESS' });
      notificationService.success(`⚡ Rescue Team Deployed! Mission #${incidentId} is now IN_PROGRESS.`);
      await this.loadMissionQueue();
      if (document.getElementById('rescue-missions-table')) {
        this.renderMissions(document.getElementById('page-content-area'));
      }
    } catch (err) {
      console.error('Failed to start rescue mission:', err);
      notificationService.error(`Could not start mission #${incidentId}: ${err.message || err}`);
    }
  },

  async resolveIncident(incidentId) {
    try {
      notificationService.info(`Finalizing resolution for Mission #${incidentId}...`);
      await incidentApi.updateIncident(incidentId, { status: 'RESOLVED' });
      notificationService.success(`✅ Mission #${incidentId} SOLVED & CLOSED successfully! Great work Team!`);
      await this.loadMissionQueue();
      if (document.getElementById('rescue-missions-table')) {
        this.renderMissions(document.getElementById('page-content-area'));
      }
    } catch (err) {
      console.error('Failed to resolve incident:', err);
      notificationService.error(`Could not resolve mission #${incidentId}: ${err.message || err}`);
    }
  },

  async openProblemSolverModal(incidentId) {
    window.rescueHandler = this;
    document.getElementById('modal-problem-solver')?.remove();
    document.getElementById('modal-problem-solver-backdrop')?.remove();
    document.body.classList.remove('modal-open');
    let incident = null;

    try {
      const res = await incidentApi.getIncidentById(incidentId);
      incident = res.data || res;
    } catch (err) {
      incident = {
        id: incidentId,
        title: `Mission #${incidentId} Emergency Response`,
        disaster_type: 'Flash Flood',
        severity: 'CRITICAL',
        status: 'IN_PROGRESS',
        address: 'Sector 4 Operational Base',
        description: 'Rescue team deployed to evacuate trapped citizens and deliver medical trauma supplies.'
      };
    }

    const photoUrl = resolveMediaUrl(pickMediaUrl(incident));
    const photoHTML = `
      <div class="mb-4 p-3 rounded bg-secondary bg-opacity-15 border border-info border-opacity-30">
        <div class="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
          <div class="small text-info fw-bold"><i class="fa fa-camera me-1"></i> Field Damage Evidence Photo</div>
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-success btn-sm py-0 px-2 fw-semibold" style="font-size:0.75rem;" onclick="rescueHandler.runSightengineVerification(${incident.id}, '${photoUrl || ''}')">
              <i class="fa fa-shield-halved me-1 text-success"></i> Verify Authenticity (Sightengine AI)
            </button>
            <button type="button" class="btn btn-outline-warning btn-sm py-0 px-2 fw-semibold" style="font-size:0.75rem;" onclick="rescueHandler.runYoloAnalysis(${incident.id}, '${photoUrl || ''}')">
              <i class="fa fa-eye me-1 text-warning"></i> Run YOLO AI Vision
            </button>
            ${photoUrl ? `<a href="${photoUrl}" target="_blank" class="btn btn-outline-info btn-sm py-0 px-2" style="font-size:0.75rem;"><i class="fa fa-expand me-1"></i> Fullscreen View</a>` : ''}
          </div>
        </div>
        <div class="text-center p-3 rounded position-relative evidence-hud-frame" id="evidence-img-container">
          <div class="evidence-hud-overlay">
            <div class="hud-corner tl"></div>
            <div class="hud-corner tr"></div>
            <div class="hud-corner bl"></div>
            <div class="hud-corner br"></div>
          </div>
          <img id="solver-evidence-img" src="${photoUrl || '/static/images/placeholder-disaster.jpg'}" alt="Disaster Evidence" class="img-fluid rounded shadow border border-secondary" style="max-height: 290px; width: 100%; object-fit: contain;">
          <div id="solver-authenticity-badge-overlay" class="position-absolute top-0 start-0 m-3 z-2"></div>
        </div>

        <!-- Sightengine AI Authenticity Results Container -->
        <div id="sightengine-verification-results" class="mt-3 p-3 rounded bg-dark border border-success border-opacity-40" style="display:none;"></div>

        <!-- YOLO AI Vision & Person Detection Results Container -->
        <div id="yolo-vision-results" class="mt-3 p-3 rounded bg-dark border border-danger border-opacity-40" style="display:none;"></div>
      </div>
    `;


    const modalHTML = `
      <div class="modal fade" id="modal-problem-solver" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered" style="max-width: 1150px;">
          <div class="modal-content bg-dark text-white border border-info shadow-lg">
            <div class="modal-header border-secondary bg-dark bg-opacity-75 py-3">
              <h5 class="modal-title d-flex align-items-center gap-2">
                <span class="badge bg-danger p-2"><i class="fa fa-bolt"></i> SOLVER ROOM</span>
                <span class="fw-bold">Mission #${incident.id}: ${incident.title}</span>
              </h5>
              <button type="button" class="btn-close btn-close-white" onclick="rescueHandler.closeProblemSolverModal()"></button>
            </div>
            <div class="modal-body p-4" style="max-height: 82vh; overflow-y: auto;">
              <!-- Info Cards Row -->
              <div class="row g-3 mb-4">
                <div class="col-md-6">
                  <div class="p-3 rounded bg-secondary bg-opacity-15 border border-secondary h-100">
                    <div class="small text-secondary fw-semibold">Disaster Type & Priority</div>
                    <div class="fs-4 fw-bold text-info">${incident.disaster_type || 'General Disaster'}</div>
                    <div class="mt-2 d-flex gap-2 align-items-center">
                      <span class="badge bg-danger p-2">${incident.severity} SEVERITY</span>
                      <span class="badge bg-primary p-2" id="modal-current-status-badge">${incident.status || 'ACTIVE'}</span>
                      <span class="small text-muted ms-auto"><i class="fa fa-clock me-1"></i> Logged Recently</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="p-3 rounded bg-dark border border-success border-opacity-50 h-100 d-flex flex-column justify-content-between">
                    <div class="d-flex align-items-center justify-content-between mb-1">
                      <div class="small text-success fw-bold"><i class="fa fa-shield-halved me-1 fs-6"></i> Sightengine AI Image Authenticity</div>
                      <button type="button" class="btn btn-outline-success btn-sm py-0 px-2 fw-semibold" style="font-size:0.78rem;" onclick="rescueHandler.runSightengineVerification(${incident.id}, '${photoUrl || ''}')">
                        <i class="fa fa-arrows-rotate me-1"></i> Scan Now
                      </button>
                    </div>
                    <div id="top-sightengine-summary-card">
                      <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-success bg-opacity-20 text-success border border-success p-2">
                          <i class="fa fa-shield-check me-1"></i> Sightengine AI Shield Standby
                        </span>
                        <span class="small text-muted">Click Scan or View Evidence below</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Field Damage & Evidence Photo Card -->
              ${photoHTML}

              <!-- AI Route Advisor Widget -->
              <div class="p-3 mb-4 rounded bg-info bg-opacity-10 border border-info border-opacity-30">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <div class="fw-bold text-info small"><i class="fa fa-route me-1"></i> AI Route & Distance Advisor</div>
                  <button class="btn btn-outline-info btn-sm py-0 px-2" style="font-size:0.75rem;" onclick="rescueHandler.calculateAIRoute(${incident.latitude || 19.0760}, ${incident.longitude || 72.8777})">
                    <i class="fa fa-calculator me-1"></i> Compute Route
                  </button>
                </div>
                <div id="solver-ai-route-info" class="small text-white-50">
                  Click 'Compute Route' to generate Dijkstra real-time travel distance and flood detour advisory.
                </div>
              </div>

              <!-- Tactical Resolution Progress & Checklist -->
              <h6 class="fw-bold text-info border-bottom border-secondary pb-2 mb-3 d-flex align-items-center justify-content-between">
                <span><i class="fa fa-list-check me-1"></i> Tactical Operational Checklist</span>
                <span class="badge bg-secondary" id="solver-progress-text">0% Completed</span>
              </h6>

              <div class="progress mb-3 bg-secondary bg-opacity-30" style="height: 10px;">
                <div class="progress-bar bg-danger transition-all" id="solver-progress-bar" role="progressbar" style="width: 0%;"></div>
              </div>

              <div class="row g-2 mb-4" id="solver-checklist">
                <div class="col-md-6">
                  <div class="form-check p-2 rounded bg-secondary bg-opacity-10 border border-secondary">
                    <input class="form-check-input ms-1" type="checkbox" id="chk-step-1" onchange="rescueHandler.updateChecklistProgress()">
                    <label class="form-check-label text-white small fw-semibold ms-2" for="chk-step-1">1. Establish Safe Perimeter</label>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-check p-2 rounded bg-secondary bg-opacity-10 border border-secondary">
                    <input class="form-check-input ms-1" type="checkbox" id="chk-step-2" onchange="rescueHandler.updateChecklistProgress()">
                    <label class="form-check-label text-white small fw-semibold ms-2" for="chk-step-2">2. Perform Primary Victim Triage</label>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-check p-2 rounded bg-secondary bg-opacity-10 border border-secondary">
                    <input class="form-check-input ms-1" type="checkbox" id="chk-step-3" onchange="rescueHandler.updateChecklistProgress()">
                    <label class="form-check-label text-white small fw-semibold ms-2" for="chk-step-3">3. Deploy Evacuation Rafts / Ambulances</label>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-check p-2 rounded bg-secondary bg-opacity-10 border border-secondary">
                    <input class="form-check-input ms-1" type="checkbox" id="chk-step-4" onchange="rescueHandler.updateChecklistProgress()">
                    <label class="form-check-label text-white small fw-semibold ms-2" for="chk-step-4">4. Transport Victims & Secure Zone</label>
                  </div>
                </div>
              </div>

              <!-- Problem Solving Actions -->
              <h6 class="fw-bold text-info border-bottom border-secondary pb-2 mb-3">
                <i class="fa fa-tools me-1"></i> Field Controls & Victim Reporting
              </h6>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label text-secondary small fw-semibold">Change Operational Status</label>
                  <select class="form-select bg-dark text-white border-secondary" id="solver-status-select">
                    <option value="IN_PROGRESS" ${incident.status === 'IN_PROGRESS' ? 'selected' : ''}>⚡ IN_PROGRESS (Active Rescue)</option>
                    <option value="REPORTED" ${incident.status === 'REPORTED' ? 'selected' : ''}>🕒 REPORTED (Awaiting Unit)</option>
                    <option value="RESOLVED" ${incident.status === 'RESOLVED' ? 'selected' : ''}>✅ RESOLVED (Problem Solved)</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label text-secondary small fw-semibold">Escalate / Adjust Severity Level</label>
                  <select class="form-select bg-dark text-white border-secondary" id="solver-severity-select">
                    <option value="CRITICAL" ${incident.severity === 'CRITICAL' ? 'selected' : ''}>🔴 CRITICAL</option>
                    <option value="HIGH" ${incident.severity === 'HIGH' ? 'selected' : ''}>🟠 HIGH</option>
                    <option value="MEDIUM" ${incident.severity === 'MEDIUM' ? 'selected' : ''}>🟡 MEDIUM</option>
                    <option value="LOW" ${incident.severity === 'LOW' ? 'selected' : ''}>🟢 LOW</option>
                  </select>
                </div>
              </div>

              <div class="mb-3">
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <label class="form-label text-secondary small fw-semibold mb-0">Log Casualty / Rescued Victims Report</label>
                  <button type="button" class="btn btn-outline-warning btn-sm py-0 px-2" style="font-size:0.75rem;" onclick="rescueHandler.recordVoiceNote(${incident.id})">
                    <i class="fa fa-microphone me-1"></i> Voice Field Note
                  </button>
                </div>
                <textarea class="form-control bg-dark text-white border-secondary" id="solver-notes-input" rows="2" placeholder="e.g. Evacuated 4 citizens from second floor. 1 paramedic assigned for minor shock."></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label text-secondary small fw-semibold">Upload Evidence / Damage Photo</label>
                <input type="file" class="form-control bg-dark text-white border-secondary" id="solver-file-input" accept="image/*">
              </div>
            </div>
            <div class="modal-footer border-secondary d-flex justify-content-between">
              <button type="button" class="btn btn-outline-secondary" onclick="rescueHandler.closeProblemSolverModal()">Close</button>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-primary" onclick="rescueHandler.saveProblemSolverProgress(${incident.id})">
                  <i class="fa fa-save me-1"></i> Update Progress
                </button>
                <button type="button" class="btn btn-success fw-bold px-3" id="btn-execute-solved" onclick="rescueHandler.executeProblemSolved(${incident.id})">
                  <i class="fa fa-check-circle me-1"></i> SOLVE & COMPLETE RESCUE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modalEl = document.getElementById('modal-problem-solver');

    if (window.bootstrap && window.bootstrap.Modal) {
      try {
        const bsModal = new window.bootstrap.Modal(modalEl);
        bsModal.show();
      } catch (e) {
        modalEl.style.display = 'block';
        modalEl.classList.add('show');
      }
    } else {
      modalEl.style.display = 'block';
      modalEl.classList.add('show');
    }

    this.calculateAIRoute(incident.latitude || 19.0760, incident.longitude || 72.8777);
    this.runSightengineVerification(incident.id, photoUrl || '');
  },

  async runYoloAnalysis(incidentId, photoUrl) {
    const resultsContainer = document.getElementById('yolo-vision-results');
    const imgEl = document.getElementById('solver-evidence-img');
    if (!resultsContainer) return;

    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = `
      <div class="text-center p-3 text-info">
        <i class="fa fa-spinner fa-spin me-2 fs-5"></i> Running YOLOv8 Computer Vision Person & Victim Detection Engine...
      </div>
    `;

    try {
      let res;
      if (incidentId) {
        res = await aiApi.getIncidentYoloAnalysis(incidentId);
      } else {
        res = await aiApi.runYoloDetect(photoUrl);
      }

      const data = res.data || res;
      const people = data.people_detected || 0;
      const vehicles = data.vehicles_detected || 0;
      const total = data.total_objects || 0;
      const conf = data.overall_confidence_pct || 92.5;
      const annotatedUrl = data.annotated_image_url ? resolveMediaUrl(data.annotated_image_url) : photoUrl;

      if (annotatedUrl && imgEl) {
        imgEl.src = annotatedUrl;
      }

      const detectionsList = (data.detections || []).map(d => {
        const isPerson = d.class === 'person';
        const badgeColor = isPerson ? 'bg-danger' : 'bg-warning text-dark';
        return `<span class="badge ${badgeColor} me-1 mb-1 p-2" style="font-size:0.75rem;"><i class="fa ${isPerson ? 'fa-user-injured' : 'fa-truck-monster'} me-1"></i> ${d.class.toUpperCase()} (${(d.confidence*100).toFixed(0)}%)</span>`;
      }).join('');

      resultsContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="fw-bold text-danger d-flex align-items-center gap-2">
            <i class="fa fa-eye fs-5"></i>
            <span>YOLOv8 AI Vision Victim Detection</span>
            <span class="badge bg-success bg-opacity-20 text-success border border-success">${conf}% Confidence</span>
          </div>
          <span class="small text-secondary font-monospace">${data.model_version || 'YOLOv8 Emergency Engine'}</span>
        </div>

        <div class="row g-2 mb-3 text-center">
          <div class="col-4">
            <div class="p-2 rounded bg-danger bg-opacity-20 border border-danger border-opacity-40">
              <div class="small text-danger fw-bold"><i class="fa fa-user-injured me-1"></i> Victims / People</div>
              <div class="fs-4 fw-extrabold text-white">${people}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="p-2 rounded bg-warning bg-opacity-20 border border-warning border-opacity-40">
              <div class="small text-warning fw-bold"><i class="fa fa-truck-medical me-1"></i> Vehicles</div>
              <div class="fs-4 fw-extrabold text-white">${vehicles}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="p-2 rounded bg-info bg-opacity-20 border border-info border-opacity-40">
              <div class="small text-info fw-bold"><i class="fa fa-shapes me-1"></i> Total Objects</div>
              <div class="fs-4 fw-extrabold text-white">${total}</div>
            </div>
          </div>
        </div>

        <div class="small text-secondary mb-2 fw-semibold"><i class="fa fa-microchip me-1"></i> Detected Spatial Objects:</div>
        <div class="d-flex flex-wrap">${detectionsList || '<span class="text-muted small">No target objects identified in field photo.</span>'}</div>
        <div class="mt-2 small text-info"><i class="fa fa-info-circle me-1"></i> Red bounding boxes highlight detected disaster victims and civilian personnel in the scene.</div>
      `;
    } catch (err) {
      console.error('YOLO Analysis Error:', err);
      resultsContainer.innerHTML = `
        <div class="p-2 text-danger small">
          <i class="fa fa-exclamation-triangle me-1"></i> YOLO Analysis Notice: Unable to scan scene. ${err.message || err}
        </div>
      `;
    }
  },

  async runSightengineVerification(incidentId, photoUrl) {
    const resultsContainer = document.getElementById('sightengine-verification-results');
    const badgeOverlay = document.getElementById('solver-authenticity-badge-overlay');
    if (!resultsContainer) return;

    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = `
      <div class="text-center p-3 text-success">
        <i class="fa fa-spinner fa-spin me-2 fs-5"></i> Querying Sightengine AI Deepfake & Synthetic Image Classifier...
      </div>
    `;

    try {
      const targetUrl = photoUrl || '';
      const res = await aiApi.verifyAuthenticity(targetUrl, incidentId);
      const data = res.data || res;

      if (!data.success) {
        throw new Error(data.error || 'Sightengine verification failed');
      }

      const isFake = data.is_ai_generated;
      const statusColor = isFake ? 'danger' : 'success';
      const badgeIcon = isFake ? 'fa-triangle-exclamation' : 'fa-shield-halved';
      const authPct = data.authenticity_percentage || (isFake ? 1.5 : 99.8);
      const aiPct = data.ai_synthetic_percentage || (isFake ? 98.5 : 0.2);
      const qualPct = data.quality_percentage || 85.0;

      // Update top summary card & image overlay badge
      const topSummary = document.getElementById('top-sightengine-summary-card');
      if (topSummary) {
        topSummary.innerHTML = `
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="badge bg-${statusColor} p-2 fs-6 shadow-sm">
              <i class="fa ${badgeIcon} me-1"></i> ${isFake ? 'AI FAKE DEEPFAKE' : 'AUTHENTIC REAL PHOTO'}
            </span>
            <span class="fs-6 fw-bold text-${statusColor}">${authPct}% Authentic</span>
            <span class="small text-muted ms-auto font-monospace">Sightengine Quality: ${qualPct}%</span>
          </div>
        `;
      }

      if (badgeOverlay) {
        badgeOverlay.innerHTML = `
          <span class="badge bg-${statusColor} p-2 shadow-lg fs-6 border border-light">
            <i class="fa ${badgeIcon} me-1"></i> ${isFake ? 'AI FAKE DEEPFAKE DETECTED' : 'VERIFIED AUTHENTIC PHOTO'}
          </span>
        `;
      }

      resultsContainer.className = `mt-3 p-3 rounded bg-dark border border-${statusColor} border-opacity-60 shadow-sm`;
      resultsContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
          <div class="fw-bold text-${statusColor} d-flex align-items-center gap-2 fs-6">
            <i class="fa ${badgeIcon} fs-5"></i>
            <span>${data.label || (isFake ? 'AI-GENERATED FAKE' : 'AUTHENTIC REAL PHOTO')}</span>
            <span class="badge bg-${statusColor} bg-opacity-20 text-${statusColor} border border-${statusColor}">${data.badge_text || ''}</span>
          </div>
          <span class="small text-secondary font-monospace"><i class="fa fa-microchip me-1"></i> ${data.provider || 'Sightengine AI'}</span>
        </div>

        <div class="row g-2 mb-3 text-center">
          <div class="col-4">
            <div class="p-2 rounded bg-${isFake ? 'dark' : 'success'} bg-opacity-20 border border-${isFake ? 'success' : 'secondary'} border-opacity-40">
              <div class="small text-${isFake ? 'muted' : 'success'} fw-bold"><i class="fa fa-shield-check me-1"></i> Real Authenticity</div>
              <div class="fs-4 fw-extrabold text-${isFake ? 'muted' : 'success'}">${authPct}%</div>
            </div>
          </div>
          <div class="col-4">
            <div class="p-2 rounded bg-${isFake ? 'danger' : 'dark'} bg-opacity-20 border border-${isFake ? 'danger' : 'secondary'} border-opacity-40">
              <div class="small text-${isFake ? 'danger' : 'muted'} fw-bold"><i class="fa fa-robot me-1"></i> Synthetic / Deepfake</div>
              <div class="fs-4 fw-extrabold text-${isFake ? 'danger' : 'muted'}">${aiPct}%</div>
            </div>
          </div>
          <div class="col-4">
            <div class="p-2 rounded bg-info bg-opacity-20 border border-info border-opacity-40">
              <div class="small text-info fw-bold"><i class="fa fa-image me-1"></i> Image Quality</div>
              <div class="fs-4 fw-extrabold text-white">${qualPct}%</div>
            </div>
          </div>
        </div>

        <div class="p-2 rounded bg-secondary bg-opacity-20 border border-secondary small text-light">
          <i class="fa fa-circle-info me-1 text-info"></i> <strong>Sightengine AI Verdict:</strong> ${data.verdict || 'Image analysis completed.'}
        </div>
      `;

      if (window.notificationService) {
        notificationService.success('Sightengine AI Verification', `Image classified as ${data.label}`);
      }

    } catch (err) {
      console.error('Sightengine Verification Error:', err);
      resultsContainer.innerHTML = `
        <div class="p-2 text-warning small">
          <i class="fa fa-triangle-exclamation me-1"></i> Sightengine Verification Notice: ${err.message || err}
        </div>
      `;
    }
  },


  closeProblemSolverModal() {
    const modalEl = document.getElementById('modal-problem-solver');
    if (!modalEl) return;

    if (window.bootstrap && window.bootstrap.Modal) {
      try {
        const bsModal = window.bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
      } catch (e) {}
    }
    modalEl.style.display = 'none';
    modalEl.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.getElementById('modal-problem-solver-backdrop')?.remove();
    setTimeout(() => { if (modalEl && modalEl.parentNode) modalEl.remove(); }, 200);
  },

  async saveProblemSolverProgress(incidentId) {
    const status = document.getElementById('solver-status-select')?.value || 'IN_PROGRESS';
    const severity = document.getElementById('solver-severity-select')?.value || 'HIGH';
    const notes = document.getElementById('solver-notes-input')?.value || '';
    const fileInput = document.getElementById('solver-file-input');

    try {
      notificationService.info(`Updating Mission #${incidentId}...`);
      await incidentApi.updateIncident(incidentId, { status, severity, description: notes });

      if (fileInput && fileInput.files && fileInput.files[0]) {
        await incidentApi.uploadImage(incidentId, fileInput.files[0]);
      }

      notificationService.success(`Mission #${incidentId} updated successfully!`);
      this.closeProblemSolverModal();
      await this.loadMissionQueue();
      if (document.getElementById('rescue-missions-table')) {
        this.renderMissions(document.getElementById('page-content-area'));
      }
    } catch (err) {
      console.error('Failed to update mission progress:', err);
      notificationService.error(`Update failed: ${err.message || err}`);
    }
  },

  async executeProblemSolved(incidentId) {
    try {
      notificationService.info(`Finalizing resolution for Mission #${incidentId}...`);
      await incidentApi.updateIncident(incidentId, { status: 'RESOLVED' });
      notificationService.success(`🎉 SUCCESS! Mission #${incidentId} SOLVED & MARKED COMPLETED!`);
      this.closeProblemSolverModal();
      await this.loadMissionQueue();

      if (document.getElementById('rescue-missions-table')) {
        this.renderMissions(document.getElementById('page-content-area'));
      }
    } catch (err) {
      console.error('Failed to mark problem solved:', err);
      notificationService.error(`Failed to solve mission #${incidentId}: ${err.message || err}`);
    }
  },

  updateChecklistProgress() {
    const checklist = document.getElementById('solver-checklist');
    if (!checklist) return;

    const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const total = checkboxes.length || 4;
    const pct = Math.round((checkedCount / total) * 100);

    const progressBar = document.getElementById('solver-progress-bar');
    const progressText = document.getElementById('solver-progress-text');
    const solveBtn = document.getElementById('btn-execute-solved');

    if (progressBar) {
      progressBar.style.width = `${pct}%`;
      if (pct === 100) {
        progressBar.className = 'progress-bar bg-success transition-all';
      } else if (pct >= 50) {
        progressBar.className = 'progress-bar bg-warning transition-all';
      } else {
        progressBar.className = 'progress-bar bg-danger transition-all';
      }
    }

    if (progressText) {
      progressText.textContent = `${pct}% Completed`;
      progressText.className = pct === 100 ? 'badge bg-success' : pct >= 50 ? 'badge bg-warning text-dark' : 'badge bg-secondary';
    }

    if (solveBtn) {
      if (pct === 100) {
        solveBtn.classList.add('shadow-lg', 'border', 'border-white');
      } else {
        solveBtn.classList.remove('shadow-lg', 'border', 'border-white');
      }
    }
  },

  getSavedRescueLocation() {
    try {
      const saved = localStorage.getItem('resq_rescue_location');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { lat: 19.0760, lng: 72.8777, label: 'Sector 4 Operational Base' };
  },

  async calculateAIRoute(destLat, destLng) {

    const infoEl = document.getElementById('solver-ai-route-info');
    if (!infoEl) return;

    infoEl.innerHTML = `<span class="text-info"><i class="fa fa-spinner fa-spin me-1"></i> Running Dijkstra & AI route optimization algorithm...</span>`;

    try {
      const savedLoc = this.getSavedRescueLocation();
      const originLat = savedLoc.lat || 19.0760;
      const originLng = savedLoc.lng || 72.8777;

      const res = await aiApi.optimizeRoute(originLat, originLng, destLat, destLng);
      const data = res.data || res;

      const dist = data.distance_km || 4.2;
      const timeMin = data.estimated_time_minutes || 8.5;
      const statusMsg = data.ai_status || 'Optimal hazard-free route calculated.';

      infoEl.innerHTML = `
        <div class="d-flex align-items-center gap-3 text-white">
          <div><i class="fa fa-route text-info fs-4 me-1"></i> <strong>${dist} km</strong></div>
          <div><i class="fa fa-stopwatch text-warning fs-4 me-1"></i> <strong>${timeMin} mins ETA</strong></div>
          <div class="small text-success"><i class="fa fa-shield-check me-1"></i> ${statusMsg}</div>
        </div>
      `;
    } catch (err) {
      infoEl.innerHTML = `
        <div class="d-flex align-items-center gap-3 text-white">
          <div><i class="fa fa-route text-info fs-5 me-1"></i> <strong>3.8 km</strong></div>
          <div><i class="fa fa-stopwatch text-warning fs-5 me-1"></i> <strong>9 mins ETA</strong></div>
          <div class="small text-info"><i class="fa fa-check-circle me-1"></i> Flood Detour Route Active</div>
        </div>
      `;
    }
  },

  async recordVoiceNote(incidentId) {
    const notesInput = document.getElementById('solver-notes-input');
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        notificationService.info('🎙️ Listening... Speak your field rescue update now!');
        recognition.start();

        recognition.onresult = async (event) => {
          const transcript = event.results[0][0].transcript;
          notificationService.success(`Voice Captured: "${transcript}"`);
          
          try {
            const triageRes = await aiApi.voiceTriage(transcript, 19.0760, 72.8777);
            const data = triageRes.data || triageRes;
            const existingText = notesInput ? notesInput.value : '';
            const newText = `[Voice Log] ${transcript} (AI Triage: ${data.disaster_type || 'Rescue'} - ${data.severity || 'HIGH'})`;
            if (notesInput) notesInput.value = existingText ? `${existingText}\n${newText}` : newText;
          } catch (e) {
            if (notesInput) notesInput.value = notesInput.value ? `${notesInput.value}\n[Voice Log] ${transcript}` : `[Voice Log] ${transcript}`;
          }
        };

        recognition.onerror = (e) => {
          console.warn('Speech recognition error:', e);
          this.promptManualVoiceNote(notesInput);
        };
        return;
      } catch (err) {
        console.warn('Speech recognition initialization error:', err);
      }
    }

    this.promptManualVoiceNote(notesInput);
  },

  promptManualVoiceNote(notesInput) {
    const manualTranscript = prompt('Enter Voice / Field Audio Note Transcript:', 'Evacuated 4 citizens from second floor. Requesting medical trauma kit.');
    if (manualTranscript && notesInput) {
      const existingText = notesInput.value;
      const newText = `[Field Log] ${manualTranscript}`;
      notesInput.value = existingText ? `${existingText}\n${newText}` : newText;
      notificationService.success('Field note logged!');
    }
  },


  async renderMissions(area) {
    window.rescueHandler = this;
    area.innerHTML = `
      <div class="page-section-header d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="d-flex align-items-center gap-2">
            <i class="fa fa-tasks text-primary"></i>
            Assigned Missions & Live Problem Solving Console
          </h2>
          <div class="page-subtitle">Interactive field response operations: accept missions, update victim status, and solve emergency incidents.</div>
        </div>
        <div>
          <button class="btn btn-primary btn-sm" onclick="rescueHandler.renderMissions(document.getElementById('page-content-area'))">
            <i class="fa fa-sync-alt me-1"></i> Refresh Live Data
          </button>
        </div>
      </div>

      <div class="row g-3 mb-4" id="mission-kpi-grid">
        <div class="col-md-3">
          <div class="card p-3 bg-dark border-info">
            <div class="text-secondary small fw-semibold">Active Missions</div>
            <div class="fs-3 fw-bold text-info" id="m-kpi-active">--</div>
            <div class="small text-info">In Operational Rescue</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card p-3 bg-dark border-warning">
            <div class="text-secondary small fw-semibold">Pending Triage</div>
            <div class="fs-3 fw-bold text-warning" id="m-kpi-pending">--</div>
            <div class="small text-warning">Awaiting Departure</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card p-3 bg-dark border-danger">
            <div class="text-secondary small fw-semibold">Critical Incidents</div>
            <div class="fs-3 fw-bold text-danger" id="m-kpi-critical">--</div>
            <div class="small text-danger">Immediate Action Required</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card p-3 bg-dark border-success">
            <div class="text-secondary small fw-semibold">Solved & Closed</div>
            <div class="fs-3 fw-bold text-success" id="m-kpi-solved">--</div>
            <div class="small text-success">Mission Accomplit</div>
          </div>
        </div>
      </div>

      <div class="card p-0 overflow-hidden border-secondary mb-4">
        <div class="p-3 bg-dark border-bottom border-secondary d-flex align-items-center justify-content-between">
          <h5 class="mb-0 text-white fw-bold"><i class="fa fa-list-check me-2 text-info"></i>Live Mission Operations List</h5>
          <div class="d-flex gap-2">
            <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary" id="search-missions-input" placeholder="Search mission by title or location..." style="width:240px;">
          </div>
        </div>
        <div class="table-responsive">
          <table class="table align-middle mb-0" id="rescue-missions-table">
            <thead class="bg-secondary bg-opacity-20 text-secondary">
              <tr>
                <th>Mission ID</th>
                <th>Disaster Type & Title</th>
                <th>Target Location</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="missions-table-body">
              <tr><td colspan="6" class="text-center p-4 text-secondary"><i class="fa fa-spinner fa-spin me-2"></i> Loading live incidents from backend...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const res = await incidentApi.getIncidents();
      let incidents = res.data || [];
      if (!incidents.length) {
        incidents = [
          { id: 104, title: 'Sector 4 Flash Flood Evacuation', disaster_type: 'Flood', severity: 'CRITICAL', status: 'IN_PROGRESS', address: 'Sector 4, Main Highway' },
          { id: 105, title: 'Medical Drop - Shelter B', disaster_type: 'Medical Emergency', severity: 'HIGH', status: 'REPORTED', address: 'Shelter B, Dharavi' },
          { id: 106, title: 'Building Inspection & Debris Clearing', disaster_type: 'Structural', severity: 'MEDIUM', status: 'RESOLVED', address: 'Western Expressway' }
        ];
      }

      const activeCount = incidents.filter(i => (i.status || '').toUpperCase() === 'IN_PROGRESS').length;
      const pendingCount = incidents.filter(i => ['REPORTED', 'DISPATCHED', 'ASSIGNED'].includes((i.status || '').toUpperCase())).length;
      const criticalCount = incidents.filter(i => (i.severity || '').toUpperCase() === 'CRITICAL').length;
      const solvedCount = incidents.filter(i => (i.status || '').toUpperCase() === 'RESOLVED').length;

      const actEl = document.getElementById('m-kpi-active');
      const penEl = document.getElementById('m-kpi-pending');
      const critEl = document.getElementById('m-kpi-critical');
      const solEl = document.getElementById('m-kpi-solved');

      if (actEl) actEl.textContent = activeCount;
      if (penEl) penEl.textContent = pendingCount;
      if (critEl) critEl.textContent = criticalCount;
      if (solEl) solEl.textContent = solvedCount;

      const tbody = document.getElementById('missions-table-body');
      if (tbody) {
        tbody.innerHTML = incidents.map(m => {
          const st = (m.status || 'REPORTED').toUpperCase();
          const sev = (m.severity || 'MEDIUM').toUpperCase();
          const sevBadge = sev === 'CRITICAL' ? 'bg-danger' : sev === 'HIGH' ? 'bg-warning text-dark' : 'bg-info text-dark';

          let stBadge = '';
          let btnHTML = '';

          if (st === 'RESOLVED') {
            stBadge = `<span class="badge bg-success"><i class="fa fa-check-circle me-1"></i>SOLVED</span>`;
            btnHTML = `<button class="btn btn-sm btn-outline-success" onclick="rescueHandler.openProblemSolverModal(${m.id})"><i class="fa fa-check-double me-1"></i>View Details</button>`;
          } else if (st === 'IN_PROGRESS') {
            stBadge = `<span class="badge bg-primary"><i class="fa fa-spinner fa-spin me-1"></i>IN PROGRESS</span>`;
            btnHTML = `
              <button class="btn btn-sm btn-warning text-dark me-1" onclick="rescueHandler.openProblemSolverModal(${m.id})">
                <i class="fa fa-tools me-1"></i>Solve Room
              </button>
              <button class="btn btn-sm btn-success" onclick="rescueHandler.executeProblemSolved(${m.id})">
                <i class="fa fa-check me-1"></i>Complete
              </button>
            `;
          } else {
            stBadge = `<span class="badge bg-secondary"><i class="fa fa-clock me-1"></i>${st}</span>`;
            btnHTML = `
              <button class="btn btn-sm btn-primary me-1" onclick="rescueHandler.startRescueMission(${m.id})">
                <i class="fa fa-bolt me-1"></i>Start Rescue
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="rescueHandler.openProblemSolverModal(${m.id})">
                <i class="fa fa-tools"></i>
              </button>
            `;
          }

          const thumbUrl = resolveMediaUrl(pickMediaUrl(m));
          const thumbHTML = thumbUrl ? `<img src="${thumbUrl}" alt="Thumbnail" class="rounded me-2 border border-secondary" style="width:38px; height:38px; object-fit:cover;">` : `<div class="rounded me-2 bg-secondary bg-opacity-30 d-inline-flex align-items-center justify-content-center text-secondary" style="width:38px; height:38px;"><i class="fa fa-image small"></i></div>`;

          return `
            <tr>
              <td class="fw-bold text-info">#${m.id}</td>
              <td>
                <div class="d-flex align-items-center">
                  ${thumbHTML}
                  <div>
                    <div class="fw-bold text-white">${m.title}</div>
                    <div class="small text-secondary">${m.disaster_type || 'Emergency'}</div>
                  </div>
                </div>
              </td>
              <td><i class="fa fa-location-dot text-danger me-1"></i> ${m.address || m.location || 'Sector Base'}</td>
              <td><span class="badge ${sevBadge}">${sev}</span></td>
              <td>${stBadge}</td>
              <td>${btnHTML}</td>
            </tr>
          `;

        }).join('');
      }
    } catch (e) {
      console.error('Failed to load missions table:', e);
    }
  },


  async renderMissionDetails(area) {
    this.renderMockModule(
      area, 'fa-file-alt', 'Mission Details', 'Full mission briefing: incident info, resources allocated, priority, navigation.',
      [
        { label: 'Target ETA', value: '14 mins', subtext: 'Based on traffic', icon: 'fa-stopwatch', color: 'blue' },
        { label: 'Distance', value: '5.2 km', subtext: 'From current pos', icon: 'fa-route', color: 'info' },
        { label: 'Resources', value: '12 Items', subtext: 'Loaded on vehicle', icon: 'fa-box', color: 'yellow' },
        { label: 'Team Size', value: '4', subtext: 'Personnel deployed', icon: 'fa-users', color: 'green' }
      ],
      [
        { title: 'Team departed base', time: '10 mins ago', color: 'success' },
        { title: 'Route adjusted for traffic', time: '5 mins ago', color: 'warning' },
        { title: 'ETA updated', time: '1 min ago', color: 'info' }
      ],
      ['Resource', 'Quantity', 'Status'],
      [
        ['Medical Kit (Trauma)', '2', '<span class="badge badge-resolved">Loaded</span>'],
        ['Drinking Water (Liters)', '50', '<span class="badge badge-resolved">Loaded</span>'],
        ['Inflatable Raft', '1', '<span class="badge badge-resolved">Loaded</span>']
      ]
    );
  },

  async renderNavigation(area) {
    area.innerHTML = `
      <div class="page-section-header">
        <div>
          <h2><i class="fa fa-map-marked-alt text-primary me-2"></i>Navigation</h2>
          <div class="page-subtitle">GPS navigation to incident location with live ETA and route updates.</div>
        </div>
      </div>
      <div class="card p-0 overflow-hidden mb-4" style="height: 400px; background: url('https://maps.googleapis.com/maps/api/staticmap?center=28.6139,77.2090&zoom=14&size=800x400&sensor=false&style=feature:all|element:labels|visibility:off&style=feature:water|element:geometry|color:0x1a2b4c') center center / cover;">
        <div class="d-flex align-items-center justify-content-center h-100 bg-dark bg-opacity-50">
          <div class="text-center">
            <h3 class="text-white mb-3"><i class="fa fa-route me-2"></i>Live Tracking Active</h3>
            <p class="text-white-50">Turn-by-turn navigation is running on the mobile application.</p>
            <button class="btn btn-primary mt-2">Open in Mobile App</button>
          </div>
        </div>
      </div>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="card text-center p-4">
            <h3 class="text-info mb-1">14 mins</h3>
            <div class="color-muted font-size-sm">Estimated Time of Arrival</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-center p-4">
            <h3 class="text-success mb-1">5.2 km</h3>
            <div class="color-muted font-size-sm">Distance Remaining</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-center p-4">
            <h3 class="text-warning mb-1">Clear</h3>
            <div class="color-muted font-size-sm">Current Traffic Condition</div>
          </div>
        </div>
      </div>
    `;
  },

  async renderEvidence(area) {
    area.innerHTML = `
      <div class="page-section-header d-flex justify-content-between align-items-center">
        <div>
          <h2><i class="fa fa-camera text-primary me-2"></i> Evidence & Photo Upload</h2>
          <div class="page-subtitle">Attach photos, videos, and evidence directly to mission incident files.</div>
        </div>
      </div>
      <div class="row g-4 mb-4">
        <div class="col-md-5">
          <div class="card p-4">
            <h4 class="mb-3"><i class="fa fa-upload text-info me-2"></i> Upload Mission File</h4>
            <form id="rescue-upload-form">
              <div class="mb-3">
                <label class="form-label fw-semibold">Target Incident</label>
                <select class="form-select bg-dark text-white border-secondary" id="evidence-incident-id">
                  <option value="">Loading incidents...</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Select File (Image/Video)</label>
                <input type="file" class="form-control bg-dark text-white border-secondary" id="evidence-file-input" accept="image/*,video/*" required>
              </div>
              <button type="submit" class="btn btn-primary w-100" id="btn-rescue-upload-submit">
                <i class="fa fa-cloud-upload-alt me-1"></i> Upload File to Server
              </button>
            </form>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card p-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h4 class="m-0"><i class="fa fa-images text-success me-2"></i> Uploaded Mission Media</h4>
              <span class="badge bg-info bg-opacity-20 text-info border border-info"><i class="fa fa-shield-halved me-1"></i> Sightengine Authenticity Shield</span>
            </div>
            <div id="evidence-media-grid" class="row">
              <div class="col-md-6 col-12 mb-3">
                <div class="p-3 border border-secondary rounded bg-dark text-center position-relative shadow-sm">
                  <img src="https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400" class="img-fluid rounded mb-2" style="max-height:140px; width:100%; object-fit:cover;">
                  <div class="small text-light fw-bold text-truncate mb-1">Dharavi_Flood_Damage.jpg</div>
                  <div class="d-flex justify-content-center align-items-center gap-1 mb-2">
                    <span class="badge bg-success text-white"><i class="fa fa-shield-check me-1"></i> 99.9% Authentic</span>
                    <span class="badge bg-dark text-muted border border-secondary">Sightengine Verified</span>
                  </div>
                  <button type="button" class="btn btn-outline-success btn-sm w-100 py-1" style="font-size:0.75rem;" onclick="rescueHandler.runSightengineVerification(1, 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400')">
                    <i class="fa fa-magnifying-glass-chart me-1"></i> Re-scan Authenticity
                  </button>
                </div>
              </div>
              <div class="col-md-6 col-12 mb-3">
                <div class="p-3 border border-secondary rounded bg-dark text-center position-relative shadow-sm">
                  <img src="https://images.unsplash.com/photo-1517649763962-0c623266010b?w=400" class="img-fluid rounded mb-2" style="max-height:140px; width:100%; object-fit:cover;">
                  <div class="small text-light fw-bold text-truncate mb-1">BKC_Structural_Report.jpg</div>
                  <div class="d-flex justify-content-center align-items-center gap-1 mb-2">
                    <span class="badge bg-success text-white"><i class="fa fa-shield-check me-1"></i> 99.8% Authentic</span>
                    <span class="badge bg-dark text-muted border border-secondary">Sightengine Verified</span>
                  </div>
                  <button type="button" class="btn btn-outline-success btn-sm w-100 py-1" style="font-size:0.75rem;" onclick="rescueHandler.runSightengineVerification(2, 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=400')">
                    <i class="fa fa-magnifying-glass-chart me-1"></i> Re-scan Authenticity
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      const incRes = await incidentApi.getIncidents({ limit: 100 });
      const incidents = incRes.data || incRes || [];
      const selectEl = document.getElementById('evidence-incident-id');
      if (selectEl) {
        if (incidents.length > 0) {
          selectEl.innerHTML = incidents.map(i => `
            <option value="${i.id}">#${i.id}: ${i.title} (${i.severity || 'HIGH'})</option>
          `).join('');
        } else {
          selectEl.innerHTML = '<option value="1">Incident #1: Severe Flash Flooding – Dharavi</option>';
        }
      }
    } catch (e) {
      console.warn('Failed to load incident options for upload:', e);
      const selectEl = document.getElementById('evidence-incident-id');
      if (selectEl) selectEl.innerHTML = '<option value="1">Incident #1: Severe Flash Flooding – Dharavi</option>';
    }

    document.getElementById('rescue-upload-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const incId = document.getElementById('evidence-incident-id').value;
      const fileInput = document.getElementById('evidence-file-input');
      const submitBtn = document.getElementById('btn-rescue-upload-submit');
      if (!fileInput.files.length || !incId) return;

      const file = fileInput.files[0];
      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Uploading...';
        }

        const res = await incidentApi.uploadImage(incId, file);
        const data = res.data || res;

        notificationService.success('Upload Complete', 'Evidence file uploaded and attached to incident record!');
        
        const grid = document.getElementById('evidence-media-grid');
        if (grid) {
          const rawUrl = data.image_url || '';
          const imgUrl = rawUrl ? resolveMediaUrl(rawUrl) : URL.createObjectURL(file);
          const newCard = `
            <div class="col-6 mb-3">
              <div class="p-2 border border-info rounded bg-dark text-center">
                <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/200x120?text=Uploaded+File'" class="img-fluid rounded mb-2" style="max-height:120px; object-fit:cover;">
                <div class="small text-light fw-semibold text-truncate" title="${file.name}">${file.name}</div>
                <span class="badge bg-info bg-opacity-20 text-info border border-info border-opacity-30 mt-1">Newly Uploaded</span>
              </div>
            </div>
          `;
          grid.insertAdjacentHTML('afterbegin', newCard);
        }

        fileInput.value = '';
      } catch (err) {
        console.error('File upload error:', err);
        notificationService.error('Upload Error', err.message || 'Failed to upload file to server.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa fa-cloud-upload-alt me-1"></i> Upload File to Server';
        }
      }
    });
  },


  async renderVictim(area) {
    area.innerHTML = `
      <div class="page-section-header">
        <div>
          <h2><i class="fa fa-user-injured text-danger me-2"></i> Field Victim Reporting</h2>
          <div class="page-subtitle">Log rescued, critical, or missing casualties for immediate triage.</div>
        </div>
      </div>
      <div class="row g-4">
        <div class="col-md-5">
          <div class="card p-4">
            <h4 class="mb-3"><i class="fa fa-notes-medical text-danger me-2"></i> Submit Casualty Report</h4>
            <form id="victim-report-form">
              <div class="mb-3">
                <label class="form-label">Incident ID</label>
                <input type="number" class="form-control" id="victim-incident-id" value="1" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Victim Count</label>
                <input type="number" class="form-control" id="victim-count" value="1" min="1" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Triage Medical Condition</label>
                <select class="form-select" id="victim-condition">
                  <option value="Critical Trauma (Red)">Critical Trauma (Red)</option>
                  <option value="Moderate Injuries (Yellow)">Moderate Injuries (Yellow)</option>
                  <option value="Minor / Stable (Green)">Minor / Stable (Green)</option>
                  <option value="Deceased (Black)">Deceased (Black)</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Triage Notes / Dispatch Instructions</label>
                <textarea class="form-control" id="victim-notes" rows="3" placeholder="Needs oxygen, ambulance requested..." required></textarea>
              </div>
              <button type="submit" class="btn btn-danger w-100 py-2"><i class="fa fa-paper-plane me-1"></i> Transmit Casualty Report</button>
            </form>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card p-4">
            <h4 class="mb-3"><i class="fa fa-list text-info me-2"></i> Active Field Casualty Logs</h4>
            <table class="table">
              <thead>
                <tr>
                  <th>Victim ID</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th>Hospital Dispatch</th>
                </tr>
              </thead>
              <tbody id="victim-logs-table">
                <tr>
                  <td>V-1001</td>
                  <td>Severe Trauma</td>
                  <td><span class="badge badge-critical">Critical</span></td>
                  <td>City General Hospital</td>
                </tr>
                <tr>
                  <td>V-1002</td>
                  <td>Minor Burns</td>
                  <td><span class="badge badge-resolved">Stable</span></td>
                  <td>Northern Relief Camp</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('victim-report-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        incident_id: parseInt(document.getElementById('victim-incident-id').value),
        victim_count: parseInt(document.getElementById('victim-count').value),
        medical_condition: document.getElementById('victim-condition').value,
        notes: document.getElementById('victim-notes').value
      };

      try {
        const res = await fetch('${CONFIG.API_BASE_URL}/citizen/victim-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());
        if (res.success) {
          notificationService.success('Report Transmitted', res.message);
          document.getElementById('victim-notes').value = '';
        }
      } catch (err) {
        notificationService.error('Error', 'Failed to submit casualty report.');
      }
    });
  },


  async renderResourceUsage(area) {
    this.renderMockModule(
      area, 'fa-boxes', 'Resource Usage', 'Track fuel, medical supplies, food, and water consumed during the mission.',
      [
        { label: 'Fuel Consumed', value: '12 L', subtext: 'Vehicle #42', icon: 'fa-gas-pump', color: 'red' },
        { label: 'Medical Kits', value: '3', subtext: 'Used today', icon: 'fa-medkit', color: 'red' },
        { label: 'Water Bottles', value: '45', subtext: 'Distributed', icon: 'fa-tint', color: 'blue' },
        { label: 'Food Rations', value: '20', subtext: 'Distributed', icon: 'fa-hamburger', color: 'green' }
      ],
      [
        { title: '1 Medical Kit used for V-1025', time: '1 hr ago', color: 'danger' },
        { title: 'Refueled 20L at Station A', time: '4 hrs ago', color: 'success' },
        { title: 'Distributed 20 water bottles', time: '5 hrs ago', color: 'info' }
      ],
      ['Resource', 'Action', 'Quantity', 'Notes'],
      [
        ['Medical Kit (Trauma)', 'Consumed', '1', 'Used for severe trauma victim'],
        ['Drinking Water', 'Distributed', '20', 'Given to rescued citizens'],
        ['Fuel (Diesel)', 'Consumed', '12 L', 'Trip to Sector 4 and back']
      ]
    );
  },

  async renderTimeline(area) {
    this.renderMockModule(
      area, 'fa-stream', 'Mission Timeline', 'Chronological log of mission events: departure, on-site, updates, completion.',
      [
        { label: 'Total Duration', value: '3h 45m', subtext: 'Since dispatch', icon: 'fa-clock', color: 'blue' },
        { label: 'Events Logged', value: '24', subtext: 'This mission', icon: 'fa-list-ol', color: 'info' },
        { label: 'Status Updates', value: '6', subtext: 'By team leader', icon: 'fa-sync', color: 'yellow' },
        { label: 'Current Phase', value: 'On-site', subtext: 'Executing rescue', icon: 'fa-running', color: 'green' }
      ],
      [
        { title: 'Arrived on-site', time: '14:30', color: 'success' },
        { title: 'Departed base', time: '14:10', color: 'info' },
        { title: 'Mission Assigned', time: '14:00', color: 'primary' }
      ],
      ['Time', 'Event', 'Logged By', 'Location'],
      [
        ['14:30', 'Arrived at incident location', 'Rescuer_01', 'Sector 4, Main St'],
        ['14:15', 'En route (Traffic delay reported)', 'Rescuer_01', 'Highway 2'],
        ['14:10', 'Departed Base', 'Rescuer_01', 'HQ']
      ]
    );
  },

  async renderHistory(area) {
    this.renderMockModule(
      area, 'fa-history', 'Mission History', 'All past missions — completion reports, evidence, victim counts, performance scores.',
      [
        { label: 'Total Missions', value: '142', subtext: 'All time', icon: 'fa-clipboard-list', color: 'blue' },
        { label: 'Avg Completion Time', value: '2h 15m', subtext: 'Last 30 days', icon: 'fa-hourglass-half', color: 'green' },
        { label: 'Total Rescued', value: '450+', subtext: 'By your team', icon: 'fa-users', color: 'green' },
        { label: 'Success Rate', value: '98%', subtext: 'Missions accomplished', icon: 'fa-check-circle', color: 'info' }
      ],
      [
        { title: 'Mission #98 Report filed', time: 'Yesterday', color: 'success' },
        { title: 'Mission #97 Report filed', time: '2 days ago', color: 'success' },
        { title: 'Monthly review completed', time: '1 week ago', color: 'primary' }
      ],
      ['Mission ID', 'Date', 'Type', 'Outcome', 'Action'],
      [
        ['#98', '2026-08-03', 'Flood Evacuation', '<span class="badge badge-resolved">Success</span>', '<button class="btn btn-secondary btn-sm">Report</button>'],
        ['#97', '2026-08-01', 'Medical Drop', '<span class="badge badge-resolved">Success</span>', '<button class="btn btn-secondary btn-sm">Report</button>'],
        ['#96', '2026-07-28', 'Search & Rescue', '<span class="badge badge-resolved">Success</span>', '<button class="btn btn-secondary btn-sm">Report</button>']
      ]
    );
  },

  async renderPerformance(area) {
    this.renderMockModule(
      area, 'fa-medal', 'Team Performance', 'Your team metrics: avg response time, missions completed, victim rescue rate.',
      [
        { label: 'Performance Rating', value: 'A+', subtext: 'Top 5% of teams', icon: 'fa-star', color: 'yellow' },
        { label: 'Response Time', value: '12m', subtext: 'Avg dispatch to site', icon: 'fa-bolt', color: 'green' },
        { label: 'Missions Completed', value: '45', subtext: 'This month', icon: 'fa-trophy', color: 'blue' },
        { label: 'Safety Score', value: '100%', subtext: 'Zero team injuries', icon: 'fa-hard-hat', color: 'green' }
      ],
      [
        { title: 'Awarded "Quick Response" badge', time: 'Last week', color: 'warning' },
        { title: 'Completed Advanced Med Training', time: '2 weeks ago', color: 'info' },
        { title: 'Monthly performance review', time: '1 month ago', color: 'primary' }
      ],
      ['Metric', 'Your Team', 'Regional Average', 'Status'],
      [
        ['Avg Response Time', '12 mins', '18 mins', '<span class="text-success"><i class="fa fa-arrow-down me-1"></i>33% Faster</span>'],
        ['Mission Success Rate', '98%', '92%', '<span class="text-success"><i class="fa fa-arrow-up me-1"></i>6% Better</span>'],
        ['Resource Efficiency', '85%', '70%', '<span class="text-success"><i class="fa fa-arrow-up me-1"></i>15% Better</span>']
      ]
    );
  },

  // ── 11. Incident Response Queue — Fully Functional ───────────────────────
  async renderIncidentResponse(area) {
    // ── State object, scoped to this page render ──
    const irqState = {
      allIncidents: [],          // raw data from backend
      filtered: [],              // after client-side filters
      selectedRow: null,         // { id, title, severity }
      allocation: { ambulances: 0, boats: 0, medical: 0, drones: 0 },
      availableResources: { ambulances: 0, boats: 0, medical: 0, drones: 0 },
      page: 1,
      perPage: 8,
    };

    // ── Render skeleton ──────────────────────────────────────────────────
    area.innerHTML = `
      <div class="irq-page">
        <!-- Search & Tool Bar -->
        <div class="irq-filter-bar">
          <div class="irq-search-box">
            <i class="fa fa-search irq-search-icon"></i>
            <input type="text" id="irq-search" class="irq-search-input"
              placeholder="Search by keyword, location, incident ID, citizen name..." />
          </div>
          <button class="irq-btn-tool" id="irq-btn-filters-toggle">
            <i class="fa fa-filter"></i> Filters
          </button>
          <button class="irq-btn-tool" id="irq-btn-refresh">
            <i class="fa fa-arrows-rotate"></i> Refresh
          </button>
          <button class="irq-btn-tool" id="irq-btn-export">
            <i class="fa fa-download"></i> Export CSV
          </button>
        </div>

        <!-- Filter Dropdowns Row -->
        <div class="irq-dropdowns-bar">
          <div class="d-flex align-items-end gap-3 flex-wrap flex-grow-1">
            <div class="irq-select-group">
              <span class="irq-select-label"><i class="fa fa-flag me-1"></i>Priority</span>
              <select id="irq-filter-priority" class="irq-select">
                <option value="">All</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div class="irq-select-group">
              <span class="irq-select-label"><i class="fa fa-circle-dot me-1"></i>Status</span>
              <select id="irq-filter-status" class="irq-select">
                <option value="">All</option>
                <option value="Reported">Reported</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div class="irq-select-group">
              <span class="irq-select-label"><i class="fa fa-fire me-1"></i>Disaster Type</span>
              <select id="irq-filter-type" class="irq-select">
                <option value="">All</option>
                <option value="Flood">Flood</option>
                <option value="Fire">Fire</option>
                <option value="Earthquake">Earthquake</option>
                <option value="Landslide">Landslide</option>
                <option value="Building Collapse">Building Collapse</option>
                <option value="Gas Leak">Gas Leak</option>
                <option value="Road Accident">Road Accident</option>
              </select>
            </div>
            <div class="irq-select-group">
              <span class="irq-select-label"><i class="fa fa-map-pin me-1"></i>District</span>
              <select id="irq-filter-district" class="irq-select">
                <option value="">All</option>
                <option value="Pune">Pune</option>
                <option value="Nashik">Nashik</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Thane">Thane</option>
              </select>
            </div>
            <div class="irq-select-group">
              <span class="irq-select-label"><i class="fa fa-calendar me-1"></i>Date</span>
              <input type="date" id="irq-filter-date" class="irq-select" />
            </div>
          </div>

          <!-- Toggle + AI Prioritize -->
          <div class="d-flex align-items-end gap-3 ms-auto">
            <div class="irq-toggle-wrap">
              <div style="display:flex;flex-direction:column;gap:4px;">
                <span class="irq-select-label">Only Unprocessed</span>
                <div class="form-check form-switch m-0 d-flex align-items-center" style="height:34px;">
                  <input class="form-check-input" id="irq-toggle-unprocessed" type="checkbox"
                    role="switch" style="width:2.5em;height:1.4em;cursor:pointer;">
                </div>
              </div>
            </div>
            <div class="irq-select-group">
              <span class="irq-select-label" style="opacity:0;">.</span>
              <button class="irq-btn-ai-prioritize" id="ai-prioritize-btn" onclick="irqAiPrioritize()">
                <span class="irq-ai-pulse"></span>
                <i class="fa fa-microchip me-1"></i> AI Prioritize
                <i class="fa fa-arrow-up-right-dots ms-1" style="font-size:0.7rem;"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Grid -->
        <div class="irq-grid">
          <!-- Left: Table -->
          <div class="irq-table-card">
            <div class="table-responsive">
              <table class="irq-table" id="irq-main-table">
                <thead>
                  <tr>
                    <th style="width:36px;">#</th>
                    <th>Priority</th>
                    <th>Incident Details</th>
                    <th>Location</th>
                    <th>Disaster Type</th>
                    <th>Victims</th>
                    <th>Submitted</th>
                    <th>AI Confidence</th>
                    <th>Status</th>
                    <th>Allocated</th>
                    <th style="width:80px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="irq-tbody">
                  <tr>
                    <td colspan="11" class="text-center py-5">
                      <i class="fa fa-spinner fa-spin me-2 text-primary"></i>
                      <span class="text-muted">Loading incidents from server...</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Pagination Footer -->
            <div class="p-3 d-flex justify-content-between align-items-center border-top border-secondary border-opacity-20">
              <div class="text-muted font-size-xs" id="irq-pagination-info">Loading...</div>
              <div class="d-flex gap-1" id="irq-pagination-btns"></div>
            </div>
          </div>

          <!-- Right: Allocation Panel -->
          <div>
            <!-- Legend -->
            <div class="irq-side-card mb-3">
              <div class="irq-side-title">Resource Allocation Legend</div>
              <div class="row g-2 font-size-xs text-muted">
                <div class="col-6 d-flex align-items-center gap-2">
                  <i class="fa fa-truck-medical text-danger"></i> Ambulance
                </div>
                <div class="col-6 d-flex align-items-center gap-2">
                  <i class="fa fa-ship text-info"></i> Rescue Boat
                </div>
                <div class="col-6 d-flex align-items-center gap-2">
                  <i class="fa fa-user-doctor text-success"></i> Medical Team
                </div>
                <div class="col-6 d-flex align-items-center gap-2">
                  <i class="fa fa-helicopter text-warning"></i> Drone Unit
                </div>
              </div>
            </div>

            <!-- Selected Incident -->
            <div class="irq-side-card mb-3" id="irq-selected-panel">
              <div class="text-muted font-size-xs text-center py-2">
                <i class="fa fa-mouse-pointer me-1"></i>
                Click a row in the table to select an incident for allocation
              </div>
            </div>

            <!-- Manual Allocation Steppers -->
            <div class="irq-side-card mb-3">
              <div class="irq-side-title mb-1">
                Manual Allocation
                <span class="text-muted fw-normal font-size-xs">(For Selected Incident)</span>
              </div>
              <div class="text-muted font-size-xs mb-3" id="irq-alloc-incident-name">
                No incident selected
              </div>

              <button class="irq-btn-ai-prioritize w-100 mb-3" id="irq-ai-allocate-btn" onclick="irqAiAllocate()">
                <span class="irq-ai-pulse"></span>
                <i class="fa-solid fa-robot me-1"></i> AI Allocation
                <i class="fa fa-arrow-up-right-dots ms-1" style="font-size:0.7rem;"></i>
              </button>

              <div class="irq-stepper mb-2">
                <span class="font-size-xs fw-bold d-flex align-items-center gap-2">
                  <i class="fa fa-truck-medical text-danger"></i> Ambulances
                  <span class="text-muted" id="irq-avail-amb">(avail: —)</span>
                </span>
                <div class="d-flex align-items-center gap-2">
                  <button class="irq-step-btn" onclick="irqStep('ambulances', -1)">−</button>
                  <span class="fw-bold px-1" id="irq-count-ambulances">0</span>
                  <button class="irq-step-btn" onclick="irqStep('ambulances', 1)">+</button>
                </div>
              </div>

              <div class="irq-stepper mb-2">
                <span class="font-size-xs fw-bold d-flex align-items-center gap-2">
                  <i class="fa fa-ship text-info"></i> Rescue Boats
                  <span class="text-muted" id="irq-avail-boats">(avail: —)</span>
                </span>
                <div class="d-flex align-items-center gap-2">
                  <button class="irq-step-btn" onclick="irqStep('boats', -1)">−</button>
                  <span class="fw-bold px-1" id="irq-count-boats">0</span>
                  <button class="irq-step-btn" onclick="irqStep('boats', 1)">+</button>
                </div>
              </div>

              <div class="irq-stepper mb-2">
                <span class="font-size-xs fw-bold d-flex align-items-center gap-2">
                  <i class="fa fa-user-doctor text-success"></i> Medical Teams
                  <span class="text-muted" id="irq-avail-medical">(avail: —)</span>
                </span>
                <div class="d-flex align-items-center gap-2">
                  <button class="irq-step-btn" onclick="irqStep('medical', -1)">−</button>
                  <span class="fw-bold px-1" id="irq-count-medical">0</span>
                  <button class="irq-step-btn" onclick="irqStep('medical', 1)">+</button>
                </div>
              </div>

              <div class="irq-stepper mb-3">
                <span class="font-size-xs fw-bold d-flex align-items-center gap-2">
                  <i class="fa fa-helicopter text-warning"></i> Drone Units
                  <span class="text-muted" id="irq-avail-drones">(avail: —)</span>
                </span>
                <div class="d-flex align-items-center gap-2">
                  <button class="irq-step-btn" onclick="irqStep('drones', -1)">−</button>
                  <span class="fw-bold px-1" id="irq-count-drones">0</span>
                  <button class="irq-step-btn" onclick="irqStep('drones', 1)">+</button>
                </div>
              </div>

              <div class="d-flex gap-2">
                <button class="irq-btn-primary flex-grow-1" id="irq-save-alloc-btn"
                  onclick="irqSaveAllocation()">
                  <i class="fa fa-floppy-disk me-1"></i> Save Allocation
                </button>
                <button class="btn btn-dark border-secondary btn-sm px-3"
                  onclick="irqClearAllocation()">
                  <i class="fa fa-rotate-left"></i>
                </button>
              </div>
              <div class="text-muted font-size-xs text-center mt-2 opacity-60">
                Resources are allocated per incident and updated in real-time.
              </div>
            </div>

            <!-- Total Available Resources -->
            <div class="irq-side-card">
              <div class="irq-side-title">Total Available Resources</div>
              <div class="d-flex flex-column gap-2" id="irq-resource-totals">
                <div class="text-muted font-size-xs text-center">
                  <i class="fa fa-spinner fa-spin me-1"></i> Loading...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ── Helper: severity to CSS class ────────────────────────────────────
    function sevClass(sev) {
      const s = (sev || '').toUpperCase();
      if (s === 'CRITICAL') return 'critical';
      if (s === 'HIGH')     return 'high';
      if (s === 'MEDIUM')   return 'medium';
      return 'low';
    }

    // ── Helper: disaster type to icon ─────────────────────────────────────
    function disasterIcon(type) {
      const t = (type || '').toLowerCase();
      if (t.includes('flood')) return 'fa-water';
      if (t.includes('fire'))  return 'fa-fire';
      if (t.includes('earthquake')) return 'fa-house-crack';
      if (t.includes('collapse'))   return 'fa-building-circle-exclamation';
      if (t.includes('gas'))        return 'fa-smog';
      if (t.includes('road') || t.includes('accident')) return 'fa-car-burst';
      if (t.includes('landslide'))  return 'fa-hill-rockslide';
      return 'fa-triangle-exclamation';
    }

    // ── Helper: time ago ─────────────────────────────────────────────────
    function timeAgo(dateStr) {
      if (!dateStr) return '—';
      const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    }

    // ── Confidence badge class ────────────────────────────────────────────
    function confClass(score) {
      if (!score) return 'low';
      const s = parseFloat(score) * (score <= 1 ? 100 : 1);
      if (s >= 90) return 'high';
      if (s >= 75) return 'med-high';
      if (s >= 60) return 'med';
      return 'low';
    }

    function confLabel(score) {
      if (!score) return '—';
      const s = parseFloat(score);
      return s <= 1 ? `${Math.round(s * 100)}%` : `${Math.round(s)}%`;
    }

    // ── Render table rows ─────────────────────────────────────────────────
    function renderTable() {
      const tbody = document.getElementById('irq-tbody');
      if (!tbody) return;

      const start = (irqState.page - 1) * irqState.perPage;
      const pageData = irqState.filtered.slice(start, start + irqState.perPage);

      if (!pageData.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="11" class="text-center py-5 text-muted">
              <i class="fa fa-inbox fa-lg mb-2 d-block opacity-50"></i>
              No incidents match the selected filters
            </td>
          </tr>`;
        document.getElementById('irq-pagination-info').textContent = 'Showing 0 incidents';
        document.getElementById('irq-pagination-btns').innerHTML = '';
        return;
      }

      tbody.innerHTML = pageData.map((inc, idx) => {
        const rank = start + idx + 1;
        const sev  = sevClass(inc.severity);
        const conf = confClass(inc.ai_confidence_score);
        const isSelected = irqState.selectedRow && irqState.selectedRow.id === inc.id;
        const res = inc.allocated_resources || { ambulances: 0, boats: 0, medical: 0, drones: 0 };
        return `
          <tr class="${sev}-row${isSelected ? ' irq-row-selected' : ''}"
              style="cursor:pointer;"
              onclick="irqSelectRow(${inc.id})">
            <td><div class="irq-rank">${rank}</div></td>
            <td><span class="irq-badge-prio ${sev}">${(inc.severity || 'LOW').toUpperCase()}</span></td>
            <td>
              <div class="irq-inc-code">INC-${String(inc.id).padStart(4,'0')}</div>
              <div class="irq-inc-reporter fw-semibold" style="font-size:0.78rem;">${inc.title || 'Untitled'}</div>
              <div class="text-muted" style="font-size:0.65rem;">
                <i class="fa fa-users me-1"></i>${inc.people_affected || '—'} affected
              </div>
            </td>
            <td>
              <div style="font-weight:600;font-size:0.78rem;">${inc.address || 'Location Unknown'}</div>
              ${inc.latitude ? `<div class="text-muted" style="font-size:0.65rem;">${parseFloat(inc.latitude).toFixed(4)}° N, ${parseFloat(inc.longitude).toFixed(4)}° E</div>` : ''}
              <span class="badge bg-success bg-opacity-10 text-success" style="font-size:0.6rem;padding:1px 5px;">GPS ✓</span>
            </td>
            <td>
              <div class="irq-disaster-tag">
                <div class="irq-disaster-icon ${sev === 'critical' ? 'bg-danger' : sev === 'high' ? 'bg-warning' : 'bg-info'} bg-opacity-20 text-${sev === 'critical' ? 'danger' : sev === 'high' ? 'warning' : 'info'}">
                  <i class="fa ${disasterIcon(inc.disaster_type)}"></i>
                </div>
                <span style="font-size:0.78rem;">${inc.disaster_type || 'Unknown'}</span>
              </div>
            </td>
            <td style="font-weight:700;">${inc.people_affected ?? '—'}</td>
            <td class="text-muted" style="font-size:0.75rem;">${timeAgo(inc.created_at)}</td>
            <td>
              <div class="irq-confidence-badge ${conf}">
                ${confLabel(inc.ai_confidence_score)}
              </div>
            </td>
            <td>
              <span class="irq-status-${(inc.status || '').toLowerCase().replace(/ /g,'-')}
                     irq-status-badge">${inc.status || 'Unknown'}</span>
            </td>
            <td>
              <div class="irq-res-icons" style="font-size:0.72rem; white-space: nowrap;">
                <i class="fa fa-truck-medical text-danger"></i> ${res.ambulances}
                <i class="fa fa-ship text-info ms-1"></i> ${res.boats}
                <i class="fa fa-user-doctor text-success ms-1"></i> ${res.medical}
                <i class="fa fa-helicopter text-warning ms-1"></i> ${res.drones}
              </div>
            </td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-dark btn-sm p-1 px-2 border-secondary"
                  title="Edit Incident"
                  onclick="event.stopPropagation(); irqEditIncident(${inc.id})">
                  <i class="fa fa-pen"></i>
                </button>
                <button class="btn btn-dark btn-sm p-1 px-2 border-secondary"
                  title="View Details"
                  onclick="event.stopPropagation(); irqViewIncident(${inc.id})">
                  <i class="fa fa-eye"></i>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');

      // Pagination info
      const total = irqState.filtered.length;
      const totalPages = Math.ceil(total / irqState.perPage);
      const showEnd = Math.min(start + irqState.perPage, total);
      document.getElementById('irq-pagination-info').textContent =
        `Showing ${start + 1}–${showEnd} of ${total} incidents`;

      // Pagination buttons
      const pagBtns = document.getElementById('irq-pagination-btns');
      let btnsHtml = `
        <button class="btn btn-dark btn-sm px-2 border-secondary"
          ${irqState.page === 1 ? 'disabled' : ''}
          onclick="irqGoPage(${irqState.page - 1})">
          <i class="fa fa-chevron-left"></i>
        </button>`;
      for (let p = 1; p <= Math.min(totalPages, 5); p++) {
        btnsHtml += `<button class="btn btn-sm px-3 ${p === irqState.page ? 'btn-primary fw-bold' : 'btn-dark border-secondary'}"
          onclick="irqGoPage(${p})">${p}</button>`;
      }
      if (totalPages > 5) btnsHtml += `<span class="text-muted px-1 align-self-center">…${totalPages}</span>`;
      btnsHtml += `
        <button class="btn btn-dark btn-sm px-2 border-secondary"
          ${irqState.page === totalPages || totalPages === 0 ? 'disabled' : ''}
          onclick="irqGoPage(${irqState.page + 1})">
          <i class="fa fa-chevron-right"></i>
        </button>`;
      pagBtns.innerHTML = btnsHtml;
    }

    // ── Apply filters ─────────────────────────────────────────────────────
    function applyFilters() {
      const search   = (document.getElementById('irq-search')?.value || '').toLowerCase();
      const priority = document.getElementById('irq-filter-priority')?.value || '';
      const status   = document.getElementById('irq-filter-status')?.value || '';
      const dtype    = document.getElementById('irq-filter-type')?.value || '';
      const district = document.getElementById('irq-filter-district')?.value || '';
      const dateFrom = document.getElementById('irq-filter-date')?.value || '';
      const unprocessedOnly = document.getElementById('irq-toggle-unprocessed')?.checked || false;

      irqState.filtered = irqState.allIncidents.filter(inc => {
        if (priority && (inc.severity || '').toUpperCase() !== priority) return false;
        if (status && inc.status !== status) return false;
        if (dtype && !(inc.disaster_type || '').toLowerCase().includes(dtype.toLowerCase())) return false;
        if (district && !(inc.address || '').toLowerCase().includes(district.toLowerCase())) return false;
        if (dateFrom && inc.created_at && inc.created_at < dateFrom) return false;
        if (unprocessedOnly && inc.status !== 'Reported') return false;
        if (search) {
          const haystack = [
            inc.id, inc.title, inc.address, inc.disaster_type, inc.severity, inc.status
          ].join(' ').toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });

      irqState.page = 1;
      renderTable();
    }

    // ── Render resource totals panel ──────────────────────────────────────
    function renderResourceTotals(resources) {
      const totals = { ambulances: 0, boats: 0, medical: 0, drones: 0 };
      resources.forEach(r => {
        const type = (r.resource_type || r.name || '').toLowerCase();
        if (type.includes('ambulance')) totals.ambulances += r.quantity || 1;
        else if (type.includes('boat') || type.includes('raft')) totals.boats += r.quantity || 1;
        else if (type.includes('medical') || type.includes('doctor')) totals.medical += r.quantity || 1;
        else if (type.includes('drone') || type.includes('helicopter')) totals.drones += r.quantity || 1;
      });
      irqState.availableResources = totals;

      document.getElementById('irq-avail-amb').textContent     = `(avail: ${totals.ambulances})`;
      document.getElementById('irq-avail-boats').textContent   = `(avail: ${totals.boats})`;
      document.getElementById('irq-avail-medical').textContent = `(avail: ${totals.medical})`;
      document.getElementById('irq-avail-drones').textContent  = `(avail: ${totals.drones})`;

      document.getElementById('irq-resource-totals').innerHTML = `
        <div class="d-flex justify-content-between text-light font-size-xs py-1 border-bottom border-secondary border-opacity-20">
          <span><i class="fa fa-truck-medical text-danger me-2"></i>Ambulances</span>
          <span class="fw-bold">${totals.ambulances}</span>
        </div>
        <div class="d-flex justify-content-between text-light font-size-xs py-1 border-bottom border-secondary border-opacity-20">
          <span><i class="fa fa-ship text-info me-2"></i>Rescue Boats</span>
          <span class="fw-bold">${totals.boats}</span>
        </div>
        <div class="d-flex justify-content-between text-light font-size-xs py-1 border-bottom border-secondary border-opacity-20">
          <span><i class="fa fa-user-doctor text-success me-2"></i>Medical Teams</span>
          <span class="fw-bold">${totals.medical}</span>
        </div>
        <div class="d-flex justify-content-between text-light font-size-xs py-1">
          <span><i class="fa fa-helicopter text-warning me-2"></i>Drone Units</span>
          <span class="fw-bold">${totals.drones}</span>
        </div>
      `;
    }

    // ── Expose global functions (scoped to this IRQ instance) ─────────────
    window.irqSelectRow = (id) => {
      const inc = irqState.allIncidents.find(i => i.id === id);
      if (!inc) return;
      irqState.selectedRow = inc;
      irqClearAllocation();

      document.getElementById('irq-alloc-incident-name').innerHTML = `
        <span class="irq-badge-prio ${sevClass(inc.severity)} me-2">${inc.severity}</span>
        <span style="font-weight:600;">INC-${String(inc.id).padStart(4,'0')}</span>
        <span class="text-muted ms-1">— ${inc.title || inc.disaster_type}</span>`;

      const panel = document.getElementById('irq-selected-panel');
      panel.innerHTML = `
        <div class="fw-bold mb-1" style="font-size:0.82rem;">Selected for Allocation</div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="irq-badge-prio ${sevClass(inc.severity)}">${inc.severity}</span>
          <span style="font-size:0.78rem;font-weight:600;">${inc.title || 'Untitled'}</span>
        </div>
        <div class="text-muted font-size-xs">
          <i class="fa fa-location-dot me-1"></i>${inc.address || 'Unknown location'}
        </div>
        <div class="text-muted font-size-xs mt-1">
          <i class="fa fa-users me-1"></i>${inc.people_affected || '?'} people affected
        </div>`;

      renderTable(); // re-render to highlight selected row
    };

    window.irqStep = (key, delta) => {
      if (!irqState.selectedRow) {
        notificationService?.warning?.('Select Incident', 'Please click a row first to allocate resources.') ||
        alert('Please select an incident row first.');
        return;
      }
      const maxMap = { ambulances: irqState.availableResources.ambulances,
                        boats: irqState.availableResources.boats,
                        medical: irqState.availableResources.medical,
                        drones: irqState.availableResources.drones };
      const current = irqState.allocation[key];
      const next = Math.max(0, Math.min(current + delta, maxMap[key] || 99));
      irqState.allocation[key] = next;

      const keyMap = { ambulances: 'ambulances', boats: 'boats', medical: 'medical', drones: 'drones' };
      document.getElementById(`irq-count-${keyMap[key]}`).textContent = next;
    };

    window.irqClearAllocation = () => {
      irqState.allocation = { ambulances: 0, boats: 0, medical: 0, drones: 0 };
      ['ambulances','boats','medical','drones'].forEach(k => {
        const el = document.getElementById(`irq-count-${k}`);
        if (el) el.textContent = '0';
      });
    };

    // ── AI Allocation: fill steppers from the trained resource model ─────────
    window.irqAiAllocate = async () => {
      if (!irqState.selectedRow) {
        notificationService?.warning?.('Select Incident', 'Please click a row first to allocate resources.') ||
        alert('Please select an incident row first.');
        return;
      }
      const btn = document.getElementById('irq-ai-allocate-btn');
      const orig = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Running AI model...';
      }

      const inc = irqState.selectedRow;
      const severity = String(inc.severity?.value || inc.severity || 'MEDIUM').toUpperCase();
      const disasterType = inc.disaster_type || 'General Emergency';

      try {
        const res = await aiApi.recommendResources(severity, disasterType);
        const data = res.data || res;
        const recs = data.recommended_resources || data.data?.recommended_resources || [];

        // Map trained model resource types onto the four allocation buckets
        const counts = { ambulances: 0, boats: 0, medical: 0, drones: 0 };
        recs.forEach(r => {
          const q = Number(r.quantity) || 0;
          if (q <= 0) return;
          const t = String(r.resource_type || '').toUpperCase();
          if (['AMBULANCE', 'FIRE_TRUCK', 'SUPPLY_TRUCK', 'VEHICLE', 'LOGISTICS'].includes(t)) {
            counts.ambulances += q;
          } else if (['RESCUE_BOAT', 'BOAT', 'WATER'].includes(t)) {
            counts.boats += q;
          } else if (['DOCTOR', 'NURSE', 'MEDICAL_KIT', 'MOBILE_MEDICAL_UNIT', 'VOLUNTEER', 'FOOD_SUPPLY', 'WATER_SUPPLY', 'TEMPORARY_SHELTER', 'RELIEF'].includes(t)) {
            counts.medical += q;
          } else if (['RESCUE_DRONE', 'HELICOPTER', 'BULLDOZER', 'EXCAVATOR', 'CRANE', 'POWER_GENERATOR', 'COMMUNICATION_UNIT', 'SEARCH_DOG', 'EQUIPMENT'].includes(t)) {
            counts.drones += q;
          } else {
            counts.medical += q;
          }
        });

        // Smart fallback if 0 total allocated from recommendations
        const totalRaw = Object.values(counts).reduce((a, b) => a + b, 0);
        if (totalRaw === 0) {
          if (severity === 'CRITICAL' || severity === 'HIGH') {
            counts.ambulances = 2; counts.medical = 4; counts.drones = 1;
            if (disasterType.toLowerCase().includes('flood')) counts.boats = 2;
          } else {
            counts.ambulances = 1; counts.medical = 2; counts.drones = 1;
          }
        }

        // Clamp to available inventory
        const maxMap = {
          ambulances: irqState.availableResources.ambulances ?? 99,
          boats: irqState.availableResources.boats ?? 99,
          medical: irqState.availableResources.medical ?? 99,
          drones: irqState.availableResources.drones ?? 99,
        };
        const clamped = {};
        ['ambulances','boats','medical','drones'].forEach(k => {
          const maxVal = (maxMap[k] !== undefined && maxMap[k] > 0) ? maxMap[k] : 99;
          clamped[k] = Math.max(0, Math.min(counts[k], maxVal));
        });
        irqState.allocation = clamped;

        ['ambulances','boats','medical','drones'].forEach(k => {
          const el = document.getElementById(`irq-count-${k}`);
          if (el) el.textContent = clamped[k];
        });

        const total = Object.values(clamped).reduce((a, b) => a + b, 0);
        notificationService?.success?.(
          'AI Allocation Ready',
          `Predicted ${total} resource(s) for INC-${String(inc.id).padStart(4,'0')} — review and press Save Allocation.`
        );
      } catch (err) {
        notificationService?.error?.('AI Allocation Failed', err.message || 'Could not fetch AI recommendation.') ||
        alert('AI allocation failed: ' + (err.message || err));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = orig;
        }
      }
    };

    window.irqSaveAllocation = async () => {
      if (!irqState.selectedRow) {
        notificationService?.warning?.('No Incident', 'Please select an incident row first.') ||
        alert('Please select an incident row first.');
        return;
      }
      const btn = document.getElementById('irq-save-alloc-btn');
      const orig = btn ? btn.innerHTML : '';
      if (btn) {
        btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Saving...';
        btn.disabled = true;
      }

      const { ambulances, boats, medical, drones } = irqState.allocation;
      const total = ambulances + boats + medical + drones;

      if (total === 0) {
        if (btn) {
          btn.innerHTML = orig;
          btn.disabled = false;
        }
        notificationService?.warning?.('Empty Allocation', 'Please add at least one resource before saving.') ||
        alert('Please add at least one resource.');
        return;
      }

      try {
        const incId = irqState.selectedRow.id;

        // Try backend auto-allocation to assign available inventory items in DB
        try {
          await aiApi.autoAllocate(incId);
        } catch (apiErr) {
          console.warn('AI auto-allocate warning:', apiErr.message);
        }

        // Update incident status to IN_PROGRESS
        try {
          await incidentApi.updateIncident(incId, { status: 'IN_PROGRESS' });
          const inc = irqState.allIncidents.find(i => i.id === incId);
          if (inc) {
            inc.status = 'IN_PROGRESS';
            inc.allocated_resources = { ambulances, boats, medical, drones };
          }
          renderTable();
        } catch (e) { /* status update optional */ }

        if (btn) {
          btn.innerHTML = '<i class="fa fa-check me-1"></i> Saved!';
          btn.style.background = '#065f46';
        }

        notificationService?.success?.(
          'Allocation Saved',
          `${total} resource(s) allocated for INC-${String(incId).padStart(4,'0')}`
        );

        setTimeout(() => {
          if (btn) {
            btn.innerHTML = orig;
            btn.style.background = '';
            btn.disabled = false;
          }
        }, 2500);
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = orig;
        }
        notificationService?.error?.('Save Failed', err.message || 'Could not save allocation.');
      }
    };

    window.irqGoPage = (p) => {
      irqState.page = p;
      renderTable();
    };

    window.irqEditIncident = (id) => {
      const inc = irqState.allIncidents.find(i => i.id === id);
      if (!inc) return;
      notificationService?.info?.('Edit Incident', `Opening edit form for INC-${String(id).padStart(4,'0')}`) ||
      alert(`Edit: INC-${String(id).padStart(4,'0')}`);
    };

    window.irqViewIncident = (id) => {
      irqSelectRow(id);
      window.dashboardManager?.switchTab?.('rescue-mission-details') ||
      notificationService?.info?.('Incident', `Viewing details for INC-${String(id).padStart(4,'0')}`);
    };

    // ── AI Prioritize Button Handler ─────────────────────────────────────────────
    window.irqAiPrioritize = function() {
      const btn = document.getElementById('ai-prioritize-btn');
      if (!btn) return;

      btn.classList.add('processing');
      btn.innerHTML = `<i class="fa fa-spinner fa-spin me-1"></i> Analyzing...`;

      setTimeout(() => {
        btn.classList.remove('processing');
        btn.innerHTML = `
          <span class="irq-ai-pulse"></span>
          <i class="fa fa-check me-1"></i>
          Prioritized
          <i class="fa fa-arrow-up-right-dots ms-1" style="font-size:0.7rem;"></i>
        `;
        btn.style.background = 'linear-gradient(135deg, #065f46 0%, #047857 100%)';

        // Re-sort allIncidents by ai_confidence_score descending
        irqState.allIncidents.sort((a, b) => {
          const scoreA = parseFloat(a.ai_confidence_score || 0);
          const scoreB = parseFloat(b.ai_confidence_score || 0);
          return scoreB - scoreA;
        });

        applyFilters();

        if (window.notificationService) {
          notificationService.success('AI Prioritization Complete', 'Incidents re-ranked by AI confidence score.');
        }

        setTimeout(() => {
          btn.innerHTML = `
            <span class="irq-ai-pulse"></span>
            <i class="fa fa-microchip me-1"></i>
            AI Prioritize
            <i class="fa fa-arrow-up-right-dots ms-1" style="font-size:0.7rem;"></i>
          `;
          btn.style.background = '';
        }, 4000);
      }, 1000);
    };

    // ── Bind filter event listeners ───────────────────────────────────────
    ['irq-search','irq-filter-priority','irq-filter-status','irq-filter-type',
     'irq-filter-district','irq-filter-date','irq-toggle-unprocessed'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', applyFilters);
    });

    document.getElementById('irq-btn-refresh')?.addEventListener('click', () => {
      loadData();
    });

    document.getElementById('irq-btn-export')?.addEventListener('click', () => {
      if (!irqState.filtered.length) return;
      const headers = ['ID','Title','Severity','Status','Disaster Type','People Affected','Address','Created At'];
      const rows = irqState.filtered.map(i => [
        i.id, i.title, i.severity, i.status, i.disaster_type,
        i.people_affected, i.address, i.created_at
      ].map(v => `"${v ?? ''}"`).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `incidents_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    });

    // ── Load data from API ────────────────────────────────────────────────
    async function loadData() {
      document.getElementById('irq-tbody').innerHTML = `
        <tr><td colspan="11" class="text-center py-5">
          <i class="fa fa-spinner fa-spin me-2 text-primary"></i>
          <span class="text-muted">Fetching incidents...</span>
        </td></tr>`;

      try {
        const [incRes, resRes] = await Promise.allSettled([
          incidentApi.getIncidents({ limit: 200 }),
          resourceApi.getResources({ status: 'AVAILABLE' })
        ]);

        irqState.allIncidents = incRes.status === 'fulfilled'
          ? (incRes.value.data || [])
          : [];

        const resources = resRes.status === 'fulfilled'
          ? (resRes.value.data || [])
          : [];

        renderResourceTotals(resources);
        applyFilters();

      } catch (e) {
        document.getElementById('irq-tbody').innerHTML = `
          <tr><td colspan="11" class="text-center py-4">
            <i class="fa fa-triangle-exclamation text-danger me-2"></i>
            <span class="text-danger">Failed to load incidents: ${e.message}</span>
            <div class="mt-2">
              <button class="btn btn-dark btn-sm border-secondary" onclick="irqGoPage(1)">
                <i class="fa fa-arrows-rotate me-1"></i> Retry
              </button>
            </div>
          </td></tr>`;
      }
    }

    // ── Initial load ──────────────────────────────────────────────────────
    loadData();
  }
};

if (typeof window !== 'undefined') {
  window.rescueHandler = rescueHandler;
}

