import os

base_dir = os.path.dirname(os.path.abspath(__file__))

NAVBAR = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/buttons.css">
  <link rel="stylesheet" href="css/cards.css">
  <link rel="stylesheet" href="css/animations.css">
  <link rel="stylesheet" href="css/public.css">
  {extra_css}
</head>
<body>

  <!-- ── Navigation ───────────────────────────────────────────────────────── -->
  <nav class="pub-nav">
    <a href="index.html" class="pub-nav-brand">
      <div class="brand-icon"><i class="fa fa-shield-alt"></i></div>
      <div class="brand-name">ResQ<span>AI</span></div>
    </a>
    
    <div class="pub-nav-links">
      <a href="index.html" class="pub-nav-link {nav_home}">Home</a>
      <a href="about.html" class="pub-nav-link {nav_about}">About</a>
      <a href="features.html" class="pub-nav-link {nav_features}">Features</a>
      <div class="pub-nav-dropdown">
        <a href="awareness.html" class="pub-nav-link {nav_awareness}">Awareness <i class="fa fa-chevron-down ms-1" style="font-size:0.7rem;"></i></a>
        <div class="pub-nav-dropdown-menu">
          <a href="awareness-flood.html"><span class="dd-icon"><i class="fa fa-water"></i></span> Flood Safety</a>
          <a href="awareness-fire.html"><span class="dd-icon"><i class="fa fa-fire"></i></span> Fire Safety</a>
          <a href="awareness-cyclone.html"><span class="dd-icon"><i class="fa fa-wind"></i></span> Cyclone Safety</a>
          <a href="awareness-earthquake.html"><span class="dd-icon"><i class="fa fa-house-crack"></i></span> Earthquake Safety</a>
          <a href="awareness-landslide.html"><span class="dd-icon"><i class="fa fa-mountain"></i></span> Landslide Safety</a>
        </div>
      </div>
      <a href="live-alerts.html" class="pub-nav-link {nav_alerts}">Live Alerts</a>
      <a href="contact.html" class="pub-nav-link {nav_contact}">Contact</a>
    </div>

    <div class="pub-nav-ctas">
      <a href="donate.html" class="btn btn-secondary btn-sm"><i class="fa fa-hand-holding-heart me-1"></i> Donate</a>
      <a href="login.html" class="btn btn-primary btn-sm"><i class="fa fa-sign-in-alt me-1"></i> Portal Login</a>
      <button class="pub-nav-hamburger" id="pub-mobile-btn">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <div class="pub-nav-mobile-menu" id="pub-mobile-menu">
    <a href="index.html">Home</a>
    <a href="about.html">About</a>
    <a href="features.html">Features</a>
    <a href="awareness.html">Awareness Center</a>
    <a href="live-alerts.html">Live Alerts</a>
    <a href="donate.html">Donate</a>
    <a href="contact.html">Contact</a>
  </div>
"""

FOOTER = """
  <!-- ── Footer ───────────────────────────────────────────────────────────── -->
  <footer class="pub-footer">
    <div class="pub-footer-grid">
      <div class="pub-footer-brand">
        <a href="index.html" class="pub-nav-brand">
          <div class="brand-icon"><i class="fa fa-shield-alt"></i></div>
          <div class="brand-name">ResQ<span>AI</span></div>
        </a>
        <p>A unified, AI-driven disaster response platform designed to save lives through rapid coordination and resource management.</p>
      </div>
      
      <div class="pub-footer-col">
        <h5>Platform</h5>
        <a href="features.html">Features</a>
        <a href="live-alerts.html">Live Alerts</a>
        <a href="shelter-finder.html">Shelter Finder</a>
        <a href="donate.html">Blockchain Donate</a>
      </div>

      <div class="pub-footer-col">
        <h5>Resources</h5>
        <a href="awareness.html">Awareness Center</a>
        <a href="news.html">News & Updates</a>
        <a href="emergency-contacts.html">Emergency Contacts</a>
        <a href="about.html">About Us</a>
      </div>

      <div class="pub-footer-col">
        <h5>Legal</h5>
        <a href="about.html">Privacy Policy</a>
        <a href="about.html">Terms of Service</a>
        <a href="about.html">Data Security</a>
        <a href="contact.html">Contact Support</a>
      </div>
    </div>

    <div class="pub-footer-bottom">
      <p>&copy; 2026 ResQAI. All rights reserved.</p>
      <div class="pub-footer-socials">
        <a href="https://twitter.com" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a>
        <a href="https://github.com" target="_blank" rel="noopener"><i class="fab fa-github"></i></a>
        <a href="https://linkedin.com" target="_blank" rel="noopener"><i class="fab fa-linkedin-in"></i></a>
      </div>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  <script type="module" src="js/publicPages.js"></script>
  <script>
    document.getElementById('pub-mobile-btn')?.addEventListener('click', () => {
      document.getElementById('pub-mobile-menu')?.classList.toggle('open');
    });
  </script>
