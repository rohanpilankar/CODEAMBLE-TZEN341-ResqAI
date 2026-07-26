import { incidentApi } from './api/incidentApi.js';
import { aiApi } from './api/aiApi.js';
import { locationService } from './services/locationService.js';
import { notificationService } from './services/notificationService.js';
import { formatDate } from './utils/date.js';
import { openModal, closeModal } from './components/modal.js';

export const incidentHandler = {
  async renderReportForm(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `
      <div class="card" style="max-width: 680px; margin: 0 auto;">
        <h3 class="mb-3"><i class="fa fa-exclamation-triangle text-danger"></i> Report Emergency Incident</h3>
        <p class="text-muted mb-4 font-size-sm">Please fill out accurate details. GPS location will be auto-captured.</p>

        <form id="incident-report-form">
          <div class="form-group">
            <label class="form-label">Incident Title</label>
            <input type="text" name="title" class="form-control" placeholder="e.g. Flash flood trapped residents" required />
          </div>

          <div class="row">
            <div class="col-md-6 form-group">
              <label class="form-label">Disaster Category</label>
              <select name="disaster_type" class="form-control" required>
                <option value="Flood">Flood</option>
                <option value="Earthquake">Earthquake</option>
                <option value="Fire">Fire</option>
                <option value="Building Collapse">Building Collapse</option>
                <option value="Hurricane">Hurricane</option>
                <option value="Gas Leak">Gas Leak</option>
                <option value="Power Outage">Power Outage</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="col-md-6 form-group">
              <label class="form-label">GPS Location</label>
              <div class="input-group">
                <input type="text" id="gps-coords-display" class="form-control" placeholder="Fetching GPS..." readonly />
                <button type="button" class="btn btn-secondary btn-sm" id="btn-detect-gps"><i class="fa fa-crosshairs"></i> Detect</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Location Address / Landmark</label>
            <input type="text" name="address" id="incident-address-input" class="form-control" placeholder="e.g. Near Dharavi Bus Depot, Sector 4" />
          </div>

          <div class="form-group">
            <label class="form-label">Description & Urgent Needs</label>
            <textarea name="description" class="form-control" rows="4" placeholder="Describe the situation, estimated victims, or immediate assistance needed..." required></textarea>
          </div>

          <!-- AI Instant Severity Assessment Banner -->
          <div id="ai-assessment-banner" style="display: none;" class="alert-banner alert-info mb-3">
            <i class="fa fa-robot font-size-lg"></i>
            <div id="ai-assessment-text">Analyzing report text...</div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary" id="btn-ai-analyze"><i class="fa fa-magic"></i> AI Analyze</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-report"><i class="fa fa-paper-plane"></i> Submit Emergency Report</button>
          </div>
        </form>
      </div>
    `;

    // Auto-detect GPS
    this.detectGPS();

    // Event listeners
    document.getElementById('btn-detect-gps')?.addEventListener('click', () => this.detectGPS());
    document.getElementById('btn-ai-analyze')?.addEventListener('click', () => this.runAIAnalysis());
    document.getElementById('incident-report-form')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
  },

  async detectGPS() {
    const display = document.getElementById('gps-coords-display');
    const addrInput = document.getElementById('incident-address-input');
    if (display) display.value = 'Detecting GPS position...';

    try {
      const pos = await locationService.getCurrentPosition();
      this.currentLat = pos.lat;
      this.currentLng = pos.lng;
      if (display) display.value = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;

      // Reverse geocode address
      const address = await locationService.reverseGeocode(pos.lat, pos.lng);
      if (addrInput && !addrInput.value) {
        addrInput.value = address;
      }
      notificationService.success('GPS Acquired', 'Location coordinates successfully added to report.');
    } catch (err) {
      if (display) display.value = '19.0760, 72.8777 (Default)';
      this.currentLat = 19.0760;
      this.currentLng = 72.8777;
      notificationService.warning('GPS Unavailable', 'Using default center location.');
    }
  },

  async runAIAnalysis() {
    const form = document.getElementById('incident-report-form');
    const title = form?.title.value;
    const desc = form?.description.value;
    const type = form?.disaster_type.value;

    if (!title || !desc) {
      notificationService.warning('Required Fields', 'Please fill in title and description first.');
      return;
    }

    const banner = document.getElementById('ai-assessment-banner');
    const textEl = document.getElementById('ai-assessment-text');
    if (banner) banner.style.display = 'flex';
    if (textEl) textEl.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Running AI models...';

    try {
      const res = await aiApi.predictSeverity(title, desc, type);
      if (textEl) {
        textEl.innerHTML = `<strong>AI Prediction:</strong> Predicted Severity <strong>${res.predicted_severity}</strong> (Confidence: ${(res.confidence_score * 100).toFixed(0)}%). ${res.analysis}`;
      }
    } catch {
      if (banner) banner.style.display = 'none';
    }
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const data = {
      title: form.title.value,
      description: form.description.value,
      disaster_type: form.disaster_type.value,
      address: form.address.value,
      latitude: this.currentLat || 19.0760,
      longitude: this.currentLng || 72.8777,
    };

    try {
      const btn = document.getElementById('btn-submit-report');
      if (btn) btn.disabled = true;

      const res = await incidentApi.createIncident(data);
      notificationService.success('Report Submitted!', `Emergency report #${res.id} submitted successfully.`);

      form.reset();
      this.detectGPS();
    } catch (err) {
      notificationService.error('Submission Failed', err.message || 'Could not submit report.');
    } finally {
      const btn = document.getElementById('btn-submit-report');
      if (btn) btn.disabled = false;
    }
  },

  async renderIncidentTable(containerId, filterStatus = null) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '<div class="spinner"></div>';

    try {
      const incidents = await incidentApi.getIncidents({ status: filterStatus });

      if (!incidents || incidents.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fa fa-clipboard-check empty-icon"></i><h3>No Incidents Found</h3><p>All emergency reports clear.</p></div>';
        return;
      }

      const rows = incidents.map(inc => `
        <tr>
          <td>#${inc.id}</td>
          <td><strong>${inc.title}</strong><div class="font-size-sm color-muted">${inc.address || 'N/A'}</div></td>
          <td>${inc.disaster_type}</td>
          <td><span class="badge badge-${inc.severity.toLowerCase()}">${inc.severity}</span></td>
          <td><span class="badge badge-${inc.status.toLowerCase()}">${inc.status}</span></td>
          <td>${formatDate(inc.created_at)}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-view-inc" data-id="${inc.id}">View</button>
          </td>
        </tr>
      `).join('');

      el.innerHTML = `
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title / Location</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      el.querySelectorAll('.btn-view-inc').forEach(btn => {
        btn.addEventListener('click', (e) => this.showIncidentModal(e.target.dataset.id));
      });
    } catch (err) {
      el.innerHTML = `<div class="alert-banner alert-danger">Error loading incidents: ${err.message}</div>`;
    }
  },

  async showIncidentModal(id) {
    try {
      const inc = await incidentApi.getIncidentById(id);
      const content = `
        <div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge badge-${inc.severity.toLowerCase()}">${inc.severity}</span>
            <span class="badge badge-${inc.status.toLowerCase()}">${inc.status}</span>
          </div>
          <p><strong>Disaster Type:</strong> ${inc.disaster_type}</p>
          <p><strong>Location:</strong> ${inc.address || 'Coordinates: ' + inc.latitude + ', ' + inc.longitude}</p>
          <p><strong>Description:</strong> ${inc.description}</p>
          <p><strong>Reported:</strong> ${formatDate(inc.created_at)}</p>
          <hr class="divider" />
          <div class="d-flex gap-2">
            <button class="btn btn-success btn-sm btn-update-status" data-id="${inc.id}" data-status="RESOLVED">Mark Resolved</button>
            <button class="btn btn-secondary btn-sm btn-update-status" data-id="${inc.id}" data-status="IN_PROGRESS">Set In Progress</button>
          </div>
        </div>
      `;
      openModal('modal-incident-detail', inc.title, content);

      document.querySelectorAll('.btn-update-status').forEach(b => {
        b.addEventListener('click', async (e) => {
          const incId = e.target.dataset.id;
          const status = e.target.dataset.status;
          await incidentApi.updateIncident(incId, { status });
          notificationService.success('Status Updated', `Incident #${incId} marked as ${status}`);
          closeModal('modal-incident-detail');
        });
      });
    } catch (err) {
      notificationService.error('Error', 'Could not load incident details.');
    }
  }
};
