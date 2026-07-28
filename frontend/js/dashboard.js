import { CONFIG } from './config.js';
import { storageService } from './services/storageService.js';
import { notificationService } from './services/notificationService.js';
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
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

export const dashboardManager = {
  user: null,
  userRole: null,
  currentTab: 'overview',
  mapController: null,

  async init() {
    // 1. Guard check
    if (!storageService.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }

    this.user = storageService.getUser();
    this.userRole = storageService.getUserRole();
    this.mapController = new MapController('map-container');

    // 2. Render core layout
    this.renderLayout();

    // 3. Connect WebSockets
    wsClient.connect();

    // 4. Load initial tab
    await this.loadTab(this.currentTab);
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
  },

  bindGlobalEvents() {
    // Sidebar navigation clicks
    document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
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

    switch (tab) {
      case 'overview':
        await this.renderOverviewTab(area);
        break;
      case 'live-map':
      case 'incident-map':
        await this.renderLiveMapTab(area);
        break;
      case 'report':
        await incidentHandler.renderReportForm('page-content-area');
        break;
      case 'shelters':
      case 'shelter-mgmt':
        area.innerHTML = `
          <div class="section-header mb-4">
            <h2><i class="fa fa-warehouse text-success me-2"></i> Shelter Management & Occupancy</h2>
          </div>
          <div id="shelters-container-list"></div>
        `;
        await shelterHandler.renderSheltersList('shelters-container-list');
        break;
      case 'missions':
      case 'all-incidents':
        area.innerHTML = `
          <div class="section-header mb-4">
            <h2><i class="fa fa-clipboard-list text-danger me-2"></i> Emergency Incident Control Center</h2>
          </div>
          <div id="incidents-container-table"></div>
        `;
        await incidentHandler.renderIncidentTable('incidents-container-table');
        break;
      case 'equipment':
      case 'resource-alloc':
        area.innerHTML = `
          <div class="section-header mb-4">
            <h2><i class="fa fa-boxes text-info me-2"></i> Emergency Equipment & Resource Allocation</h2>
          </div>
          <div id="resources-container-list"></div>
        `;
        await resourceHandler.renderResourceOverview('resources-container-list');
        break;
      case 'users':
        this.renderUsersTab(area);
        break;
      case 'system-logs':
        this.renderAuditLogsTab(area);
        break;
      case 'analytics':
        area.innerHTML = `
          <div class="section-header mb-4">
            <h2><i class="fa fa-chart-pie text-warning me-2"></i> Disaster Response Analytics & Situation Reports</h2>
          </div>
          <div id="analytics-container-main"></div>
        `;
        await analyticsHandler.renderAnalyticsDashboard('analytics-container-main');
        break;
      case 'notifications':
        area.innerHTML = `
          <div class="section-header mb-4">
            <h2><i class="fa fa-bell text-primary me-2"></i> Notifications & Emergency Alerts</h2>
          </div>
          <div id="notifications-container-list"></div>
        `;
        await notificationHandler.renderNotificationList('notifications-container-list');
        break;
      case 'contacts':
        this.renderContactsTab(area);
        break;
      default:
        await this.renderOverviewTab(area);
        break;
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

  renderUsersTab(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-users-cog text-info me-2"></i> User Administration & Role Management</h2>
      </div>
      <div class="card p-0">
        <div class="data-table-wrapper">
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
            <tbody>
              <tr>
                <td>#1</td>
                <td><strong>System Admin</strong></td>
                <td>admin@resqai.com</td>
                <td><span class="badge badge-critical">Admin</span></td>
                <td><span class="badge badge-resolved">Active</span></td>
                <td><button class="btn btn-secondary btn-sm" disabled>Manage</button></td>
              </tr>
              <tr>
                <td>#2</td>
                <td><strong>Disaster Officer</strong></td>
                <td>gov@resqai.com</td>
                <td><span class="badge badge-warning">Government Authority</span></td>
                <td><span class="badge badge-resolved">Active</span></td>
                <td><button class="btn btn-secondary btn-sm">Edit Role</button></td>
              </tr>
              <tr>
                <td>#3</td>
                <td><strong>Alpha Squad Lead</strong></td>
                <td>rescue@resqai.com</td>
                <td><span class="badge badge-info">Rescue Team</span></td>
                <td><span class="badge badge-resolved">Active</span></td>
                <td><button class="btn btn-secondary btn-sm">Edit Role</button></td>
              </tr>
              <tr>
                <td>#4</td>
                <td><strong>Ravi Kumar</strong></td>
                <td>citizen@resqai.com</td>
                <td><span class="badge badge-reported">Citizen</span></td>
                <td><span class="badge badge-resolved">Active</span></td>
                <td><button class="btn btn-secondary btn-sm">Edit Role</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderAuditLogsTab(area) {
    area.innerHTML = `
      <div class="section-header mb-4">
        <h2><i class="fa fa-terminal text-secondary me-2"></i> System Audit Logs</h2>
      </div>
      <div class="card p-3">
        <div style="font-family: monospace; font-size: 0.85rem; background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; max-height: 400px; overflow-y: auto;">
          <div class="color-muted mb-2">[2026-07-26 18:10:02] INFO: System initialized successfully. DB connection verified.</div>
          <div class="text-success mb-2">[2026-07-26 18:11:15] AUTH: Admin user admin@resqai.com logged in from 127.0.0.1.</div>
          <div class="text-warning mb-2">[2026-07-26 18:12:40] INCIDENT: New incident #104 (Flood Trapped Residents) registered. Severity: HIGH.</div>
          <div class="text-info mb-2">[2026-07-26 18:14:05] RESOURCE: Resource #12 (Boat-04) dispatched to Incident #104.</div>
          <div class="text-success mb-2">[2026-07-26 18:15:20] SHELTER: Shelter #2 capacity updated (Occupancy 120/200).</div>
        </div>
      </div>
    `;
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
  }
};

