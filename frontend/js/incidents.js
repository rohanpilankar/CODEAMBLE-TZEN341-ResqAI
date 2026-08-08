import { incidentApi } from './api/incidentApi.js';
import { aiApi } from './api/aiApi.js';
import { locationService } from './services/locationService.js';
import { notificationService } from './services/notificationService.js';
import { storageService } from './services/storageService.js';
import { formatDate } from './utils/date.js';
import { resolveMediaUrl, pickMediaUrl } from './utils/helpers.js';
import { openModal, closeModal } from './components/modal.js';
import { firebaseService } from './services/firebaseService.js';
import { CONFIG } from './config.js';


export const incidentHandler = {

  // ── Internal state ────────────────────────────────────────────────────────
  _previewMap: null,
  _previewMarker: null,
  _exifrLoaded: false,
  _cameraStream: null,

  // ── Platform detection ────────────────────────────────────────────────────
  _isMobile() {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
  },

  // ── Camera Modal (desktop getUserMedia) ──────────────────────────────────
  async openCameraModal() {
    // On mobile, the native capture input is better
    if (this._isMobile()) {
      document.getElementById('incident-camera-input')?.click();
      return;
    }

    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      notificationService.warning('Camera Not Supported', 'Your browser does not support camera access. Please upload a photo instead.');
      document.getElementById('incident-upload-input')?.click();
      return;
    }

    // Inject modal if not already present
    if (!document.getElementById('resqai-camera-modal')) {
      const modalEl = document.createElement('div');
      modalEl.id = 'resqai-camera-modal';
      modalEl.className = 'resqai-camera-overlay';
      modalEl.innerHTML = `
        <div class="resqai-camera-dialog" id="camera-dialog">
          <div class="camera-dialog-header">
            <div class="camera-title">
              <i class="fa fa-camera-retro"></i>
              <span>ResQAI Geo-Tagged Camera</span>
            </div>
            <div class="camera-header-meta" id="camera-gps-badge">
              <i class="fa fa-crosshairs fa-spin"></i> Acquiring GPS…
            </div>
            <button class="camera-close-btn" id="btn-camera-close" title="Close">
              <i class="fa fa-times"></i>
            </button>
          </div>

          <div class="camera-viewfinder-wrap">
            <video id="camera-video" autoplay playsinline muted class="camera-video"></video>
            <canvas id="camera-canvas" style="display:none;"></canvas>
            <div class="camera-viewfinder-overlay">
              <div class="camera-corner tl"></div>
              <div class="camera-corner tr"></div>
              <div class="camera-corner bl"></div>
              <div class="camera-corner br"></div>
            </div>
            <div class="camera-flash" id="camera-flash"></div>
          </div>

          <div class="camera-controls">
            <button class="camera-switch-btn" id="btn-camera-switch" title="Switch camera">
              <i class="fa fa-sync-alt"></i>
            </button>
            <button class="camera-shutter-btn" id="btn-camera-shutter">
              <div class="shutter-ring"></div>
              <div class="shutter-core"></div>
            </button>
            <div class="camera-gps-mini" id="camera-gps-mini">
              <i class="fa fa-map-marker-alt"></i>
              <span id="camera-gps-text">—</span>
            </div>
          </div>

          <div class="camera-info-bar">
            <span><i class="fa fa-circle text-danger me-1" style="font-size:0.6rem;"></i> Live</span>
            <span id="camera-ts"></span>
            <span id="camera-res">—</span>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    const modal = document.getElementById('resqai-camera-modal');
    const video = document.getElementById('camera-video');
    modal.classList.add('active');

    // Start GPS acquisition in parallel
    let captureGps = { lat: this.currentLat || null, lng: this.currentLng || null };
    locationService.getCurrentPosition().then(pos => {
      captureGps.lat = pos.lat;
      captureGps.lng = pos.lng;
      const badge = document.getElementById('camera-gps-badge');
      const miniText = document.getElementById('camera-gps-text');
      if (badge) badge.innerHTML = `<i class="fa fa-map-marker-alt"></i> ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
      if (miniText) miniText.textContent = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
    }).catch(() => {
      const badge = document.getElementById('camera-gps-badge');
      if (badge) badge.innerHTML = `<i class="fa fa-exclamation-triangle text-warning"></i> GPS unavailable`;
    });

    // Update timestamp ticker
    const tsTicker = setInterval(() => {
      const el = document.getElementById('camera-ts');
      if (el) el.textContent = new Date().toLocaleTimeString();
    }, 1000);

    // Start webcam
    this._currentFacingMode = 'environment';
    try {
      this._cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      video.srcObject = this._cameraStream;
      video.onloadedmetadata = () => {
        const resEl = document.getElementById('camera-res');
        if (resEl) resEl.textContent = `${video.videoWidth}×${video.videoHeight}`;
      };
    } catch (err) {
      clearInterval(tsTicker);
      this.closeCameraModal();
      notificationService.error('Camera Access Denied', 'Please allow camera permission and try again. You can also upload a photo instead.');
      return;
    }

    // Switch camera
    const switchBtn = document.getElementById('btn-camera-switch');
    switchBtn.onclick = async () => {
      this._currentFacingMode = this._currentFacingMode === 'environment' ? 'user' : 'environment';
      if (this._cameraStream) {
        this._cameraStream.getTracks().forEach(t => t.stop());
      }
      try {
        this._cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this._currentFacingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        video.srcObject = this._cameraStream;
      } catch { /* silent */ }
    };

    // Shutter button
    const shutterBtn = document.getElementById('btn-camera-shutter');
    shutterBtn.onclick = () => this.captureFromCamera(captureGps, tsTicker);

    // Close button
    document.getElementById('btn-camera-close').onclick = () => {
      clearInterval(tsTicker);
      this.closeCameraModal();
    };

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        clearInterval(tsTicker);
        this.closeCameraModal();
      }
    }, { once: true });
  },

  closeCameraModal() {
    if (this._cameraStream) {
      this._cameraStream.getTracks().forEach(t => t.stop());
      this._cameraStream = null;
    }
    const modal = document.getElementById('resqai-camera-modal');
    if (modal) modal.classList.remove('active');
    const video = document.getElementById('camera-video');
    if (video) video.srcObject = null;
  },

  captureFromCamera(gps, tsTicker) {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const flash = document.getElementById('camera-flash');
    if (!video || !canvas) return;

    // Flash effect
    if (flash) {
      flash.classList.add('flash-active');
      setTimeout(() => flash.classList.remove('flash-active'), 400);
    }

    // Draw frame to canvas
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    // Mirror if front camera
    if (this._currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stamp timestamp + GPS onto image
    const now = new Date();
    const stamp = `${now.toLocaleString()}  |  GPS: ${gps.lat?.toFixed(5) ?? 'N/A'}, ${gps.lng?.toFixed(5) ?? 'N/A'}`;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset mirror
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(stamp, canvas.width - 12, canvas.height - 12);

    // Convert canvas → Blob → File
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `resqai-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Store GPS directly — no EXIF in canvas, but we have live GPS
      if (gps.lat && gps.lng) {
        this.currentLat = gps.lat;
        this.currentLng  = gps.lng;
      }

      // Close modal first
      if (tsTicker) clearInterval(tsTicker);
      this.closeCameraModal();

      // Process the captured file (shows preview, map, metadata)
      await this.handlePhotoCaptureWithGps(capturedFile, gps.lat, gps.lng, now);
    }, 'image/jpeg', 0.92);
  },

  // Extended handlePhotoCapture that accepts pre-known GPS (from live camera)
  async handlePhotoCaptureWithGps(file, preLat, preLng, captureTime) {
    this.selectedMediaFile = file;

    // Show image preview immediately
    const url = URL.createObjectURL(file);
    const previewContainer = document.getElementById('media-preview-container');
    if (previewContainer) {
      previewContainer.innerHTML = `<img src="${url}" alt="Captured photo" style="max-height:180px;width:100%;border-radius:10px;object-fit:cover;" />`;
      previewContainer.classList.remove('d-none');
    }

    const metaPanel = document.getElementById('incident-metadata-panel');
    const metaContent = document.getElementById('metadata-content');
    if (metaPanel) metaPanel.classList.remove('d-none');
    if (metaContent) metaContent.innerHTML = `
      <div class="d-flex align-items-center gap-2 text-muted">
        <i class="fa fa-spinner fa-spin"></i>
        <span style="font-size:0.85rem;">Processing captured photo…</span>
      </div>`;

    let lat = preLat || this.currentLat;
    let lng = preLng || this.currentLng;

    // If still no GPS, try browser geolocation
    if (!lat || !lng) {
      try {
        const pos = await locationService.getCurrentPosition();
        lat = pos.lat; lng = pos.lng;
      } catch {
        lat = CONFIG.MAP.DEFAULT_LAT; lng = CONFIG.MAP.DEFAULT_LNG;
      }
    }

    this.currentLat = lat;
    this.currentLng = lng;

    // Update GPS display
    const gpsDisplay = document.getElementById('gps-coords-display');
    if (gpsDisplay) {
      gpsDisplay.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      gpsDisplay.classList.add('gps-autofilled');
    }

    // Capture time field
    const capturedAtEl = document.getElementById('incident-captured-at');
    const capturedStr = (captureTime || new Date()).toLocaleString();
    if (capturedAtEl) capturedAtEl.value = capturedStr;

    // Reverse geocode
    let address = '';
    try {
      address = await locationService.reverseGeocode(lat, lng);
      const addrInput = document.getElementById('incident-address-input');
      if (addrInput) {
        addrInput.value = address;
        addrInput.classList.add('field-autofilled');
      }
    } catch { /* silent */ }

    // Init map preview
    this.initPreviewMap(lat, lng);

    // Render chips
    const chips = [
      { icon: 'fa-camera', label: 'Source', value: 'Live Camera Capture', source: 'ResQAI', ok: true },
      { icon: 'fa-map-marker-alt', label: 'GPS', value: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, source: preLat ? 'Live GPS' : 'Device GPS', ok: true },
      { icon: 'fa-calendar-alt', label: 'Captured', value: capturedStr, source: 'Device Clock', ok: true },
    ];
    if (address) chips.push({ icon: 'fa-location-arrow', label: 'Address', value: address.substring(0, 60) + (address.length > 60 ? '…' : ''), source: 'Geocoded', ok: true });

    if (metaContent) {
      metaContent.innerHTML = chips.map(c => `
        <div class="meta-chip meta-chip-ok">
          <i class="fa ${c.icon} meta-chip-icon"></i>
          <div class="meta-chip-body">
            <div class="meta-chip-label">${c.label} <span class="meta-chip-source">${c.source}</span></div>
            <div class="meta-chip-value">${c.value}</div>
          </div>
          <i class="fa fa-check-circle meta-chip-check"></i>
        </div>`).join('');
    }

    notificationService.success('Photo Captured', `Geo-tagged photo captured at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  },

  // ── EXIF Extraction ───────────────────────────────────────────────────────
  async extractExifData(file) {
    try {
      // Dynamically load exifr (lightweight EXIF parser, ~20KB)
      if (!this._exifrLoaded) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/exifr@7/dist/lite.umd.cjs';
          s.onload = () => { this._exifrLoaded = true; resolve(); };
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      // eslint-disable-next-line no-undef
      const data = await window.exifr.parse(file, {
        gps: true,
        tiff: true,
        exif: true,
        ifd0: true,
      });

      if (!data) return null;

      const result = {};
      // GPS
      if (data.latitude != null && data.longitude != null) {
        result.lat = data.latitude;
        result.lng = data.longitude;
        result.altitude = data.GPSAltitude ? `${data.GPSAltitude.toFixed(1)} m` : null;
      }
      // Date/time
      if (data.DateTimeOriginal || data.DateTime) {
        result.datetime = data.DateTimeOriginal || data.DateTime;
      }
      // Device info
      result.make  = data.Make  || null;
      result.model = data.Model || null;
      // Orientation
      const orientMap = {
        1: 'Normal', 3: '180°', 6: '90° CW', 8: '90° CCW',
      };
      result.orientation = orientMap[data.Orientation] || null;

      return result;
    } catch (err) {
      console.warn('[EXIF] Extraction failed:', err.message);
      return null;
    }
  },

  // ── MapTiler Preview Map ──────────────────────────────────────────────────
  initPreviewMap(lat, lng) {
    const container = document.getElementById('incident-preview-map');
    if (!container || !window.L) return;

    // Unhide container first so Leaflet can calculate dimensions correctly
    container.parentElement.classList.remove('d-none');

    // Destroy old instance
    if (this._previewMap) {
      this._previewMap.remove();
      this._previewMap = null;
      this._previewMarker = null;
    }

    this._previewMap = window.L.map(container, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    // MapTiler Streets tile layer
    window.L.tileLayer(CONFIG.MAPTILER.TILE_URL, {
      attribution: CONFIG.MAPTILER.ATTRIBUTION,
      maxZoom: 20,
      tileSize: 256,
    }).addTo(this._previewMap);

    // Custom pulsing marker
    const pulseIcon = window.L.divIcon({
      className: '',
      html: `<div class="incident-map-pin">
               <div class="pin-core"></div>
               <div class="pin-pulse-ring"></div>
               <div class="pin-pulse-ring delay"></div>
             </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    this._previewMarker = window.L.marker([lat, lng], { icon: pulseIcon }).addTo(this._previewMap);

    // Ensure Leaflet resizes correctly after unhiding
    setTimeout(() => {
      if (this._previewMap) {
        this._previewMap.invalidateSize();
      }
    }, 150);
  },

  updatePreviewMap(lat, lng) {
    document.getElementById('incident-preview-map')?.parentElement?.classList.remove('d-none');

    if (!this._previewMap || !this._previewMarker) {
      this.initPreviewMap(lat, lng);
      return;
    }
    this._previewMap.setView([lat, lng], 15, { animate: true });
    this._previewMarker.setLatLng([lat, lng]);

    setTimeout(() => {
      if (this._previewMap) {
        this._previewMap.invalidateSize();
      }
    }, 150);
  },

  // ── Photo Capture Handler ─────────────────────────────────────────────────
  async handlePhotoCapture(file) {
    if (!file) return;

    this.selectedMediaFile = file;

    // Show image preview immediately
    const url = URL.createObjectURL(file);
    const previewContainer = document.getElementById('media-preview-container');
    const isVideo = file.type.startsWith('video/');
    if (previewContainer) {
      previewContainer.innerHTML = isVideo
        ? `<video src="${url}" controls style="max-height:180px;width:100%;border-radius:10px;object-fit:cover;"></video>`
        : `<img src="${url}" alt="Captured photo" style="max-height:180px;width:100%;border-radius:10px;object-fit:cover;" />`;
      previewContainer.classList.remove('d-none');
    }

    // Show metadata panel in loading state
    const metaPanel = document.getElementById('incident-metadata-panel');
    const metaContent = document.getElementById('metadata-content');
    if (metaPanel) metaPanel.classList.remove('d-none');
    if (metaContent) metaContent.innerHTML = `
      <div class="d-flex align-items-center gap-2 text-muted">
        <i class="fa fa-spinner fa-spin"></i>
        <span style="font-size:0.85rem;">Extracting metadata from photo…</span>
      </div>`;

    try {
      // 1 — Extract EXIF
      const exif = isVideo ? null : await this.extractExifData(file);
      let lat = null, lng = null;

      if (exif?.lat && exif?.lng) {
        lat = exif.lat;
        lng = exif.lng;
        notificationService.success('GPS Extracted', `Location found in photo: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        // 2 — Fall back to browser geolocation
        try {
          const pos = await locationService.getCurrentPosition();
          lat = pos.lat;
          lng = pos.lng;
          notificationService.info('GPS Detected', 'No GPS in photo — using device location.');
        } catch {
          lat = CONFIG.MAP.DEFAULT_LAT;
          lng = CONFIG.MAP.DEFAULT_LNG;
          notificationService.warning('GPS Unavailable', 'Using default city coordinates.');
        }
      }

      this.currentLat = lat;
      this.currentLng = lng;

      // Update GPS display
      const gpsDisplay = document.getElementById('gps-coords-display');
      if (gpsDisplay) {
        gpsDisplay.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        gpsDisplay.classList.add('gps-autofilled');
      }

      // Reverse geocode
      let address = '';
      try {
        address = await locationService.reverseGeocode(lat, lng);
        const addrInput = document.getElementById('incident-address-input');
        if (addrInput && !addrInput.value) {
          addrInput.value = address;
          addrInput.classList.add('field-autofilled');
        }
      } catch { /* silent */ }

      // Init map preview
      this.initPreviewMap(lat, lng);

      // Render metadata panel
      const chips = [];
      chips.push({ icon: 'fa-map-marker-alt', label: 'GPS', value: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, source: exif?.lat ? 'EXIF Photo' : 'Device GPS', ok: true });
      if (exif?.datetime) {
        chips.push({ icon: 'fa-calendar-alt', label: 'Captured', value: new Date(exif.datetime).toLocaleString(), source: 'EXIF', ok: true });
        const capturedAt = document.getElementById('incident-captured-at');
        if (capturedAt) capturedAt.value = new Date(exif.datetime).toLocaleString();
      } else {
        chips.push({ icon: 'fa-calendar-alt', label: 'Captured', value: new Date().toLocaleString(), source: 'Device Clock', ok: false });
      }
      if (exif?.altitude)  chips.push({ icon: 'fa-mountain', label: 'Altitude', value: exif.altitude, source: 'EXIF', ok: true });
      if (exif?.make || exif?.model) chips.push({ icon: 'fa-mobile-alt', label: 'Device', value: [exif.make, exif.model].filter(Boolean).join(' '), source: 'EXIF', ok: true });
      if (exif?.orientation) chips.push({ icon: 'fa-sync-alt', label: 'Orientation', value: exif.orientation, source: 'EXIF', ok: true });
      if (address) chips.push({ icon: 'fa-location-arrow', label: 'Address', value: address.substring(0, 60) + (address.length > 60 ? '…' : ''), source: 'Geocoded', ok: true });

      const chipsHtml = chips.map(c => `
        <div class="meta-chip ${c.ok ? 'meta-chip-ok' : 'meta-chip-warn'}">
          <i class="fa ${c.icon} meta-chip-icon"></i>
          <div class="meta-chip-body">
            <div class="meta-chip-label">${c.label} <span class="meta-chip-source">${c.source}</span></div>
            <div class="meta-chip-value">${c.value}</div>
          </div>
          ${c.ok ? '<i class="fa fa-check-circle meta-chip-check"></i>' : '<i class="fa fa-exclamation-circle meta-chip-warn-icon"></i>'}
        </div>`).join('');

      if (metaContent) {
        metaContent.innerHTML = chipsHtml;
      }

    } catch (err) {
      console.error('[Photo Capture]', err);
      if (metaContent) metaContent.innerHTML = `<div class="text-danger font-size-sm"><i class="fa fa-exclamation-triangle me-1"></i>${err.message}</div>`;
    }
  },

  async renderReportForm(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Reset state
    this._previewMap = null;
    this._previewMarker = null;

    el.innerHTML = `
      <div class="smart-report-card">

        <!-- Header -->
        <div class="smart-report-header">
          <div class="smart-report-icon">
            <i class="fa fa-shield-alt"></i>
          </div>
          <div>
            <h2 class="smart-report-title">Report Emergency Incident</h2>
            <p class="smart-report-subtitle">Capture or upload a photo — ResQAI will automatically extract location, time, and device metadata.</p>
          </div>
        </div>

        <form id="incident-report-form" autocomplete="off">

          <!-- ── Step 1: Photo Capture ───────────────────────────────────── -->
          <div class="capture-step">
            <div class="step-label"><span class="step-badge">1</span> Capture Photo Evidence</div>

            <div class="photo-capture-zone" id="photo-drop-zone">
              <!-- Hidden inputs -->
              <input type="file" id="incident-camera-input"  accept="image/*"       capture="environment" style="display:none;" />
              <input type="file" id="incident-upload-input"  accept="image/*,video/*" style="display:none;" />

              <div id="media-preview-container" class="d-none media-preview-wrapper"></div>

              <div class="capture-buttons-row" id="capture-buttons-row">
                <button type="button" class="capture-btn capture-btn-camera" id="btn-take-photo">
                  <div class="capture-btn-inner">
                    <div class="capture-btn-icon">
                      <i class="fa fa-camera"></i>
                    </div>
                    <div class="capture-btn-pulse"></div>
                  </div>
                  <div class="capture-btn-label">Take Live Photo</div>
                  <div class="capture-btn-sub">Opens geo-tagged camera</div>
                </button>

                <div class="capture-divider">or</div>

                <button type="button" class="capture-btn capture-btn-upload" id="btn-upload-photo">
                  <div class="capture-btn-inner">
                    <div class="capture-btn-icon">
                      <i class="fa fa-cloud-upload-alt"></i>
                    </div>
                  </div>
                  <div class="capture-btn-label">Upload Existing Photo</div>
                  <div class="capture-btn-sub">JPG, PNG, MP4 — Max 50MB</div>
                </button>
              </div>

              <div class="drop-hint" id="drop-hint">
                <i class="fa fa-hand-paper me-1"></i> Or drag &amp; drop a photo here
              </div>
            </div>

            <!-- Metadata Panel (hidden until photo captured) -->
            <div class="incident-metadata-panel d-none" id="incident-metadata-panel">
              <div class="metadata-panel-header">
                <i class="fa fa-microchip text-primary me-2"></i>
                <span>Auto-Extracted Metadata</span>
                <span class="metadata-badge ms-auto">AI-Powered</span>
              </div>
              <div class="metadata-content" id="metadata-content">
                <!-- Chips injected here -->
              </div>
            </div>

            <!-- Map Preview (hidden until GPS resolved) -->
            <div class="map-preview-wrapper d-none" id="map-preview-wrapper">
              <div class="map-preview-header">
                <i class="fa fa-map-marked-alt text-primary me-2"></i>
                <span>Incident Location Preview</span>
                <span class="map-badge ms-auto"><i class="fa fa-satellite-dish me-1"></i>MapTiler</span>
              </div>
              <div id="incident-preview-map" class="incident-preview-map"></div>
            </div>
          </div>

          <!-- ── Step 2: Incident Details ────────────────────────────────── -->
          <div class="capture-step mt-4">
            <div class="step-label"><span class="step-badge">2</span> Incident Details</div>

            <div class="form-group">
              <label class="form-label">Incident Title</label>
              <input type="text" name="title" class="form-control" placeholder="e.g. Flash flood trapped residents" required />
            </div>

            <div class="row">
              <div class="col-md-6 form-group">
                <label class="form-label">Disaster Category</label>
                <select name="disaster_type" class="form-control" required>
                  <option value="Flood">🌊 Flood</option>
                  <option value="Earthquake">🌍 Earthquake</option>
                  <option value="Fire">🔥 Fire</option>
                  <option value="Building Collapse">🏚 Building Collapse</option>
                  <option value="Hurricane">🌀 Hurricane</option>
                  <option value="Landslide">⛰ Landslide</option>
                  <option value="Gas Leak">☣ Gas Leak</option>
                  <option value="Power Outage">⚡ Power Outage</option>
                  <option value="Road Accident">🚗 Road Accident</option>
                  <option value="Medical Emergency">🏥 Medical Emergency</option>
                  <option value="Other">⚠ Other</option>
                </select>
              </div>
              <div class="col-md-6 form-group">
                <label class="form-label">GPS Location</label>
                <div class="input-group">
                  <input type="text" id="gps-coords-display" class="form-control" placeholder="Fetching GPS…" readonly />
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-detect-gps" title="Re-detect GPS">
                    <i class="fa fa-crosshairs"></i> Detect
                  </button>
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
              <input type="text" name="address" id="incident-address-input" class="form-control" placeholder="Auto-filled from GPS or type manually…" />
            </div>

            <div class="form-group">
              <label class="form-label">Photo Capture Time</label>
              <input type="text" id="incident-captured-at" class="form-control" placeholder="Auto-filled from photo EXIF…" readonly />
            </div>

            <div class="form-group">
              <label class="form-label">Description &amp; Urgent Needs</label>
              <textarea name="description" class="form-control" rows="4" placeholder="Describe the situation, estimated victims, or immediate assistance needed…" required></textarea>
            </div>
          </div>

          <!-- ── AI Assessment Banner ────────────────────────────────────── -->
          <div id="ai-assessment-banner" style="display: none;" class="alert-banner alert-info mb-3">
            <i class="fa fa-robot font-size-lg"></i>
            <div id="ai-assessment-text">Analyzing report text...</div>
          </div>

          <!-- ── Action Buttons ──────────────────────────────────────────── -->
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary" id="btn-ai-analyze">
              <i class="fa fa-magic me-1"></i> AI Analyze
            </button>
            <button type="submit" class="btn btn-primary" id="btn-submit-report">
              <i class="fa fa-paper-plane me-1"></i> Submit Emergency Report
            </button>
          </div>

        </form>
      </div>
    `;

    // Auto-detect GPS on load (no photo yet)
    this.detectGPS();

    // Take Live Photo button → opens camera modal (getUserMedia on desktop, native on mobile)
    document.getElementById('btn-take-photo')?.addEventListener('click', () => this.openCameraModal());

    // Mobile camera input fallback (used by openCameraModal on mobile)
    document.getElementById('incident-camera-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handlePhotoCapture(file);
    });

    // Upload input
    document.getElementById('btn-upload-photo')?.addEventListener('click', () => {
      document.getElementById('incident-upload-input')?.click();
    });
    document.getElementById('incident-upload-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handlePhotoCapture(file);
    });

    // Drag and drop
    const dropZone = document.getElementById('photo-drop-zone');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files?.[0];
        if (file) this.handlePhotoCapture(file);
      });
    }

    // Other button listeners
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

      notificationService.success('Report Submitted!', `Emergency report #${res.id || 'NEW'} submitted & synced.`);

      form.reset();
      this.selectedMediaFile = null;
      this.aiAssessment = null;

      // Reset photo + metadata + map
      const previewContainer = document.getElementById('media-preview-container');
      if (previewContainer) { previewContainer.innerHTML = ''; previewContainer.classList.add('d-none'); }
      const metaPanel = document.getElementById('incident-metadata-panel');
      if (metaPanel) metaPanel.classList.add('d-none');
      const mapWrapper = document.getElementById('map-preview-wrapper');
      if (mapWrapper) mapWrapper.classList.add('d-none');
      if (this._previewMap) { this._previewMap.remove(); this._previewMap = null; this._previewMarker = null; }

      // Store in Firebase
      try {
        await firebaseService.pushRealtimeIncident({ id: res.id, ...data, status: 'REPORTED' });
        await firebaseService.addFirestoreRecord('incidents', { id: res.id, ...data, status: 'REPORTED' });
      } catch (fbErr) {
        console.warn('Firebase sync warning:', fbErr);
      }
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
