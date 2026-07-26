export class ChartController {
  static renderSeverityPie(canvasId, severityData = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [
            severityData.CRITICAL || 0,
            severityData.HIGH || 0,
            severityData.MEDIUM || 0,
            severityData.LOW || 0
          ],
          backgroundColor: ['#ff0038', '#ff6b00', '#f59e0b', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8' } }
        }
      }
    });
  }

  static renderDailyTrendsBar(canvasId, trends = []) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = trends.map(t => t.day);
    const incidents = trends.map(t => t.incidents);
    const resolved = trends.map(t => t.resolved);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Reported',
            data: incidents,
            backgroundColor: '#e63946',
            borderRadius: 6
          },
          {
            label: 'Resolved',
            data: resolved,
            backgroundColor: '#10b981',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8' } }
        }
      }
    });
  }
}
