import { publicApi } from './api/publicApi.js';
import { notificationService } from './services/notificationService.js';
import { themeService } from './services/themeService.js';

export const publicPagesHandler = {
  async init() {
    try { themeService.init(); } catch (e) { console.warn('Theme service init warning:', e); }

    // Listen to cross-tab storage changes (e.g. location or theme updates)
    window.addEventListener('storage', (evt) => {
      if (evt.key === themeService.THEME_KEY && evt.newValue) {
        themeService.setTheme(evt.newValue);
      }
      if (evt.key === 'resq_rescue_location' && evt.newValue) {
        window.dispatchEvent(new CustomEvent('rescueLocationUpdated', { detail: JSON.parse(evt.newValue) }));
      }
    });

    const page = window.location.pathname.split('/').pop() || 'index.html';



    if (page.includes('news.html')) {
      await this.initNewsPage();
    } else if (page.includes('emergency-contacts.html')) {
      await this.initEmergencyContactsPage();
    } else if (page.includes('shelter-finder.html')) {
      await this.initShelterFinderPage();
    } else if (page.includes('live-alerts.html')) {
      await this.initLiveAlertsPage();
    } else if (page.includes('contact.html')) {
      this.initContactForm();
    } else if (page.includes('donate.html')) {
      this.initDonatePage();
    }
  },

  // ── Live Alerts Page ───────────────────────────────────────────────────────
  async initLiveAlertsPage() {
    const alertsContainer = document.getElementById('public-live-alerts-container');
    if (!alertsContainer) return;

    try {
      alertsContainer.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-danger"></div><p class="mt-2 text-muted">Connecting to real-time emergency feed...</p></div>`;
      
      const [weatherRes, incidentsRes] = await Promise.allSettled([
        fetch('http://localhost:8000/api/v1/public/weather').then(r => r.json()),
        fetch('http://localhost:8000/api/v1/incidents').then(r => r.json())
      ]);

      const weather = weatherRes.status === 'fulfilled' ? weatherRes.value.data : null;
      const incidents = incidentsRes.status === 'fulfilled' ? incidentsRes.value.data || [] : [];

      let html = '';

      if (weather) {
        html += `
          <div style="border-left:4px solid var(--danger);padding-left:16px;margin-bottom:24px;background:rgba(255,0,56,0.05);padding:16px;border-radius:8px;">
            <div style="font-size:0.8rem;color:var(--danger);font-weight:700;margin-bottom:4px;text-transform:uppercase;">
              <i class="fa fa-cloud-showers-heavy me-1"></i> Weather Advisory • Active Warning
            </div>
            <h4 style="font-size:1.1rem;color:var(--text-primary);font-weight:700;margin-bottom:8px;">${weather.condition}</h4>
            <p style="color:var(--text-muted);font-size:0.9rem;margin:0;line-height:1.6;">${weather.advisory}</p>
            <div class="mt-2 small text-secondary">Location: ${weather.location} | Wind: ${weather.wind_speed_kmh} km/h | Humidity: ${weather.humidity_pct}%</div>
          </div>
        `;
      }

      if (incidents.length > 0) {
        incidents.forEach(inc => {
          const isCrit = inc.severity === 'CRITICAL';
          const borderCol = isCrit ? 'var(--danger)' : 'var(--warning)';
          html += `
            <div style="border-left:4px solid ${borderCol};padding-left:16px;margin-bottom:20px;background:rgba(255,255,255,0.02);padding:16px;border-radius:8px;">
              <div style="font-size:0.8rem;color:${isCrit ? 'var(--danger)' : 'var(--warning)'};font-weight:700;margin-bottom:4px;text-transform:uppercase;">
                ${inc.disaster_type} • ${inc.severity} Severity
              </div>
              <h4 style="font-size:1.1rem;color:var(--text-primary);font-weight:700;margin-bottom:8px;">${inc.title}</h4>
              <p style="color:var(--text-muted);font-size:0.9rem;margin:0;line-height:1.6;">${inc.description}</p>
              <div class="mt-2 font-size-xs text-muted"><i class="fa fa-map-marker-alt me-1"></i> ${inc.address || 'Location Reported'}</div>
            </div>
          `;
        });
      } else {
        html += `<div class="text-center py-4 text-muted">No critical public warnings at this time.</div>`;
      }

      alertsContainer.innerHTML = html;
    } catch (e) {
      alertsContainer.innerHTML = `<div class="alert alert-danger">Unable to load live alerts feed.</div>`;
    }
  },


  // ── News Page ──────────────────────────────────────────────────────────────
  async initNewsPage() {
    const newsContainer = document.getElementById('news-container');
    const searchInput = document.getElementById('news-search-input');
    if (!newsContainer) return;

    try {
      newsContainer.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Loading latest advisories...</p></div>`;
      const res = await publicApi.getNews();
      const articles = res.data || [];
      this.allArticles = articles;
      this.renderNews(articles);

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase();
          const filtered = this.allArticles.filter(a =>
            a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
          );
          this.renderNews(filtered);
        });
      }
    } catch (err) {
      newsContainer.innerHTML = `<div class="alert alert-danger">Failed to load news advisories. Please try again later.</div>`;
    }
  },

  renderNews(articles) {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;

    if (articles.length === 0) {
      newsContainer.innerHTML = `<div class="text-center py-5 text-muted"><i class="fa fa-newspaper fa-3x mb-3 opacity-50"></i><p>No news articles found matching your query.</p></div>`;
      return;
    }

    newsContainer.innerHTML = articles.map(a => `
      <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:28px;margin-bottom:20px;transition:transform 0.2s ease;">
        <div style="font-size:0.8rem;color:var(--primary);font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <span><i class="fa fa-calendar-alt me-1"></i> ${new Date(a.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"><i class="fa fa-user me-1"></i> ${a.author || 'Editorial'}</span>
        </div>
        <h3 style="font-size:1.35rem;font-weight:800;color:var(--text-primary);margin-bottom:12px;">${a.title}</h3>
        <p style="color:var(--text-muted);line-height:1.7;margin-bottom:0;">${a.content}</p>
      </div>
    `).join('');
  },

  // ── Emergency Contacts Page ────────────────────────────────────────────────
  async initEmergencyContactsPage() {
    const contactsGrid = document.getElementById('emergency-contacts-grid');
    const searchInput = document.getElementById('contact-search');
    const categoryFilter = document.getElementById('contact-category-filter');
    if (!contactsGrid) return;

    try {
      contactsGrid.innerHTML = `<div class="text-center py-5 col-12"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Fetching official emergency hotlines...</p></div>`;
      const res = await publicApi.getEmergencyContacts();
      const contacts = res.data || [];
      this.allContacts = contacts;
      this.renderEmergencyContacts(contacts);

      const filterFn = () => {
        const q = searchInput?.value.toLowerCase() || '';
        const cat = categoryFilter?.value || 'ALL';
        const filtered = this.allContacts.filter(c => {
          const matchesSearch = c.agency_name.toLowerCase().includes(q) || c.phone_number.includes(q) || c.location.toLowerCase().includes(q);
          const matchesCat = cat === 'ALL' || c.category.toLowerCase() === cat.toLowerCase();
          return matchesSearch && matchesCat;
        });
        this.renderEmergencyContacts(filtered);
      };

      searchInput?.addEventListener('input', filterFn);
      categoryFilter?.addEventListener('change', filterFn);
    } catch (err) {
      contactsGrid.innerHTML = `<div class="alert alert-danger col-12">Failed to load emergency contacts.</div>`;
    }
  },

  renderEmergencyContacts(contacts) {
    const contactsGrid = document.getElementById('emergency-contacts-grid');
    if (!contactsGrid) return;

    if (contacts.length === 0) {
      contactsGrid.innerHTML = `<div class="text-center py-5 text-muted col-12"><i class="fa fa-phone-slash fa-3x mb-3 opacity-50"></i><p>No emergency contacts found.</p></div>`;
      return;
    }

    const iconMap = {
      'Police': 'fa-shield-halved',
      'Fire': 'fa-fire-extinguisher',
      'Ambulance': 'fa-truck-medical',
      'Disaster Mgmt': 'fa-triangle-exclamation',
    };

    contactsGrid.innerHTML = contacts.map(c => `
      <div class="col-md-6 col-lg-4 mb-4">
        <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:24px;height:100%;display:flex;flex-direction:column;justify-between;position:relative;">
          <div>
            <div style="display:flex;align-items:center;justify-between;margin-bottom:12px;">
              <span class="badge bg-secondary text-white"><i class="fa ${iconMap[c.category] || 'fa-phone'} me-1"></i> ${c.category}</span>
              <span class="text-muted font-size-xs"><i class="fa fa-location-dot me-1"></i> ${c.location}</span>
            </div>
            <h4 style="font-weight:700;font-size:1.1rem;color:var(--text-primary);margin-bottom:8px;">${c.agency_name}</h4>
            <div style="font-size:1.6rem;font-weight:900;color:var(--primary);margin:16px 0;">
              ${c.phone_number}
            </div>
          </div>
          <a href="tel:${c.phone_number}" class="btn btn-primary btn-sm w-100 mt-2">
            <i class="fa fa-phone me-2"></i> Call Hotline
          </a>
        </div>
      </div>
    `).join('');
  },

  // ── Shelter Finder Page ────────────────────────────────────────────────────
  async initShelterFinderPage() {
    const listContainer = document.getElementById('public-shelter-list');
    const searchInput = document.getElementById('shelter-search-input');
    const amenityFilter = document.getElementById('shelter-amenity-filter');
    if (!listContainer) return;

    try {
      listContainer.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Retrieving active emergency shelters...</p></div>`;
      const res = await publicApi.getShelters(true);
      const shelters = res.data || [];
      this.allShelters = shelters;

      this.initShelterMap(shelters);
      this.renderPublicShelters(shelters);

      const filterFn = () => {
        const q = searchInput?.value.toLowerCase() || '';
        const amenity = amenityFilter?.value || 'ALL';

        const filtered = this.allShelters.filter(s => {
          const matchesSearch = s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
          let matchesAmenity = true;
          if (amenity === 'medical') matchesAmenity = s.medical_available;
          if (amenity === 'food') matchesAmenity = s.food_available;
          if (amenity === 'water') matchesAmenity = s.water_available;
          return matchesSearch && matchesAmenity;
        });

        this.renderPublicShelters(filtered);
        this.updateShelterMapMarkers(filtered);
      };

      searchInput?.addEventListener('input', filterFn);
      amenityFilter?.addEventListener('change', filterFn);
    } catch (err) {
      listContainer.innerHTML = `<div class="alert alert-danger">Unable to fetch active shelters.</div>`;
    }
  },

  initShelterMap(shelters) {
    const mapEl = document.getElementById('public-shelters-map');
    if (!mapEl || typeof L === 'undefined') return;

    this.map = L.map('public-shelters-map').setView([19.0760, 72.8777], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.updateShelterMapMarkers(shelters);
  },

  updateShelterMapMarkers(shelters) {
    if (!this.markersGroup) return;
    this.markersGroup.clearLayers();

    shelters.forEach(s => {
      if (s.latitude && s.longitude) {
        const marker = L.marker([s.latitude, s.longitude]);
        const occPct = Math.round((s.current_occupancy / (s.total_capacity || 1)) * 100);
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;">
            <strong style="color:#0f172a;">${s.name}</strong><br/>
            <span style="font-size:0.8rem;color:#475569;">${s.address}</span><br/>
            <div style="margin-top:6px;">Occupancy: <b>${s.current_occupancy} / ${s.total_capacity} (${occPct}%)</b></div>
            <a href="tel:${s.contact_phone}" style="display:inline-block;margin-top:6px;font-size:0.8rem;color:#2563eb;text-decoration:none;">📞 ${s.contact_phone || 'N/A'}</a>
          </div>
        `);
        this.markersGroup.addLayer(marker);
      }
    });
  },

  renderPublicShelters(shelters) {
    const listContainer = document.getElementById('public-shelter-list');
    if (!listContainer) return;

    if (shelters.length === 0) {
      listContainer.innerHTML = `<div class="text-center py-4 text-muted"><p>No emergency shelters matching criteria.</p></div>`;
      return;
    }

    listContainer.innerHTML = shelters.map(s => {
      const pct = Math.min(100, Math.round((s.current_occupancy / (s.total_capacity || 1)) * 100));
      const badgeClass = pct > 90 ? 'bg-danger' : (pct > 70 ? 'bg-warning text-dark' : 'bg-success');
      return `
        <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:20px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <h5 style="font-weight:700;color:var(--text-primary);margin:0;">${s.name}</h5>
            <span class="badge ${badgeClass}">${pct}% Full</span>
          </div>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;"><i class="fa fa-map-marker-alt me-1"></i> ${s.address}</p>
          
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">
              <span>Capacity (${s.current_occupancy} / ${s.total_capacity})</span>
              <span>${pct}%</span>
            </div>
            <div class="progress" style="height:6px;background:rgba(255,255,255,0.05);">
              <div class="progress-bar ${pct > 90 ? 'bg-danger' : 'bg-primary'}" style="width:${pct}%;"></div>
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
            <div style="display:flex;gap:6px;">
              ${s.food_available ? '<span class="badge bg-secondary"><i class="fa fa-utensils me-1"></i> Food</span>' : ''}
              ${s.water_available ? '<span class="badge bg-secondary"><i class="fa fa-droplet me-1"></i> Water</span>' : ''}
              ${s.medical_available ? '<span class="badge bg-secondary"><i class="fa fa-kit-medical me-1"></i> Medical</span>' : ''}
            </div>
            ${s.contact_phone ? `<a href="tel:${s.contact_phone}" class="btn btn-outline-primary btn-sm"><i class="fa fa-phone me-1"></i> ${s.contact_phone}</a>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  // ── Contact Form ───────────────────────────────────────────────────────────
  initContactForm() {
    const form = document.getElementById('public-contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      const data = {
        first_name: form.querySelector('#contact-first-name')?.value.trim(),
        last_name: form.querySelector('#contact-last-name')?.value.trim(),
        email: form.querySelector('#contact-email')?.value.trim(),
        message: form.querySelector('#contact-message')?.value.trim(),
      };

      if (!data.first_name || !data.last_name || !data.email || !data.message) {
        notificationService.warning('Required Fields', 'Please fill in all fields before submitting.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Sending...`;

        await publicApi.submitContact(data);
        notificationService.success('Message Received', 'Thank you. Our emergency support team has received your message.');
        form.reset();
      } catch (err) {
        notificationService.error('Submission Error', err.response?.data?.message || 'Failed to submit contact message.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  },

  // ── Blockchain Donate Page ─────────────────────────────────────────────────
  initDonatePage() {
    const connectBtn = document.getElementById('connect-metamask-btn');
    const walletStatus = document.getElementById('wallet-status-badge');
    const donateForm = document.getElementById('donate-crypto-form');

    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        if (typeof window.ethereum !== 'undefined') {
          try {
            connectBtn.disabled = true;
            connectBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Connecting...`;
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
              const addr = accounts[0];
              const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
              notificationService.success('Wallet Connected', `Connected wallet: ${shortAddr}`);
              if (walletStatus) {
                walletStatus.className = 'badge bg-success';
                walletStatus.innerHTML = `<i class="fa fa-check-circle me-1"></i> Connected: ${shortAddr}`;
              }
              connectBtn.innerHTML = `<i class="fa fa-check-circle me-2"></i> ${shortAddr}`;
              connectBtn.className = 'btn btn-success btn-lg w-100 mb-3';
            }
          } catch (err) {
            notificationService.error('Wallet Error', 'Failed to connect MetaMask wallet.');
            connectBtn.disabled = false;
            connectBtn.innerHTML = `<i class="fa fa-wallet me-2"></i> Connect MetaMask`;
          }
        } else {
          notificationService.warning('MetaMask Not Found', 'Please install MetaMask extension to connect Web3 wallet.');
        }
      });
    }

    if (donateForm) {
      donateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = document.getElementById('donation-amount')?.value;
        if (!amount || amount <= 0) {
          notificationService.warning('Invalid Amount', 'Please specify a valid ETH donation amount.');
          return;
        }
        notificationService.success('Transaction Initiated', `Smart contract call prepared for ${amount} ETH. Awaiting block confirmation.`);
        donateForm.reset();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  publicPagesHandler.init();
});
