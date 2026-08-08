import { shelterApi } from './api/shelterApi.js';
import { notificationService } from './services/notificationService.js';
import { openModal, closeModal } from './components/modal.js';
import { storageService } from './services/storageService.js';
import { CONFIG } from './config.js';

export const shelterHandler = {
  allShelters: [],

  async renderSheltersList(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await shelterApi.getShelters();
      this.allShelters = Array.isArray(res) ? res : (res.data || []);

      if (!this.allShelters || this.allShelters.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fa fa-campground empty-icon"></i><h3>No Active Shelters</h3></div>';
        return;
      }

      this.renderShelterCards(containerId, this.allShelters);
    } catch (err) {
      el.innerHTML = `<div class="alert-banner alert-danger">Error loading shelters: ${err.message}</div>`;
    }
  },

  renderShelterCards(containerId, shelters) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const userRole = storageService.getUserRole();
    const roleStr = typeof userRole === 'object' ? (userRole?.name || '') : String(userRole || '');
    const isCitizen = !roleStr || roleStr.toLowerCase().includes('citizen');

    const cards = shelters.map(s => {
      const available = Math.max(0, s.total_capacity - s.current_occupancy);
      const percent = Math.min(100, Math.round((s.current_occupancy / s.total_capacity) * 100));
      const fillClass = percent > 85 ? 'red' : percent > 60 ? 'orange' : 'green';

      const actionButtonsHtml = isCitizen
        ? `<button class="btn btn-primary btn-sm btn-view-shelter" data-id="${s.id}"><i class="fa fa-map-marked-alt me-1"></i> View Details & Direction</button>`
        : `
          <div class="d-flex gap-1">
            <button class="btn btn-outline-primary btn-sm btn-view-shelter" data-id="${s.id}"><i class="fa fa-eye me-1"></i> View</button>
            <button class="btn btn-secondary btn-sm btn-update-shelter" data-id="${s.id}" data-name="${s.name}" data-occ="${s.current_occupancy}" data-cap="${s.total_capacity}"><i class="fa fa-edit me-1"></i> Update</button>
          </div>
        `;

      return `
        <div class="col-md-6 col-lg-4 mb-4">
          <div class="card h-100">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h4 style="font-size: 1.05rem; margin: 0;"><i class="fa fa-campground text-success me-2"></i>${s.name}</h4>
              <span class="badge ${s.is_active ? 'badge-resolved' : 'badge-closed'}">${s.is_active ? 'Active' : 'Closed'}</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted);" class="mb-3"><i class="fa fa-map-marker-alt text-danger me-1"></i> ${s.address}</p>

            <div class="mb-3">
              <div class="d-flex justify-content-between font-size-sm mb-1">
                <span>Occupancy</span>
                <strong>${s.current_occupancy} / ${s.total_capacity} (${percent}%)</strong>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar-fill ${fillClass}" style="width: ${percent}%;"></div>
              </div>
              <div class="font-size-sm text-success mt-1">Available Beds: <strong>${available}</strong></div>
            </div>

            <div class="d-flex gap-2 font-size-sm mb-3">
              <span class="badge ${s.medical_available ? 'badge-resolved' : 'badge-reported'}"><i class="fa fa-first-aid me-1"></i> Medical</span>
              <span class="badge ${s.food_available ? 'badge-resolved' : 'badge-reported'}"><i class="fa fa-utensils me-1"></i> Food</span>
              <span class="badge ${s.water_available ? 'badge-resolved' : 'badge-reported'}"><i class="fa fa-tint me-1"></i> Water</span>
            </div>

            <div class="d-flex justify-content-between align-items-center pt-2 border-top border-glass">
              <span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa fa-phone text-info me-1"></i> ${s.contact_phone || 'N/A'}</span>
              ${actionButtonsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div class="search-bar">
          <i class="fa fa-search color-muted"></i>
          <input type="text" id="shelter-search-input" placeholder="Search shelters by name or address..." />
        </div>
        <div class="font-size-sm color-muted">Showing <strong>${shelters.length}</strong> shelters</div>
      </div>
      <div class="row">${cards}</div>
    `;

    el.querySelectorAll('.btn-view-shelter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const shelterId = e.currentTarget.dataset.id;
        this.renderShelterDetailPage(shelterId);
      });
    });

    el.querySelectorAll('.btn-update-shelter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ds = e.currentTarget.dataset;
        this.showUpdateModal(ds.id, ds.name, ds.occ, ds.cap);
      });
    });

    document.getElementById('shelter-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = this.allShelters.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
      this.renderShelterCards(containerId, filtered);
    });
  },

  renderShelterDetailPage(shelterId) {
    const area = document.getElementById('page-content-area');
    if (!area) return;

    const s = this.allShelters.find(item => String(item.id) === String(shelterId));
    if (!s) {
      notificationService.error('Error', 'Shelter information not found.');
      return;
    }

    const available = Math.max(0, s.total_capacity - s.current_occupancy);
    const percent = Math.min(100, Math.round((s.current_occupancy / s.total_capacity) * 100));
    const fillClass = percent > 85 ? 'red' : percent > 60 ? 'orange' : 'green';
    const statusBadge = s.is_active ? '<span class="badge badge-resolved fs-6 py-2 px-3"><i class="fa fa-check-circle me-1"></i> Active Relief Shelter</span>' : '<span class="badge badge-closed fs-6 py-2 px-3"><i class="fa fa-ban me-1"></i> Shelter Closed</span>';

    const lat = parseFloat(s.latitude) || CONFIG.MAP.DEFAULT_LAT;
    const lng = parseFloat(s.longitude) || CONFIG.MAP.DEFAULT_LNG;

    area.innerHTML = `
      <div class="mb-3">
        <button class="btn btn-outline-secondary btn-sm" id="btn-back-to-shelters">
          <i class="fa fa-arrow-left me-1"></i> Back to Shelters List
        </button>
      </div>

      <!-- Hero Header Card -->
      <div class="card p-4 mb-4" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)); border: 1px solid var(--glass-border);">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <div class="d-flex align-items-center gap-2 mb-2">
              ${statusBadge}
              <span class="badge bg-secondary bg-opacity-25 text-white border border-secondary">ID: #${s.id}</span>
            </div>
            <h1 class="mb-2" style="font-size: 1.8rem;"><i class="fa fa-campground text-success me-2"></i> ${s.name}</h1>
            <p class="text-muted fs-6 mb-0"><i class="fa fa-map-marker-alt text-danger me-2"></i> ${s.address}</p>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="btn btn-primary">
              <i class="fa fa-directions me-2"></i> Google Maps Directions
            </a>
            ${s.contact_phone ? `<a href="tel:${s.contact_phone}" class="btn btn-success"><i class="fa fa-phone me-2"></i> Call Shelter Desk (${s.contact_phone})</a>` : ''}
          </div>
        </div>
      </div>

      <!-- Main Grid: Left Stats & Amenities | Right Large Map -->
      <div class="row g-4 mb-4">
        <div class="col-lg-5">
          <!-- Bed Capacity & Occupancy Card -->
          <div class="card p-4 mb-4">
            <h4 class="mb-3"><i class="fa fa-bed text-info me-2"></i> Bed Capacity & Occupancy Status</h4>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="text-muted font-size-sm">Live Occupancy Rate</span>
              <strong class="fs-5">${percent}%</strong>
            </div>
            <div class="progress-bar-wrapper mb-3" style="height: 12px;">
              <div class="progress-bar-fill ${fillClass}" style="width: ${percent}%;"></div>
            </div>
            <div class="row text-center g-2 mt-2">
              <div class="col-4">
                <div class="p-2 rounded bg-dark border border-secondary">
                  <div class="font-size-xs text-muted">Total Beds</div>
                  <div class="fw-bold fs-5">${s.total_capacity}</div>
                </div>
              </div>
              <div class="col-4">
                <div class="p-2 rounded bg-dark border border-secondary">
                  <div class="font-size-xs text-muted">Occupied</div>
                  <div class="fw-bold fs-5 text-warning">${s.current_occupancy}</div>
                </div>
              </div>
              <div class="col-4">
                <div class="p-2 rounded bg-dark border border-secondary">
                  <div class="font-size-xs text-muted">Available</div>
                  <div class="fw-bold fs-5 text-success">${available}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- On-Site Amenities Card -->
          <div class="card p-4 mb-4">
            <h4 class="mb-3"><i class="fa fa-shield-heart text-danger me-2"></i> On-Site Relief Amenities</h4>
            <div class="row g-3">
              <div class="col-6">
                <div class="p-3 rounded border ${s.medical_available ? 'border-success bg-success bg-opacity-10' : 'border-secondary bg-dark'} d-flex align-items-center gap-2">
                  <i class="fa fa-first-aid fs-4 ${s.medical_available ? 'text-success' : 'text-muted'}"></i>
                  <div>
                    <div class="fw-bold font-size-sm">Medical Aid</div>
                    <div class="font-size-xs text-muted">${s.medical_available ? 'Available On-site' : 'Not Available'}</div>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-3 rounded border ${s.food_available ? 'border-success bg-success bg-opacity-10' : 'border-secondary bg-dark'} d-flex align-items-center gap-2">
                  <i class="fa fa-utensils fs-4 ${s.food_available ? 'text-success' : 'text-muted'}"></i>
                  <div>
                    <div class="fw-bold font-size-sm">Food Supplies</div>
                    <div class="font-size-xs text-muted">${s.food_available ? 'Free Meals Served' : 'Limited/None'}</div>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-3 rounded border ${s.water_available ? 'border-success bg-success bg-opacity-10' : 'border-secondary bg-dark'} d-flex align-items-center gap-2">
                  <i class="fa fa-tint fs-4 ${s.water_available ? 'text-success' : 'text-muted'}"></i>
                  <div>
                    <div class="fw-bold font-size-sm">Drinking Water</div>
                    <div class="font-size-xs text-muted">${s.water_available ? 'Purified Water Station' : 'Not Available'}</div>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-3 rounded border border-success bg-success bg-opacity-10 d-flex align-items-center gap-2">
                  <i class="fa fa-bolt fs-4 text-success"></i>
                  <div>
                    <div class="fw-bold font-size-sm">Power Backup</div>
                    <div class="font-size-xs text-muted">Generator Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact & Location Info Card -->
          <div class="card p-4">
            <h4 class="mb-3"><i class="fa fa-circle-info text-primary me-2"></i> Shelter Contact & Location</h4>
            <ul class="list-group list-group-flush bg-transparent">
              <li class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between px-0">
                <span>Helpline Phone:</span>
                <strong class="text-info">${s.contact_phone || 'N/A'}</strong>
              </li>
              <li class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between px-0">
                <span>Latitude & Longitude:</span>
                <code>${lat.toFixed(5)}, ${lng.toFixed(5)}</code>
              </li>
              <li class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between px-0">
                <span>Operating Hours:</span>
                <span class="badge bg-success">24/7 Emergency Operations</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Large Interactive Map Column -->
        <div class="col-lg-7">
          <div class="card p-3 h-100 d-flex flex-column" style="min-height: 520px;">
            <div class="d-flex justify-content-between align-items-center mb-3 px-2">
              <h4 class="m-0"><i class="fa fa-map-location-dot text-success me-2"></i> High-Scale Shelter Location & Route Map</h4>
              <span class="badge bg-primary"><i class="fa fa-satellite-dish me-1"></i> MapTiler Streets Live</span>
            </div>
            <div id="full-shelter-map" style="width: 100%; height: 500px; border-radius: 12px; overflow: hidden; background: #0f172a;" class="flex-grow-1"></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-back-to-shelters')?.addEventListener('click', () => {
      const currentTab = window.dashboardManager?.currentTab || 'shelters';
      window.dashboardManager?.loadTab(currentTab);
    });

    // Initialize large MapTiler Streets map
    setTimeout(() => {
      const mapEl = document.getElementById('full-shelter-map');
      if (!mapEl || typeof L === 'undefined') return;

      const shelterMap = L.map('full-shelter-map').setView([lat, lng], 14);

      L.tileLayer(CONFIG.MAPTILER.TILE_URL, {
        attribution: CONFIG.MAPTILER.ATTRIBUTION,
        maxZoom: 19
      }).addTo(shelterMap);

      const shelterIcon = L.divIcon({
        className: 'shelter-full-pin',
        html: `<div style="background-color: #10b981; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 20px rgba(16,185,129,0.9); border: 3px solid white;"><i class="fa fa-campground" style="font-size: 22px;"></i></div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const shelterMarker = L.marker([lat, lng], { icon: shelterIcon }).addTo(shelterMap);
      shelterMarker.bindPopup(`
        <div class="p-1">
          <h5 style="margin: 0 0 4px 0; color: #10b981;">${s.name}</h5>
          <div style="font-size: 0.85rem; color: #334155;">${s.address}</div>
          <div style="margin-top: 6px; font-weight: bold; color: #0284c7;">Available Beds: ${available} / ${s.total_capacity}</div>
        </div>
      `).openPopup();

      setTimeout(() => {
        shelterMap.invalidateSize();
      }, 250);

      // Geolocation route polyline to shelter
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;

            const userIcon = L.divIcon({
              className: 'user-full-pin',
              html: `<div style="background-color: #3b82f6; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 14px rgba(59,130,246,0.9); border: 3px solid white;"><i class="fa fa-user" style="font-size: 16px;"></i></div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });

            const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(shelterMap);
            userMarker.bindPopup('<b>Your Current Location</b>');

            L.polyline([
              [userLat, userLng],
              [lat, lng]
            ], { color: '#3b82f6', weight: 5, opacity: 0.9, dashArray: '10, 10' }).addTo(shelterMap);

            const bounds = L.latLngBounds([[userLat, userLng], [lat, lng]]);
            shelterMap.fitBounds(bounds, { padding: [60, 60] });
          },
          () => {
            shelterMap.invalidateSize();
          }
        );
      }
    }, 100);
  },

  showUpdateModal(id, name, currentOcc, totalCap) {
    const html = `
      <form id="form-update-shelter">
        <div class="form-group">
          <label class="form-label">Current Occupancy</label>
          <input type="number" name="current_occupancy" class="form-control" value="${currentOcc}" min="0" max="${totalCap}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Total Capacity</label>
          <input type="number" name="total_capacity" class="form-control" value="${totalCap}" min="1" required />
        </div>
        <div class="d-flex justify-content-end gap-2 mt-4">
          <button type="button" class="btn btn-secondary" id="btn-cancel-shelter-modal">Cancel</button>
          <button type="submit" class="btn btn-primary"><i class="fa fa-save me-1"></i> Save Changes</button>
        </div>
      </form>
    `;
    openModal('modal-update-shelter', `Update Shelter: ${name}`, html);

    document.getElementById('btn-cancel-shelter-modal')?.addEventListener('click', () => {
      closeModal('modal-update-shelter');
    });

    document.getElementById('form-update-shelter')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const occ = parseInt(e.target.current_occupancy.value);
      const cap = parseInt(e.target.total_capacity.value);

      try {
        await shelterApi.updateShelter(id, { current_occupancy: occ, total_capacity: cap });
        notificationService.success('Shelter Updated', `Shelter occupancy updated to ${occ}/${cap}`);
        closeModal('modal-update-shelter');
        this.renderSheltersList('shelters-container-list');
      } catch (err) {
        notificationService.error('Update Failed', err.message);
      }
    });
  }
};
