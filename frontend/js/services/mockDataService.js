/**
 * MockDataService — Centralized mock data provider for the AI Command Center.
 *
 * Every public method returns a Promise (matching real API contracts).
 * Replace each method body with actual API calls when backend is ready.
 */

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function timeAgo(minutesAgo) {
  const d = new Date(Date.now() - minutesAgo * 60000);
  return d.toISOString();
}

const DISTRICTS = [
  'Andheri West', 'Bandra East', 'Dharavi', 'Kurla', 'Dadar',
  'Worli', 'Colaba', 'Borivali', 'Malad', 'Goregaon',
  'Thane', 'Navi Mumbai', 'Chembur', 'Powai', 'Vikhroli'
];

const DISASTER_TYPES = ['Flood', 'Fire', 'Earthquake', 'Landslide', 'Cyclone', 'Medical Emergency'];

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const STATUSES = ['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'];

const NAMES = [
  'Rajesh Kumar', 'Priya Sharma', 'Anil Mehta', 'Sunita Patil',
  'Vikram Singh', 'Meera Desai', 'Suresh Nair', 'Deepa Joshi',
  'Rohan Gupta', 'Anita Reddy', 'Manoj Tiwari', 'Kavita Rao'
];

const TEAM_NAMES = [
  'Alpha Squad', 'Bravo Unit', 'Delta Force', 'Echo Team',
  'Foxtrot Unit', 'Golf Squad', 'Sierra Team', 'Tango Unit'
];

const VEHICLE_TYPES = ['Ambulance', 'Boat', 'Fire Truck', 'Helicopter', 'Rescue Van', 'Police Vehicle'];

