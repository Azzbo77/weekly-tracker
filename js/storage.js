function save() {
  try {
    const toSave = {};
    Object.keys(weeks).forEach(k => {
      const w = weeks[k];
      if (w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length > 0) {
        toSave[k] = w;
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ months: toSave, monthOffset }));
  } catch (e) {
    console.warn('Failed to save data to localStorage', e);
    showToast('Could not save — storage may be full. Export your data to avoid losing it.', 'error', null, null, 8000);
  }
}

function load() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (!r) return;
    const d = JSON.parse(r);

    if (d.months && typeof d.months === 'object') Object.assign(weeks, d.months);
    else if (d.weeks && typeof d.weeks === 'object') Object.assign(weeks, d.weeks);

    if (typeof d.monthOffset === 'number') monthOffset = d.monthOffset;
    else if (typeof d.weekOffset === 'number') monthOffset = d.weekOffset;
  } catch (e) {
    console.warn('Failed to load data from localStorage', e);
  }
}

function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? '' : 'dark');
  try {
    localStorage.setItem(STORAGE_THEME, dark ? 'light' : 'dark');
  } catch (e) {}
}

(function () {
  try {
    if (localStorage.getItem(STORAGE_THEME) === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    const savedSec = localStorage.getItem(STORAGE_SEC);
    if (savedSec) Object.assign(secOpen, JSON.parse(savedSec));
  } catch (e) {}
})();