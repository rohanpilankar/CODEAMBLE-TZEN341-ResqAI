import { CONFIG } from '../config.js';
import { storageService } from '../services/storageService.js';

// ── Helper: build a simple nav item ──────────────────────────────────────────
function navItem(tab, icon, label, badge = '', current = '') {
  const isActive = current === tab ? 'active' : '';
  const badgeHtml = badge
    ? `<span class="nav-badge">${badge}</span>`
    : '';
  return `
    <a class="nav-item nav-sub-item ${isActive}" data-tab="${tab}" href="#">
      <span class="nav-icon"><i class="fa ${icon}"></i></span>
      <span>${label}</span>${badgeHtml}
    </a>`;
}

// ── Helper: build a top-level nav item ───────────────────────────────────────
function topNavItem(tab, icon, label, badge = '', current = '') {
  const isActive = current === tab ? 'active' : '';
  const badgeHtml = badge
    ? `<span class="nav-badge">${badge}</span>`
    : '';
  return `
    <a class="nav-item ${isActive}" data-tab="${tab}" href="#">
      <span class="nav-icon"><i class="fa ${icon}"></i></span>
      <span>${label}</span>${badgeHtml}
    </a>`;
}

// ── Helper: build a collapsible nav group ────────────────────────────────────
function navGroup(id, icon, label, items, current = '') {
  const hasActive = items.some(([tab]) => current === tab);
  return `
    <div class="nav-group ${hasActive ? 'expanded' : ''}" data-group-id="${id}">
      <div class="nav-group-header ${hasActive ? 'active-group' : ''}" data-group="${id}">
        <span class="nav-icon"><i class="fa ${icon}"></i></span>
        <span>${label}</span>
        <span class="nav-group-arrow"><i class="fa fa-chevron-down"></i></span>
      </div>
      <div class="nav-group-items" id="group-${id}">
        ${items.map(([tab, ico, lbl, bdg]) => navItem(tab, ico, lbl, bdg, current)).join('')}
      </div>
    </div>`;
}

// ── Role-specific colour class ────────────────────────────────────────────────
function roleBadgeClass(role) {
  const map = {
    [CONFIG.ROLES.CITIZEN]:   'role-badge-citizen',
    [CONFIG.ROLES.VOLUNTEER]: 'role-badge-volunteer',
    [CONFIG.ROLES.RESCUE]:    'role-badge-rescue',
    [CONFIG.ROLES.GOVT]:      'role-badge-government',
    [CONFIG.ROLES.NGO]:       'role-badge-ngo',
    [CONFIG.ROLES.ADMIN]:     'role-badge-admin',
  };
  return map[role] || 'role-badge-citizen';
}

// ── Citizen Navigation ────────────────────────────────────────────────────────
function citizenNav(current) {
  return `
    <a class="nav-sos-btn" data-tab="citizen-sos" href="#">
      <i class="fa fa-exclamation-circle fa-lg"></i>
      <span>EMERGENCY SOS</span>
    </a>

    <div class="nav-section-title">My Activity</div>
    ${topNavItem('citizen-incidents',  'fa-clipboard-list',   'My Incidents', '', current)}
    ${topNavItem('citizen-report',     'fa-plus-circle',      'Report Incident', '', current)}
    ${topNavItem('citizen-notifications','fa-bell',           'Notifications', '3', current)}

    <div class="nav-section-title">Track & Monitor</div>
    ${topNavItem('citizen-incident-details', 'fa-info-circle',  'Incident Details', '', current)}
    ${topNavItem('citizen-incident-timeline','fa-history',       'Incident Timeline', '', current)}
    ${topNavItem('citizen-live-tracking',    'fa-satellite-dish','Live Tracking', '', current)}

    <div class="nav-section-title">Safety</div>
    ${topNavItem('citizen-chatbot',      'fa-robot',          'Disaster AI Assistant', 'Grok', current)}
    ${topNavItem('citizen-shelters',     'fa-house-chimney',  'Nearby Shelters', '', current)}
    ${topNavItem('citizen-relief',       'fa-box-open',       'Relief Distribution', '', current)}
    ${topNavItem('citizen-donation',     'fa-donate',         'Donation', '', current)}

    <div class="nav-section-title">Account</div>
    ${topNavItem('citizen-profile',  'fa-user-circle', 'Profile', '', current)}
    ${topNavItem('citizen-settings', 'fa-cog',         'Settings', '', current)}`;
}

