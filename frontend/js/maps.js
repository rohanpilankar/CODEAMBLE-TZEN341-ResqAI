import { CONFIG } from './config.js';

export class MapController {
  constructor(containerId = 'map-container') {
    this.containerId = containerId;
    this.map = null;
    this.currentTileLayer = null;
    this.incidentLayer = null;
    this.shelterLayer = null;
    this.teamLayer = null;
    this.userLayer = null;
    this.currentPreset = 'VOYAGER';
    this.isFullscreen = false;
  }

  init(lat = CONFIG.MAP.DEFAULT_LAT, lng = CONFIG.MAP.DEFAULT_LNG, zoom = CONFIG.MAP.DEFAULT_ZOOM) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(this.containerId, {
      center: [lat, lng],
      zoom: zoom,
      zoomControl: false,
    });

    const initialUrl = CONFIG.MAP.PRESETS[this.currentPreset] || CONFIG.MAP.TILE_URL;
    this.currentTileLayer = L.tileLayer(initialUrl, {
      attribution: CONFIG.MAP.TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Use MarkerCluster if available, otherwise plain LayerGroup
    if (typeof L.markerClusterGroup === 'function') {
      this.incidentLayer = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      }).addTo(this.map);
    } else {
      this.incidentLayer = L.layerGroup().addTo(this.map);
    }

    this.shelterLayer  = L.layerGroup().addTo(this.map);
    this.teamLayer     = L.layerGroup().addTo(this.map);
    this.userLayer     = L.layerGroup().addTo(this.map);

