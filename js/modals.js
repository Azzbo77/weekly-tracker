// -- Modal wiring --
function setupModal(modalId, cancelBtnId, confirmHandler) {
  const m = document.getElementById(modalId);
  const c = document.getElementById(cancelBtnId);
  c.addEventListener('click', () => closeModal(modalId));
  if (confirmHandler) document.getElementById(cancelBtnId.replace('cancel','confirm')).addEventListener('click', confirmHandler);
  m.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(modalId); });
}

document.addEventListener('DOMContentLoaded', () => {
  setupModal('pdf-modal','pdf-cancel-btn', generatePdf);
  setupModal('help-modal','help-close-btn');
  setupModal('import-modal','import-cancel-btn');
  setupModal('json-modal','json-cancel-btn', exportData);
  document.getElementById('import-confirm-btn').addEventListener('click', doImport);
  document.getElementById('import-upload-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.click();
  });
  document.getElementById('import-file').addEventListener('change', handleImportFileSelect);
  document.querySelectorAll('input[name="pdf-range"]').forEach(r => r.addEventListener('change', onPdfRangeChange));
  document.querySelectorAll('input[name="json-range"]').forEach(r => r.addEventListener('change', onJsonRangeChange));

  document.addEventListener('click', e => {
    if (!e.target.closest('.mv-menu') && !e.target.closest('.dp-btn') && !e.target.closest('button.ntb-btn')) {
      closeAllOpenElements();
    }
  });
});

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  // Clear search state when the search modal is dismissed
  if (id === 'search-modal') {
    const inp = document.getElementById('global-search');
    if (inp) inp.value = '';
    const results = document.getElementById('search-results');
    if (results) results.innerHTML = '';
  }
}
function openHelp() { openModal('help-modal'); }
function openImport() { openModal('import-modal'); }

function handleImportFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const raw = typeof reader.result === 'string' ? reader.result : '';
    document.getElementById('import-ta').value = raw;
    showToast('File loaded. Click Import to apply it.', 'info', null, null, 3000);
  };
  reader.onerror = () => {
    showToast('Could not read that file. Please try another JSON file.', 'error');
  };
  reader.readAsText(file);
}