// ── Government Navigation (collapsible groups) ────────────────────────────────
function govNav(current) {
  return `
    <div class="nav-section-title">Command</div>
    ${topNavItem('gov-command', 'fa-broadcast-tower', 'Mission Command Center', '', current)}
    ${topNavItem('gov-incident-response', 'fa-fire-extinguisher', 'Incident Response', '', current)}

    <div class="nav-divider"></div>
    <div class="nav-section-title">Modules</div>

    ${navGroup('incident-mgmt', 'fa-clipboard-list', 'Incident Management', [
      ['gov-incident-queue',     'fa-list-ul',       'Incident Queue',       ''],
      ['gov-incident-verify',    'fa-check-double',  'Verification',         ''],
      ['gov-incident-details',   'fa-file-alt',      'Incident Details',     ''],
      ['gov-complaint-history',  'fa-history',       'Complaint History',    ''],
      ['gov-duplicate-complaints','fa-copy',         'Duplicate Complaints', ''],
      ['gov-closed-incidents',   'fa-archive',       'Closed Incidents',     ''],
    ], current)}

    ${navGroup('resource-center', 'fa-boxes', 'Resource Center', [
      ['gov-resource-inventory', 'fa-warehouse',     'Resource Inventory',   ''],
      ['gov-assign-resources',   'fa-random',        'Assign Resources',     ''],
      ['gov-vehicle-fleet',      'fa-truck',         'Vehicle Fleet',        ''],
      ['gov-medical-inventory',  'fa-briefcase-medical','Medical Inventory', ''],
      ['gov-heavy-equipment',    'fa-tractor',       'Heavy Equipment',      ''],
      ['gov-fuel',               'fa-gas-pump',      'Fuel',                 ''],
      ['gov-warehouse',          'fa-warehouse',     'Warehouse',            ''],
      ['gov-comms-equipment',    'fa-walkie-talkie', 'Communication Equipment',''],
    ], current)}

    ${navGroup('rescue-ops', 'fa-truck-medical', 'Rescue Operations', [
      ['gov-rescue-teams',       'fa-users',         'Rescue Teams',         ''],
      ['gov-mission-assign',     'fa-tasks',         'Mission Assignment',   ''],
      ['gov-active-missions',    'fa-satellite-dish','Active Missions',      ''],
      ['gov-mission-timeline',   'fa-stream',        'Mission Timeline',     ''],
      ['gov-mission-reports',    'fa-file-pdf',      'Mission Reports',      ''],
    ], current)}

    ${navGroup('shelter-ops', 'fa-house-chimney', 'Shelter Operations', [
      ['gov-shelter-dashboard',  'fa-tachometer-alt','Shelter Dashboard',    ''],
      ['gov-shelter-capacity',   'fa-people-roof',   'Capacity',             ''],
      ['gov-shelter-occupancy',  'fa-bed',           'Occupancy',            ''],
      ['gov-shelter-food',       'fa-utensils',      'Food',                 ''],
      ['gov-shelter-water',      'fa-droplet',       'Water',                ''],
      ['gov-shelter-medical',    'fa-kit-medical',   'Medical Supplies',     ''],
    ], current)}

    ${navGroup('volunteer-center', 'fa-hands-helping', 'Volunteer Center', [
      ['gov-volunteers',         'fa-user-check',    'Volunteers',           ''],
      ['gov-volunteer-skills',   'fa-medal',         'Skills',               ''],
      ['gov-volunteer-assign',   'fa-calendar-check','Assignments',          ''],
      ['gov-volunteer-avail',    'fa-clock',         'Availability',         ''],
    ], current)}

    ${navGroup('ngo-center', 'fa-hands-holding-heart', 'NGO Center', [
      ['gov-ngos',               'fa-building',      'NGOs',                 ''],
      ['gov-ngo-relief',         'fa-hand-holding-heart','Relief Requests',  ''],
      ['gov-ngo-campaigns',      'fa-flag',          'Campaigns',            ''],
      ['gov-ngo-inventory',      'fa-box',           'Inventory',            ''],
    ], current)}

    ${navGroup('comms-center', 'fa-bullhorn', 'Communication Center', [
      ['gov-broadcast',          'fa-broadcast-tower','Broadcast Alerts',    ''],
      ['gov-sms',                'fa-sms',           'SMS',                  ''],
      ['gov-email-center',       'fa-envelope',      'Email',                ''],
      ['gov-push-notif',         'fa-bell',          'Push Notifications',   ''],
    ], current)}

    ${navGroup('analytics-center', 'fa-chart-pie', 'Analytics Center', [
      ['gov-incident-analytics', 'fa-chart-line',    'Incident Analytics',   ''],
      ['gov-response-analytics', 'fa-stopwatch',     'Response Time',        ''],
      ['gov-resource-analytics', 'fa-chart-bar',     'Resource Analytics',   ''],
      ['gov-shelter-analytics',  'fa-chart-area',    'Shelter Analytics',    ''],
      ['gov-dept-performance',   'fa-star',          'Department Performance',''],
    ], current)}

    ${navGroup('reports-center', 'fa-file-alt', 'Reports', [
      ['gov-reports-daily',      'fa-calendar-day',  'Daily',                ''],
      ['gov-reports-weekly',     'fa-calendar-week', 'Weekly',               ''],
      ['gov-reports-monthly',    'fa-calendar-alt',  'Monthly',              ''],
      ['gov-reports-export',     'fa-file-pdf',      'Export PDF',           ''],
    ], current)}

    <div class="nav-divider"></div>
    ${topNavItem('gov-settings', 'fa-cog', 'Settings', '', current)}`;
}

