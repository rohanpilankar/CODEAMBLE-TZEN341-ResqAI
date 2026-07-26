import { shelterApi } from './api/shelterApi.js';
import { notificationService } from './services/notificationService.js';
import { openModal, closeModal } from './components/modal.js';

export const shelterHandler = {
  async renderSheltersList(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '<div class="spinner"></div>';

    try {
      const shelters = await shelterApi.getShelters();

      if (!shelters || shelters.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fa fa-campground empty-icon"></i><h3>No Active Shelters</h3></div>';
        return;
      }

      const cards = shelters.map(s => {
        const available = Math.max(0, s.total_capacity - s.current_occupancy);
        const percent = Math.min(100, Math.round((s.current_occupancy / s.total_capacity) * 100));
        const fillClass = percent > 85 ? 'red' : percent > 60 ? 'orange' : 'green';

        return `
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h4 style="font-size: 1.05rem; margin: 0;"><i class="fa fa-campground text-success me-2"></i>${s.name}</h4>
                <span class="badge ${s.is_active ? 'badge-resolved' : 'badge-closed'}">${s.is_active ? 'Active' : 'Closed'}</span>
              </div>
              <p style="font-size: 0.82rem; color: var(--text-muted);" class="mb-3"><i class="fa fa-map-marker-alt"></i> ${s.address}</p>

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
                <span class="badge ${s.medical_available ? 'badge-resolved' : 'badge-reported'}"><i class="fa fa-first-aid"></i> Medical</span>
                <span class="badge ${s.food_available ? 'badge-resolved' : 'badge-reported'}"><i class="fa fa-utensils"></i> Food</span>
                <span class="badge ${s.water_available ? 'badge-resolved' : 'badge-reported'}"><i class="fa fa-tint"></i> Water</span>
              </div>

              <div class="d-flex justify-content-between align-items-center pt-2 border-top border-glass">
                <span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa fa-phone"></i> ${s.contact_phone || 'N/A'}</span>
                <button class="btn btn-secondary btn-sm btn-update-shelter" data-id="${s.id}" data-name="${s.name}" data-occ="${s.current_occupancy}" data-cap="${s.total_capacity}">Update</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      el.innerHTML = `<div class="row">${cards}</div>`;

      el.querySelectorAll('.btn-update-shelter').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const ds = e.target.dataset;
          this.showUpdateModal(ds.id, ds.name, ds.occ, ds.cap);
        });
      });
    } catch (err) {
      el.innerHTML = `<div class="alert-banner alert-danger">Error loading shelters: ${err.message}</div>`;
    }
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
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-update-shelter')">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    `;
    openModal('modal-update-shelter', `Update Shelter: ${name}`, html);

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
