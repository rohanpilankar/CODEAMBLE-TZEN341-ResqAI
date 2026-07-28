import { incidentApi } from './api/incidentApi.js';
import { shelterApi } from './api/shelterApi.js';
import { CONFIG } from './config.js';

// ─── 1. Relative Time Formatter ───────────────────────────────────────────────
function timeAgo(dateString) {
  if (!dateString) return 'Unknown';
  try {
    const cleaned = dateString.replace(' ', 'T');
    const date = new Date(cleaned);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (isNaN(seconds)) return dateString.split('.')[0];
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch (e) {
    return dateString;
  }
}

// ─── 2. Smooth Counting Stat Animation ────────────────────────────────────────
function animateCount(elementId, targetValue, duration = 1200) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const startValue = 0;
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // Ease-out quad formula for natural acceleration deceleration curve
    const easeProgress = progress * (2 - progress);
    const currentValue = Math.floor(startValue + easeProgress * (targetValue - startValue));
    
    element.innerText = currentValue;

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      element.innerText = targetValue;
    }
  }

  requestAnimationFrame(updateCount);
}

// ─── 3. High-Performance Infinite Scroll Ticker ──────────────────────────────
class LiveTicker {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.speedPerMs = 0.027; // Smooth 60FPS velocity (~27px/sec) independent of refresh rate
    this.scrollY = 0;
    this.isPaused = false;
    this.animationFrameId = null;
    this.wrapper = null;
    this.halfHeight = 0;
    this.lastTimestamp = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  init() {
    this.container.addEventListener('mouseenter', () => this.isPaused = true);
    this.container.addEventListener('mouseleave', () => {
      this.isPaused = false;
      this.lastTimestamp = performance.now();
    });
    this.container.addEventListener('focusin', () => this.isPaused = true);
    this.container.addEventListener('focusout', () => {
      this.isPaused = false;
      this.lastTimestamp = performance.now();
    });

    window.addEventListener('resize', () => {
      if (this.wrapper) {
        this.halfHeight = this.wrapper.scrollHeight / 2.2;
      }
    }, { passive: true });
  }

  start(items) {
    if (!this.container || !items.length) return;
    this.destroy();
    this.container.innerHTML = '';
    
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ticker-wrapper';
    this.wrapper.style.willChange = 'transform';
    this.wrapper.style.display = 'flex';
    this.wrapper.style.flexDirection = 'column';
    this.wrapper.style.gap = '12px';

    items.forEach(item => this.wrapper.appendChild(item));
    this.container.appendChild(this.wrapper);

    // If screen reader requests reduced motion, or items fit within the view, don't auto-scroll
    if (this.reducedMotion || this.container.scrollHeight <= this.container.clientHeight) {
      this.container.style.overflowY = 'auto';
      return;
    }

    // Clone items to fill screen and enable infinite loop
    const containerHeight = this.container.clientHeight;
    let accumulatedHeight = 0;
    let index = 0;
    while (accumulatedHeight < containerHeight * 2.5) {
      const clone = items[index % items.length].cloneNode(true);
      this.wrapper.appendChild(clone);
      accumulatedHeight += 95; // Approximate height with gaps
      index++;
    }

    // Precompute halfHeight once to avoid forced synchronous reflow / layout thrashing per frame
    this.halfHeight = this.wrapper.scrollHeight / 2.2;
    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  animate(timestamp) {
    if (this.isPaused || !timestamp) {
      this.lastTimestamp = timestamp || performance.now();
      this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts));
      return;
    }

    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    const validDelta = Math.min(delta, 100);

    this.scrollY += this.speedPerMs * validDelta;

    if (this.scrollY >= this.halfHeight && this.halfHeight > 0) {
      this.scrollY = 0;
    }

    this.wrapper.style.transform = `translate3d(0, -${this.scrollY.toFixed(2)}px, 0)`;
    this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts));
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// ─── 4. Dynamic Health Status Verification ──────────────────────────────────
async function checkSystemHealth() {
  const apiBadge = document.getElementById('status-api');
  const wsBadge = document.getElementById('status-ws');
  
  if (!apiBadge || !wsBadge) return;

  // 1. Verify Backend API Health
  try {
    const healthUrl = CONFIG.API_BASE_URL.replace('/api/v1', '/api/health');
    const response = await fetch(healthUrl);
    if (response.ok) {
      apiBadge.innerText = 'Online';
      apiBadge.className = 'status-badge status-online';
    } else {
      apiBadge.innerText = 'Degraded';
      apiBadge.className = 'status-badge status-connecting';
    }
  } catch (e) {
    apiBadge.innerText = 'Offline';
    apiBadge.className = 'status-badge status-offline';
  }

  // 2. Verify WebSocket Availability
  try {
    const wsUrl = CONFIG.WS_BASE_URL + '/health_ping_client';
    const testSocket = new WebSocket(wsUrl);
    
    testSocket.onopen = () => {
      wsBadge.innerText = 'Online';
      wsBadge.className = 'status-badge status-online';
      testSocket.close();
    };
    
    testSocket.onerror = () => {
      // If server is not running at all
      wsBadge.innerText = 'Offline';
      wsBadge.className = 'status-badge status-offline';
    };

    testSocket.onclose = (event) => {
      // 4001 indicates authentication failure, meaning server responded and is alive!
      if (event.code === 4001 || event.wasClean) {
        wsBadge.innerText = 'Online';
        wsBadge.className = 'status-badge status-online';
      } else {
        wsBadge.innerText = 'Offline';
        wsBadge.className = 'status-badge status-offline';
      }
    };
  } catch (err) {
    wsBadge.innerText = 'Offline';
    wsBadge.className = 'status-badge status-offline';
  }
}