    this.addMapControls();
    this.addFullscreenButton();
    this.addLocationButton();
  }

  setTilePreset(presetKey) {
    if (!this.map || !CONFIG.MAP.PRESETS[presetKey]) return;
    this.currentPreset = presetKey;
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }
    this.currentTileLayer = L.tileLayer(CONFIG.MAP.PRESETS[presetKey], {
      attribution: CONFIG.MAP.TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(this.map);
  }

  addMapControls() {
    if (!this.map) return;

    const existingOverlay = document.getElementById(`map-overlay-controls-${this.containerId}`);
    if (existingOverlay) existingOverlay.remove();

    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.style.position = 'relative';

    const overlay = document.createElement('div');
    overlay.id = `map-overlay-controls-${this.containerId}`;
    overlay.className = 'map-overlay-controls';
    overlay.innerHTML = `
      <div class="map-controls-group">
        <select class="map-layer-select" id="map-style-select-${this.containerId}" title="Change Map Style" aria-label="Map style">
          <option value="VOYAGER" ${this.currentPreset === 'VOYAGER' ? 'selected' : ''}>🗺️ Map: Voyager (Vibrant)</option>
          <option value="LIGHT" ${this.currentPreset === 'LIGHT' ? 'selected' : ''}>☀️ Map: Positron (Light)</option>
          <option value="STREETS" ${this.currentPreset === 'STREETS' ? 'selected' : ''}>🌐 Map: OpenStreetMap</option>
          <option value="DARK" ${this.currentPreset === 'DARK' ? 'selected' : ''}>🌙 Map: Carto Dark</option>
        </select>
        <button type="button" class="map-ctrl-btn" id="map-recenter-btn-${this.containerId}" title="Recenter Map">
          <i class="fa fa-crosshairs me-1"></i> Recenter
        </button>
      </div>
      <div class="map-legend-pills">
        <span class="legend-pill pill-critical"><i class="fa fa-exclamation-triangle me-1"></i> Critical</span>
        <span class="legend-pill pill-high"><i class="fa fa-fire me-1"></i> High</span>
        <span class="legend-pill pill-medium"><i class="fa fa-info-circle me-1"></i> Medium</span>
        <span class="legend-pill pill-shelter"><i class="fa fa-campground me-1"></i> Shelter</span>
      </div>
    `;

    container.appendChild(overlay);

    document.getElementById(`map-style-select-${this.containerId}`)?.addEventListener('change', (e) => {
      this.setTilePreset(e.target.value);
    });

    document.getElementById(`map-recenter-btn-${this.containerId}`)?.addEventListener('click', () => {
      this.map.setView([CONFIG.MAP.DEFAULT_LAT, CONFIG.MAP.DEFAULT_LNG], CONFIG.MAP.DEFAULT_ZOOM);
    });
  }

  addFullscreenButton() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const existing = container.querySelector('.cc-map-fullscreen-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'cc-map-fullscreen-btn';
    btn.title = 'Toggle Fullscreen';
    btn.setAttribute('aria-label', 'Toggle fullscreen map');
    btn.innerHTML = '<i class="fa fa-expand"></i>';
    container.appendChild(btn);

    btn.addEventListener('click', () => {
      this.isFullscreen = !this.isFullscreen;
      if (this.isFullscreen) {
        container.style.position = 'fixed';
        container.style.inset = '0';
        container.style.zIndex = '9000';
        container.style.height = '100vh';
        container.style.borderRadius = '0';
        btn.innerHTML = '<i class="fa fa-compress"></i>';
      } else {
        container.style.position = 'relative';
        container.style.inset = '';
        container.style.zIndex = '';
        container.style.height = '';
        container.style.borderRadius = '';
        btn.innerHTML = '<i class="fa fa-expand"></i>';
      }
      setTimeout(() => this.map?.invalidateSize(), 200);
    });
  }

  addLocationButton() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const existing = container.querySelector('.cc-map-location-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'cc-map-fullscreen-btn cc-map-location-btn';
    btn.style.top = '52px';
    btn.title = 'My Location';
    btn.setAttribute('aria-label', 'Go to my location');
    btn.innerHTML = '<i class="fa fa-location-arrow"></i>';
    container.appendChild(btn);

    btn.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => this.renderUserLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  getDisasterIcon(disasterType) {
    const icons = CONFIG.DISASTER_ICONS || {};
    return icons[disasterType] || 'fa-exclamation-triangle';
  }

  renderIncidents(incidents = []) {
    if (!this.incidentLayer) return;
    this.incidentLayer.clearLayers();

    const list = Array.isArray(incidents) ? incidents : (incidents && Array.isArray(incidents.data) ? incidents.data : []);
    list.forEach((inc) => {
      if (!inc.latitude || !inc.longitude) return;

      const severityColor = CONFIG.SEVERITY_COLORS[inc.severity] || '#f59e0b';
      const isCritical = inc.severity === 'CRITICAL';
      const iconClass = this.getDisasterIcon(inc.disaster_type);

      const customIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="map-marker-pin ${isCritical ? 'pulse-critical' : ''}" style="background-color: ${severityColor};">
            <i class="fa ${iconClass}" style="font-size: 11px; color: #fff;"></i>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

      const popupContent = `
        <div class="map-popup-card">
          <div class="map-popup-header" style="border-left: 4px solid ${severityColor};">
            <span class="map-popup-badge" style="background-color: ${severityColor};">${inc.severity}</span>
            <span class="map-popup-status">${inc.status}</span>
          </div>
          <div class="map-popup-title">${inc.title}</div>
          <div class="map-popup-detail"><i class="fa fa-tag text-primary me-1"></i> <strong>Type:</strong> ${inc.disaster_type}</div>
          <div class="map-popup-detail"><i class="fa fa-map-marker-alt text-danger me-1"></i> <strong>Location:</strong> ${inc.address || `${inc.latitude.toFixed(3)}, ${inc.longitude.toFixed(3)}`}</div>
          <div class="map-popup-desc">${inc.description}</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      this.incidentLayer.addLayer(marker);
    });
  }

  renderShelters(shelters = []) {
    if (!this.shelterLayer) return;
    this.shelterLayer.clearLayers();

    const list = Array.isArray(shelters) ? shelters : (shelters && Array.isArray(shelters.data) ? shelters.data : []);
    list.forEach((sh) => {
      if (!sh.latitude || !sh.longitude) return;

      const customIcon = L.divIcon({
        className: 'shelter-map-icon',
        html: `
          <div class="map-marker-shelter">
            <i class="fa fa-campground" style="font-size: 12px; color: #fff;"></i>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([sh.latitude, sh.longitude], { icon: customIcon });

      const available = Math.max(0, sh.total_capacity - sh.current_occupancy);
      const popupContent = `
        <div class="map-popup-card">
          <div class="map-popup-header" style="border-left: 4px solid #10b981;">
            <span class="map-popup-badge" style="background-color: #10b981;">ACTIVE SHELTER</span>
          </div>
          <div class="map-popup-title"><i class="fa fa-campground text-success me-1"></i> ${sh.name}</div>
          <div class="map-popup-detail"><i class="fa fa-map-marker-alt text-danger me-1"></i> ${sh.address}</div>
          <div class="map-popup-detail"><i class="fa fa-users text-primary me-1"></i> <strong>Occupancy:</strong> ${sh.current_occupancy} / ${sh.total_capacity}</div>
          <div class="map-popup-detail"><i class="fa fa-bed text-success me-1"></i> <strong>Available Beds:</strong> <strong class="text-success">${available}</strong></div>
          <div class="map-popup-detail"><i class="fa fa-phone text-info me-1"></i> <strong>Contact:</strong> ${sh.contact_phone || 'N/A'}</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      this.shelterLayer.addLayer(marker);
    });
  }

  renderUserLocation(lat, lng) {
    if (!this.userLayer || !this.map) return;
    this.userLayer.clearLayers();

    const customIcon = L.divIcon({
      className: 'user-map-icon',
      html: `
        <div class="map-marker-pin" style="background-color: #3b82f6; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 16px #3b82f6;">
          <i class="fa fa-user" style="font-size: 10px; color: white;"></i>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup('<strong>Your Current GPS Location</strong>');
    this.userLayer.addLayer(marker);
    this.map.setView([lat, lng], 13);
  }
}

