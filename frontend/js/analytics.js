import { analyticsApi } from './api/analyticsApi.js';
import { ChartController } from './charts.js';

export const analyticsHandler = {
  async renderAnalyticsDashboard(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await analyticsApi.getOverview();
      const data = res.data || res;

      el.innerHTML = `
        <div class="row mb-4">
          <div class="col-md-6 mb-4">
            <div class="card h-100">
              <h4><i class="fa fa-chart-pie text-danger me-2"></i> Incidents by Severity</h4>
              <div style="height: 260px; position: relative; margin-top: 16px;">
                <canvas id="chart-severity-pie"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6 mb-4">
            <div class="card h-100">
              <h4><i class="fa fa-chart-bar text-success me-2"></i> Weekly Incident & Resolution Trends</h4>
              <div style="height: 260px; position: relative; margin-top: 16px;">
                <canvas id="chart-trends-bar"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;

      setTimeout(() => {
        ChartController.renderSeverityPie('chart-severity-pie', data.incidents_by_severity);
        ChartController.renderDailyTrendsBar('chart-trends-bar', data.daily_report_trends);
      }, 50);

    } catch (err) {
      el.innerHTML = `<div class="alert-banner alert-danger">Error loading analytics: ${err.message}</div>`;
    }
  }
};
