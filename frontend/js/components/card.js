export function renderStatCard(title, value, icon, colorClass, subtitle = '') {
  return `
    <div class="stat-card">
      <div class="stat-icon ${colorClass}">
        <i class="fa ${icon}"></i>
      </div>
      <div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${title}</div>
        ${subtitle ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${subtitle}</div>` : ''}
      </div>
    </div>
  `;
}

export function renderIncidentCard(incident) {
  const severityClass = incident.severity.toLowerCase();
  return `
    <div class="incident-card ${severityClass}" data-id="${incident.id}">
      <div class="severity-bar"></div>
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h4 style="font-size: 1rem; margin-bottom: 0;">${incident.title}</h4>
        <span class="badge badge-${severityClass}">${incident.severity}</span>
      </div>
      <p style="font-size: 0.84rem; margin-bottom: 10px;" class="text-truncate-2">${incident.description}</p>
      <div class="d-flex justify-content-between align-items-center font-size-sm color-muted">
        <span><i class="fa fa-map-marker-alt"></i> ${incident.disaster_type} &bull; ${incident.address || 'Unknown Address'}</span>
        <span class="badge badge-${incident.status.toLowerCase()}">${incident.status}</span>
      </div>
    </div>
  `;
}
