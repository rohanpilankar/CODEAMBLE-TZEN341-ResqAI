import { incidentApi } from './api/incidentApi.js';
import { aiApi } from './api/aiApi.js';
import { locationService } from './services/locationService.js';
import { notificationService } from './services/notificationService.js';
import { storageService } from './services/storageService.js';
import { formatDate } from './utils/date.js';
import { resolveMediaUrl, pickMediaUrl } from './utils/helpers.js';
import { openModal, closeModal } from './components/modal.js';
import { firebaseService } from './services/firebaseService.js';


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

          <div class="row">
            <div class="col-md-6 form-group">
              <label class="form-label">Contact Phone No.</label>
              <div class="input-group-icon">
                <i class="fa fa-phone input-icon"></i>
                <input type="tel" name="phone_number" class="form-control" placeholder="e.g. +91 98765 43210" required />
              </div>
            </div>
            <div class="col-md-6 form-group">
              <label class="form-label">No. of People Affected / Trapped</label>
              <div class="input-group-icon">
                <i class="fa fa-users input-icon"></i>
                <input type="number" name="people_affected" min="1" value="1" class="form-control" placeholder="e.g. 3" required />
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

          <div class="form-group">
            <label class="form-label">Upload Photo / Video (Evidence)</label>
            <div class="file-upload-area" id="incident-media-upload-area" onclick="document.getElementById('incident-media-input').click()">
              <input type="file" name="media_file" id="incident-media-input" accept="image/*,video/*" style="display:none;" />
              <i class="fa fa-cloud-upload-alt text-primary fs-2 mb-2"></i>
              <div class="fw-bold" id="upload-media-title">Click or drag & drop photo/video</div>
              <div class="text-muted font-size-sm" id="upload-media-subtitle">Supports JPG, PNG, MP4, WEBM (Max 50MB)</div>
              <div id="media-preview-container" class="mt-3 d-none"></div>
            </div>
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

    // Setup Media File Input Preview
    const fileInput = document.getElementById('incident-media-input');
    const previewContainer = document.getElementById('media-preview-container');
    const uploadTitle = document.getElementById('upload-media-title');

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        uploadTitle.innerText = `Selected file: ${file.name}`;
        const isVideo = file.type.startsWith('video/');
        const url = URL.createObjectURL(file);
        this.selectedMediaFile = file;

        if (isVideo) {
          previewContainer.innerHTML = `<video src="${url}" controls style="max-height: 180px; width: 100%; border-radius: 8px;"></video>`;
        } else {
          previewContainer.innerHTML = `<img src="${url}" style="max-height: 180px; width: 100%; object-fit: cover; border-radius: 8px;" />`;
        }
        previewContainer.classList.remove('d-none');
      }
    });

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
      this.aiAssessment = {
        severity: (res.predicted_severity || 'MEDIUM').toUpperCase(),
        confidence: res.confidence_score || 0,
      };
      if (textEl) {
        textEl.innerHTML = `<strong>AI Prediction:</strong> Predicted Severity <strong>${this.aiAssessment.severity}</strong> (Confidence: ${(this.aiAssessment.confidence * 100).toFixed(0)}%). ${res.analysis}`;
      }
    } catch {
      this.aiAssessment = null;
      if (banner) banner.style.display = 'none';
    }
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const mediaFile = this.selectedMediaFile || form.media_file?.files[0];

    const data = {
      title: form.title.value,
      description: form.description.value,
      disaster_type: form.disaster_type.value,
      severity: this.aiAssessment?.severity || 'MEDIUM',
      address: form.address.value,
      phone_number: form.phone_number?.value || null,
      people_affected: parseInt(form.people_affected?.value || "1", 10),
      media_url: null,
      latitude: this.currentLat || 19.0760,
      longitude: this.currentLng || 72.8777,
    };

    try {
      const btn = document.getElementById('btn-submit-report');
      if (btn) btn.disabled = true;

      const rawRes = await incidentApi.createIncident(data);
      const res = rawRes.data || rawRes;
      const incId = res.id;

      // Upload file directly to backend storage endpoint
      if (mediaFile && incId) {
        try {
          const uploadRes = await incidentApi.uploadImage(incId, mediaFile);
          const upData = uploadRes.data || uploadRes;
          if (upData.image_url) {
            data.media_url = upData.image_url;
            await incidentApi.updateIncident(incId, { media_url: upData.image_url });
            notificationService.success('Photo Uploaded', 'Your photo/video was attached to the report.');
          }
        } catch (uploadErr) {
          console.warn('Backend image upload warning:', uploadErr);
          notificationService.warning('Photo Not Uploaded', 'The report was submitted, but the photo upload failed. You can attach it later.');
        }
      }


      // Store in Firebase Realtime Database & Firestore Profile
      try {
        await firebaseService.pushRealtimeIncident({ id: res.id, ...data, status: 'REPORTED' });
        await firebaseService.addFirestoreRecord('incidents', { id: res.id, ...data, status: 'REPORTED' });
      } catch (fbErr) {
        console.warn('Firebase sync warning:', fbErr);
      }

      notificationService.success('Report Submitted!', `Emergency report #${res.id || 'NEW'} submitted & synced.`);

      form.reset();
      this.selectedMediaFile = null;
      this.aiAssessment = null;
      const previewContainer = document.getElementById('media-preview-container');
      if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.classList.add('d-none');
      }
      const uploadTitle = document.getElementById('upload-media-title');
      if (uploadTitle) uploadTitle.innerText = 'Click or drag & drop photo/video';

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
      const rawRes = await incidentApi.getIncidents({ status: filterStatus });
      const incidents = Array.isArray(rawRes) ? rawRes : (rawRes.data || []);

      if (!incidents || incidents.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fa fa-clipboard-check empty-icon"></i><h3>No Incidents Found</h3><p>All emergency reports clear.</p></div>';
        return;
      }

      const rows = incidents.map(inc => `
        <tr>
          <td>#${inc.id}</td>
          <td><strong>${inc.title}</strong><div class="font-size-sm color-muted">${inc.address || 'N/A'}</div></td>
          <td>${inc.disaster_type}</td>
          <td><span class="badge badge-${(inc.severity || 'MEDIUM').toLowerCase()}">${inc.severity}</span></td>
          <td><span class="badge badge-${(inc.status || 'REPORTED').toLowerCase()}">${inc.status}</span></td>
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
      const rawInc = await incidentApi.getIncidentById(id);
      const inc = rawInc.data || rawInc;
      
      let mediaPreviewHtml = '';
      const mediaSrc = resolveMediaUrl(pickMediaUrl(inc));
      if (mediaSrc) {
        if (mediaSrc.includes('data:video') || mediaSrc.endsWith('.mp4') || mediaSrc.endsWith('.webm')) {
          mediaPreviewHtml = `<div class="mt-3"><label class="fw-bold me-2">Uploaded Media:</label><video src="${mediaSrc}" controls style="max-width:100%; max-height:220px; border-radius:8px;" /></div>`;
        } else {
          mediaPreviewHtml = `<div class="mt-3"><label class="fw-bold me-2">Uploaded Evidence:</label><br/><img src="${mediaSrc}" style="max-width:100%; max-height:220px; object-fit:cover; border-radius:8px;" /></div>`;
        }
      }

      const user = storageService.getUser();
      const currentRole = storageService.getUserRole();
      const isReporter = user?.id !== undefined && inc.reported_by_id !== undefined && user.id === inc.reported_by_id;
      const canManage = isReporter || ['Rescue Team', 'Government Authority', 'Admin'].includes(currentRole);
      const canAllocate = ['Rescue Team', 'Government Authority', 'Admin'].includes(currentRole);
      const statusActionsHtml = canManage ? `
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm btn-update-status" data-id="${inc.id}" data-status="RESOLVED">Mark Resolved</button>
          <button class="btn btn-secondary btn-sm btn-update-status" data-id="${inc.id}" data-status="IN_PROGRESS">Set In Progress</button>
        </div>` : '';

      const allocateHtml = canAllocate ? `
        <hr class="divider" />
        <div class="d-flex align-items-center justify-content-between mb-2">
          <strong class="font-size-sm"><i class="fa-solid fa-robot me-1"></i> AI Resource Allocation</strong>
          <button class="btn btn-primary btn-sm" id="btn-auto-allocate" data-id="${inc.id}">
            <i class="fa-solid fa-bolt me-1"></i> Auto Allocate Resources
          </button>
        </div>
        <div id="ai-allocation-result" class="font-size-sm"></div>` : '';

      const content = `
        <div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge badge-${(inc.severity || 'MEDIUM').toLowerCase()}">${inc.severity}</span>
            <span class="badge badge-${(inc.status || 'REPORTED').toLowerCase()}">${inc.status}</span>
          </div>
          <p><strong>Disaster Type:</strong> ${inc.disaster_type}</p>
          <p><strong>Location:</strong> ${inc.address || 'Coordinates: ' + inc.latitude + ', ' + inc.longitude}</p>
          <p><strong>Phone No:</strong> ${inc.phone_number || 'N/A'}</p>
          <p><strong>People Affected:</strong> ${inc.people_affected || 1}</p>
          <p><strong>Description:</strong> ${inc.description}</p>
          ${mediaPreviewHtml}
          <p class="mt-2 font-size-sm text-muted"><strong>Reported:</strong> ${formatDate(inc.created_at)}</p>
          ${statusActionsHtml}
          ${allocateHtml}
        </div>
      `;
      openModal('modal-incident-detail', inc.title, content);

      document.querySelectorAll('.btn-update-status').forEach(b => {
        b.addEventListener('click', async (e) => {
          const incId = e.currentTarget.dataset.id || e.target.dataset.id;
          const status = e.currentTarget.dataset.status || e.target.dataset.status;
          await incidentApi.updateIncident(incId, { status });
          notificationService.success('Status Updated', `Incident #${incId} marked as ${status}`);
          closeModal('modal-incident-detail');
        });
      });

      document.getElementById('btn-auto-allocate')?.addEventListener('click', () => {
        this.autoAllocateResources(inc.id);
      });
    } catch (err) {
      notificationService.error('Error', 'Could not load incident details.');
    }
  },

  async autoAllocateResources(incidentId) {
    const btn = document.getElementById('btn-auto-allocate');
    const box = document.getElementById('ai-allocation-result');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Running AI model...';
    }
    if (box) {
      box.innerHTML = '<div class="text-muted mt-2"><i class="fa-solid fa-robot"></i> Analyzing incident and allocating resources...</div>';
    }

    try {
      const res = await aiApi.autoAllocate(incidentId);
      const data = res.data || res;

      const rows = (data.allocated || []).map((a) => `
        <tr>
          <td class="fw-bold">${a.resource_type.replace(/_/g, ' ')}</td>
          <td>${a.quantity}</td>
          <td><span class="badge badge-${(a.priority || 'MEDIUM').toLowerCase()}">${a.priority}</span></td>
          <td>${a.assigned
            ? `<span class="text-success"><i class="fa fa-check-circle me-1"></i>Assigned</span><div class="text-muted font-size-sm">Unit #${a.resource_id} · ${a.resource_name || ''}</div>`
            : `<span class="text-warning"><i class="fa fa-exclamation-triangle me-1"></i>${a.reason || 'No unit'}</span>`}</td>
        </tr>`).join('');

      const assigned = data.assigned_count || 0;
      if (box) {
        box.innerHTML = `
          <div class="mt-2 p-2 rounded bg-secondary bg-opacity-10 border border-secondary">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <strong class="text-info">AI Allocation Plan</strong>
              <span class="badge badge-${(data.severity || 'MEDIUM').toLowerCase()}">${data.severity} ${data.disaster_type || ''}</span>
            </div>
            <div style="max-height:220px; overflow:auto;">
              <table class="data-table">
                <thead><tr><th>Resource</th><th>Qty</th><th>Priority</th><th>Status</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="4" class="text-muted">No resources recommended.</td></tr>'}</tbody>
              </table>
            </div>
            <div class="small text-muted mt-2"><i class="fa fa-circle-info me-1"></i>${data.ai_notes || ''}</div>
            <div class="small mt-2">${assigned > 0
              ? `<span class="text-success fw-bold"><i class="fa fa-check-circle me-1"></i>${assigned} unit(s) assigned & persisted to Incident #${incidentId}.</span>`
              : '<span class="text-warning">No inventory units were available to persist. Add resources in Resource Management first.</span>'}</div>
          </div>`;
      }
      notificationService.success('AI Allocation Complete', `Resources allocated for Incident #${incidentId}.`);
    } catch (err) {
      if (box) {
        box.innerHTML = `<div class="text-danger mt-2"><i class="fa fa-circle-xmark me-1"></i>Allocation failed: ${err.message || err}</div>`;
      }
      notificationService.error('Allocation Failed', err.message || 'Could not allocate resources.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-bolt me-1"></i> Auto Allocate Resources';
      }
    }
  }
};
