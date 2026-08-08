import { CONFIG } from './config.js';
import { storageService } from './services/storageService.js';
import { notificationService } from './services/notificationService.js';
import { renderNavbar } from './components/navbar.js';
import { renderSidebar, initSidebarGroups } from './components/sidebar.js';
import { renderFooter } from './components/footer.js';
import { renderStatCard } from './components/card.js';
import { MapController } from './maps.js';
import { incidentHandler } from './incidents.js';
import { shelterHandler } from './shelters.js';
import { resourceHandler } from './resources.js';
import { analyticsHandler } from './analytics.js';
import { notificationHandler } from './notifications.js';
import { analyticsApi } from './api/analyticsApi.js';
import { incidentApi } from './api/incidentApi.js';
import { shelterApi } from './api/shelterApi.js';
import { resourceApi } from './api/resourceApi.js';
import { wsClient } from './websocket.js';
import { commandCenter } from './commandCenter.js';
import { citizenHandler } from './citizen.js';
import { userApi } from './api/userApi.js';
import { rescueHandler } from './rescue.js';
import { ngoHandler } from './ngo.js';
import { adminHandler } from './admin.js';
import { blockchainHandler } from './blockchain.js';
import { citizenChatbot } from './components/chatbotWidget.js';
export const dashboardManager = {
  user: null,
  userRole: null,
  currentTab: 'overview',
  mapController: null,

  // Role → default landing tab map
  ROLE_DEFAULT_TABS: {
    'Citizen':               'citizen-incidents',
    'Volunteer':             'rescue-missions',
    'Rescue Team':           'rescue-dashboard',
    'Government Authority':  'gov-command',
    'NGO':                   'ngo-dashboard',
    'Admin':                 'admin-dashboard',
  },

  normalizeRole(role) {
    if (!role) return 'Citizen';
    if (typeof role === 'object') role = role.name || '';
    const r = String(role).trim().toLowerCase();
    if (r.includes('admin')) return 'Admin';
    if (r.includes('gov')) return 'Government Authority';
    if (r.includes('rescue')) return 'Rescue Team';
    if (r.includes('ngo')) return 'NGO';
    if (r.includes('volunteer')) return 'Volunteer';
    return 'Citizen';
  },

  async init() {
    // 1. Guard check
    if (!storageService.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }

    try {
      this.user     = storageService.getUser();
      const rawRole = storageService.getUserRole();
      this.userRole = this.normalizeRole(rawRole);

      // 2. Role-aware default tab
      const defaultTab = this.ROLE_DEFAULT_TABS[this.userRole] || 'citizen-incidents';
      this.currentTab  = defaultTab;

      window.rescueHandler = rescueHandler;

      // 3. Render core layout immediately to replace initial loading spinner
      this.renderLayout();


      // 4. Init collapsible sidebar groups safely
      try { initSidebarGroups(); } catch (e) { console.warn('Sidebar init warning:', e); }

      // 5. Connect WebSockets asynchronously
      try { wsClient.connect(); } catch (wsErr) { console.warn('WebSocket connect error:', wsErr); }

      // 6. Load role-default tab
      await this.loadTab(this.currentTab);
    } catch (err) {
      console.error('Dashboard init error:', err);
      if (!document.getElementById('page-content-area')) {
        this.renderLayout();
      }
      const area = document.getElementById('page-content-area');
      if (area) {
        area.innerHTML = `
          <div class="alert-banner alert-danger p-4 m-4">
            <h4 class="mb-2"><i class="fa fa-exclamation-triangle me-2"></i> Dashboard Notice</h4>
            <p class="mb-3">${err.message || 'Error loading dashboard view.'}</p>
            <div class="d-flex gap-2">
              <button class="btn btn-primary btn-sm" onclick="location.reload()"><i class="fa fa-sync-alt me-1"></i> Refresh</button>
              <button class="btn btn-secondary btn-sm" onclick="storageService.clearSession(); location.href='login.html'"><i class="fa fa-sign-out-alt me-1"></i> Clear Session & Sign In</button>
            </div>
          </div>
        `;
      }
    }
  },

  renderLayout() {
    const appEl = document.getElementById('app-root');
    if (!appEl) return;

    appEl.innerHTML = `
      <div class="app-layout">
        ${renderSidebar(this.userRole, this.currentTab)}
        <div class="main-content">
          ${renderNavbar(this.user, `${this.userRole} Dashboard`)}
          <main class="page-content" id="page-content-area"></main>
          ${renderFooter()}
        </div>
      </div>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
    `;

    this.bindGlobalEvents();
    initSidebarGroups();
    try { citizenChatbot.mountFloatingWidget(); } catch (cwErr) { console.warn('Chatbot widget mount warning:', cwErr); }
  },

  bindGlobalEvents() {
    // Sidebar navigation clicks
    document.querySelectorAll('.sidebar-nav .nav-item, .nav-sos-btn').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = e.currentTarget.dataset.tab;
        if (tab) {
          this.switchTab(tab);
        }
      });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // Logout buttons (Sidebar & Topbar)
    const handleLogout = (e) => {
      e.preventDefault();
      storageService.clearSession();
      notificationService.info('Logged Out', 'You have been safely logged out.');
      setTimeout(() => (window.location.href = 'login.html'), 300);
    };

    document.getElementById('nav-logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('nav-topbar-logout-btn')?.addEventListener('click', handleLogout);

    // Notifications button
    document.getElementById('btn-notifications')?.addEventListener('click', () => {
      this.switchTab('notifications');
    });
  },

  switchTab(tab) {
    this.currentTab = tab;

    // Update sidebar active styling
    document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Close mobile sidebar
    document.getElementById('sidebar-container')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    this.loadTab(tab);
  },

  async loadTab(tab) {
    const area = document.getElementById('page-content-area');
    if (!area) return;

    try {
      switch (tab) {
        // ── Legacy / generic tabs (kept for backward-compat) ──────────
        case 'overview':
          await this.renderOverviewTab(area); break;
        case 'live-map':
        case 'incident-map':
          await this.renderLiveMapTab(area); break;
        case 'report':
          await incidentHandler.renderReportForm('page-content-area'); break;
        case 'shelters':
        case 'shelter-mgmt':
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-warehouse text-success me-2"></i> Shelter Management</h2></div><div id="shelters-container-list"></div>`;
          await shelterHandler.renderSheltersList('shelters-container-list'); break;
        case 'missions':
        case 'all-incidents':
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-clipboard-list text-danger me-2"></i> Emergency Incident Control Center</h2></div><div id="incidents-container-table"></div>`;
          await incidentHandler.renderIncidentTable('incidents-container-table'); break;
        case 'equipment':
        case 'resource-alloc':
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-boxes text-info me-2"></i> Resource Allocation</h2></div><div id="resources-container-list"></div>`;
          await resourceHandler.renderResourceOverview('resources-container-list'); break;
        case 'users':
          await this.renderUsersTab(area); break;
        case 'system-logs':
          this.renderAuditLogsTab(area); break;
        case 'analytics':
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-chart-pie text-warning me-2"></i> Analytics</h2></div><div id="analytics-container-main"></div>`;
          await analyticsHandler.renderAnalyticsDashboard('analytics-container-main'); break;
        case 'notifications':
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-bell text-primary me-2"></i> Notifications</h2></div><div id="notifications-container-list"></div>`;
          await notificationHandler.renderNotificationList('notifications-container-list'); break;
        case 'contacts':
          this.renderContactsTab(area); break;

        // ── Government: Mission Command Center ───────────────────────
        case 'gov-command':
          commandCenter.destroy();
          await commandCenter.renderAll(area); break;

        // ── Government: Incident Management ──────────────────────────
        case 'gov-incident-queue':
        case 'gov-incident-verify':
        case 'gov-incident-details':
        case 'gov-complaint-history':
        case 'gov-duplicate-complaints':
        case 'gov-closed-incidents':
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-clipboard-list text-primary me-2"></i> Incident Management</h2></div><div id="generic-incidents-container"></div>`;
          await incidentHandler.renderIncidentTable('generic-incidents-container'); break;

        // ── Government: Resource Center ───────────────────────────────
        case 'gov-resource-inventory':
        case 'gov-assign-resources':
        case 'gov-vehicle-fleet':
        case 'gov-medical-inventory':
        case 'gov-heavy-equipment':
        case 'gov-fuel':
        case 'gov-warehouse':
        case 'gov-comms-equipment': {
          const categoryMap = {
            'gov-vehicle-fleet': 'VEHICLE',
            'gov-medical-inventory': 'MEDICAL',
            'gov-heavy-equipment': 'EQUIPMENT',
            'gov-fuel': 'FUEL',
            'gov-warehouse': 'SUPPLIES',
            'gov-comms-equipment': 'COMMUNICATION'
          };
          const catFilter = categoryMap[tab] || null;
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-boxes text-info me-2"></i> Resource Operations ${catFilter ? `(${catFilter})` : ''}</h2></div><div id="generic-resources-container"></div>`;
          await resourceHandler.renderResourceOverview('generic-resources-container', catFilter);
          break;
        }


        // ── Government: Rescue Operations ─────────────────────────────
        case 'gov-rescue-teams':
        case 'gov-mission-assign':
        case 'gov-active-missions':
        case 'gov-mission-timeline':
        case 'gov-mission-reports':
          await rescueHandler.renderRescueDashboard(area); break;

        // ── Government: Shelter Operations ────────────────────────────
        case 'gov-shelter-dashboard':
        case 'gov-shelter-capacity':
        case 'gov-shelter-occupancy':
        case 'gov-shelter-food':
        case 'gov-shelter-water':
        case 'gov-shelter-medical':
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-house-chimney text-success me-2"></i> Shelter Operations</h2></div><div id="generic-shelters-container"></div>`;
          await shelterHandler.renderSheltersList('generic-shelters-container'); break;

        // ── Government: Volunteer Center ──────────────────────────────
        case 'gov-volunteers':
        case 'gov-volunteer-skills':
        case 'gov-volunteer-assign':
        case 'gov-volunteer-avail':
          await this.renderUsersTab(area); break;

        // ── Government: NGO Center ────────────────────────────────────
        case 'gov-ngos':
        case 'gov-ngo-relief':
        case 'gov-ngo-campaigns':
        case 'gov-ngo-inventory':
          await ngoHandler.renderNgoDashboard(area); break;

        // ── Government: Communication Center ─────────────────────────
        case 'gov-broadcast':
        case 'gov-sms':
        case 'gov-email-center':
        case 'gov-push-notif':
          await this.renderCommsCenter(area, tab);
          break;

        // ── Government: Analytics Center ─────────────────────────────
        case 'gov-analytics':
        case 'gov-incident-analytics':
        case 'gov-response-analytics':
        case 'gov-resource-analytics':
        case 'gov-shelter-analytics':
        case 'gov-dept-performance':
          area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-chart-pie text-warning me-2"></i> Analytics Center</h2></div><div id="gov-analytics-container"></div>`;
          await analyticsHandler.renderAnalyticsDashboard('gov-analytics-container');
          break;

        // ── Government: Reports & Settings ───────────────────────────
        case 'gov-reports-daily':
        case 'gov-reports-weekly':
        case 'gov-reports-monthly':
        case 'gov-reports-export':
          await this.renderReportsCenter(area, tab);
          break;
        case 'gov-settings':
          await adminHandler.renderSettings(area);
          break;

        // ── Citizen Module ────────────────────────────────────────────
        case 'citizen-chatbot':          await citizenHandler.renderChatbot(area); break;
        case 'citizen-incidents':        await citizenHandler.renderMyIncidents(area); break;
        case 'citizen-report':           await citizenHandler.renderReportIncident(area); break;
        case 'citizen-incident-details': await citizenHandler.renderIncidentDetails(area); break;
        case 'citizen-incident-timeline':await citizenHandler.renderIncidentTimeline(area); break;
        case 'citizen-live-tracking':    await citizenHandler.renderLiveTracking(area); break;
        case 'citizen-sos':              await citizenHandler.renderEmergencySOS(area); break;
        case 'citizen-shelters':         area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-house-chimney text-success me-2"></i> Nearby Shelters</h2></div><div id="shelters-container-list"></div>`; await shelterHandler.renderSheltersList('shelters-container-list'); break;
        case 'citizen-relief':           await citizenHandler.renderReliefDistribution(area); break;
        case 'citizen-donation':         await citizenHandler.renderDonation(area); break;
        case 'citizen-notifications':    area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-bell text-primary me-2"></i> Notifications</h2></div><div id="notifications-container-list"></div>`; await notificationHandler.renderNotificationList('notifications-container-list'); break;
        case 'citizen-profile':          await citizenHandler.renderProfile(area); break;
        case 'citizen-settings':         await citizenHandler.renderSettings(area); break;

        // ── Rescue Team Module ────────────────────────────────────────
        case 'rescue-dashboard':         await rescueHandler.renderRescueDashboard(area); break;
        case 'gov-incident-response':
        case 'rescue-incident-response': await rescueHandler.renderIncidentResponse(area); break;
        case 'rescue-missions':          await rescueHandler.renderMissions(area); break;
        case 'rescue-mission-details':   await rescueHandler.renderMissionDetails(area); break;
        case 'rescue-navigation':        await rescueHandler.renderNavigation(area); break;
        case 'rescue-evidence':          await rescueHandler.renderEvidence(area); break;
        case 'rescue-victim':            await rescueHandler.renderVictim(area); break;
        case 'rescue-resource-usage':    await rescueHandler.renderResourceUsage(area); break;
        case 'rescue-timeline':          await rescueHandler.renderTimeline(area); break;
        case 'rescue-history':           await rescueHandler.renderHistory(area); break;
        case 'rescue-performance':       await rescueHandler.renderPerformance(area); break;

        // ── NGO Module ────────────────────────────────────────────────
        case 'ngo-dashboard':            await ngoHandler.renderNgoDashboard(area); break;
        case 'ngo-campaigns':            await ngoHandler.renderCampaigns(area); break;
        case 'ngo-inventory':            await ngoHandler.renderInventory(area); break;
        case 'ngo-relief-requests':      await ngoHandler.renderReliefRequests(area); break;
        case 'ngo-distribution':         await ngoHandler.renderDistribution(area); break;
        case 'ngo-donations':            await ngoHandler.renderDonations(area); break;
        case 'ngo-volunteers':           await ngoHandler.renderVolunteers(area); break;
        case 'ngo-reports':              await ngoHandler.renderReports(area); break;

        // ── Admin Module ──────────────────────────────────────────────
        case 'admin-dashboard':          await this.renderAdminDashboard(area); break;
        case 'admin-users':              await this.renderUsersTab(area); break;
        case 'admin-roles':              await adminHandler.renderRoles(area); break;
        case 'admin-departments':        await adminHandler.renderDepartments(area); break;
        case 'admin-resources':          await resourceHandler.renderResourceOverview('page-content-area'); break;
        case 'admin-hospitals':          await adminHandler.renderHospitals(area); break;
        case 'admin-shelters':           area.innerHTML = `<div class="section-header mb-4"><h2><i class="fa fa-house-chimney text-success me-2"></i> Shelter Database</h2></div><div id="shelters-container-list"></div>`; await shelterHandler.renderSheltersList('shelters-container-list'); break;
        case 'admin-ngos':               await adminHandler.renderNgos(area); break;
        case 'admin-audit-logs':         this.renderAuditLogsTab(area); break;
        case 'admin-security':           await adminHandler.renderSecurity(area); break;
        case 'admin-settings':           await adminHandler.renderSettings(area); break;

        // ── Blockchain Module ─────────────────────────────────────────
        case 'blockchain-wallet':        await blockchainHandler.renderWallet(area); break;
        case 'blockchain-donate':        await blockchainHandler.renderDonate(area); break;
        case 'blockchain-history':       await blockchainHandler.renderHistory(area); break;
        case 'blockchain-transparency':  await blockchainHandler.renderTransparency(area); break;
        case 'blockchain-contracts':     await blockchainHandler.renderContracts(area); break;

        default:
          await this.renderOverviewTab(area);
          break;
      }
    } catch (tabErr) {
      console.error(`Tab "${tab}" render error:`, tabErr);
      area.innerHTML = `
        <div class="p-4 m-2">
          <div class="card p-4" style="border: 1px solid rgba(239,68,68,0.3);">
            <h4 class="mb-3" style="color: var(--color-danger, #ef4444);">
              <i class="fa fa-exclamation-circle me-2"></i>Unable to Load This Section
            </h4>
            <p class="text-muted mb-3">${tabErr.message || 'An error occurred while loading this view.'}</p>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-primary btn-sm" onclick="dashboardManager.loadTab('${tab}')">
                <i class="fa fa-redo me-1"></i> Retry
              </button>
              <button class="btn btn-secondary btn-sm" onclick="dashboardManager.loadTab('citizen-incidents')">
                <i class="fa fa-home me-1"></i> Go to My Incidents
              </button>
            </div>
          </div>
        </div>`;
    }
  },

  async renderLiveMapTab(area) {
    area.innerHTML = `
      <div class="page-header mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 class="m-0"><i class="fa fa-map-marked-alt text-primary me-2"></i> Live Emergency Command Map</h1>
          <div class="page-subtitle">Real-time GPS plotting for all emergency incidents and response centers</div>
        </div>
        <div class="d-flex gap-2">
          <span class="badge badge-resolved py-2 px-3 fs-6"><i class="fa fa-sync-alt fa-spin me-1"></i> Live Stream</span>
        </div>
      </div>
      <div class="card p-0 mb-4 overflow-hidden">
        <div id="map-container-fullscreen" style="height: 560px; width: 100%;"></div>
      </div>
    `;

    const mapCtrl = new MapController('map-container-fullscreen');
    mapCtrl.init();
    try {
      const incidents = await incidentApi.getIncidents();
      const shelters = await shelterApi.getShelters();
      mapCtrl.renderIncidents(incidents);
      mapCtrl.renderShelters(shelters);
    } catch (err) {
      console.error('Live map render error:', err);
    }
  },

  async renderOverviewTab(area) {
    // Destroy previous command center timers if any
    commandCenter.destroy();
    // Delegate to the full AI Command Center module
    await commandCenter.renderAll(area);
  },

  async renderUsersTab(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-users-cog text-info me-2"></i> User Administration & Role Management</h2>
      </div>
      <div class="card p-0">
        <div class="data-table-wrapper" id="admin-users-table">
          <div class="p-4 text-center"><i class="fa fa-spinner fa-spin"></i> Loading users...</div>
        </div>
      </div>
    `;

    try {
      const res = await userApi.getUsers();
      const users = res.data || [];
      const tbody = users.map(u => {
        const roleBadge = u.role === 'Admin' ? 'badge-critical' : u.role.includes('Government') ? 'badge-warning' : u.role.includes('Rescue') ? 'badge-info' : 'badge-reported';
        const statusBadge = u.is_active ? 'badge-resolved' : 'badge-critical';
        return `
          <tr>
            <td>#${u.id}</td>
            <td><strong>${u.full_name}</strong></td>
            <td>${u.email}</td>
            <td><span class="badge ${roleBadge}">${u.role}</span></td>
            <td><span class="badge ${statusBadge}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
            <td><button class="btn btn-secondary btn-sm" ${u.role === 'Admin' ? 'disabled' : ''}>Edit Role</button></td>
          </tr>
        `;
      }).join('');

      document.getElementById('admin-users-table').innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
      `;
    } catch (err) {
      document.getElementById('admin-users-table').innerHTML = '<div class="p-4 text-danger">Failed to load users</div>';
    }
  },

  async renderAuditLogsTab(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-terminal text-secondary me-2"></i> System Audit Logs</h2>
      </div>
      <div class="card p-3">
        <div id="audit-log-container" style="font-family: monospace; font-size: 0.85rem; background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; max-height: 450px; overflow-y: auto;">
          <div class="text-muted"><i class="fa fa-spinner fa-spin"></i> Fetching system audit logs...</div>
        </div>
      </div>
    `;

    try {
      const res = await fetch('${CONFIG.API_BASE_URL}/audit/logs').then(r => r.json());
      const logs = res.data || [];
      const html = logs.map(l => `
        <div class="mb-2">
          <span class="text-muted">[${l.timestamp}]</span>
          <strong class="text-warning">[${l.action}]</strong>
          <span class="text-info">(${l.user}):</span>
          <span>${l.details}</span>
        </div>
      `).join('');
      document.getElementById('audit-log-container').innerHTML = html || '<div class="text-muted">No audit logs available.</div>';
    } catch (err) {
      document.getElementById('audit-log-container').innerHTML = '<div class="text-danger">Failed to load audit logs.</div>';
    }
  },

  async renderCommsCenter(area, tab) {
    area.innerHTML = `
      <div class="section-header mb-4 d-flex justify-content-between align-items-center">
        <h2><i class="fa fa-bullhorn text-danger me-2"></i> Emergency Communication Center</h2>
        <span class="badge bg-success py-2 px-3"><i class="fa fa-wifi me-1"></i> Broadcast Gateway Active</span>
      </div>
      <div class="row">
        <div class="col-md-6 mb-4">
          <div class="card p-4">
            <h4 class="mb-3"><i class="fa fa-paper-plane text-primary me-2"></i> Transmit Mass Alert</h4>
            <form id="comms-broadcast-form">
              <div class="mb-3">
                <label class="form-label">Alert Channel</label>
                <select class="form-select" id="comms-channel">
                  <option value="BROADCAST">WebSocket Live Broadcast</option>
                  <option value="SMS">Mass SMS Emergency Network</option>
                  <option value="EMAIL">Gov Authority Email Dispatch</option>
                  <option value="PUSH">Push Notifications</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Target Audience Role</label>
                <select class="form-select" id="comms-role">
                  <option value="ALL">All Users & Field Units</option>
                  <option value="Citizen">Citizens Only</option>
                  <option value="Rescue Team">Rescue Teams</option>
                  <option value="Volunteer">Volunteers</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Headline / Subject</label>
                <input type="text" class="form-control" id="comms-title" placeholder="e.g. Evacuation Warning - Flash Floods" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Alert Message</label>
                <textarea class="form-control" id="comms-message" rows="3" placeholder="Enter emergency instructions..." required></textarea>
              </div>
              <button type="submit" class="btn btn-danger w-100 py-2"><i class="fa fa-broadcast-tower me-2"></i> Broadcast Mass Alert Now</button>
            </form>
          </div>
        </div>
        <div class="col-md-6 mb-4">
          <div class="card p-4">
            <h4 class="mb-3"><i class="fa fa-history text-warning me-2"></i> Recent Transmitted Logs</h4>
            <div id="comms-logs-list" style="max-height: 380px; overflow-y: auto;">
              <div class="text-center py-4"><i class="fa fa-spinner fa-spin"></i> Loading broadcast history...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const loadLogs = async () => {
      try {
        const res = await fetch('${CONFIG.API_BASE_URL}/comms/logs').then(r => r.json());
        const logs = res.data || [];
        const html = logs.map(l => `
          <div class="p-3 mb-2 rounded bg-dark border border-secondary">
            <div class="d-flex justify-content-between fw-bold text-light">
              <span>${l.title}</span>
              <small class="text-muted">${l.created_at}</small>
            </div>
            <p class="mb-0 text-secondary font-size-sm mt-1">${l.message}</p>
          </div>
        `).join('');
        document.getElementById('comms-logs-list').innerHTML = html || '<div class="text-muted">No broadcasts recorded yet.</div>';
      } catch (e) {
        document.getElementById('comms-logs-list').innerHTML = '<div class="text-danger">Failed to load logs</div>';
      }
    };

    loadLogs();

    document.getElementById('comms-broadcast-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('comms-title').value,
        message: document.getElementById('comms-message').value,
        channel: document.getElementById('comms-channel').value,
        target_role: document.getElementById('comms-role').value
      };
      try {
        const res = await fetch('${CONFIG.API_BASE_URL}/comms/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());
        if (res.success) {
          notificationService.success('Broadcast Sent', res.message);
          document.getElementById('comms-title').value = '';
          document.getElementById('comms-message').value = '';
          loadLogs();
        }
      } catch (err) {
        notificationService.error('Broadcast Error', 'Failed to transmit broadcast');
      }
    });
  },

  async renderReportsCenter(area, tab) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-file-pdf text-primary me-2"></i> Reports & Documentation Hub</h2>
      </div>
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card p-3 text-center">
            <i class="fa fa-clipboard-list fa-2x text-primary mb-2"></i>
            <h5>Daily Briefing</h5>
            <p class="text-muted small">Incident summary & active mission statuses</p>
            <a href="${CONFIG.API_BASE_URL}/reports/export/csv" class="btn btn-outline-primary btn-sm"><i class="fa fa-download me-1"></i> Download CSV</a>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card p-3 text-center">
            <i class="fa fa-calendar-week fa-2x text-warning mb-2"></i>
            <h5>Weekly Audit</h5>
            <p class="text-muted small">Shelter capacity & resource usage breakdown</p>
            <a href="${CONFIG.API_BASE_URL}/reports/export/csv" class="btn btn-outline-warning btn-sm"><i class="fa fa-download me-1"></i> Download CSV</a>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card p-3 text-center">
            <i class="fa fa-calendar-alt fa-2x text-info mb-2"></i>
            <h5>Monthly Executive</h5>
            <p class="text-muted small">Government compliance & transparency metric</p>
            <a href="${CONFIG.API_BASE_URL}/reports/export/csv" class="btn btn-outline-info btn-sm"><i class="fa fa-download me-1"></i> Download CSV</a>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card p-3 text-center">
            <i class="fa fa-file-pdf fa-2x text-danger mb-2"></i>
            <h5>Full PDF Export</h5>
            <p class="text-muted small">Complete platform state PDF archive</p>
            <button onclick="window.print()" class="btn btn-outline-danger btn-sm"><i class="fa fa-print me-1"></i> Print / Save PDF</button>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <h4><i class="fa fa-chart-bar text-success me-2"></i> System Summary Metadata</h4>
        <div id="reports-summary-content" class="mt-3">
          <div class="text-muted"><i class="fa fa-spinner fa-spin"></i> Generating summary stats...</div>
        </div>
      </div>
    `;

    try {
      const res = await fetch('${CONFIG.API_BASE_URL}/reports/export/summary').then(r => r.json());
      const s = res.data || {};
      document.getElementById('reports-summary-content').innerHTML = `
        <div class="row text-center">
          <div class="col-6 col-md-3 mb-2">
            <div class="display-6 font-weight-bold text-danger">${s.total_incidents || 0}</div>
            <div class="text-muted">Total Incidents</div>
          </div>
          <div class="col-6 col-md-3 mb-2">
            <div class="display-6 font-weight-bold text-info">${s.total_resources || 0}</div>
            <div class="text-muted">Managed Resources</div>
          </div>
          <div class="col-6 col-md-3 mb-2">
            <div class="display-6 font-weight-bold text-warning">${s.total_rescue_teams || 0}</div>
            <div class="text-muted">Active Rescue Units</div>
          </div>
          <div class="col-6 col-md-3 mb-2">
            <div class="display-6 font-weight-bold text-success">${s.total_shelters || 0}</div>
            <div class="text-muted">Relief Shelters</div>
          </div>
        </div>
      `;
    } catch (e) {
      document.getElementById('reports-summary-content').innerHTML = '<div class="text-danger">Failed to fetch report summary stats</div>';
    }
  },


  renderContactsTab(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-phone-alt text-danger me-2"></i> Emergency Contacts & Hotlines</h2>
      </div>
      <div class="row">
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card text-center py-4">
            <h4><i class="fa fa-phone-volume text-danger me-2"></i> National Emergency</h4>
            <div class="display-5 font-weight-bold my-2 text-danger">112</div>
            <p class="font-size-sm color-muted">24/7 Universal emergency assistance hotline.</p>
            <a href="tel:112" class="btn btn-danger btn-sm mt-2"><i class="fa fa-phone me-1"></i> Call 112</a>
          </div>
        </div>
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card text-center py-4">
            <h4><i class="fa fa-fire text-warning me-2"></i> Fire Rescue</h4>
            <div class="display-5 font-weight-bold my-2 text-warning">101</div>
            <p class="font-size-sm color-muted">Immediate fire suppression & hazardous containment.</p>
            <a href="tel:101" class="btn btn-warning btn-sm mt-2"><i class="fa fa-phone me-1"></i> Call 101</a>
          </div>
        </div>
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card text-center py-4">
            <h4><i class="fa fa-ambulance text-success me-2"></i> Ambulance Service</h4>
            <div class="display-5 font-weight-bold my-2 text-success">108</div>
            <p class="font-size-sm color-muted">Emergency medical transport & paramedic response.</p>
            <a href="tel:108" class="btn btn-success btn-sm mt-2"><i class="fa fa-phone me-1"></i> Call 108</a>
          </div>
        </div>
      </div>
    `;
  },

  // ── Universal placeholder for stub tabs ──────────────────────────────────
  renderPlaceholder(area, icon, title, description, isCritical = false) {
    const iconBg = isCritical
      ? 'background: rgba(255,45,85,0.12); color: #ff2d55; border-color: rgba(255,45,85,0.3);'
      : '';
    const iconStyle = isCritical ? `style="${iconBg}"` : '';

    area.innerHTML = `
      <div class="page-section-header">
        <div>
          <h2 style="display:flex;align-items:center;gap:10px;">
            <span style="width:36px;height:36px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:rgba(var(--primary-rgb),0.12);color:var(--primary);font-size:1rem;flex-shrink:0;">
              <i class="fa ${icon}"></i>
            </span>
            ${title}
          </h2>
        </div>
      </div>
      <div class="card">
        <div class="tab-placeholder">
          <div class="placeholder-icon" ${iconStyle}>
            <i class="fa ${icon}"></i>
          </div>
          <h3>${title}</h3>
          <p>${description}</p>
          <div class="placeholder-actions">
            <button class="btn btn-primary btn-sm" disabled>
              <i class="fa fa-hammer me-2"></i>Under Construction
            </button>
            <button class="btn btn-secondary btn-sm" onclick="history.back()">
              <i class="fa fa-arrow-left me-2"></i>Go Back
            </button>
          </div>
          <p style="margin-top:20px;font-size:0.75rem;color:var(--text-muted);">
            This module is being built. Check back after the next phase is complete.
          </p>
        </div>
      </div>
    `;
  },

  // ── Admin Dashboard (stat overview) ──────────────────────────────────────
  async renderAdminDashboard(area) {
    area.innerHTML = `
      <div class="page-section-header">
        <div>
          <h2><i class="fa fa-tachometer-alt text-warning me-2"></i>Admin Dashboard</h2>
          <div class="page-subtitle">System-wide overview and control panel</div>
        </div>
        <span class="badge badge-resolved py-2 px-3"><i class="fa fa-circle me-1"></i>All Systems Online</span>
      </div>

      <div class="stats-grid-4" style="margin-bottom:24px;">
        <div class="module-stat-card">
          <div class="stat-icon blue"><i class="fa fa-users"></i></div>
          <div class="stat-info">
            <div class="stat-label">Total Users</div>
            <div class="stat-value" id="admin-stat-users"><i class="fa fa-spinner fa-spin fs-6"></i></div>
            <div class="stat-delta">Live</div>
          </div>
        </div>
        <div class="module-stat-card">
          <div class="stat-icon red"><i class="fa fa-exclamation-triangle"></i></div>
          <div class="stat-info">
            <div class="stat-label">Active Incidents</div>
            <div class="stat-value" id="admin-stat-incidents"><i class="fa fa-spinner fa-spin fs-6"></i></div>
            <div class="stat-delta">Live</div>
          </div>
        </div>
        <div class="module-stat-card">
          <div class="stat-icon green"><i class="fa fa-house-chimney"></i></div>
          <div class="stat-info">
            <div class="stat-label">Active Shelters</div>
            <div class="stat-value" id="admin-stat-shelters"><i class="fa fa-spinner fa-spin fs-6"></i></div>
            <div class="stat-delta">Operational</div>
          </div>
        </div>
        <div class="module-stat-card">
          <div class="stat-icon yellow"><i class="fa fa-server"></i></div>
          <div class="stat-info">
            <div class="stat-label">System Health</div>
            <div class="stat-value" id="admin-stat-health" style="font-size:1rem;padding-top:4px;">
              <span class="status-pill active"><i class="fa fa-spinner fa-spin me-1"></i>Checking...</span>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-md-6">
          <div class="card p-4">
            <h5 class="mb-3"><i class="fa fa-users-cog text-info me-2"></i>Quick Management</h5>
            <div class="d-flex flex-column gap-2">
              <button class="btn btn-secondary text-start" data-tab="admin-users" onclick="dashboardManager.switchTab('admin-users')">
                <i class="fa fa-users me-2"></i>User Management
              </button>
              <button class="btn btn-secondary text-start" data-tab="admin-roles" onclick="dashboardManager.switchTab('admin-roles')">
                <i class="fa fa-user-tag me-2"></i>Role Management
              </button>
              <button class="btn btn-secondary text-start" data-tab="admin-departments" onclick="dashboardManager.switchTab('admin-departments')">
                <i class="fa fa-building me-2"></i>Departments
              </button>
              <button class="btn btn-secondary text-start" data-tab="admin-audit-logs" onclick="dashboardManager.switchTab('admin-audit-logs')">
                <i class="fa fa-terminal me-2"></i>Audit Logs
              </button>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card p-4">
            <h5 class="mb-3"><i class="fa fa-database text-primary me-2"></i>Resource Databases</h5>
            <div class="d-flex flex-column gap-2">
              <button class="btn btn-secondary text-start" onclick="dashboardManager.switchTab('admin-hospitals')">
                <i class="fa fa-hospital me-2"></i>Hospitals Database
              </button>
              <button class="btn btn-secondary text-start" onclick="dashboardManager.switchTab('admin-shelters')">
                <i class="fa fa-house-chimney me-2"></i>Shelters Database
              </button>
              <button class="btn btn-secondary text-start" onclick="dashboardManager.switchTab('admin-ngos')">
                <i class="fa fa-hands-holding-heart me-2"></i>NGOs Database
              </button>
              <button class="btn btn-secondary text-start" onclick="dashboardManager.switchTab('admin-security')">
                <i class="fa fa-shield-alt me-2"></i>Security Center
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      const [uRes, iRes, sRes, hRes] = await Promise.allSettled([
        userApi.getUsers(),
        incidentApi.getIncidents({ status: 'Reported,In Progress' }),
        shelterApi.getShelters(),
        fetch(`${CONFIG.API_BASE_URL}/health`)
      ]);

      if (uRes.status === 'fulfilled' && uRes.value.data) {
        document.getElementById('admin-stat-users').innerText = uRes.value.data.length;
      }
      
      if (iRes.status === 'fulfilled' && iRes.value.data) {
        document.getElementById('admin-stat-incidents').innerText = iRes.value.data.filter(i => (i.status || '').toUpperCase() !== 'RESOLVED').length;
      }

      if (sRes.status === 'fulfilled' && sRes.value.data) {
        document.getElementById('admin-stat-shelters').innerText = sRes.value.data.filter(s => s.is_active).length;
      }

      const hEl = document.getElementById('admin-stat-health');
      if (hRes.status === 'fulfilled' && hRes.value.ok) {
        hEl.innerHTML = '<span class="status-pill active">Online</span>';
      } else {
        hEl.innerHTML = '<span class="status-pill critical">Degraded</span>';
      }
    } catch (e) {
      console.warn('Admin stats fetch error', e);
    }
  }
};
