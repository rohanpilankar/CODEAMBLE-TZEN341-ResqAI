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
        <h3 style="font-size: 1.2rem; margin: 0; font-weight: 700;">${title}</h3>
        <button class="modal-close" onclick="closeModal('${id}')" title="Close">&times;</button>
      </div>
      <div class="modal-body">
        ${contentHtml}
      </div>
    </div>
  `;

  // Close when clicking overlay backdrop
  modalEl.onclick = (e) => {
    if (e.target === modalEl) {
      closeModal(id);
    }
  };

  setTimeout(() => modalEl.classList.add('active'), 10);
}

export function closeModal(id) {
  const modalEl = document.getElementById(id);
  if (modalEl) {
    modalEl.classList.remove('active');
  }
}

// Attach globally to window to handle inline onclick attributes in dynamic templates
if (typeof window !== 'undefined') {
  window.openModal = openModal;
  window.closeModal = closeModal;

  // ESC key listener to close active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) {
        closeModal(activeModal.id);
      }
    }
  });
}

