export class ChartController {
  static getChartColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      labelColor: style.getPropertyValue('--chart-label').trim() || '#cbd5e1',
      axisColor: style.getPropertyValue('--chart-axis').trim() || '#94a3b8',
      gridColor: style.getPropertyValue('--chart-grid').trim() || 'rgba(255, 255, 255, 0.08)',
      critical: style.getPropertyValue('--severity-critical').trim() || '#ef4444',
      high: style.getPropertyValue('--severity-high').trim() || '#f97316',
      medium: style.getPropertyValue('--severity-medium').trim() || '#eab308',
      low: style.getPropertyValue('--severity-low').trim() || '#22c55e',
      primary: style.getPropertyValue('--primary').trim() || '#06b6d4',
      success: style.getPropertyValue('--success').trim() || '#22c55e'
    };
  }

  static renderSeverityPie(canvasId, severityData = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const colors = this.getChartColors();

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
          backgroundColor: [colors.critical, colors.high, colors.medium, colors.low],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: colors.labelColor } }
        }
      }
    });
  }

  static renderDailyTrendsBar(canvasId, trends = []) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const colors = this.getChartColors();
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
            backgroundColor: colors.primary,
            borderRadius: 6
          },
          {
            label: 'Resolved',
            data: resolved,
            backgroundColor: colors.success,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: colors.labelColor }, grid: { display: false } },
          y: { ticks: { color: colors.labelColor }, grid: { color: colors.gridColor } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: colors.labelColor } }
        }
      }
    });
  }
}