</body>
</html>
"""

PAGES = {
    "about.html": {
        "title": "ResQAI — About Us",
        "nav_about": "active",
        "body": """
  <section class="pub-hero">
    <h1>About <span class="highlight">ResQAI</span></h1>
    <p>We are on a mission to modernize disaster response. By bridging the gap between citizens, governments, and rescue teams, we aim to eliminate communication silos during critical emergencies.</p>
  </section>

  <section class="pub-section" style="padding-top:0;">
    <div class="row g-5 align-items-center">
      <div class="col-md-6">
        <div style="width:100%;height:320px;border-radius:20px;background:linear-gradient(135deg,rgba(6,182,212,0.1),rgba(14,165,233,0.1));border:1px solid rgba(6,182,212,0.2);display:flex;align-items:center;justify-content:center;font-size:4rem;color:var(--primary);">
          <i class="fa fa-globe-asia"></i>
        </div>
      </div>
      <div class="col-md-6">
        <h2 style="font-size:2rem;font-weight:800;color:var(--text-primary);margin-bottom:20px;">Our Vision</h2>
        <p style="color:var(--text-muted);line-height:1.8;margin-bottom:20px;">
          When disaster strikes, every second counts. Historically, emergency response has been hindered by fragmented communication, duplicate reports, and inefficient resource allocation. 
        </p>
        <p style="color:var(--text-muted);line-height:1.8;">
          ResQAI was built to solve this. By integrating real-time incident reporting with AI-driven severity analysis and blockchain-verified NGO donations, we provide a single source of truth for all stakeholders.
        </p>
      </div>
    </div>
  </section>
"""
    },
    "features.html": {
        "title": "ResQAI — Features",
        "nav_features": "active",
        "body": """
  <section class="pub-hero">
    <h1>Platform <span class="highlight">Features</span></h1>
    <p>Explore the tools that power the next generation of emergency response and disaster management.</p>
  </section>

  <section class="pub-section" style="padding-top:0;">
    <div class="features-grid">
      <div class="feature-card">
        <div class="fc-icon"><i class="fa fa-map-location-dot"></i></div>
        <h3>Live GIS Mapping</h3>
        <p>Visualize all active incidents, deployed rescue teams, and available shelters on a dynamic, real-time map.</p>
      </div>
      <div class="feature-card">
        <div class="fc-icon"><i class="fa fa-robot"></i></div>
        <h3>AI Duplicate Detection</h3>
        <p>Our NLP model analyzes incoming SOS reports to merge duplicate complaints, preventing resource waste.</p>
      </div>
      <div class="feature-card">
        <div class="fc-icon"><i class="fa fa-boxes-packing"></i></div>
        <h3>Predictive Resource Allocation</h3>
        <p>Based on incident severity, the system automatically suggests the required number of ambulances, fire trucks, and medical kits.</p>
      </div>
      <div class="feature-card">
        <div class="fc-icon"><i class="fa fa-wifi"></i></div>
        <h3>Offline-First Mobile App</h3>
        <p>Rescue teams can download maps and mission data beforehand. The app syncs automatically when connection is restored.</p>
      </div>
      <div class="feature-card">
        <div class="fc-icon"><i class="fa fa-file-contract"></i></div>
        <h3>Smart Contract Donations</h3>
        <p>Eliminate fraud. All donations to NGOs are routed through verifiable blockchain smart contracts on the Ethereum network.</p>
      </div>
      <div class="feature-card">
        <div class="fc-icon"><i class="fa fa-bullhorn"></i></div>
        <h3>Geo-Fenced Alerts</h3>
        <p>Government authorities can push SMS and app notifications to citizens located strictly within a specific danger zone.</p>
      </div>
    </div>
  </section>
