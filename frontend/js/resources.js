import { resourceApi } from './api/resourceApi.js';
import { incidentApi } from './api/incidentApi.js';
import { notificationService } from './services/notificationService.js';
import { openModal, closeModal } from './components/modal.js';

export const resourceHandler = {
  allResources: [],

  async renderResourceOverview(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await resourceApi.getResources();
      this.allResources = Array.isArray(res) ? res : (res.data || []);

      if (!this.allResources || this.allResources.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fa fa-boxes empty-icon"></i><h3>No Resources Tracked</h3></div>';
        return;
      }

      this.renderResourceTable(containerId, this.allResources);
    } catch (err) {
      el.innerHTML = `<div class="alert-banner alert-danger">Error loading resources: ${err.message}</div>`;
    }
  },

  renderResourceTable(containerId, resources) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const rows = resources.map(r => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td><span class="badge badge-info">${r.resource_type}</span></td>
        <td><strong>${r.quantity}</strong></td>
        <td><span class="badge ${r.status === 'AVAILABLE' ? 'badge-resolved' : 'badge-in-progress'}">${r.status}</span></td>
        <td>${r.location_name || 'Central Depot'}</td>
        <td>
          <button class="btn btn-secondary btn-sm btn-assign-resource" data-id="${r.id}" data-name="${r.name}"><i class="fa fa-paper-plane me-1"></i> Assign</button>
        </td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div class="search-bar">
          <i class="fa fa-search color-muted"></i>
          <input type="text" id="resource-search-input" placeholder="Search resources or type..." />
        </div>
        <div class="font-size-sm color-muted">Tracking <strong>${resources.length}</strong> items</div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Resource Name</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Depot / Location</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    el.querySelectorAll('.btn-assign-resource').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ds = e.currentTarget.dataset;
        this.showAssignModal(ds.id, ds.name);
      });
    });

    document.getElementById('resource-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = this.allResources.filter(r => r.name.toLowerCase().includes(q) || r.resource_type.toLowerCase().includes(q));
      this.renderResourceTable(containerId, filtered);
    });
  },

  async showAssignModal(resourceId, resourceName) {
    try {
      const rawInc = await incidentApi.getIncidents();
      const allInc = Array.isArray(rawInc) ? rawInc : (rawInc.data || []);
      const incidents = allInc.filter(i => {
        const s = String(i.status || '').toUpperCase();
        return s !== 'RESOLVED' && s !== 'CLOSED';
      });
      const options = incidents.map(i => `<option value="${i.id}">#${i.id} - ${i.title} (${i.severity || 'MEDIUM'})</option>`).join('');

      const html = `
        <form id="form-assign-resource">
          <p>Assign <strong>${resourceName}</strong> to an active emergency incident:</p>
          <div class="form-group">
            <label class="form-label">Target Incident</label>
            <select name="incident_id" class="form-control" required>
              ${options.length ? options : '<option value="">No active incidents available</option>'}
            </select>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary" id="btn-cancel-assign-modal">Cancel</button>
            <button type="submit" class="btn btn-primary" ${!options.length ? 'disabled' : ''}><i class="fa fa-truck me-1"></i> Dispatch Resource</button>
          </div>
        </form>
      `;

      openModal('modal-assign-resource', `Assign Resource: ${resourceName}`, html);

      document.getElementById('btn-cancel-assign-modal')?.addEventListener('click', () => {
        closeModal('modal-assign-resource');
      });

      document.getElementById('form-assign-resource')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const incId = parseInt(e.target.incident_id.value);

        try {
          await resourceApi.assignResource({ incident_id: incId, resource_id: parseInt(resourceId) });
          notificationService.success('Dispatched!', `Resource assigned to incident #${incId}`);
          closeModal('modal-assign-resource');
          this.renderResourceOverview('resources-container-list');
        } catch (err) {
          notificationService.error('Assignment Failed', err.message);
        }
      });
    } catch (err) {
      notificationService.error('Error', 'Could not load active incidents for assignment.');
    }
  }
};