// ── Rescue Team Navigation ────────────────────────────────────────────────────
function rescueNav(current) {
  return `
    <div class="nav-section-title">Operations</div>
    ${topNavItem('rescue-dashboard',         'fa-tachometer-alt', 'Dashboard', '', current)}
    ${topNavItem('rescue-incident-response', 'fa-fire-extinguisher','Incident Response', '', current)}
    ${topNavItem('rescue-missions',          'fa-tasks',          'Assigned Missions', '', current)}
    ${topNavItem('rescue-mission-details',   'fa-file-alt',      'Mission Details', '', current)}

    <div class="nav-section-title">Field Tools</div>
    ${topNavItem('rescue-victim',        'fa-user-injured',   'Victim Report', '', current)}

    <div class="nav-section-title">History</div>
    ${topNavItem('rescue-timeline',      'fa-stream',         'Mission Timeline', '', current)}
    ${topNavItem('rescue-history',       'fa-history',        'Mission History', '', current)}
    ${topNavItem('rescue-performance',   'fa-medal',          'Performance', '', current)}`;
}

// ── NGO Navigation ────────────────────────────────────────────────────────────
function ngoNav(current) {
  return `
    <div class="nav-section-title">Overview</div>
    ${topNavItem('ngo-dashboard',        'fa-tachometer-alt', 'Dashboard', '', current)}
    ${topNavItem('ngo-campaigns',        'fa-flag',           'Campaigns', '', current)}

    <div class="nav-section-title">Operations</div>
    ${topNavItem('ngo-inventory',        'fa-box-open',       'Inventory', '', current)}
    ${topNavItem('ngo-relief-requests',  'fa-hand-holding-heart','Relief Requests', '', current)}
    ${topNavItem('ngo-distribution',     'fa-truck',          'Distribution', '', current)}

    <div class="nav-section-title">Finance & People</div>
    ${topNavItem('ngo-donations',        'fa-donate',         'Donations', '', current)}
    ${topNavItem('ngo-volunteers',       'fa-users',          'Volunteers', '', current)}
    ${topNavItem('ngo-reports',          'fa-file-alt',       'Reports', '', current)}`;
}

// ── Admin Navigation ──────────────────────────────────────────────────────────
function adminNav(current) {
  return `
    <div class="nav-section-title">Overview</div>
    ${topNavItem('admin-dashboard', 'fa-tachometer-alt', 'Dashboard', '', current)}

    <div class="nav-section-title">User Management</div>
    ${topNavItem('admin-users',       'fa-users-cog',    'User Management', '', current)}
    ${topNavItem('admin-roles',       'fa-user-tag',     'Role Management', '', current)}
    ${topNavItem('admin-departments', 'fa-building',     'Departments', '', current)}

    <div class="nav-section-title">Resource DBs</div>
    ${topNavItem('admin-resources',   'fa-cubes',        'Resources', '', current)}
    ${topNavItem('admin-hospitals',   'fa-hospital',     'Hospitals', '', current)}
    ${topNavItem('admin-shelters',    'fa-house-chimney','Shelters', '', current)}
    ${topNavItem('admin-ngos',        'fa-hands-holding-heart','NGOs', '', current)}

    <div class="nav-section-title">System</div>
    ${topNavItem('admin-audit-logs',  'fa-terminal',     'Audit Logs', '', current)}
    ${topNavItem('admin-security',    'fa-shield-alt',   'Security', '', current)}
    ${topNavItem('admin-settings',    'fa-cog',          'System Settings', '', current)}`;
}

