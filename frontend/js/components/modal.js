export function openModal(id, title, contentHtml) {
  let modalEl = document.getElementById(id);
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = id;
    modalEl.className = 'modal-overlay';
    document.body.appendChild(modalEl);
  }

  modalEl.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 style="font-size: 1.2rem; margin: 0;">${title}</h3>
        <button class="modal-close" onclick="document.getElementById('${id}').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        ${contentHtml}
      </div>
    </div>
  `;

  setTimeout(() => modalEl.classList.add('active'), 10);
}

export function closeModal(id) {
  const modalEl = document.getElementById(id);
  if (modalEl) {
    modalEl.classList.remove('active');
  }
}