"""
    },
    "live-alerts.html": {
        "title": "ResQAI — Live Alerts",
        "nav_alerts": "active",
        "body": """
  <section class="pub-hero">
    <div class="hero-badge"><i class="fa fa-circle text-danger me-1"></i> Live feed active</div>
    <h1>Live <span class="highlight">Public Alerts</span></h1>
    <p>Real-time updates on active disaster zones, critical warnings, and emergency broadcast messages from government authorities.</p>
  </section>

  <section class="pub-section" style="padding-top:0;">
    <div id="public-live-alerts-container" style="max-width:800px;margin:0 auto;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:32px;">
    </div>
  </section>
"""
    },
    "contact.html": {
        "title": "ResQAI — Contact",
        "nav_contact": "active",
        "body": """
  <section class="pub-hero">
    <h1>Contact <span class="highlight">Us</span></h1>
    <p>Have questions about the platform, NGO registration, or API access? Our support team is ready to help.</p>
  </section>

  <section class="pub-section" style="padding-top:0;">
    <div class="contact-grid">
      <div class="contact-info-card">
        <h3 style="font-size:1.2rem;font-weight:800;color:var(--text-primary);margin-bottom:24px;">Get in touch</h3>
        
        <div class="contact-info-item">
          <div class="ci-icon"><i class="fa fa-envelope"></i></div>
          <div>
            <div class="ci-label">Email Support</div>
            <div class="ci-value">support@resqai.com</div>
          </div>
        </div>
        
        <div class="contact-info-item">
          <div class="ci-icon"><i class="fa fa-phone"></i></div>
          <div>
            <div class="ci-label">Partnerships</div>
            <div class="ci-value">+1 (555) 123-4567</div>
          </div>
        </div>
        
        <div class="contact-info-item">
          <div class="ci-icon"><i class="fa fa-building"></i></div>
          <div>
            <div class="ci-label">Headquarters</div>
            <div class="ci-value">101 Innovation Drive<br>Tech City, TC 90210</div>
          </div>
        </div>
      </div>

      <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:32px;">
        <form>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
            <div>
              <label style="display:block;font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">First Name</label>
              <input type="text" class="form-control" style="background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.1);color:#fff;" required>
            </div>
            <div>
              <label style="display:block;font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">Last Name</label>
              <input type="text" class="form-control" style="background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.1);color:#fff;" required>
            </div>
          </div>
          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">Email Address</label>
            <input type="email" class="form-control" style="background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.1);color:#fff;" required>
          </div>
          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">Message</label>
            <textarea class="form-control" rows="5" style="background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.1);color:#fff;" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary w-100 py-3"><i class="fa fa-paper-plane me-2"></i> Send Message</button>
        </form>
      </div>
    </div>
  </section>
