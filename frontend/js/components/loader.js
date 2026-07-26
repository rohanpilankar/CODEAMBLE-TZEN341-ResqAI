export function renderSpinner() {
  return `<div class="d-flex justify-content-center p-5"><div class="spinner"></div></div>`;
}

export function renderSkeletonRows(count = 5) {
  return Array(count).fill(0).map(() => `
    <tr>
      <td colspan="5"><div class="skeleton" style="height: 20px; width: 100%;"></div></td>
    </tr>
  `).join('');
}
