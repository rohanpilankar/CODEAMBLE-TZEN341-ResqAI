export function renderFooter() {
  return `
    <footer style="padding: 20px 28px; border-top: 1px solid var(--glass-border); font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
      <div>&copy; 2026 ResQAI Disaster Response Platform. All rights reserved.</div>
      <div class="d-flex gap-3">
        <a href="about.html" style="color: var(--text-muted);">Privacy Policy</a>
        <a href="about.html" style="color: var(--text-muted);">Terms of Emergency Service</a>
        <a href="live-alerts.html" style="color: var(--text-muted);">API Status</a>
      </div>
    </footer>
  `;
}