"""
    },
    "awareness.html": {
        "title": "ResQAI — Awareness Center",
        "nav_awareness": "active",
        "body": """
  <section class="pub-hero">
    <h1>Disaster <span class="highlight">Awareness Center</span></h1>
    <p>Knowledge is your first line of defense. Learn how to prepare for, survive, and recover from various natural disasters.</p>
  </section>

  <section class="pub-section" style="padding-top:0;">
    <div class="features-grid">
      <a href="awareness-flood.html" class="feature-card disaster-flood" style="text-decoration:none;">
        <div class="fc-icon" style="background:var(--d-bg);color:var(--d-color);"><i class="fa fa-water"></i></div>
        <h3>Flood Safety</h3>
        <p>Learn how to evacuate, what an emergency kit should contain, and how to stay safe in rising waters.</p>
        <span style="display:inline-block;margin-top:16px;font-size:0.8rem;font-weight:600;color:var(--d-color);">Read Guide <i class="fa fa-arrow-right ms-1"></i></span>
      </a>
      
      <a href="awareness-fire.html" class="feature-card disaster-fire" style="text-decoration:none;">
        <div class="fc-icon" style="background:var(--d-bg);color:var(--d-color);"><i class="fa fa-fire"></i></div>
        <h3>Fire Safety</h3>
        <p>Wildfire and structural fire prevention, evacuation protocols, and smoke inhalation first aid.</p>
        <span style="display:inline-block;margin-top:16px;font-size:0.8rem;font-weight:600;color:var(--d-color);">Read Guide <i class="fa fa-arrow-right ms-1"></i></span>
      </a>
      
      <a href="awareness-cyclone.html" class="feature-card disaster-cyclone" style="text-decoration:none;">
        <div class="fc-icon" style="background:var(--d-bg);color:var(--d-color);"><i class="fa fa-wind"></i></div>
        <h3>Cyclone & Hurricane</h3>
        <p>Securing your home, interpreting warning signals, and surviving extreme wind conditions.</p>
        <span style="display:inline-block;margin-top:16px;font-size:0.8rem;font-weight:600;color:var(--d-color);">Read Guide <i class="fa fa-arrow-right ms-1"></i></span>
      </a>

      <a href="awareness-earthquake.html" class="feature-card disaster-earthquake" style="text-decoration:none;">
        <div class="fc-icon" style="background:var(--d-bg);color:var(--d-color);"><i class="fa fa-house-crack"></i></div>
        <h3>Earthquake Safety</h3>
        <p>Drop, cover, and hold on. Learn structural safety, aftershock protocols, and hazard mitigation.</p>
        <span style="display:inline-block;margin-top:16px;font-size:0.8rem;font-weight:600;color:var(--d-color);">Read Guide <i class="fa fa-arrow-right ms-1"></i></span>
      </a>

      <a href="awareness-landslide.html" class="feature-card disaster-landslide" style="text-decoration:none;">
        <div class="fc-icon" style="background:var(--d-bg);color:var(--d-color);"><i class="fa fa-mountain"></i></div>
        <h3>Landslide Safety</h3>
        <p>Recognizing early warning signs, evacuation routes, and post-landslide rescue guidelines.</p>
        <span style="display:inline-block;margin-top:16px;font-size:0.8rem;font-weight:600;color:var(--d-color);">Read Guide <i class="fa fa-arrow-right ms-1"></i></span>
      </a>
    </div>
  </section>
"""
    },
    "emergency-contacts.html": {
        "title": "ResQAI — Emergency Contacts",
        "body": """
  <section class="pub-hero">
    <h1>Emergency <span class="highlight">Contacts</span></h1>
    <p>Keep these numbers saved. In case of immediate life-threatening situations, call these hotlines directly.</p>
  </section>

  <section class="pub-section" style="padding-top:0;">
    <div class="stats-row" style="margin-bottom:40px;">
      <div class="stat-cell">
        <div class="stat-num" style="color:var(--danger);">112</div>
        <div class="stat-label">National Emergency</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num" style="color:var(--warning);">101</div>
        <div class="stat-label">Fire & Rescue</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num" style="color:var(--success);">108</div>
        <div class="stat-label">Ambulance Service</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num" style="color:var(--info);">100</div>
        <div class="stat-label">Police Control Room</div>
      </div>
    </div>
    
    <div style="text-align:center;">
      <p style="color:var(--text-muted);">For non-immediate platform assistance, please use the <a href="contact.html" style="color:var(--primary);">Contact page</a>.</p>
    </div>
  </section>
