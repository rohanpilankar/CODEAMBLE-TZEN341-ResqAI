import { CONFIG } from './config.js';
import { incidentApi } from './api/incidentApi.js';
import { userApi } from './api/userApi.js';
import { notificationService } from './services/notificationService.js';
import { incidentHandler } from './incidents.js';
import { citizenChatbot } from './components/chatbotWidget.js';
import { resolveMediaUrl, pickMediaUrl } from './utils/helpers.js';
import { MapController } from './maps.js';



export const citizenHandler = {
  
  // ── 1. My Incidents ────────────────────────────────────────────────────────
  async renderMyIncidents(area) {
    area.innerHTML = `
      <div class="section-header mb-4 d-flex justify-content-between align-items-center">
        <h2><i class="fa fa-clipboard-list text-primary me-2"></i> My Reported Incidents</h2>
        <button class="btn btn-primary" onclick="document.querySelector('[data-tab=\\'citizen-report\\']').click()">
          <i class="fa fa-plus me-1"></i> Report New
        </button>
      </div>
      <div id="my-incidents-list" class="row">
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
      </div>
    `;

    try {
      const rawRes = await incidentApi.getIncidents();
      const incidents = Array.isArray(rawRes) ? rawRes : (rawRes.data || []);
      
      const listEl = document.getElementById('my-incidents-list');
      if (!incidents || !incidents.length) {
        listEl.innerHTML = `<div class="col-12 text-center text-muted py-5">You haven't reported any incidents yet.</div>`;
        return;
      }

      let html = '';
      incidents.forEach(inc => {
        const sc = inc.status === 'RESOLVED' ? 'success' : (inc.status === 'IN_PROGRESS' ? 'info' : 'warning');
        const titleText = inc.title || inc.disaster_type || 'Emergency Incident';
        const addressText = inc.address || (inc.latitude ? `${inc.latitude}, ${inc.longitude}` : 'Unknown Location');
        const thumbUrl = resolveMediaUrl(pickMediaUrl(inc));
        const mediaThumb = thumbUrl ? `
          <div class="incident-card-img">
            ${thumbUrl.startsWith('data:video') || thumbUrl.endsWith('.mp4') || thumbUrl.endsWith('.webm')
              ? `<video src="${thumbUrl}" controls muted style="width:100%; max-height:160px; object-fit:cover; border-radius:10px;"></video>`
              : `<img src="${thumbUrl}" alt="Incident photo" style="width:100%; max-height:160px; object-fit:cover; border-radius:10px;">`}
          </div>` : '';

        html += `
          <div class="col-md-6 mb-4">
            <div class="incident-card">
              ${mediaThumb}
              <div class="incident-card-header d-flex justify-content-between align-items-center">
                <h3 class="incident-card-title m-0">${titleText}</h3>
                <span class="badge bg-${sc} bg-opacity-10 text-${sc} border border-${sc} border-opacity-25">${inc.status || 'REPORTED'}</span>
              </div>
              <div class="incident-card-meta my-2">
                <span><i class="fa fa-map-marker-alt me-1"></i> ${addressText}</span>
                <span class="ms-3"><i class="fa fa-phone me-1"></i> ${inc.phone_number || 'N/A'}</span>
                <span class="ms-3"><i class="fa fa-users me-1"></i> Affected: ${inc.people_affected || 1}</span>
              </div>
              <p class="text-muted text-truncate" style="font-size:0.9rem;">${inc.description || 'No description provided.'}</p>
              <div class="mt-3 pt-3 border-top border-glass d-flex justify-content-between align-items-center">
                <span class="text-${inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'danger' : 'warning'} font-size-sm fw-bold">
                  <i class="fa fa-exclamation-triangle me-1"></i> ${inc.severity || 'MEDIUM'}
                </span>
                <button class="btn btn-outline-primary btn-sm" onclick="window.viewCitizenIncident('${inc.id}')">
                  View Details <i class="fa fa-arrow-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      });
      listEl.innerHTML = html;

      window.viewCitizenIncident = (id) => {
        this.renderIncidentDetails(document.getElementById('page-content-area'), id);
      };

    } catch (err) {
      document.getElementById('my-incidents-list').innerHTML = `<div class="col-12 text-danger">Failed to load incidents: ${err.message}</div>`;
      console.error(err);
    }
  },

  // ── 2. Report Incident ─────────────────────────────────────────────────────
  async renderReportIncident(area) {
    // Proxies to existing incident handler which has the form logic
    await incidentHandler.renderReportForm('page-content-area');
  },

  // ── 3. Incident Details ────────────────────────────────────────────────────
  async renderIncidentDetails(area, incidentId = '1') {
    area.innerHTML = `
      <div class="mb-3">
        <a href="#" class="text-muted text-decoration-none" onclick="document.querySelector('[data-tab=\\'citizen-incidents\\']').click(); return false;">
          <i class="fa fa-arrow-left me-1"></i> Back to My Incidents
        </a>
      </div>
      <div id="citizen-incident-detail-content">
        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      </div>
    `;

    try {
      const rawInc = await incidentApi.getIncidentById(incidentId);
      const inc = rawInc.data || rawInc;

      let mediaHtml = '<div class="text-muted font-size-sm">No photo/video attached.</div>';
      const mediaSrc = resolveMediaUrl(pickMediaUrl(inc));
      if (mediaSrc) {
        if (mediaSrc.includes('data:video') || mediaSrc.endsWith('.mp4') || mediaSrc.endsWith('.webm')) {
          mediaHtml = `<video src="${mediaSrc}" controls style="max-width:100%; max-height:280px; border-radius:12px;"></video>`;
        } else {
          mediaHtml = `<img src="${mediaSrc}" style="max-width:100%; max-height:280px; object-fit:cover; border-radius:12px;" />`;
        }
      }

      const statusColor = inc.status === 'RESOLVED' ? 'success' : (inc.status === 'IN_PROGRESS' ? 'info' : 'warning');

      document.getElementById('citizen-incident-detail-content').innerHTML = `
        <div class="section-header mb-4">
          <h2><i class="fa fa-info-circle text-info me-2"></i> Incident Details <span class="text-muted fs-5 ms-2">#${inc.id}</span></h2>
        </div>

        <div class="row g-4">
          <div class="col-md-8">
            <div class="card p-4">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="m-0">${inc.title || inc.disaster_type}</h4>
                <span class="badge bg-${statusColor} bg-opacity-10 text-${statusColor} border border-${statusColor} border-opacity-25 fs-6">${inc.status || 'REPORTED'}</span>
              </div>
              <p class="text-secondary">${inc.description || 'No description provided.'}</p>
              
              <div class="row mt-4">
                <div class="col-sm-6 mb-3">
                  <div class="text-secondary font-size-sm">Disaster Category</div>
                  <div class="fw-bold"><i class="fa fa-fire text-danger me-1"></i> ${inc.disaster_type || 'General'}</div>
                </div>
                <div class="col-sm-6 mb-3">
                  <div class="text-secondary font-size-sm">Location Address</div>
                  <div class="fw-bold"><i class="fa fa-map-marker-alt text-primary me-1"></i> ${inc.address || (inc.latitude + ', ' + inc.longitude)}</div>
                </div>
                <div class="col-sm-6 mb-3">
                  <div class="text-secondary font-size-sm">Contact Phone No.</div>
                  <div class="fw-bold"><i class="fa fa-phone text-info me-1"></i> ${inc.phone_number || 'N/A'}</div>
                </div>
                <div class="col-sm-6 mb-3">
                  <div class="text-secondary font-size-sm">People Affected / Trapped</div>
                  <div class="fw-bold"><i class="fa fa-users text-warning me-1"></i> ${inc.people_affected || 1} Persons</div>
                </div>
              </div>

              <div class="mt-4 pt-3 border-top border-glass">
                <h5 class="mb-3"><i class="fa fa-photo-video text-primary me-2"></i> Uploaded Photo / Video Evidence</h5>
                ${mediaHtml}
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card p-4 mb-4" style="background:rgba(6,182,212,0.05);border-color:rgba(6,182,212,0.2);">
              <h5 class="text-info"><i class="fa fa-shield-alt me-2"></i> Response Status</h5>
              <div class="mt-3">
                <div class="fw-bold">${inc.status === 'IN_PROGRESS' ? 'Rescue Team Dispatched' : 'Report Logged in System'}</div>
                <div class="text-muted font-size-sm">Severity: ${inc.severity || 'MEDIUM'}</div>
              </div>
              <button class="btn btn-primary w-100 mt-3" onclick="document.querySelector('[data-tab=\\'citizen-live-tracking\\']')?.click()">
                <i class="fa fa-map-marked-alt me-1"></i> Track Emergency Response
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('citizen-incident-detail-content').innerHTML = `<div class="alert alert-danger">Could not load incident details.</div>`;
    }
  },

  // ── 4. Incident Timeline ───────────────────────────────────────────────────
  async renderIncidentTimeline(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-stream text-primary me-2"></i> Incident Timeline</h2>
      </div>
      <div class="card p-4">
        <div class="timeline">
          
          <div class="timeline-item completed">
            <div class="timeline-icon"><i class="fa fa-check"></i></div>
            <div class="timeline-content">
              <h4 class="timeline-title">Incident Reported</h4>
              <div class="timeline-time">Aug 4, 14:30 PM</div>
              <p class="timeline-desc">You submitted the SOS report via the Citizen App.</p>
            </div>
          </div>

          <div class="timeline-item completed">
            <div class="timeline-icon"><i class="fa fa-check"></i></div>
            <div class="timeline-content">
              <h4 class="timeline-title">AI Severity Analysis Complete</h4>
              <div class="timeline-time">Aug 4, 14:30 PM</div>
              <p class="timeline-desc">System flagged the incident as CRITICAL based on NLP text extraction.</p>
            </div>
          </div>

          <div class="timeline-item completed">
            <div class="timeline-icon"><i class="fa fa-check"></i></div>
            <div class="timeline-content">
              <h4 class="timeline-title">Verified by Command Center</h4>
              <div class="timeline-time">Aug 4, 14:35 PM</div>
              <p class="timeline-desc">Government operator verified the location and approved resource dispatch.</p>
            </div>
          </div>

          <div class="timeline-item active">
            <div class="timeline-icon"><i class="fa fa-truck-fast"></i></div>
            <div class="timeline-content" style="border-color:var(--primary);background:rgba(6,182,212,0.05);">
              <h4 class="timeline-title text-primary">Rescue Team Dispatched</h4>
              <div class="timeline-time">Aug 4, 14:38 PM</div>
              <p class="timeline-desc">Alpha Response Unit 4 is en route. ETA: 12 minutes.</p>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-icon"><i class="fa fa-flag-checkered"></i></div>
            <div class="timeline-content opacity-50">
              <h4 class="timeline-title">Incident Resolved</h4>
              <div class="timeline-time">Pending</div>
              <p class="timeline-desc">Waiting for rescue team completion report.</p>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  // ── 5. Live Tracking ───────────────────────────────────────────────────────
  async renderLiveTracking(area) {
    area.innerHTML = `
      <div class="section-header mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 class="m-0"><i class="fa fa-satellite-dish text-info me-2"></i> Live Rescue Tracking</h2>
          <div class="text-muted font-size-sm">Real-time GPS tracking for assigned rescue teams, nearby shelters, and active distress signals</div>
        </div>
        <span class="badge bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30 py-2 px-3">
          <i class="fa fa-satellite-dish fa-spin me-1"></i> Live Satellite Stream
        </span>
      </div>
      <div class="card p-0 overflow-hidden" style="height: 600px; position: relative;">
        <!-- Interactive Map Element -->
        <div id="citizen-live-map" style="width: 100%; height: 100%;"></div>

        <!-- Live Unit Tracking Status Overlay Card -->
        <div class="card position-absolute bottom-0 start-50 translate-middle-x mb-4 p-3 shadow" style="width: 90%; max-width: 440px; border: 1px solid var(--glass-border); background: rgba(15,22,41,0.95); backdrop-filter: blur(12px); z-index: 1000;">
          <div class="d-flex justify-content-between align-items-center border-bottom border-glass pb-2 mb-2">
            <div>
              <div class="fw-bold text-primary font-size-md" id="tracking-unit-name">Alpha Response Unit 4</div>
              <div class="font-size-sm text-muted" id="tracking-unit-type">Swift Water Rescue Team · NDRF</div>
            </div>
            <div class="text-end">
              <div class="fs-4 fw-bold text-success" id="tracking-eta">12 min</div>
              <div class="font-size-sm text-muted" id="tracking-dist">2.4 km away</div>
            </div>
          </div>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-outline-secondary w-100 btn-sm" id="btn-call-team"><i class="fa fa-phone me-1"></i> Contact Team</button>
            <button class="btn btn-outline-danger w-100 btn-sm" id="btn-cancel-request"><i class="fa fa-times me-1"></i> Cancel Request</button>
          </div>
        </div>
      </div>
    `;

    setTimeout(async () => {
      try {
        const mapCtrl = new MapController('citizen-live-map');
        mapCtrl.init();

        setTimeout(() => {
          if (mapCtrl.map) mapCtrl.map.invalidateSize();
        }, 250);

        // Fetch active incidents to plot
        const rawInc = await incidentApi.getIncidents();
        const incidents = Array.isArray(rawInc) ? rawInc : (rawInc.data || []);
        if (incidents.length > 0) {
          mapCtrl.renderIncidents(incidents);
        } else {
          mapCtrl.renderIncidents([
            { id: 101, title: 'Sector 4 Flood Evacuation', severity: 'CRITICAL', status: 'IN_PROGRESS', latitude: 19.0760, longitude: 72.8777 },
            { id: 102, title: 'Medical Emergency Drop', severity: 'HIGH', status: 'VERIFIED', latitude: 19.0850, longitude: 72.8900 }
          ]);
        }

        // Plot Rescue Vehicle
        if (typeof L !== 'undefined' && mapCtrl.map) {
          const vehicleIcon = L.divIcon({
            className: 'vehicle-live-marker',
            html: `<div style="background:#0284c7; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; border:3px solid white; box-shadow:0 0 16px rgba(2,132,199,0.8);"><i class="fa fa-truck-medical" style="font-size:18px;"></i></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          L.marker([19.0790, 72.8850], { icon: vehicleIcon })
            .addTo(mapCtrl.map)
            .bindPopup(`<strong>Alpha Response Unit 4</strong><br>NDRF Rescue Team<br>ETA: 12 mins`);
        }
      } catch (err) {
        console.warn('Citizen live tracking map notice:', err);
      }
    }, 50);

    document.getElementById('btn-call-team')?.addEventListener('click', () => {
      notificationService.info('Connecting Call...', 'Dialing Alpha Response Unit 4 Team Lead (+91-1800-RESQAI).');
    });

    document.getElementById('btn-cancel-request')?.addEventListener('click', () => {
      notificationService.warning('Request Notice', 'Please contact Command Center directly to modify active rescue dispatches.');
    });
  },

  // ── 6. Emergency SOS ───────────────────────────────────────────────────────
  async renderEmergencySOS(area) {
    area.innerHTML = `
      <div class="sos-container">
        <h2 class="text-danger fw-bold mb-2">CRITICAL EMERGENCY</h2>
        <p class="text-muted mb-4">Pressing this button will immediately broadcast your exact GPS location to all nearby rescue teams and government command centers.</p>
        
        <div class="sos-button-wrapper" id="sos-btn-wrapper">
          <div class="sos-pulse-ring"></div>
          <div class="sos-pulse-ring"></div>
          <button class="sos-button" id="sos-trigger-btn">SOS</button>
        </div>

        <p class="sos-warning mt-4"><i class="fa fa-triangle-exclamation me-1"></i> <strong>WARNING:</strong> False reports are punishable by law. Only use this feature in life-threatening situations where you cannot fill out a detailed form.</p>
      </div>
    `;

    // Bind SOS trigger
    setTimeout(() => {
      const btn = document.getElementById('sos-trigger-btn');
      if (btn) {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i>`;
          notificationService.info('Acquiring Location...', 'Connecting to GPS satellites and Command Center.');

          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const res = await userApi.triggerSOS({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`
                });
                btn.innerHTML = `<i class="fa fa-check"></i>`;
                btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                btn.style.boxShadow = '0 0 30px rgba(16,185,129,0.6)';
                document.querySelectorAll('.sos-pulse-ring').forEach(r => r.style.background = 'rgba(16,185,129,0.2)');
                notificationService.success('SOS Broadcasted', 'High-priority SOS signal sent to Command Center!');
              } catch (err) {
                notificationService.error('SOS Failed', 'Could not send SOS signal. Please try calling 112 directly.');
                btn.disabled = false;
                btn.innerHTML = 'SOS';
              }
            },
            async () => {
              // Fallback if location permission denied
              try {
                await userApi.triggerSOS({ latitude: 19.0760, longitude: 72.8777, address: 'Default City Center SOS' });
                btn.innerHTML = `<i class="fa fa-check"></i>`;
                btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                notificationService.success('SOS Broadcasted', 'SOS signal sent with city location!');
              } catch (e) {
                notificationService.error('SOS Failed', 'Failed to trigger SOS.');
                btn.disabled = false;
                btn.innerHTML = 'SOS';
              }
            }
          );
        });
      }
    }, 100);
  },


  // ── 8. Relief Distribution ─────────────────────────────────────────────────
  async renderReliefDistribution(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-box-open text-info me-2"></i> Relief Distribution Centers</h2>
      </div>
      
      <div class="row g-4">
        <div class="col-md-4">
          <div class="card p-3 mb-3 border-primary">
            <div class="d-flex justify-content-between mb-2">
              <h5 class="m-0 text-primary">Sector 4 Relief Camp</h5>
              <span class="badge bg-success">Open</span>
            </div>
            <p class="text-muted font-size-sm mb-3">Govt. High School Ground. Operated by Red Cross.</p>
            <div class="d-flex gap-2 flex-wrap mb-3">
              <span class="badge bg-dark border border-glass"><i class="fa fa-utensils text-warning me-1"></i> Food Rations</span>
              <span class="badge bg-dark border border-glass"><i class="fa fa-droplet text-info me-1"></i> Drinking Water</span>
              <span class="badge bg-dark border border-glass"><i class="fa fa-blanket text-secondary me-1"></i> Blankets</span>
            </div>
            <button class="btn btn-outline-primary btn-sm w-100"><i class="fa fa-location-arrow me-1"></i> Get Directions (1.2 km)</button>
          </div>

          <div class="card p-3 border-glass">
            <div class="d-flex justify-content-between mb-2">
              <h5 class="m-0">Central Hospital Drop</h5>
              <span class="badge bg-secondary">Closing Soon</span>
            </div>
            <p class="text-muted font-size-sm mb-3">Main gate. Medical supplies and baby food only.</p>
            <div class="d-flex gap-2 flex-wrap mb-3">
              <span class="badge bg-dark border border-glass"><i class="fa fa-kit-medical text-danger me-1"></i> Medical</span>
              <span class="badge bg-dark border border-glass"><i class="fa fa-baby text-primary me-1"></i> Baby Food</span>
            </div>
            <button class="btn btn-outline-primary btn-sm w-100"><i class="fa fa-location-arrow me-1"></i> Get Directions (3.5 km)</button>
          </div>
        </div>
        <div class="col-md-8">
          <div class="card p-0 h-100" style="min-height: 400px; background:#1a2235;">
            <div class="d-flex h-100 align-items-center justify-content-center text-muted flex-column">
               <i class="fa fa-map mb-3 fs-1 opacity-50"></i>
               Map view of relief centers (Placeholder)
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── 9. Blockchain Donation ─────────────────────────────────────────────────
  async renderDonation(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fab fa-ethereum text-warning me-2"></i> Blockchain Donations</h2>
      </div>

      <div class="row g-4">
        <div class="col-md-5">
          <div class="card p-4 text-center border-warning">
            <div style="width:60px;height:60px;background:rgba(245,158,11,0.1);color:var(--warning);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 20px;">
              <i class="fa fa-wallet"></i>
            </div>
            <h4>Connect Web3 Wallet</h4>
            <p class="text-muted font-size-sm mb-4">Connect MetaMask to securely donate ETH/USDT directly to verified NGO smart contracts.</p>
            <button class="btn btn-primary w-100 py-2" style="background:#f6851b;border-color:#f6851b;color:#fff;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="20" class="me-2"> Connect MetaMask
            </button>
          </div>
        </div>
        
        <div class="col-md-7">
          <h4 class="mb-3">Active NGO Campaigns</h4>
          <div class="card p-3 mb-3 hover-lift border-glass">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h5 class="m-0 text-primary">Flood Relief 2026 - North District</h5>
                <div class="text-muted font-size-sm mt-1"><i class="fa fa-check-circle text-success me-1"></i> Verified NGO: Red Cross</div>
              </div>
              <span class="badge bg-dark border border-glass">Target: 50 ETH</span>
            </div>
            <div class="progress mt-3 mb-2" style="height:8px;background:rgba(255,255,255,0.1);">
              <div class="progress-bar bg-warning" style="width:65%;"></div>
            </div>
            <div class="d-flex justify-content-between font-size-sm text-muted">
              <span>Raised: 32.5 ETH</span>
              <span>65% Funded</span>
            </div>
            <button class="btn btn-outline-warning btn-sm mt-3 w-100" disabled><i class="fa fa-lock me-1"></i> Connect Wallet to Donate</button>
          </div>
        </div>
      </div>
    `;
  },

  // ── 10. Profile ────────────────────────────────────────────────────────────
  async renderProfile(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-user-circle text-secondary me-2"></i> My Profile</h2>
      </div>
      <div class="card p-4" style="max-width: 600px;">
        <form>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label text-muted font-size-sm">Full Name</label>
              <input type="text" class="form-control bg-dark border-glass text-white" value="Citizen User">
            </div>
            <div class="col-md-6">
              <label class="form-label text-muted font-size-sm">Phone Number</label>
              <input type="tel" class="form-control bg-dark border-glass text-white" value="+1 555-0199">
            </div>
            <div class="col-12">
              <label class="form-label text-muted font-size-sm">Email Address</label>
              <input type="email" class="form-control bg-dark border-glass text-white" value="citizen@resqai.com" disabled>
            </div>
            <div class="col-12 mt-4">
              <h5 class="border-bottom border-glass pb-2 mb-3">Medical Information (For Rescue Teams)</h5>
            </div>
            <div class="col-md-4">
              <label class="form-label text-muted font-size-sm">Blood Type</label>
              <select class="form-select bg-dark border-glass text-white">
                <option>O+</option>
                <option>A+</option>
                <option>B-</option>
                <option>AB+</option>
              </select>
            </div>
            <div class="col-md-8">
              <label class="form-label text-muted font-size-sm">Allergies / Conditions</label>
              <input type="text" class="form-control bg-dark border-glass text-white" placeholder="e.g. Penicillin, Asthma">
            </div>
            <div class="col-12 mt-4">
              <button type="button" class="btn btn-primary"><i class="fa fa-save me-1"></i> Save Changes</button>
            </div>
          </div>
        </form>
      </div>
    `;
  },

  // ── 11. Settings ───────────────────────────────────────────────────────────
  async renderSettings(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-cog text-secondary me-2"></i> Settings</h2>
      </div>
      <div class="card p-4" style="max-width: 600px;">
        
        <div class="mb-4">
          <h5 class="mb-3">Notifications</h5>
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="pushNotif" checked>
            <label class="form-check-label text-white" for="pushNotif">Push Notifications (App)</label>
          </div>
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="smsNotif" checked>
            <label class="form-check-label text-white" for="smsNotif">SMS Emergency Alerts</label>
          </div>
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="emailNotif">
            <label class="form-check-label text-white" for="emailNotif">Email Updates</label>
          </div>
        </div>

        <div class="mb-4 pt-3 border-top border-glass">
          <h5 class="mb-3">Privacy & Location</h5>
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="bgLocation">
            <label class="form-check-label text-white" for="bgLocation">Allow Background Location (Faster SOS tracking)</label>
          </div>
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="shareFamily" checked>
            <label class="form-check-label text-white" for="shareFamily">Share location with linked Family Members</label>
          </div>
        </div>

        <div class="pt-3 border-top border-glass">
          <button class="btn btn-outline-danger"><i class="fa fa-trash me-1"></i> Delete Account</button>
        </div>
      </div>
    `;
  },

  // ── 12. AI Disaster Chatbot Full Page ──────────────────────────────────────
  async renderChatbot(area) {
    citizenChatbot.mountFullPage(area);
  }
};

// Expose routing helper for onclick handlers in innerHTML strings
window.viewCitizenIncident = (id) => {
  document.querySelector('[data-tab="citizen-incident-details"]')?.click();
};
