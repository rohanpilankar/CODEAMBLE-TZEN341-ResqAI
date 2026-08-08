import { CONFIG } from './config.js';

export const blockchainHandler = {
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
          <button class="btn btn-primary btn-sm" onclick="blockchainHandler.connectWallet()"><i class="fa fa-wallet me-1"></i> Connect Wallet</button>
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
            <h5 class="mb-3">Network Status</h5>
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

  async renderWallet(area) {
    this.renderMockModule(
      area, 'fa-wallet', 'Wallet Connect', 'Connect your MetaMask or WalletConnect wallet to interact with the ResQAI smart contract.',
      [
        { label: 'Wallet Status', value: 'Not Connected', subtext: 'Click Connect Wallet', icon: 'fa-plug', color: 'red' },
        { label: 'Network', value: 'Ethereum', subtext: 'Mainnet', icon: 'fa-network-wired', color: 'blue' },
        { label: 'Gas Price', value: '12 Gwei', subtext: 'Low', icon: 'fa-gas-pump', color: 'green' },
        { label: 'ResQ Tokens', value: '0.00', subtext: 'Balance', icon: 'fa-coins', color: 'yellow' }
      ],
      [
        { title: 'Block #145892 mined', time: '12 secs ago', color: 'success' },
        { title: 'Network congestion low', time: '1 min ago', color: 'info' },
        { title: 'Smart Contract synced', time: '5 mins ago', color: 'primary' }
      ],
      ['Wallet Provider', 'Status', 'Supported Networks', 'Action'],
      [
        ['MetaMask', '<span class="badge badge-warning">Disconnected</span>', 'ETH, Polygon, BSC', '<button class="btn btn-primary btn-sm">Connect</button>'],
        ['WalletConnect', '<span class="badge badge-warning">Disconnected</span>', 'Multi-chain', '<button class="btn btn-primary btn-sm">Connect</button>'],
        ['Coinbase Wallet', '<span class="badge badge-warning">Disconnected</span>', 'ETH', '<button class="btn btn-primary btn-sm">Connect</button>']
      ]
    );
  },

  async renderDonate(area) {
    this.renderMockModule(
      area, 'fa-hand-holding-usd', 'Crypto Donate', 'Select an NGO and donate directly via blockchain — get a verifiable certificate.',
      [
        { label: 'Total Donated', value: '$45,210', subtext: 'By you', icon: 'fa-gift', color: 'green' },
        { label: 'Active Campaigns', value: '12', subtext: 'Accepting Crypto', icon: 'fa-flag', color: 'blue' },
        { label: 'Certificates', value: '4', subtext: 'Minted NFTs', icon: 'fa-certificate', color: 'yellow' },
        { label: 'Tax Deductible', value: 'Yes', subtext: 'Via smart receipt', icon: 'fa-file-invoice', color: 'info' }
      ],
      [
        { title: '0.5 ETH donated to Global Relief', time: '10 mins ago', color: 'success' },
        { title: '100 USDC to LocalCare', time: '1 hour ago', color: 'info' },
        { title: 'NFT Certificate minted', time: '1 hour ago', color: 'primary' }
      ],
      ['Campaign Name', 'Accepts', 'Goal Progress', 'Action'],
      [
        ['Flood Relief Mumbai', 'ETH, USDC', '64%', '<button class="btn btn-success btn-sm">Donate</button>'],
        ['Shelter Supply Fund', 'USDT, MATIC', '30%', '<button class="btn btn-success btn-sm">Donate</button>'],
        ['Medical Aid Network', 'ETH, DAI', '85%', '<button class="btn btn-success btn-sm">Donate</button>']
      ]
    );
  },

  async renderHistory(area) {
    try {
      const res = await fetch('${CONFIG.API_BASE_URL}/blockchain/donations').then(r => r.json());
      const txs = res.data || [];
      const rows = txs.map(t => [
        `<code>${t.tx_hash}</code>`, t.timestamp, `${t.amount_eth} ETH (${t.usd_equivalent})`, `<span class="badge badge-resolved">${t.status}</span>`, `<a href="#" onclick="alert('Viewing verified transaction receipt for ${t.tx_hash}'); return false;">Receipt</a>`
      ]);
      this.renderMockModule(
        area, 'fa-receipt', 'Donation History', 'All past blockchain donations with transaction hashes and NGO receipts.',
        [
          { label: 'Total Transactions', value: `${txs.length}`, subtext: 'Since join', icon: 'fa-list', color: 'blue' },
          { label: 'Volume Donated', value: '1.7 ETH', subtext: '~ $4,930', icon: 'fa-chart-bar', color: 'green' },
          { label: 'Smart Contracts', value: '2', subtext: 'Interacted', icon: 'fa-file-contract', color: 'yellow' },
          { label: 'Verifications', value: '100%', subtext: 'On-chain proof', icon: 'fa-check-double', color: 'info' }
        ],
        [
          { title: 'Transaction Confirmed', time: 'Just now', color: 'success' },
          { title: 'Smart Contract Verified', time: '5 mins ago', color: 'info' },
        ],
        ['Tx Hash', 'Date', 'Amount', 'Status', 'Receipt'],
        rows
      );
    } catch (e) {
      area.innerHTML = '<div class="p-4 text-danger">Failed to load blockchain donation history</div>';
    }
  },

  async renderTransparency(area) {
    this.renderMockModule(
      area, 'fa-eye', 'NGO Transparency', 'Public ledger of all NGO donations and verified disbursements on-chain.',
      [
        { label: 'Total Ecosystem Volume', value: '$2.4M', subtext: 'Locked & Spent', icon: 'fa-globe', color: 'blue' },
        { label: 'Verified Disbursements', value: '$1.8M', subtext: '75% of funds', icon: 'fa-check-circle', color: 'green' },
        { label: 'Tracked Vendors', value: '450', subtext: 'Suppliers paid', icon: 'fa-truck', color: 'yellow' },
        { label: 'Audit Score', value: 'A+', subtext: 'Real-time', icon: 'fa-medal', color: 'info' }
      ],
      [
        { title: 'Relief India Foundation disbursed $50k', time: '2 hrs ago', color: 'success' },
        { title: 'Vendor payment verified', time: '4 hrs ago', color: 'info' },
        { title: 'New audit report published', time: '1 day ago', color: 'primary' }
      ],
      ['NGO', 'Funds Raised', 'Funds Spent', 'Transparency Score'],
      [
        ['Relief India Foundation', '$500,000', '$420,000', '<span class="text-success">98/100</span>'],
        ['Disaster Aid Alliance', '$150,000', '$120,000', '<span class="text-success">95/100</span>'],
      ]
    );
  },

  async renderContracts(area) {
    try {
      const res = await fetch('${CONFIG.API_BASE_URL}/blockchain/contracts').then(r => r.json());
      const contracts = res.data || [];
      const rows = contracts.map(c => [
        `<strong>${c.name}</strong>`, `<code>${c.address}</code>`, c.network, `<span class="badge badge-resolved">Verified (${c.transparency_score})</span>`
      ]);
      this.renderMockModule(
        area, 'fa-file-contract', 'Smart Contract Explorer', 'Browse and interact with deployed ResQAI smart contracts.',
        [
          { label: 'Deployed Contracts', value: `${contracts.length}`, subtext: 'Core system', icon: 'fa-code', color: 'blue' },
          { label: 'Active Addresses', value: '14.2k', subtext: 'Interacting', icon: 'fa-users', color: 'green' },
          { label: 'TVL', value: '$850k', subtext: 'Total Value Locked', icon: 'fa-lock', color: 'yellow' },
          { label: 'Last Audit', value: 'Passed', subtext: 'Certik & OpenZeppelin', icon: 'fa-shield-check', color: 'info' }
        ],
        [
          { title: 'Contract Verified on Etherscan', time: '1 day ago', color: 'primary' },
          { title: 'Security Audit passed', time: '1 month ago', color: 'success' }
        ],
        ['Contract Name', 'Address', 'Network', 'Status'],
        rows
      );
    } catch (e) {
      area.innerHTML = '<div class="p-4 text-danger">Failed to load smart contracts list</div>';
    }
  },

  async connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        const shortAccount = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        alert(`Web3 Wallet Connected: ${shortAccount}`);
        localStorage.setItem('resq_web3_account', account);
        return account;
      } catch (err) {
        console.error('Wallet connection rejected:', err);
      }
    } else {
      alert('MetaMask or Web3 wallet browser extension is not detected. Please install MetaMask to interact with live relief funds on-chain.');
    }
  }
};