"""
    },
    "donate.html": {
        "title": "ResQAI — Donate via Blockchain",
        "body": """
  <section class="pub-hero">
    <h1>Transparent <span class="highlight">Blockchain Donations</span></h1>
    <p>Donate crypto directly to verified NGOs. Every transaction is transparent, immutable, and fully traceable on the Ethereum network.</p>
  </section>

  <section class="pub-section" style="padding-top:0;">
    <div style="max-width:600px;margin:0 auto;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:40px;text-align:center;">
      <div style="width:80px;height:80px;background:rgba(245,158,11,0.1);color:var(--warning);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin:0 auto 24px;">
        <i class="fab fa-ethereum"></i>
      </div>
      <h3 style="font-size:1.5rem;font-weight:800;color:var(--text-primary);margin-bottom:12px;">Connect Wallet</h3>
      <p style="color:var(--text-muted);margin-bottom:32px;">To donate to active campaigns, you need to connect your Web3 wallet (MetaMask, TrustWallet, etc.).</p>
      
      <button class="btn btn-primary btn-lg w-100 mb-3" style="background:#f6851b;border-color:#f6851b;color:#fff;">
        <i class="fa fa-wallet me-2"></i> Connect MetaMask
      </button>
      
      <div style="font-size:0.8rem;color:var(--text-muted);">
        <i class="fa fa-shield-alt me-1"></i> Secure Smart Contract via ResQAI Protocol
      </div>
    </div>
  </section>
"""
    },
    "shelter-finder.html": {
        "title": "ResQAI — Shelter Finder",
        "body": """
  <section class="pub-hero">
    <h1>Find <span class="highlight">Nearby Shelters</span></h1>
    <p>Locate active government and NGO emergency shelters in your area. Check real-time capacity and available amenities.</p>
  </section>

  <section class="pub-section" style="padding-top:0;">
    <div style="max-width:800px;margin:0 auto;text-align:center;">
      <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:60px 20px;">
        <div style="font-size:3rem;color:var(--primary);margin-bottom:20px;"><i class="fa fa-map-marked-alt"></i></div>
        <h3 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin-bottom:12px;">Requires Location Access</h3>
        <p style="color:var(--text-muted);margin-bottom:24px;">Please sign in to the Citizen Portal to grant location access and view shelters on the interactive map.</p>
        <a href="login.html" class="btn btn-primary"><i class="fa fa-sign-in-alt me-2"></i> Open Citizen Portal</a>
      </div>
    </div>
  </section>
"""
    },
    "news.html": {
        "title": "ResQAI — News & Updates",
        "body": """
  <section class="pub-hero">
    <h1>Platform <span class="highlight">News</span></h1>
    <p>The latest updates, release notes, and success stories from the ResQAI platform.</p>
  </section>
  <section class="pub-section" style="padding-top:0;">
    <div style="max-width:800px;margin:0 auto;">
      <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:32px;margin-bottom:24px;">
        <div style="font-size:0.8rem;color:var(--primary);font-weight:700;margin-bottom:8px;">August 2, 2026</div>
        <h3 style="font-size:1.4rem;font-weight:800;color:var(--text-primary);margin-bottom:12px;">ResQAI v2.0 Released: Blockchain Donations are Live!</h3>
        <p style="color:var(--text-muted);line-height:1.7;">We are thrilled to announce that our new smart-contract based donation system is now live on the mainnet. Citizens can now donate directly to verified NGOs with full on-chain transparency, ensuring funds reach the right places without intermediaries.</p>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:32px;">
        <div style="font-size:0.8rem;color:var(--primary);font-weight:700;margin-bottom:8px;">July 15, 2026</div>
        <h3 style="font-size:1.4rem;font-weight:800;color:var(--text-primary);margin-bottom:12px;">AI Duplicate Detection Accuracy Reaches 98%</h3>
        <p style="color:var(--text-muted);line-height:1.7;">Our NLP models have been updated to better process multi-lingual text and voice inputs. In the latest drill, the system successfully merged 1,400 duplicate incident reports down to 43 unique events in under 2 seconds, massively reducing operator fatigue.</p>
      </div>
    </div>
  </section>
