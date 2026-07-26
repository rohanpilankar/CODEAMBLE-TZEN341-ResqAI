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

    // Logout button
    document.getElementById('nav-logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      storageService.clearSession();
      notificationService.info('Logged Out', 'You have been safely logged out.');
      setTimeout(() => (window.location.href = 'login.html'), 300);
    });

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
      case 'report':
        await incidentHandler.renderReportForm('page-content-area');
        break;
      case 'shelters':
      case 'shelter-mgmt':
        area.innerHTML = `
          <div class="section-header">
            <h2>Shelter Management & Occupancy</h2>
          </div>
          <div id="shelters-container-list"></div>
        `;
        await shelterHandler.renderSheltersList('shelters-container-list');
        break;
      case 'missions':
      case 'all-incidents':
        area.innerHTML = `
          <div class="section-header">
            <h2>Emergency Incident Control Center</h2>
          </div>
          <div id="incidents-container-table"></div>
        `;
        await incidentHandler.renderIncidentTable('incidents-container-table');
        break;
      case 'equipment':
      case 'resource-alloc':
        area.innerHTML = `
          <div class="section-header">
            <h2>Emergency Equipment & Resource Allocation</h2>
          </div>
          <div id="resources-container-list"></div>
        `;
        await resourceHandler.renderResourceOverview('resources-container-list');
        break;
      case 'analytics':
        area.innerHTML = `
          <div class="section-header">
            <h2>Disaster Response Analytics & Situation Reports</h2>
          </div>
          <div id="analytics-container-main"></div>
        `;
        await analyticsHandler.renderAnalyticsDashboard('analytics-container-main');
        break;
      case 'notifications':
        area.innerHTML = `
          <div class="section-header">
            <h2>Notifications & Emergency Alerts</h2>
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

  async renderOverviewTab(area) {
    area.innerHTML = `
      <div class="page-header">
        <h1>Dashboard Overview</h1>
        <div class="page-subtitle">Real-time situational awareness and active emergency metrics</div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" id="stats-grid-container">
        ${renderStatCard('Total Incidents', '...', 'fa-exclamation-circle', 'red')}
        ${renderStatCard('Active Rescue', '...', 'fa-tasks', 'orange')}
        ${renderStatCard('Available Shelters', '...', 'fa-campground', 'green')}
        ${renderStatCard('Equipment Ready', '...', 'fa-truck-monster', 'blue')}
      </div>

      <!-- Live Map Section -->
      <div class="card mb-4 p-0">
        <div class="p-3 border-bottom border-glass d-flex justify-content-between align-items-center">
          <h3 class="font-size-md m-0"><i class="fa fa-map-marked-alt text-primary me-2"></i> Live Emergency Command Map</h3>
          <span class="badge badge-verified"><i class="fa fa-sync-alt fa-spin"></i> Live Updates</span>
        </div>
        <div id="map-container" style="height: 420px; width: 100%;"></div>
      </div>

      <!-- Recent Incidents Table -->
      <div class="section-header mt-4">
        <h2>Recent Emergency Reports</h2>
      </div>
      <div id="recent-incidents-table"></div>
    `;

    // Fetch metrics & populate map
    try {
      const stats = await analyticsApi.getOverview();
      const statsGrid = document.getElementById('stats-grid-container');
      if (statsGrid) {
        statsGrid.innerHTML = `
          ${renderStatCard('Total Incidents', stats.total_incidents, 'fa-exclamation-circle', 'red', `${stats.active_incidents} Active`)}
          ${renderStatCard('Rescue Teams', stats.active_rescue_teams, 'fa-users', 'orange', `${stats.total_rescue_teams} Total Teams`)}
          ${renderStatCard('Shelter Capacity', `${stats.shelter_occupancy_rate}%`, 'fa-campground', 'green', `${stats.total_shelters} Centers`)}
          ${renderStatCard('Resources Ready', stats.available_resources, 'fa-cubes', 'blue', `${stats.assigned_resources} Dispatched`)}
        `;
      }

      // Initialize map & plot markers
      this.mapController.init();
      const incidents = await incidentApi.getIncidents();
      const shelters = await shelterApi.getShelters();
      this.mapController.renderIncidents(incidents);
      this.mapController.renderShelters(shelters);

      // Render recent incidents
      await incidentHandler.renderIncidentTable('recent-incidents-table');
    } catch (err) {
      console.error('Overview render error:', err);
    }
  },

  renderContactsTab(area) {
    area.innerHTML = `
      <div class="section-header">
        <h2>Emergency Contacts & Hotlines</h2>
      </div>
      <div class="row">
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card">
            <h4><i class="fa fa-phone-volume text-danger me-2"></i> National Emergency</h4>
            <div class="display-6 font-weight-bold my-2">112</div>
            <p class="font-size-sm">24/7 Universal emergency assistance hotline.</p>
          </div>
        </div>
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card">
            <h4><i class="fa fa-fire text-warning me-2"></i> Fire Department</h4>
            <div class="display-6 font-weight-bold my-2">101</div>
            <p class="font-size-sm">Immediate fire suppression & hazardous containment.</p>
          </div>
        </div>
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card">
            <h4><i class="fa fa-ambulance text-success me-2"></i> Medical Ambulance</h4>
            <div class="display-6 font-weight-bold my-2">108</div>
            <p class="font-size-sm">Emergency medical transport & paramedic response.</p>
          </div>
        </div>
      </div>
    `;
  }
};
