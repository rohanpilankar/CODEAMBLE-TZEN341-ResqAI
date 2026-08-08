import { incidentApi } from './api/incidentApi.js';
import { shelterApi } from './api/shelterApi.js';
import { resourceApi } from './api/resourceApi.js';

export const ngoHandler = {
  async renderNgoDashboard(area) {
    area.innerHTML = `
      <div class="page-section-header">
        <div>
          <h2><i class="fa fa-tachometer-alt text-warning me-2"></i>NGO Dashboard</h2>
          <div class="page-subtitle">Overview of active campaigns, inventory levels, and pending requests</div>
        </div>
      </div>
      <div class="row g-4" id="ngo-content">
        <div class="col-12 text-center py-5">
          <div class="spinner"></div>
          <p class="mt-3 color-muted">Loading NGO data...</p>
        </div>
      </div>
    `;

    try {
      const [resRes, sRes] = await Promise.allSettled([
        resourceApi.getResources(),
        shelterApi.getShelters()
      ]);

      const inventory = resRes.status === 'fulfilled' ? resRes.value.data || [] : [];
      const shelters = sRes.status === 'fulfilled' ? sRes.value.data || [] : [];

      const inventoryRows = inventory.length > 0
        ? inventory.slice(0, 5).map(r => `
          <tr>
            <td>${r.name}</td>
            <td><span class="badge badge-info">${r.resource_type}</span></td>
            <td><strong>${r.quantity}</strong></td>
            <td><span class="badge ${r.status === 'AVAILABLE' ? 'badge-resolved' : 'badge-in-progress'}">${r.status}</span></td>
          </tr>
        `).join('')
        : `<tr><td colspan="4" class="text-center text-muted">No inventory tracked</td></tr>`;

      const shelterCards = shelters.length > 0
        ? shelters.slice(0, 4).map(s => {
            const needsHelp = s.current_occupancy / s.total_capacity > 0.8;
            return `
              <div class="card mb-3 p-3 border-left-${needsHelp ? 'danger' : 'success'}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h6 class="mb-0">${s.name}</h6>
                  <span class="badge ${needsHelp ? 'badge-critical' : 'badge-resolved'}">
                    ${needsHelp ? 'High Need' : 'Stable'}
                  </span>
                </div>
                <div class="font-size-sm color-muted mb-2"><i class="fa fa-users me-1"></i> ${s.current_occupancy} / ${s.total_capacity} People</div>
                <div class="d-flex gap-2">
                  ${!s.food_available ? '<span class="badge badge-warning"><i class="fa fa-utensils me-1"></i> Food Needed</span>' : ''}
                  ${!s.medical_available ? '<span class="badge badge-danger"><i class="fa fa-first-aid me-1"></i> Medical Needed</span>' : ''}
                </div>
                <div class="mt-3 pt-2 border-top border-glass text-end">
                  <button class="btn btn-secondary btn-sm"><i class="fa fa-truck me-1"></i> Dispatch Supplies</button>
                </div>
              </div>
            `;
          }).join('')
        : `<div class="alert-banner alert-info">No active shelters currently requesting relief.</div>`;

      document.getElementById('ngo-content').innerHTML = `
        <div class="col-lg-7">
          <h4 class="mb-3"><i class="fa fa-box-open text-primary me-2"></i>Current Inventory</h4>
          <div class="card p-0 mb-4">
            <table class="table mb-0">
              <thead style="background: rgba(255,255,255,0.05);">
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${inventoryRows}
              </tbody>
            </table>
          </div>
          
          <h4 class="mb-3"><i class="fa fa-flag text-success me-2"></i>Active Campaigns</h4>
          <div class="card border-left-success">
            <h5>Flood Relief Fund — Mumbai</h5>
            <div class="d-flex justify-content-between font-size-sm mb-1 mt-2">
              <span>Goal: ₹5,00,000</span>
              <strong>₹3,20,500 Raised (64%)</strong>
            </div>
            <div class="progress-bar-wrapper mb-3">
              <div class="progress-bar-fill green" style="width: 64%;"></div>
            </div>
            <button class="btn btn-secondary btn-sm"><i class="fa fa-bullhorn me-1"></i> Manage Campaign</button>
          </div>
        </div>
        <div class="col-lg-5">
          <h4 class="mb-3"><i class="fa fa-hand-holding-heart text-danger me-2"></i>Relief Requests (Shelters)</h4>
          ${shelterCards}
        </div>
      `;

    } catch (e) {
      document.getElementById('ngo-content').innerHTML = `
        <div class="col-12">
          <div class="alert-banner alert-danger">Failed to load NGO dashboard data: ${e.message}</div>
        </div>
      `;
    }
  },

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
          <button class="btn btn-primary btn-sm"><i class="fa fa-plus me-1"></i> Create New</button>
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

  async renderCampaigns(area) {
    this.renderMockModule(
      area, 'fa-flag', 'Campaigns', 'Create and manage fundraising and relief campaigns with blockchain tracking.',
      [
        { label: 'Active Campaigns', value: '3', subtext: 'Currently running', icon: 'fa-bullhorn', color: 'blue' },
        { label: 'Total Raised', value: '$1.2M', subtext: 'Across all campaigns', icon: 'fa-hand-holding-usd', color: 'green' },
        { label: 'Donors', value: '4,520', subtext: 'Unique contributors', icon: 'fa-users', color: 'info' },
        { label: 'Goal Reached', value: '85%', subtext: 'Average success', icon: 'fa-chart-pie', color: 'yellow' }
      ],
      [
        { title: 'New donation received: $500', time: '10 mins ago', color: 'success' },
        { title: 'Campaign goal reached: Med Supplies', time: '2 hours ago', color: 'info' },
        { title: 'Campaign "Winter Relief" started', time: '1 day ago', color: 'primary' }
      ],
      ['Campaign Name', 'Target', 'Raised', 'Status', 'Actions'],
      [
        ['Flood Relief Mumbai', '$500,000', '$320,500 (64%)', '<span class="badge badge-in-progress">Active</span>', '<button class="btn btn-secondary btn-sm">Manage</button>'],
        ['Medical Supplies Fund', '$100,000', '$100,000 (100%)', '<span class="badge badge-resolved">Completed</span>', '<button class="btn btn-secondary btn-sm">Manage</button>'],
        ['Winter Relief Blanket Drive', '$50,000', '$10,000 (20%)', '<span class="badge badge-in-progress">Active</span>', '<button class="btn btn-secondary btn-sm">Manage</button>']
      ]
    );
  },

  async renderInventory(area) {
    this.renderMockModule(
      area, 'fa-box-open', 'Inventory', 'Food, medicine, clothing, and other supplies — stock levels and distribution history.',
      [
        { label: 'Total Items', value: '14,500', subtext: 'In warehouse', icon: 'fa-boxes', color: 'blue' },
        { label: 'Low Stock Alerts', value: '2', subtext: 'Needs replenishment', icon: 'fa-exclamation-triangle', color: 'red' },
        { label: 'Categories', value: '8', subtext: 'Tracked', icon: 'fa-tags', color: 'info' },
        { label: 'Turnover Rate', value: 'High', subtext: 'Fast moving', icon: 'fa-tachometer-alt', color: 'green' }
      ],
      [
        { title: '1,000 Water bottles arrived', time: '1 hour ago', color: 'success' },
        { title: '50 Medical Kits dispatched', time: '3 hours ago', color: 'warning' },
        { title: 'Inventory audit completed', time: '1 day ago', color: 'primary' }
      ],
      ['Item Name', 'Category', 'Quantity', 'Status', 'Actions'],
      [
        ['Bottled Water (1L)', 'Food & Water', '5,000', '<span class="badge badge-resolved">Good</span>', '<button class="btn btn-secondary btn-sm">Update</button>'],
        ['First Aid Kits', 'Medical', '50', '<span class="badge badge-critical">Low Stock</span>', '<button class="btn btn-secondary btn-sm">Update</button>'],
        ['Blankets', 'Shelter', '2,000', '<span class="badge badge-resolved">Good</span>', '<button class="btn btn-secondary btn-sm">Update</button>']
      ]
    );
  },

  async renderReliefRequests(area) {
    this.renderMockModule(
      area, 'fa-hand-holding-heart', 'Relief Requests', 'Submit and track relief resource requests to the government.',
      [
        { label: 'Pending Requests', value: '4', subtext: 'Awaiting approval', icon: 'fa-hourglass-half', color: 'yellow' },
        { label: 'Approved', value: '12', subtext: 'This month', icon: 'fa-check-double', color: 'green' },
        { label: 'Fulfilled', value: '10', subtext: 'Supplies received', icon: 'fa-box', color: 'info' },
        { label: 'Denied', value: '1', subtext: 'Insufficient info', icon: 'fa-times-circle', color: 'red' }
      ],
      [
        { title: 'Request #405 Approved', time: '30 mins ago', color: 'success' },
        { title: 'Request #406 Submitted', time: '2 hours ago', color: 'info' },
        { title: 'Supplies received for #401', time: '1 day ago', color: 'primary' }
      ],
      ['Request ID', 'Items Requested', 'To', 'Status', 'Actions'],
      [
        ['#406', '500x Food Rations', 'Govt Command', '<span class="badge badge-warning">Pending</span>', '<button class="btn btn-secondary btn-sm">View</button>'],
        ['#405', '100x Medical Kits', 'NDRF', '<span class="badge badge-resolved">Approved</span>', '<button class="btn btn-secondary btn-sm">View</button>'],
        ['#401', '10x Tents', 'Govt Command', '<span class="badge badge-info">Fulfilled</span>', '<button class="btn btn-secondary btn-sm">View</button>']
      ]
    );
  },

  async renderDistribution(area) {
    this.renderMockModule(
      area, 'fa-truck', 'Distribution', 'Plan and record distribution of supplies to shelters and disaster zones.',
      [
        { label: 'Active Dispatches', value: '2', subtext: 'En route', icon: 'fa-shipping-fast', color: 'blue' },
        { label: 'Locations Served', value: '15', subtext: 'Shelters/Zones', icon: 'fa-map-marker-alt', color: 'info' },
        { label: 'Items Distributed', value: '8,400', subtext: 'This month', icon: 'fa-box-open', color: 'green' },
        { label: 'Vehicles', value: '5', subtext: 'In fleet', icon: 'fa-truck', color: 'yellow' }
      ],
      [
        { title: 'Truck #2 reached Shelter B', time: '15 mins ago', color: 'success' },
        { title: 'Truck #4 departed for Zone C', time: '1 hour ago', color: 'info' },
        { title: 'Distribution report filed', time: 'Yesterday', color: 'primary' }
      ],
      ['Dispatch ID', 'Destination', 'Vehicle', 'Status', 'Actions'],
      [
        ['DSP-102', 'Shelter B', 'Truck #2', '<span class="badge badge-info">Arrived</span>', '<button class="btn btn-secondary btn-sm">Details</button>'],
        ['DSP-103', 'Zone C (Flood)', 'Truck #4', '<span class="badge badge-warning">En Route</span>', '<button class="btn btn-secondary btn-sm">Details</button>'],
        ['DSP-101', 'Shelter A', 'Van #1', '<span class="badge badge-resolved">Completed</span>', '<button class="btn btn-secondary btn-sm">Details</button>']
      ]
    );
  },

  async renderDonations(area) {
    this.renderMockModule(
      area, 'fa-donate', 'Donations', 'Blockchain-verified donation records — donor list, amounts, and disbursement.',
      [
        { label: 'Total Received', value: '$1.2M', subtext: 'Fiat & Crypto', icon: 'fa-coins', color: 'green' },
        { label: 'On-Chain', value: '$450k', subtext: 'Blockchain verified', icon: 'fa-link', color: 'blue' },
        { label: 'Disbursed', value: '$950k', subtext: 'Spent on relief', icon: 'fa-money-bill-wave', color: 'info' },
        { label: 'Transparency', value: '98%', subtext: 'Audit score', icon: 'fa-eye', color: 'yellow' }
      ],
      [
        { title: 'Anonymous donated 1 ETH', time: '5 mins ago', color: 'success' },
        { title: 'Disbursement of $50k verified', time: '2 hours ago', color: 'info' },
        { title: 'Monthly audit report generated', time: '1 day ago', color: 'primary' }
      ],
      ['Tx Hash / ID', 'Donor', 'Amount', 'Verification', 'Actions'],
      [
        ['0x9a8b...7c6d', 'Anonymous', '1 ETH (~$3,000)', '<span class="text-success"><i class="fa fa-check-circle"></i> On-Chain</span>', '<button class="btn btn-secondary btn-sm">Receipt</button>'],
        ['FIAT-8842', 'John Doe', '$500', '<span class="text-info"><i class="fa fa-university"></i> Bank</span>', '<button class="btn btn-secondary btn-sm">Receipt</button>'],
        ['0x1b2c...3d4e', 'CryptoFund', '5,000 USDC', '<span class="text-success"><i class="fa fa-check-circle"></i> On-Chain</span>', '<button class="btn btn-secondary btn-sm">Receipt</button>']
      ]
    );
  },

  async renderVolunteers(area) {
    this.renderMockModule(
      area, 'fa-users', 'Volunteers', 'Manage your NGO volunteers — skills, assignments, and availability.',
      [
        { label: 'Total Volunteers', value: '150', subtext: 'Registered', icon: 'fa-users', color: 'blue' },
        { label: 'Active Now', value: '45', subtext: 'On duty', icon: 'fa-user-check', color: 'green' },
        { label: 'Medical Trained', value: '30', subtext: 'Certified', icon: 'fa-user-nurse', color: 'red' },
        { label: 'Pending Approval', value: '5', subtext: 'New signups', icon: 'fa-user-clock', color: 'yellow' }
      ],
      [
        { title: '5 volunteers dispatched to Shelter B', time: '1 hour ago', color: 'info' },
        { title: 'Sarah Jenkins completed Med Training', time: '3 hours ago', color: 'success' },
        { title: 'New volunteer application received', time: '5 hours ago', color: 'warning' }
      ],
      ['Name', 'Skills', 'Availability', 'Status', 'Actions'],
      [
        ['Alex Mercer', 'Medical, Driving', 'Weekends', '<span class="badge badge-resolved">Active</span>', '<button class="btn btn-secondary btn-sm">Assign</button>'],
        ['Sarah Jenkins', 'Logistics, First Aid', 'Full-time', '<span class="badge badge-in-progress">On Duty</span>', '<button class="btn btn-secondary btn-sm">Assign</button>'],
        ['David Chen', 'Heavy Machinery', 'Evenings', '<span class="badge badge-warning">Pending</span>', '<button class="btn btn-secondary btn-sm">Assign</button>']
      ]
    );
  },

  async renderReports(area) {
    this.renderMockModule(
      area, 'fa-file-alt', 'Reports', 'NGO activity reports — relief distribution summaries and donation transparency.',
      [
        { label: 'Generated Reports', value: '24', subtext: 'This year', icon: 'fa-file-pdf', color: 'red' },
        { label: 'Govt Submissions', value: '12', subtext: 'Mandatory', icon: 'fa-landmark', color: 'blue' },
        { label: 'Public Audits', value: '4', subtext: 'Quarterly', icon: 'fa-search-dollar', color: 'green' },
        { label: 'Next Due', value: '5 Days', subtext: 'Monthly Summary', icon: 'fa-calendar-alt', color: 'yellow' }
      ],
      [
        { title: 'July Transparency Report generated', time: '1 week ago', color: 'success' },
        { title: 'Q2 Audit submitted to Govt', time: '1 month ago', color: 'info' },
        { title: 'Distribution summary updated', time: 'Yesterday', color: 'primary' }
      ],
      ['Report Name', 'Type', 'Date Generated', 'Status', 'Actions'],
      [
        ['July 2026 Transparency & Impact', 'Monthly', 'Aug 01, 2026', '<span class="badge badge-resolved">Published</span>', '<button class="btn btn-secondary btn-sm">Download</button>'],
        ['Q2 Govt Compliance Report', 'Quarterly', 'Jul 15, 2026', '<span class="badge badge-resolved">Submitted</span>', '<button class="btn btn-secondary btn-sm">Download</button>'],
        ['Shelter B Distribution Log', 'Operational', 'Aug 03, 2026', '<span class="badge badge-info">Internal</span>', '<button class="btn btn-secondary btn-sm">Download</button>']
      ]
    );
  }
};