"""
    },
    "awareness-flood.html": {
        "title": "ResQAI — Flood Safety",
        "nav_awareness": "active",
        "body": """
  <section class="pub-hero">
    <div class="hero-badge" style="color:#38bdf8;border-color:rgba(56,189,248,0.3);background:rgba(56,189,248,0.1);"><i class="fa fa-water"></i> Flood Safety</div>
    <h1>Surviving <span style="color:#38bdf8;">Floods</span></h1>
    <p>Learn how to evacuate, what an emergency kit should contain, and how to stay safe in rising waters.</p>
  </section>
  <section class="pub-section" style="padding-top:0;">
    <div style="max-width:800px;margin:0 auto;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:40px;">
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">Before a Flood</h3>
      <ul style="color:var(--text-muted);margin-bottom:32px;line-height:1.7;">
        <li>Build an emergency kit and make a family communications plan.</li>
        <li>Elevate the furnace, water heater, and electric panel in your home if you live in an area that has a high flood risk.</li>
        <li>Consider installing "check valves" to prevent flood water from backing up into the drains of your home.</li>
      </ul>
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">During a Flood</h3>
      <ul style="color:var(--text-muted);line-height:1.7;">
        <li>Listen to the radio or television for information.</li>
        <li>If there is any possibility of a flash flood, move immediately to higher ground. Do not wait for instructions to move.</li>
        <li>Be aware of streams, drainage channels, canyons, and other areas known to flood suddenly.</li>
        <li>Do not walk through moving water. Six inches of moving water can make you fall.</li>
      </ul>
    </div>
  </section>
"""
    },
    "awareness-fire.html": {
        "title": "ResQAI — Fire Safety",
        "nav_awareness": "active",
        "body": """
  <section class="pub-hero">
    <div class="hero-badge" style="color:#fb923c;border-color:rgba(251,146,60,0.3);background:rgba(251,146,60,0.1);"><i class="fa fa-fire"></i> Fire Safety</div>
    <h1>Surviving <span style="color:#fb923c;">Fires</span></h1>
    <p>Wildfire and structural fire prevention, evacuation protocols, and smoke inhalation first aid.</p>
  </section>
  <section class="pub-section" style="padding-top:0;">
    <div style="max-width:800px;margin:0 auto;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:40px;">
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">Prevention & Preparation</h3>
      <ul style="color:var(--text-muted);margin-bottom:32px;line-height:1.7;">
        <li>Install smoke alarms on every level of your home, inside bedrooms, and outside sleeping areas.</li>
        <li>Test smoke alarms every month. If they're not working, change the batteries.</li>
        <li>Create and practice a fire escape plan with your family.</li>
      </ul>
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">During a Fire</h3>
      <ul style="color:var(--text-muted);line-height:1.7;">
        <li>Get out, stay out, and call 101 or your local emergency number.</li>
        <li>Yell "Fire!" several times and go outside right away.</li>
        <li>If your clothes catch fire, stop, drop, and roll.</li>
        <li>If there is smoke, get low and go under the smoke to your exit.</li>
      </ul>
    </div>
  </section>
"""
    },
    "awareness-cyclone.html": {
        "title": "ResQAI — Cyclone Safety",
        "nav_awareness": "active",
        "body": """
  <section class="pub-hero">
    <div class="hero-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.1);"><i class="fa fa-wind"></i> Cyclone Safety</div>
    <h1>Surviving <span style="color:#a78bfa;">Cyclones</span></h1>
    <p>Securing your home, interpreting warning signals, and surviving extreme wind conditions.</p>
  </section>
  <section class="pub-section" style="padding-top:0;">
    <div style="max-width:800px;margin:0 auto;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:40px;">
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">Before a Cyclone</h3>
      <ul style="color:var(--text-muted);margin-bottom:32px;line-height:1.7;">
        <li>Check your house roof and repair it if necessary.</li>
        <li>Keep a first aid kit, flashlights, and extra batteries ready.</li>
        <li>Store dry food, drinking water, and essential medicines.</li>
        <li>Trim tree branches and secure loose items outside.</li>
      </ul>
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">During a Cyclone</h3>
      <ul style="color:var(--text-muted);line-height:1.7;">
        <li>Stay indoors and take shelter in the strongest part of your house.</li>
        <li>Turn off all electrical appliances and the main gas valve.</li>
        <li>Listen to battery-operated radio for official updates.</li>
        <li>Do not go outside until the "all clear" signal is given by authorities.</li>
      </ul>
    </div>
  </section>