// ─── 5. Main Application Initialization ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // A. Lazy Load and GPU Control for Video
  const video = document.getElementById('hero-bg-video');
  if (video) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.1 });
    
    observer.observe(video);
  }

  // B. Run Health Checks
  checkSystemHealth();
  // Poll health checks every 30 seconds
  setInterval(checkSystemHealth, 30000);

  // C. Fetch and Render Bulletin & Statistics
  const ticker = new LiveTicker('live-bulletin-container');
  
  try {
    const [incidentsRes, sheltersRes] = await Promise.all([
      incidentApi.getIncidents(),
      shelterApi.getShelters()
    ]);

    const incidents = Array.isArray(incidentsRes) ? incidentsRes : (incidentsRes && Array.isArray(incidentsRes.data) ? incidentsRes.data : []);
    const shelters = Array.isArray(sheltersRes) ? sheltersRes : (sheltersRes && Array.isArray(sheltersRes.data) ? sheltersRes.data : []);

    // 1. Calculate active statistics
    const activeIncidents = incidents.filter(i => (i.status || '').toLowerCase() !== 'resolved');
    const criticalIncidents = activeIncidents.filter(i => (i.severity || '').toLowerCase() === 'critical');
    const activeShelters = shelters.filter(s => s.is_active);

    // 2. Trigger count animations
    animateCount('stat-active-incidents', activeIncidents.length);
    animateCount('stat-critical-incidents', criticalIncidents.length);
    animateCount('stat-active-shelters', activeShelters.length);

    // 3. Update bulletin sync timestamp
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestampEl = document.getElementById('bulletin-timestamp');
    if (timestampEl) {
      timestampEl.innerText = `Synced: ${timeNow}`;
    }

    // 4. Render and start bulletin ticker
    const bulletinContainer = document.getElementById('live-bulletin-container');
    if (bulletinContainer) {
      if (incidents.length === 0) {
        bulletinContainer.innerHTML = `
          <div class="empty-state text-center py-5">
            <i class="fa fa-circle-check empty-icon text-success fs-1 mb-2"></i>
            <h3>No Active Emergencies</h3>
            <p class="text-secondary">All reported incidents have been resolved.</p>
          </div>
        `;
        return;
      }

      const cardElements = incidents.slice(0, 10).map(inc => {
        const disasterType = inc.disaster_type || 'Other';
        const iconClass = CONFIG.DISASTER_ICONS[disasterType] || 'fa-exclamation-triangle';
        
        const statusLower = (inc.status || 'reported').toLowerCase();
        let statusBadgeClass = 'badge-reported';
        if (statusLower === 'active' || statusLower === 'in progress') statusBadgeClass = 'badge-in-progress';
        else if (statusLower === 'resolved') statusBadgeClass = 'badge-resolved';
        else if (statusLower === 'closed') statusBadgeClass = 'badge-closed';

        const severityUpper = (inc.severity || 'LOW').toUpperCase();
        const severityColor = CONFIG.SEVERITY_COLORS[severityUpper] || '#f59e0b';
        let severityBadgeClass = 'badge-low';
        if (severityUpper === 'CRITICAL') severityBadgeClass = 'badge-critical';
        else if (severityUpper === 'HIGH') severityBadgeClass = 'badge-high';
        else if (severityUpper === 'MEDIUM') severityBadgeClass = 'badge-medium';

        const formattedTime = timeAgo(inc.created_at);

        const card = document.createElement('div');
        card.className = 'p-3 rounded-3 hover-lift transition-fast';
        card.style.background = 'rgba(255,255,255,0.015)';
        card.style.border = '1px solid var(--glass-border)';
        card.style.position = 'relative';
        card.style.borderLeft = `4px solid ${severityColor}`;

        card.innerHTML = `
          <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div style="flex: 1; min-width: 250px;">
              <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span class="badge ${severityBadgeClass}">${inc.severity}</span>
                <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-secondary);"><i class="fa ${iconClass} me-1"></i> ${disasterType}</span>
                <span class="badge ${statusBadgeClass}">${inc.status}</span>
              </div>
              <h5 class="fs-6 font-weight-700 mb-1 color-white">${inc.title}</h5>
              <p class="font-size-sm color-muted mb-2 text-truncate-2" style="font-size: 0.85rem;">${inc.description}</p>
              <div class="d-flex align-items-center gap-3 text-secondary font-size-xs" style="font-size: 0.78rem;">
                <span><i class="fa fa-map-marker-alt me-1 text-danger"></i> ${inc.address || 'Location Specified'}</span>
                <span><i class="fa fa-clock me-1 text-primary"></i> ${formattedTime}</span>
              </div>
            </div>
          </div>
        `;
        return card;
      });

      ticker.start(cardElements);
    }
  } catch (err) {
    console.error('Error loading bulletin dashboard:', err);
    const bulletinContainer = document.getElementById('live-bulletin-container');
    if (bulletinContainer) {
      bulletinContainer.innerHTML = `
        <div class="alert-banner alert-danger text-center py-4">
          <i class="fa fa-exclamation-circle me-2 fs-4 mb-2"></i>
          <div>Failed to retrieve emergency updates. Please check connection.</div>
          <button class="btn btn-secondary btn-sm mt-3" onclick="window.location.reload()"><i class="fa fa-sync-alt"></i> Retry</button>
        </div>
      `;
    }
  }
});
