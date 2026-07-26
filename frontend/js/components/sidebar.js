import { CONFIG } from '../config.js';
import { storageService } from '../services/storageService.js';

export function renderSidebar(userRole, currentTab = 'overview') {
  const isCitizen = userRole === CONFIG.ROLES.CITIZEN;
  const isRescue  = userRole === CONFIG.ROLES.RESCUE;
  const isGov     = userRole === CONFIG.ROLES.GOVT;
  const isAdmin   = userRole === CONFIG.ROLES.ADMIN;

  const user = storageService.getUser();

  return `
    <aside class="sidebar" id="sidebar-container">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <i class="fa fa-shield-alt"></i>
        </div>
        <div class="brand-text">
          <div class="brand-name">ResQ<span style="color: var(--primary);">AI</span></div>
          <div class="brand-sub">${userRole} Portal</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Navigation</div>
        
        <a class="nav-item ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview" href="#">
          <span class="nav-icon"><i class="fa fa-chart-line"></i></span>
          <span>Dashboard Overview</span>
        </a>

        ${isCitizen ? `
          <a class="nav-item ${currentTab === 'report' ? 'active' : ''}" data-tab="report" href="#">
            <span class="nav-icon"><i class="fa fa-exclamation-triangle"></i></span>
            <span>Report Emergency</span>
          </a>
          <a class="nav-item ${currentTab === 'shelters' ? 'active' : ''}" data-tab="shelters" href="#">
            <span class="nav-icon"><i class="fa fa-campground"></i></span>
            <span>Nearby Shelters</span>
          </a>
          <a class="nav-item ${currentTab === 'contacts' ? 'active' : ''}" data-tab="contacts" href="#">
            <span class="nav-icon"><i class="fa fa-phone-alt"></i></span>
            <span>Emergency Contacts</span>
          </a>
        ` : ''}

        ${isRescue ? `
          <a class="nav-item ${currentTab === 'missions' ? 'active' : ''}" data-tab="missions" href="#">
            <span class="nav-icon"><i class="fa fa-tasks"></i></span>
            <span>Assigned Missions</span>
          </a>
          <a class="nav-item ${currentTab === 'live-map' ? 'active' : ''}" data-tab="live-map" href="#">
            <span class="nav-icon"><i class="fa fa-map-marked-alt"></i></span>
            <span>Live Mission Map</span>
          </a>
          <a class="nav-item ${currentTab === 'equipment' ? 'active' : ''}" data-tab="equipment" href="#">
            <span class="nav-icon"><i class="fa fa-truck-monster"></i></span>
            <span>Team Resources</span>
          </a>
        ` : ''}

        ${isGov ? `
          <a class="nav-item ${currentTab === 'incident-map' ? 'active' : ''}" data-tab="incident-map" href="#">
            <span class="nav-icon"><i class="fa fa-map"></i></span>
            <span>Live Incident Map</span>
          </a>
          <a class="nav-item ${currentTab === 'shelter-mgmt' ? 'active' : ''}" data-tab="shelter-mgmt" href="#">
            <span class="nav-icon"><i class="fa fa-warehouse"></i></span>
            <span>Shelter Capacity</span>
          </a>
          <a class="nav-item ${currentTab === 'resource-alloc' ? 'active' : ''}" data-tab="resource-alloc" href="#">
            <span class="nav-icon"><i class="fa fa-boxes"></i></span>
            <span>Resource Allocation</span>
          </a>
          <a class="nav-item ${currentTab === 'analytics' ? 'active' : ''}" data-tab="analytics" href="#">
            <span class="nav-icon"><i class="fa fa-chart-pie"></i></span>
            <span>Reports & Analytics</span>
          </a>
        ` : ''}

        ${isAdmin ? `
          <a class="nav-item ${currentTab === 'users' ? 'active' : ''}" data-tab="users" href="#">
            <span class="nav-icon"><i class="fa fa-users-cog"></i></span>
            <span>User Management</span>
          </a>
          <a class="nav-item ${currentTab === 'all-incidents' ? 'active' : ''}" data-tab="all-incidents" href="#">
            <span class="nav-icon"><i class="fa fa-clipboard-list"></i></span>
            <span>Incident Control</span>
          </a>
          <a class="nav-item ${currentTab === 'shelter-mgmt' ? 'active' : ''}" data-tab="shelter-mgmt" href="#">
            <span class="nav-icon"><i class="fa fa-warehouse"></i></span>
            <span>Shelter Admin</span>
          </a>
          <a class="nav-item ${currentTab === 'resource-alloc' ? 'active' : ''}" data-tab="resource-alloc" href="#">
            <span class="nav-icon"><i class="fa fa-cubes"></i></span>
            <span>Resource Management</span>
          </a>
          <a class="nav-item ${currentTab === 'system-logs' ? 'active' : ''}" data-tab="system-logs" href="#">
            <span class="nav-icon"><i class="fa fa-terminal"></i></span>
            <span>System Audit Logs</span>
          </a>
        ` : ''}

        <div class="nav-section-title" style="margin-top: 16px;">System</div>
        <a class="nav-item" id="nav-logout-btn" href="#">
          <span class="nav-icon"><i class="fa fa-sign-out-alt"></i></span>
          <span>Logout</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}</div>
          <div>
            <div class="user-name">${user?.full_name || 'User'}</div>
            <div class="user-role">${userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}