export const mockDataService = {

  async getDashboardStats() {
    const totalIncidents = rand(42, 78);
    const todayIncidents = rand(5, 18);
    const weeklyChange = randomFloat(-15, 25, 1);
    const weeklyTrend = Array.from({ length: 7 }, () => rand(3, 16));

    const activeMissions = rand(4, 12);
    const avgResponseTime = rand(8, 28);
    const successRate = randomFloat(85, 98, 1);

    const totalShelters = rand(12, 20);
    const activeShelters = rand(8, totalShelters);
    const avgOccupancy = randomFloat(45, 88, 1);

    const resources = {
      ambulances: { total: 24, available: rand(8, 18) },
      boats: { total: 16, available: rand(4, 12) },
      medicalTeams: { total: 20, available: rand(6, 16) },
      fireTrucks: { total: 18, available: rand(5, 14) },
      helicopters: { total: 6, available: rand(1, 5) },
    };

    return {
      incidents: {
        total: totalIncidents,
        today: todayIncidents,
        weeklyChange,
        trend: weeklyTrend,
      },
      missions: {
        active: activeMissions,
        avgResponseTime,
        successRate,
      },
      shelters: {
        total: totalShelters,
        active: activeShelters,
        avgOccupancy,
      },
      resources,
    };
  },

  async getAICommandData() {
    const riskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const riskLevel = pick(riskLevels.slice(0, 3));
    const confidence = randomFloat(72, 97, 1);
    const predictedSeverity = pick(['Catastrophic', 'Severe', 'Moderate', 'Minor']);
    const disasterContext = pick([
      'Heavy rainfall causing flash floods in low-lying areas',
      'Structural fire spreading in densely populated area',
      'Seismic activity detected with potential aftershocks',
      'Cyclonic weather system approaching coastal districts',
      'Landslide risk due to soil saturation in hilly terrain',
    ]);

    return {
      currentSituation: disasterContext,
      riskLevel,
      confidence,
      predictedSeverity,
      recommendedResponse: pick([
        'Deploy all available flood rescue boats and medical teams immediately',
        'Evacuate affected zone within 2km radius and establish triage centers',
        'Activate emergency shelters and deploy search-and-rescue teams',
        'Issue coastal evacuation alert and mobilize cyclone relief resources',
        'Deploy geological survey team and evacuate hillside settlements',
      ]),
      requiredResources: {
        ambulances: rand(3, 8),
        boats: rand(2, 6),
        medicalTeams: rand(2, 5),
        fireTrucks: rand(1, 4),
        helicopters: rand(0, 2),
      },
      estimatedRescueTime: `${rand(25, 90)} minutes`,
      nearestShelter: {
        name: pick(['Andheri Relief Center', 'Bandra Community Hall', 'Dharavi Shelter Block A', 'Kurla Sports Complex']),
        distance: `${randomFloat(0.5, 4.5, 1)} km`,
        availableBeds: rand(20, 150),
      },
      blockedRoads: rand(1, 6),
      alternativeRouteAvailable: Math.random() > 0.3,
      reasoning: pick([
        'Based on rainfall intensity exceeding 120mm/hr in last 2 hours, historical flood data shows 89% probability of waterlogging in this region. AI model cross-referenced soil saturation levels and drainage capacity.',
        'Thermal imaging data indicates fire spread trajectory towards residential blocks. Wind speed and direction analysis suggests 76% chance of escalation within 45 minutes.',
        'Seismic sensors detected 4.2 magnitude tremor. Historical aftershock patterns indicate 68% probability of secondary event within 6 hours. Building vulnerability assessment shows 12 structures at risk.',
        'Satellite imagery and weather models predict cyclonic system making landfall within 8 hours. Storm surge modeling indicates coastal flooding risk for 3 districts.',
      ]),
      lastAnalysisTime: new Date(Date.now() - rand(30, 300) * 1000).toISOString(),
    };
  },

  async getPriorityQueue() {
    const count = rand(6, 12);
    return Array.from({ length: count }, (_, i) => ({
      id: rand(1000, 9999),
      title: pick([
        'Residents trapped in flooded building',
        'Gas leak near residential area',
        'Building structural collapse',
        'Road accident with multiple injuries',
        'Fire in commercial complex',
        'Stranded residents on rooftop',
        'Medical emergency — cardiac arrest',
        'Bridge collapse blocking highway',
        'Electrocution hazard from downed powerlines',
        'Landslide blocking village access road',
      ]),
      location: pick(DISTRICTS),
      severity: SEVERITIES[Math.min(i, 3)],
      disasterType: pick(DISASTER_TYPES),
      time: timeAgo(rand(5, 180)),
      reporter: pick(NAMES),
      assignedTeam: i < 4 ? pick(TEAM_NAMES) : null,
      responseEta: i < 4 ? `${rand(5, 35)} min` : null,
      requiredResources: [pick(VEHICLE_TYPES), pick(VEHICLE_TYPES)].filter((v, idx, a) => a.indexOf(v) === idx),
      status: pick(STATUSES),
      aiPriority: i + 1,
      latitude: randomFloat(18.95, 19.25, 4),
      longitude: randomFloat(72.78, 72.98, 4),
    }));
  },

  async getResourceUtilization() {
    const types = [
      { name: 'Ambulances', icon: 'fa-ambulance', total: 24 },
      { name: 'Medical Teams', icon: 'fa-user-md', total: 20 },
      { name: 'Boats', icon: 'fa-ship', total: 16 },
      { name: 'Fire Trucks', icon: 'fa-fire-extinguisher', total: 18 },
      { name: 'Police Units', icon: 'fa-shield-alt', total: 22 },
      { name: 'Helicopters', icon: 'fa-helicopter', total: 6 },
    ];

    return types.map(t => {
      const busy = rand(2, Math.floor(t.total * 0.6));
      const maintenance = rand(0, Math.floor(t.total * 0.15));
      const available = Math.max(0, t.total - busy - maintenance);
      return { ...t, available, busy, maintenance };
    });
  },

  async getShelterOccupancy() {
    const shelters = [
      'Andheri Relief Center', 'Bandra Community Hall', 'Dharavi Shelter Block A',
      'Kurla Sports Complex', 'Worli Emergency Camp', 'Colaba Civic Center',
    ];

    return shelters.map(name => {
      const capacity = rand(100, 400);
      const occupied = rand(20, capacity);
      const available = capacity - occupied;
      const pct = Math.round((occupied / capacity) * 100);
      return {
        name,
        capacity,
        occupied,
        availableBeds: available,
        occupancyPercent: pct,
        medicalStaff: rand(2, 12),
        foodAvailable: Math.random() > 0.2,
        waterAvailable: Math.random() > 0.15,
        powerStatus: pick(['Active', 'Generator', 'Outage']),
        internetStatus: pick(['Online', 'Limited', 'Offline']),
        overflowWarning: pct > 85,
      };
    });
  },

  async getCitizenFeed() {
    const count = rand(5, 10);
    return Array.from({ length: count }, () => ({
      id: rand(10000, 99999),
      reporter: pick(NAMES),
      location: pick(DISTRICTS),
      time: timeAgo(rand(1, 120)),
      description: pick([
        'Water entering ground floor rapidly',
        'Smoke visible from 3rd floor window',
        'Road completely submerged, vehicles stuck',
        'Elderly person needs medical evacuation',
        'Building tilting dangerously after tremor',
        'Power lines fallen across main road',
        'Multiple families stranded on terrace',
        'Fire hydrant burst flooding intersection',
      ]),
      severity: pick(SEVERITIES),
      status: pick(['Pending', 'Verified', 'Dispatched', 'Resolved']),
      verificationStatus: pick(['Verified', 'Unverified', 'AI Verified']),
      aiSpamScore: randomFloat(0, 15, 1),
      hasPhoto: Math.random() > 0.4,
    }));
  },

  async getActiveMissions() {
    const count = rand(3, 6);
    return Array.from({ length: count }, (_, i) => ({
      id: `MSN-${rand(100, 999)}`,
      name: pick([
        'Flood Rescue Op — Dharavi Sector 4',
        'Fire Containment — Andheri Industrial',
        'Medical Evacuation — Bandra Coast',
        'Search & Rescue — Kurla Collapse',
        'Cyclone Relief — Colaba Waterfront',
        'Landslide Clearance — Borivali Hills',
      ]),
      commander: pick(NAMES),
      teamMembers: rand(4, 12),
      vehicles: [pick(VEHICLE_TYPES), pick(VEHICLE_TYPES)].filter((v, idx, a) => a.indexOf(v) === idx),
      eta: `${rand(5, 45)} min`,
      distanceRemaining: `${randomFloat(0.3, 8, 1)} km`,
      progress: rand(15, 95),
      status: pick(['En Route', 'On Site', 'Extracting', 'Returning']),
      startTime: timeAgo(rand(15, 180)),
    }));
  },

  async getAIForecast() {
    return {
      timeframe: '1 Hour',
      predictions: [
        { name: 'Flood Spread', probability: randomFloat(20, 85, 1), trend: pick(['rising', 'stable', 'falling']) },
        { name: 'Fire Spread', probability: randomFloat(5, 60, 1), trend: pick(['rising', 'stable', 'falling']) },
        { name: 'Road Blockage', probability: randomFloat(15, 70, 1), trend: pick(['rising', 'stable', 'falling']) },
        { name: 'Landslide Risk', probability: randomFloat(10, 55, 1), trend: pick(['rising', 'stable', 'falling']) },
        { name: 'Cyclone Risk', probability: randomFloat(5, 40, 1), trend: pick(['rising', 'stable', 'falling']) },
        { name: 'Earthquake Aftershock', probability: randomFloat(3, 35, 1), trend: pick(['rising', 'stable', 'falling']) },
      ],
      overallConfidence: randomFloat(70, 95, 1),
      lastUpdated: new Date().toISOString(),
    };
  },

  async getWeatherData() {
    return {
      current: {
        temperature: randomFloat(24, 36, 1),
        humidity: rand(55, 95),
        windSpeed: randomFloat(5, 45, 1),
        windDirection: pick(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
        rainfall: randomFloat(0, 85, 1),
        visibility: randomFloat(1, 10, 1),
        condition: pick(['Heavy Rain', 'Thunderstorm', 'Overcast', 'Partly Cloudy', 'Clear']),
        icon: pick(['fa-cloud-showers-heavy', 'fa-bolt', 'fa-cloud', 'fa-cloud-sun', 'fa-sun']),
      },
      alerts: [
        { type: 'Flood Warning', active: Math.random() > 0.4, level: pick(['Watch', 'Warning', 'Emergency']) },
        { type: 'Cyclone Warning', active: Math.random() > 0.6, level: pick(['Watch', 'Warning']) },
        { type: 'Lightning Alert', active: Math.random() > 0.5, level: pick(['Advisory', 'Warning']) },
      ].filter(a => a.active),
      lastUpdated: new Date().toISOString(),
    };
  },

  async getNotificationsCenter() {
    const categories = {
      critical: Array.from({ length: rand(1, 3) }, () => ({
        id: rand(1, 999),
        title: pick(['CRITICAL: Multiple casualties reported', 'CRITICAL: Dam overflow imminent', 'CRITICAL: Gas pipeline rupture']),
        message: pick(['Immediate evacuation required in Sector 7', 'Deploy all available medical teams', 'Shut down gas supply to affected blocks']),
        time: timeAgo(rand(1, 30)),
        read: false,
      })),
      warning: Array.from({ length: rand(2, 5) }, () => ({
        id: rand(1, 999),
        title: pick(['Water level rising rapidly', 'Resource shortage detected', 'Shelter at 90% capacity', 'Communication blackout in zone']),
        message: pick(['Monitoring closely — may escalate', 'Request additional supplies from central depot', 'Prepare overflow arrangements', 'Deploying mobile communication unit']),
        time: timeAgo(rand(10, 120)),
        read: Math.random() > 0.5,
      })),
      info: Array.from({ length: rand(3, 6) }, () => ({
        id: rand(1, 999),
        title: pick(['Mission MSN-421 completed', 'New volunteer registered', 'Weather update received', 'Shelter occupancy updated', 'Resource restocked']),
        message: pick(['All victims evacuated safely', '15 new volunteers deployed to Sector 3', 'Rainfall expected to decrease by evening', 'Bandra shelter now at 65% capacity', 'Medical supplies replenished at central depot']),
        time: timeAgo(rand(30, 360)),
        read: Math.random() > 0.3,
      })),
    };

    const unreadCount = [...categories.critical, ...categories.warning, ...categories.info].filter(n => !n.read).length;
    return { categories, unreadCount };
  },

  async getActivityTimeline() {
    const events = [
      { type: 'incident_created', icon: 'fa-exclamation-circle', color: 'var(--danger)', title: 'Incident #4521 Created', user: pick(NAMES), description: 'Flash flood reported in Dharavi Sector 4 — 12 residents trapped', time: timeAgo(rand(5, 15)) },
      { type: 'ai_analysis', icon: 'fa-robot', color: 'var(--info)', title: 'AI Analysis Complete', user: 'ResQAI Engine', description: 'Severity assessed as HIGH (confidence 91%). Recommended 3 boats + 2 medical teams.', time: timeAgo(rand(15, 25)) },
      { type: 'resource_assigned', icon: 'fa-truck', color: 'var(--warning)', title: 'Resources Dispatched', user: pick(NAMES), description: 'Alpha Squad dispatched with 2 rescue boats and emergency medical kit', time: timeAgo(rand(25, 40)) },
      { type: 'rescue_started', icon: 'fa-life-ring', color: 'var(--primary)', title: 'Rescue Operation Started', user: pick(NAMES), description: 'Team on site. Beginning extraction of trapped residents from Building C.', time: timeAgo(rand(40, 60)) },
      { type: 'victims_rescued', icon: 'fa-hands-helping', color: 'var(--success)', title: '8 Victims Rescued', user: pick(NAMES), description: '8 of 12 residents evacuated to Andheri Relief Center. 4 remaining.', time: timeAgo(rand(60, 90)) },
      { type: 'mission_completed', icon: 'fa-check-circle', color: 'var(--success)', title: 'Mission MSN-387 Completed', user: pick(NAMES), description: 'All 12 residents safely evacuated. No casualties. Shelter intake complete.', time: timeAgo(rand(90, 150)) },
    ];
    return events;
  },

  async getAIInsights() {
    return {
      topRiskDistrict: pick(DISTRICTS),
      mostCommonDisaster: pick(['Flood', 'Fire', 'Building Collapse']),
      highestResourceConsumption: pick(['Ambulances', 'Boats', 'Medical Teams']),
      avgResponseTime: `${rand(12, 28)} min`,
      predictedHighRiskArea: pick(DISTRICTS),
      resourceShortageAlert: pick(['Boats running low (3 remaining)', 'Medical kits below threshold', 'Helicopter fuel reserves at 30%', 'None — all resources adequate']),
      populationAtRisk: `${rand(1200, 8500).toLocaleString()}`,
      suggestedPreventiveAction: pick([
        'Pre-position boats in flood-prone Sectors 3–7 before next rainfall',
        'Reinforce embankments along Mithi River before monsoon peak',
        'Conduct evacuation drill in high-density zones within 48 hours',
        'Stockpile medical supplies at all active shelters',
        'Deploy early warning sirens in coastal districts',
      ]),
    };
  },

  async getSystemStatus() {
    const statusVal = () => pick(['operational', 'degraded', 'down']);
    return {
      services: [
        { name: 'Backend API', status: 'operational', latency: `${rand(12, 85)}ms` },
        { name: 'AI Engine', status: statusVal(), latency: `${rand(50, 250)}ms` },
        { name: 'Firebase', status: 'operational', latency: `${rand(20, 100)}ms` },
        { name: 'WebSocket', status: statusVal(), latency: `${rand(5, 40)}ms` },
        { name: 'Notification Service', status: 'operational', latency: `${rand(15, 60)}ms` },
        { name: 'Storage', status: 'operational', latency: `${rand(10, 50)}ms` },
        { name: 'Database', status: 'operational', latency: `${rand(8, 45)}ms` },
      ],
      metrics: {
        apiLatency: `${rand(15, 80)}ms`,
        serverUptime: `${rand(95, 100)}%`,
        memoryUsage: `${rand(35, 75)}%`,
        cpuUsage: `${rand(10, 55)}%`,
      },
    };
  },
};
