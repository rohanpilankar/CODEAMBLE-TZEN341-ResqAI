import { CONFIG } from './config.js';

export class MapController {
  constructor(containerId = 'map-container') {
    this.containerId = containerId;
    this.map = null;
    this.incidentLayer = null;
    this.shelterLayer = null;
    this.teamLayer = null;
    this.userLayer = null;
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

    L.tileLayer(CONFIG.MAP.TILE_URL, {
      attribution: CONFIG.MAP.TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.incidentLayer = L.layerGroup().addTo(this.map);
    this.shelterLayer  = L.layerGroup().addTo(this.map);
    this.teamLayer     = L.layerGroup().addTo(this.map);
    this.userLayer     = L.layerGroup().addTo(this.map);
  }

  renderIncidents(incidents = []) {
    if (!this.incidentLayer) return;
    this.incidentLayer.clearLayers();

    incidents.forEach((inc) => {
      if (!inc.latitude || !inc.longitude) return;

      const severityColor = CONFIG.SEVERITY_COLORS[inc.severity] || '#f59e0b';
      const isCritical = inc.severity === 'CRITICAL';

      const customIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="background-color: ${severityColor}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px ${severityColor}; display: flex; align-items: center; justify-content: center;">
            <i class="fa fa-exclamation-triangle" style="font-size: 10px; color: #fff;"></i>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

      const popupContent = `
        <div class="map-popup-title">${inc.title}</div>
        <div class="map-popup-detail"><i class="fa fa-tag"></i> Type: ${inc.disaster_type}</div>
        <div class="map-popup-detail"><i class="fa fa-exclamation-circle"></i> Severity: <strong style="color: ${severityColor};">${inc.severity}</strong></div>
        <div class="map-popup-detail"><i class="fa fa-info-circle"></i> Status: ${inc.status}</div>
        <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">${inc.description}</div>
      `;

      marker.bindPopup(popupContent);
      this.incidentLayer.addLayer(marker);
    });
  }

  renderShelters(shelters = []) {
    if (!this.shelterLayer) return;
    this.shelterLayer.clearLayers();

    shelters.forEach((sh) => {
      if (!sh.latitude || !sh.longitude) return;

      const customIcon = L.divIcon({
        className: 'shelter-map-icon',
        html: `
          <div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 6px; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(16,185,129,0.5); display: flex; align-items: center; justify-content: center; color: #fff;">
            <i class="fa fa-campground" style="font-size: 11px;"></i>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([sh.latitude, sh.longitude], { icon: customIcon });

      const available = Math.max(0, sh.total_capacity - sh.current_occupancy);
      const popupContent = `
        <div class="map-popup-title"><i class="fa fa-campground text-success"></i> ${sh.name}</div>
        <div class="map-popup-detail"><i class="fa fa-map-marker-alt"></i> ${sh.address}</div>
        <div class="map-popup-detail"><i class="fa fa-users"></i> Occupancy: ${sh.current_occupancy} / ${sh.total_capacity}</div>
        <div class="map-popup-detail"><i class="fa fa-bed"></i> Available Beds: <strong class="text-success">${available}</strong></div>
        <div class="map-popup-detail"><i class="fa fa-phone"></i> Phone: ${sh.contact_phone || 'N/A'}</div>
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
        <div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px #3b82f6;"></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup('<strong>Your Current GPS Location</strong>');
    this.userLayer.addLayer(marker);
    this.map.setView([lat, lng], 13);
  }
}
