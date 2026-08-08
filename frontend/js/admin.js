import { CONFIG } from './config.js';

export const adminHandler = {
  renderMockModule(area, icon, title, description, metrics, listItems, tableHeaders, tableRows) {
    area.innerHTML = `
      <div class="page-section-header">
        <div>
          <h2 style="display:flex;align-items:center;gap:10px;">
            <span style="width:36px;height:36px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:rgba(var(--primary-rgb),0.12);color:var(--primary);font-size:1rem;flex-shrink:0;">
              <i class="fa ${icon}"></i>
            </span>
            ${title}
          </h2>
          <div class="page-subtitle">${description}</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-primary btn-sm"><i class="fa fa-plus me-1"></i> Add New</button>
          <button class="btn btn-secondary btn-sm"><i class="fa fa-download me-1"></i> Export</button>
        </div>
      </div>
      
      <div class="stats-grid-4" style="margin-bottom:24px;">
        ${metrics.map(m => `
        <div class="module-stat-card">
          <div class="stat-icon ${m.color}"><i class="fa ${m.icon}"></i></div>
          <div class="stat-info">
            <div class="stat-label">${m.label}</div>
            <div class="stat-value">${m.value}</div>
            <div class="stat-delta">${m.subtext}</div>
          </div>
        </div>
        `).join('')}
      </div>

      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card p-0">
            <table class="table mb-0">
              <thead style="background: rgba(255,255,255,0.05);">
                <tr>
                  ${tableHeaders.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows.map(row => `
                  <tr>
                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="card p-4 h-100">
            <h5 class="mb-3">Recent Activity</h5>
            <ul class="list-unstyled d-flex flex-column gap-3 mb-0">
              ${listItems.map(item => `
                <li class="d-flex align-items-center gap-3">
                  <div class="activity-dot" style="width:10px;height:10px;border-radius:50%;background:var(--${item.color});"></div>
                  <div>
                    <div class="font-size-sm fw-bold">${item.title}</div>
                    <div class="font-size-xs color-muted">${item.time}</div>
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  },

  async renderRoles(area) {
    this.renderMockModule(
      area, 'fa-user-tag', 'Role Management', 'Create, edit, and assign roles and permission sets to users.',
      [
        { label: 'Total Roles', value: '12', subtext: 'System wide', icon: 'fa-tags', color: 'blue' },
        { label: 'Active Users', value: '1,420', subtext: 'With assigned roles', icon: 'fa-users', color: 'green' },
        { label: 'Pending Requests', value: '5', subtext: 'Role escalations', icon: 'fa-clock', color: 'yellow' },
        { label: 'System Health', value: 'OK', subtext: 'Permissions valid', icon: 'fa-shield-alt', color: 'green' }
      ],
      [
        { title: 'Admin granted to user#452', time: '10 mins ago', color: 'primary' },
        { title: 'Volunteer role updated', time: '2 hours ago', color: 'success' },
        { title: 'New role "Medical" created', time: '1 day ago', color: 'info' }
      ],
      ['Role Name', 'Users', 'Permissions Level', 'Actions'],
      [
        ['Administrator', '5', '<span class="badge badge-danger">Full Access</span>', '<button class="btn btn-secondary btn-sm"><i class="fa fa-edit"></i></button>'],
        ['Rescue Leader', '42', '<span class="badge badge-warning">High</span>', '<button class="btn btn-secondary btn-sm"><i class="fa fa-edit"></i></button>'],
        ['Volunteer', '1250', '<span class="badge badge-success">Standard</span>', '<button class="btn btn-secondary btn-sm"><i class="fa fa-edit"></i></button>']
      ]
    );
  },

  async renderDepartments(area) {
    this.renderMockModule(
      area, 'fa-building', 'Departments', 'Manage government departments, their resources, and disaster response mandates.',
      [
        { label: 'Active Depts', value: '8', subtext: 'Gov Agencies', icon: 'fa-landmark', color: 'blue' },
        { label: 'Personnel', value: '34,500', subtext: 'Total staff', icon: 'fa-users-cog', color: 'green' },
        { label: 'Budget Utilized', value: '72%', subtext: 'Fiscal year', icon: 'fa-chart-pie', color: 'yellow' },
        { label: 'Open Mandates', value: '14', subtext: 'Active operations', icon: 'fa-clipboard-check', color: 'red' }
      ],
      [
        { title: 'NDRF deployed 4 units', time: '1 hour ago', color: 'danger' },
        { title: 'Health Dept requested funds', time: '3 hours ago', color: 'warning' },
        { title: 'Fire Dept report submitted', time: '5 hours ago', color: 'success' }
      ],
      ['Department', 'Head', 'Personnel', 'Status'],
      [
        ['NDRF', 'Director Sharma', '12,000', '<span class="badge badge-resolved">Active</span>'],
        ['Ministry of Health', 'Dr. Gupta', '8,500', '<span class="badge badge-resolved">Active</span>'],
        ['Fire & Rescue', 'Chief Singh', '14,000', '<span class="badge badge-resolved">Active</span>']
      ]
    );
  },

  async renderHospitals(area) {
    try {
      const res = await fetch('${CONFIG.API_BASE_URL}/medical/hospitals').then(r => r.json());
      const hospitals = res.data || [];
      const rows = hospitals.map(h => [
        `<strong>${h.name}</strong>`, h.address, `${h.icu_beds} ICU / ${h.total_beds} Total`, `<span class="badge ${h.available_beds > 20 ? 'badge-resolved' : 'badge-critical'}">${h.available_beds} Available</span>`
      ]);
      this.renderMockModule(
        area, 'fa-hospital', 'Hospital Database', 'Manage hospital records — capacity, ICU beds, ER status, and contact details.',
        [
          { label: 'Registered Hospitals', value: `${hospitals.length}`, subtext: 'In region', icon: 'fa-hospital-symbol', color: 'blue' },
          { label: 'Total Beds', value: `${hospitals.reduce((acc, h) => acc + h.total_beds, 0)}`, subtext: 'Capacity', icon: 'fa-bed', color: 'red' },
          { label: 'Occupied Beds', value: `${hospitals.reduce((acc, h) => acc + h.occupied_beds, 0)}`, subtext: 'High Load', icon: 'fa-user-injured', color: 'yellow' },
          { label: 'Emergency Status', value: 'Active', subtext: 'Hotlines online', icon: 'fa-phone-volume', color: 'green' }
        ],
        [
          { title: 'Hospital beds synchronized', time: 'Just now', color: 'success' },
          { title: 'Trauma center status updated', time: '10 mins ago', color: 'info' }
        ],
        ['Hospital Name', 'Address', 'ICU / Total Beds', 'Availability'],
        rows
      );
    } catch (e) {
      area.innerHTML = '<div class="p-4 text-danger">Failed to load hospitals database</div>';
    }
  },

  async renderNgos(area) {
    try {
      const res = await fetch('${CONFIG.API_BASE_URL}/ngo/list').then(r => r.json());
      const ngos = res.data || [];
      const rows = ngos.map(n => [
        `<strong>${n.name}</strong>`, n.registration_number, n.contact_email, `<span class="badge badge-resolved">${n.verified ? 'Verified' : 'Pending'}</span>`
      ]);
      this.renderMockModule(
        area, 'fa-hands-holding-heart', 'NGO Database', 'Registered NGOs — verify, approve, and manage relief campaigns.',
        [
          { label: 'Verified NGOs', value: `${ngos.length}`, subtext: 'Platform wide', icon: 'fa-check-circle', color: 'green' },
          { label: 'Active Campaigns', value: '5', subtext: 'Live fundraising', icon: 'fa-flag', color: 'blue' },
          { label: 'Relief Dispatched', value: '100%', subtext: 'Verified on-chain', icon: 'fa-truck', color: 'yellow' },
          { label: 'Audit Score', value: '98%', subtext: 'Compliance', icon: 'fa-medal', color: 'green' }
        ],
        [
          { title: 'NGO registration active', time: 'Just now', color: 'success' },
          { title: 'Relief campaign approved', time: '1 hour ago', color: 'info' }
        ],
        ['NGO Name', 'Reg Number', 'Email', 'Verification Status'],
        rows
      );
    } catch (e) {
      area.innerHTML = '<div class="p-4 text-danger">Failed to load NGO database</div>';
    }
  },

  async renderSecurity(area) {
    try {
      const res = await fetch('${CONFIG.API_BASE_URL}/audit/security').then(r => r.json());
      const s = res.data || {};
      this.renderMockModule(
        area, 'fa-shield-alt', 'Security Center', 'Login attempts, rate limits, firewall, and system security posture.',
        [
          { label: 'Firewall Status', value: `${s.firewall}`, subtext: 'Active filtering', icon: 'fa-shield-check', color: 'green' },
          { label: 'Failed Logins (24h)', value: `${s.failed_login_attempts_24h}`, subtext: 'Monitored', icon: 'fa-user-lock', color: 'red' },
          { label: 'Rate Limiting', value: 'ENABLED', subtext: s.rate_limiting, icon: 'fa-tachometer-alt', color: 'blue' },
          { label: 'IP Whitelists', value: `${s.active_ip_whitelists}`, subtext: 'Authorized nodes', icon: 'fa-list-check', color: 'green' }
        ],
        [
          { title: 'Daily security scan passed', time: 'Just now', color: 'success' },
          { title: 'JWT Secret encryption verified', time: '1 hour ago', color: 'info' }
        ],
        ['Security Parameter', 'Configured Value', 'Status'],
        [
          ['JWT Encryption Algorithm', s.jwt_token_encryption, '<span class="badge badge-resolved">Secure</span>'],
          ['Firewall Rate Limiter', s.rate_limiting, '<span class="badge badge-resolved">Active</span>'],
          ['SSL Certificate Expiry', `${s.ssl_cert_expiry_days} days remaining`, '<span class="badge badge-resolved">Valid</span>']
        ]
      );
    } catch (e) {
      area.innerHTML = '<div class="p-4 text-danger">Failed to load security status</div>';
    }
  },


  async renderSettings(area) {
    this.renderMockModule(
      area, 'fa-cog', 'System Settings', 'Global platform configuration — API keys, integrations, and environment settings.',
      [
        { label: 'API Version', value: 'v2.4.1', subtext: 'Latest', icon: 'fa-code-branch', color: 'blue' },
        { label: 'Database Status', value: 'Optimized', subtext: '99% Uptime', icon: 'fa-database', color: 'green' },
        { label: 'Cache Hits', value: '94%', subtext: 'Redis active', icon: 'fa-bolt', color: 'yellow' },
        { label: 'Storage Used', value: '42%', subtext: '2.1TB remaining', icon: 'fa-hdd', color: 'info' }
      ],
      [
        { title: 'Config updated by Admin', time: '1 day ago', color: 'warning' },
        { title: 'SSL Certificate renewed', time: '1 week ago', color: 'success' },
        { title: 'System backup completed', time: '12 hours ago', color: 'info' }
      ],
      ['Configuration Key', 'Value', 'Category', 'Actions'],
      [
        ['ENABLE_BLOCKCHAIN', 'True', 'Features', '<button class="btn btn-secondary btn-sm">Edit</button>'],
        ['MAX_UPLOAD_SIZE', '50MB', 'System', '<button class="btn btn-secondary btn-sm">Edit</button>'],
        ['SMTP_HOST', 'mail.resq.ai', 'Email', '<button class="btn btn-secondary btn-sm">Edit</button>']
      ]
    );
  }
};
