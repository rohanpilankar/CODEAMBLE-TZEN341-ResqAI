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
        this.showViewModal(shelterId);
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

  showViewModal(shelterId) {
    const s = this.allShelters.find(item => String(item.id) === String(shelterId));
    if (!s) {
      notificationService.error('Error', 'Shelter information not found.');
      return;
    }

    const available = Math.max(0, s.total_capacity - s.current_occupancy);
    const percent = Math.min(100, Math.round((s.current_occupancy / s.total_capacity) * 100));
    const fillClass = percent > 85 ? 'red' : percent > 60 ? 'orange' : 'green';

    const lat = parseFloat(s.latitude) || CONFIG.MAP.DEFAULT_LAT;
    const lng = parseFloat(s.longitude) || CONFIG.MAP.DEFAULT_LNG;

    const modalHtml = `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="card p-3 mb-3 bg-dark border-secondary" style="background: rgba(15, 23, 42, 0.95) !important;">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge ${s.is_active ? 'bg-success' : 'bg-danger'} bg-opacity-25 text-white border border-${s.is_active ? 'success' : 'danger'}">
                ${s.is_active ? 'Active Shelter' : 'Shelter Closed'}
              </span>
              <span class="text-muted font-size-sm">Shelter ID: #${s.id}</span>
            </div>
            <h4 class="text-light mb-2"><i class="fa fa-campground text-success me-2"></i>${s.name}</h4>
            <p class="text-secondary font-size-sm mb-3"><i class="fa fa-map-marker-alt text-danger me-1"></i> ${s.address}</p>

            <div class="mb-3">
              <div class="d-flex justify-content-between font-size-sm mb-1 text-light">
                <span>Occupancy Status</span>
                <strong>${s.current_occupancy} / ${s.total_capacity} beds occupied (${percent}%)</strong>
              </div>
              <div class="progress-bar-wrapper mb-2">
                <div class="progress-bar-fill ${fillClass}" style="width: ${percent}%;"></div>
              </div>
              <div class="text-success font-size-sm fw-bold"><i class="fa fa-bed me-1"></i> ${available} Available Beds</div>
            </div>

            <div class="mb-3">
              <div class="text-muted font-size-sm mb-2">On-site Amenities:</div>
              <div class="d-flex gap-2 flex-wrap">
                <span class="badge ${s.medical_available ? 'bg-success' : 'bg-secondary'} bg-opacity-25 text-white border border-${s.medical_available ? 'success' : 'secondary'}">
                  <i class="fa fa-first-aid me-1"></i> Medical Aid
                </span>
                <span class="badge ${s.food_available ? 'bg-success' : 'bg-secondary'} bg-opacity-25 text-white border border-${s.food_available ? 'success' : 'secondary'}">
                  <i class="fa fa-utensils me-1"></i> Food Supplies
                </span>
                <span class="badge ${s.water_available ? 'bg-success' : 'bg-secondary'} bg-opacity-25 text-white border border-${s.water_available ? 'success' : 'secondary'}">
                  <i class="fa fa-tint me-1"></i> Clean Water
                </span>
              </div>
            </div>

            <div class="mb-3 font-size-sm text-secondary">
              <div><i class="fa fa-phone text-info me-2"></i><strong>Contact Phone:</strong> ${s.contact_phone || 'N/A'}</div>
              <div class="mt-1"><i class="fa fa-compass text-warning me-2"></i><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
            </div>

            <div class="mt-4 pt-3 border-top border-glass d-flex flex-column gap-2">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="btn btn-primary w-100 py-2">
                <i class="fa fa-directions me-2"></i> Get Map Directions on Google Maps
              </a>
              ${s.contact_phone ? `<a href="tel:${s.contact_phone}" class="btn btn-outline-light w-100 py-2"><i class="fa fa-phone me-2"></i> Call Shelter Desk</a>` : ''}
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card p-2 bg-dark border-secondary h-100 d-flex flex-column" style="background: rgba(15, 23, 42, 0.95) !important;">
            <div class="d-flex justify-content-between align-items-center mb-2 px-2 pt-1">
              <span class="fw-bold font-size-sm text-light"><i class="fa fa-map-marked-alt text-primary me-1"></i> Interactive Shelter Location & Directions Map</span>
            </div>
            <div id="modal-shelter-map" style="height: 380px; width: 100%; border-radius: 8px; overflow: hidden; background: #0f172a;" class="flex-grow-1"></div>
          </div>
        </div>
      </div>
    `;

    openModal('modal-view-shelter', `Shelter Details & Map Location: ${s.name}`, modalHtml);

    setTimeout(() => {
      const mapEl = document.getElementById('modal-shelter-map');
      if (mapEl && typeof L !== 'undefined') {
        const tileUrl = (CONFIG.MAP && CONFIG.MAP.PRESETS && CONFIG.MAP.PRESETS.VOYAGER)
          || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        const shelterMap = L.map('modal-shelter-map').setView([lat, lng], 14);

        L.tileLayer(tileUrl, {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19
        }).addTo(shelterMap);

        const shelterIcon = L.divIcon({
          className: 'shelter-modal-pin',
          html: `<div style="background-color: #10b981; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 14px rgba(16,185,129,0.7); border: 2px solid white;"><i class="fa fa-campground" style="font-size: 17px;"></i></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const shelterMarker = L.marker([lat, lng], { icon: shelterIcon }).addTo(shelterMap);
        shelterMarker.bindPopup(`<b>${s.name}</b><br>${s.address}<br>Available Beds: ${available}`).openPopup();

        // Check if browser has geolocation to draw path from user to shelter
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const userLat = pos.coords.latitude;
              const userLng = pos.coords.longitude;

              const userIcon = L.divIcon({
                className: 'user-modal-pin',
                html: `<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 10px rgba(59,130,246,0.7); border: 2px solid white;"><i class="fa fa-user" style="font-size: 13px;"></i></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              });

              const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(shelterMap);
              userMarker.bindPopup('<b>Your Current Location</b>');

              L.polyline([
                [userLat, userLng],
                [lat, lng]
              ], { color: '#3b82f6', weight: 4, opacity: 0.85, dashArray: '8, 8' }).addTo(shelterMap);

              const bounds = L.latLngBounds([[userLat, userLng], [lat, lng]]);
              shelterMap.fitBounds(bounds, { padding: [45, 45] });
            },
            () => {
              shelterMap.invalidateSize();
            }
          );
        }

        setTimeout(() => shelterMap.invalidateSize(), 250);
      }
    }, 120);
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