// ── Volunteer Navigation (uses citizen subset) ────────────────────────────────
function volunteerNav(current) {
  return `
    <div class="nav-section-title">Operations</div>
    ${topNavItem('rescue-missions',   'fa-tasks',          'Assigned Missions', '', current)}
    ${topNavItem('rescue-victim',     'fa-user-injured',   'Victim Report', '', current)}

    <div class="nav-section-title">Safety</div>
    ${topNavItem('citizen-shelters',  'fa-house-chimney',  'Nearby Shelters', '', current)}
    ${topNavItem('citizen-incidents', 'fa-clipboard-list', 'Report Incident', '', current)}`;
}


// ── Blockchain Section (appended to all authenticated roles) ──────────────────
function blockchainNav(current) {
  return `
    <div class="nav-divider"></div>
    <div class="nav-section-title">Blockchain</div>
    ${topNavItem('blockchain-wallet',       'fa-wallet',          'Wallet Connect', '', current)}
    ${topNavItem('blockchain-donate',       'fa-hand-holding-usd','Donate', '', current)}
    ${topNavItem('blockchain-history',      'fa-receipt',         'Donation History', '', current)}
    ${topNavItem('blockchain-transparency', 'fa-eye',             'NGO Transparency', '', current)}
    ${topNavItem('blockchain-contracts',    'fa-file-contract',   'Smart Contract Explorer', '', current)}`;
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function renderSidebar(userRole, currentTab = 'overview') {
  const isCitizen   = userRole === CONFIG.ROLES.CITIZEN;
  const isVolunteer = userRole === CONFIG.ROLES.VOLUNTEER;
  const isRescue    = userRole === CONFIG.ROLES.RESCUE;
  const isGov       = userRole === CONFIG.ROLES.GOVT;
  const isNGO       = userRole === CONFIG.ROLES.NGO;
  const isAdmin     = userRole === CONFIG.ROLES.ADMIN;

  const user      = storageService.getUser();
  const initials  = user?.full_name ? user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  const badgeCls  = roleBadgeClass(userRole);

  let roleNav = '';
  if (isCitizen)   roleNav = citizenNav(currentTab);
  if (isVolunteer) roleNav = volunteerNav(currentTab);
  if (isRescue)    roleNav = rescueNav(currentTab);
  if (isGov)       roleNav = govNav(currentTab);
  if (isNGO)       roleNav = ngoNav(currentTab);
  if (isAdmin)     roleNav = adminNav(currentTab);

  return `
    <aside class="sidebar" id="sidebar-container">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <i class="fa fa-shield-alt"></i>
        </div>
        <div class="brand-text">
          <div class="brand-name">ResQ<span style="color: var(--primary);">AI</span></div>
          <span class="sidebar-role-badge ${badgeCls}">
            <i class="fa fa-circle" style="font-size:0.5rem;"></i>
            ${userRole}
          </span>
        </div>
      </div>

      <nav class="sidebar-nav" id="sidebar-nav">
        ${roleNav}
        ${blockchainNav(currentTab)}

        <div class="nav-divider"></div>
        <div class="nav-section-title">System</div>
        <a class="nav-item" id="nav-logout-btn" href="#">
          <span class="nav-icon"><i class="fa fa-sign-out-alt"></i></span>
          <span>Logout</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${initials}</div>
          <div>
            <div class="user-name">${user?.full_name || 'User'}</div>
            <div class="user-role">${userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

// ── Bind collapsible nav group toggles ───────────────────────────────────────
// Call after renderSidebar() has been inserted into the DOM
export function initSidebarGroups() {
  document.querySelectorAll('.nav-group-header').forEach((header) => {
    header.addEventListener('click', () => {
      const group = header.closest('.nav-group');
      if (!group) return;
      const wasExpanded = group.classList.contains('expanded');
      // Collapse all groups first (accordion behaviour)
      document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('expanded'));
      if (!wasExpanded) group.classList.add('expanded');
    });
  });
}