"""
    },
    "awareness-earthquake.html": {
        "title": "ResQAI — Earthquake Safety",
        "nav_awareness": "active",
        "body": """
  <section class="pub-hero">
    <div class="hero-badge" style="color:#f87171;border-color:rgba(248,113,113,0.3);background:rgba(248,113,113,0.1);"><i class="fa fa-house-crack"></i> Earthquake Safety</div>
    <h1>Surviving <span style="color:#f87171;">Earthquakes</span></h1>
    <p>Drop, cover, and hold on. Learn structural safety, aftershock protocols, and hazard mitigation.</p>
  </section>
  <section class="pub-section" style="padding-top:0;">
    <div style="max-width:800px;margin:0 auto;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:40px;">
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">During an Earthquake</h3>
      <ul style="color:var(--text-muted);margin-bottom:32px;line-height:1.7;">
        <li><strong>DROP</strong> to your hands and knees.</li>
        <li><strong>COVER</strong> your head and neck with your arms. If a sturdy table or desk is nearby, crawl underneath it for shelter.</li>
        <li><strong>HOLD ON</strong> to your shelter until the shaking stops.</li>
        <li>If you are outside, stay outside. Move away from buildings, streetlights, and utility wires.</li>
      </ul>
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">After an Earthquake</h3>
      <ul style="color:var(--text-muted);line-height:1.7;">
        <li>Expect aftershocks. Be ready to Drop, Cover, and Hold On if you feel an aftershock.</li>
        <li>Check yourself for injuries and get first aid if necessary before helping injured or trapped persons.</li>
        <li>Look for and extinguish small fires. Fire is the most common hazard after an earthquake.</li>
      </ul>
    </div>
  </section>
"""
    },
    "awareness-landslide.html": {
        "title": "ResQAI — Landslide Safety",
        "nav_awareness": "active",
        "body": """
  <section class="pub-hero">
    <div class="hero-badge" style="color:#86efac;border-color:rgba(134,239,172,0.3);background:rgba(134,239,172,0.1);"><i class="fa fa-mountain"></i> Landslide Safety</div>
    <h1>Surviving <span style="color:#86efac;">Landslides</span></h1>
    <p>Recognizing early warning signs, evacuation routes, and post-landslide rescue guidelines.</p>
  </section>
  <section class="pub-section" style="padding-top:0;">
    <div style="max-width:800px;margin:0 auto;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:40px;">
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">Before a Landslide</h3>
      <ul style="color:var(--text-muted);margin-bottom:32px;line-height:1.7;">
        <li>Find out if you live in a landslide-prone area. Look for patterns of storm-water drainage on slopes near your home.</li>
        <li>Listen for unusual sounds that might indicate moving debris, such as trees cracking or boulders knocking together.</li>
        <li>If you are in areas susceptible to landslides and debris flows, consider leaving if it is safe to do so.</li>
      </ul>
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;">During and After a Landslide</h3>
      <ul style="color:var(--text-muted);line-height:1.7;">
        <li>Move away from the path of a landslide or debris flow as quickly as possible.</li>
        <li>If escape is not possible, curl into a tight ball and protect your head.</li>
        <li>Stay away from the slide area. There may be danger of additional slides.</li>
        <li>Watch for flooding, which may occur after a landslide or debris flow.</li>
      </ul>
    </div>
  </section>
"""
    }
}

def generate_pages():
    for filename, data in PAGES.items():
        # Setup defaults
        ctx = {
            "title": data.get("title", "ResQAI"),
            "nav_home": "",
            "nav_about": "",
            "nav_features": "",
            "nav_awareness": "",
            "nav_alerts": "",
            "nav_contact": "",
            "extra_css": data.get("extra_css", "")
        }
        
        # Override active states
        for k in ctx.keys():
            if k in data:
                ctx[k] = data[k]
                
        html = NAVBAR.format(**ctx) + data["body"] + FOOTER
        
        filepath = os.path.join(base_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Generated {filename}")

if __name__ == "__main__":
    generate_pages()
