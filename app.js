// ── State ─────────────────────────────────────────────────
const weeks = {}, COLS = ['doing', 'planned', 'blocked'];

const secOpen = { done: true, cancelled: true };
const editing = {}, editingName = {};
let currentKey = '', monthOffset = 0;

// ── Storage keys ──────────────────────────────────────────
const STORAGE_KEY = 'wt8';
const STORAGE_THEME = 'wt8_theme';
const STORAGE_SEC = 'wt8_sec';

// ── Constants ─────────────────────────────────────────────
const TIMING = {
  TOAST_DEFAULT_DURATION: 10000,
  COPY_CONFIRMATION_FADE: 2000,
  PDF_PRINT_DIALOG_DELAY: 600,
  ASYNC_TASK_SCHEDULE: 0,
};
const DATE = {
  PADSTART_LENGTH: 2,
  YEAR_SLICE_LENGTH: 2,
  ISO_DATE_SLICE: 10,
  ISO_MONTH_SLICE: 7,
  ISO_DATE_START: 0,
};
const CALENDAR = {
  GRID_COLUMNS: 7,
  GRID_TOTAL_CELLS: 42,
};
const MARKUP = {
  STRIKETHROUGH_DELIMITER: 2,
  STRIKETHROUGH_MIN_LENGTH: 4,
  BULLET_PREFIX_LENGTH: 2,
  COL_IDENTIFIER_LENGTH: 2,
};
const LOCALE = 'en-GB';

// ── Date formatting helpers ──────────────────────────────
/**
 * Formats a date as month and year (e.g., "March 2026" in UK English).
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatMonthYear(date) {
  return date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}

/**
 * Formats a date as day, month and year (e.g., "18 March 2026" in UK English).
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatFullDate(date) {
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Formats a date with weekday, day, month and year (e.g., "Tuesday, 18 March 2026" in UK English).
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatFullDateWithWeekday(date) {
  return date.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── DOM helper functions ──────────────────────────────────
/**
 * Closes all open modals and dropdown menus by removing the 'open' class.
 * @returns {void}
 */
function closeAllOpenElements() {
  document.querySelectorAll('.mv-menu.open, .date-picker.open').forEach(el => el.classList.remove('open'));
}

/**
 * Removes all toast notification elements from the DOM.
 * @returns {void}
 */
function clearAllToasts() {
  document.querySelectorAll('.toast').forEach(el => el.remove());
}

// ── Toast notifications ───────────────────────────────────
function showToast(message, type = 'info', actionLabel = null, actionFn = null, duration = TIMING.TOAST_DEFAULT_DURATION) {
  const colors = {
    success: { bg: 'var(--green)', text: '#fff', btn: 'rgba(255,255,255,0.2)' },
    warning: { bg: 'var(--amber)', text: '#fff', btn: 'rgba(255,255,255,0.2)' },
    error:   { bg: 'var(--red)',   text: '#fff', btn: 'rgba(255,255,255,0.2)' },
    info:    { bg: 'var(--blue)',  text: '#fff', btn: 'rgba(255,255,255,0.2)' },
  };
  const c = colors[type] || colors.info;
  clearAllToasts();
  const t = document.createElement('div');
  t.setAttribute('role', 'alert');
  t.setAttribute('aria-live', 'polite');
  t.className = 'toast';
  t.style.cssText = `background:${c.bg};color:${c.text};display:flex;align-items:center;gap:12px;`;
  const msgSpan = document.createElement('span');
  msgSpan.style.flex = '1';
  msgSpan.textContent = message;
  t.appendChild(msgSpan);
  if (actionLabel) {
    const btn = document.createElement('button');
    btn.className = 'toast-action-btn';
    btn.style.cssText = `background:${c.btn};color:${c.text};`;
    btn.textContent = actionLabel;
    t.appendChild(btn);
  }
  document.body.appendChild(t);

  if (actionLabel && actionFn) {
    const btn = t.querySelector('button');
    btn.addEventListener('click', () => { actionFn(); t.remove(); });
  }
  if (duration > 0) setTimeout(() => { if (t.parentNode) t.remove(); }, duration);
}

// ── Theme colors for PDF export ───────────────────────────
const PDF_THEMES = {
  light: { BG:'#ffffff',TEXT:'#1a1917',TEXT2:'#6b6860',TEXT3:'#a8a49e',DIVIDER:'#e0ddd8',
    GREEN:'#1a7a56',GREEN_BG:'#e8f5ef',BLUE:'#1a5fa8',BLUE_BG:'#e8f0fb',
    RED:'#b83232',RED_BG:'#fbeaea',AMBER:'#9a6200',AMBER_BG:'#fef3db',
    GREY:'#6b6860',GREY_BG:'#f0ede8',PURPLE:'#6b3fa0',PURPLE_BG:'#f0eafa',
    TITLE_LINE:'#1a1917',ITEM_BORDER:'rgba(0,0,0,0.06)' },
  dark: { BG:'#141312',TEXT:'#f0ede8',TEXT2:'#9e9a94',TEXT3:'#5c5955',DIVIDER:'rgba(255,255,255,0.12)',
    GREEN:'#3ecf8e',GREEN_BG:'#0e2a1e',BLUE:'#5b9cf6',BLUE_BG:'#0d1f3c',
    RED:'#f07070',RED_BG:'#2d1212',AMBER:'#f0b429',AMBER_BG:'#2a1f05',
    GREY:'#9e9a94',GREY_BG:'#272523',PURPLE:'#b07ef5',PURPLE_BG:'#1e1030',
    TITLE_LINE:'#f0ede8',ITEM_BORDER:'rgba(255,255,255,0.07)' }
};

// ── Modal wiring ──────────────────────────────────────────
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
  document.getElementById('import-confirm-btn').addEventListener('click', doImport);
  document.getElementById('import-upload-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.click();
  });
  document.getElementById('import-file').addEventListener('change', handleImportFileSelect);
  document.querySelectorAll('input[name="pdf-range"]').forEach(r => r.addEventListener('change', onPdfRangeChange));

  document.addEventListener('click', e => {
    if (!e.target.closest('.mv-menu') && !e.target.closest('.dp-btn') && !e.target.closest('button.ntb-btn')) {
      closeAllOpenElements();
    }
  });
});

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
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

// ── Persistence ───────────────────────────────────────────
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

// ── Theme ─────────────────────────────────────────────────
function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? '' : 'dark');
  try { localStorage.setItem(STORAGE_THEME, dark ? 'light' : 'dark'); } catch (e) {}
}
(function () {
  try {
    if (localStorage.getItem(STORAGE_THEME) === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    const savedSec = localStorage.getItem(STORAGE_SEC);
    if (savedSec) Object.assign(secOpen, JSON.parse(savedSec));
  } catch (e) {}
})();

// ── Export / Import ───────────────────────────────────────
function exportData() {
  const b = new Blob([JSON.stringify({ months: weeks, monthOffset }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'monthly-tracker-' + new Date().toISOString().slice(DATE.ISO_DATE_START, DATE.ISO_DATE_SLICE) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/**
 * Imports and processes exported JSON data, replacing current local storage.
 * Handles migration from weekly to monthly format automatically.
 * Validates data structure and displays appropriate error/success messages.
 * @returns {void}
 */
function doImport() {
  const importBtn = document.getElementById('import-confirm-btn');
  const origText = importBtn.textContent;
  importBtn.textContent = 'Importing…';
  importBtn.disabled = true;

  try {
    const raw = document.getElementById('import-ta').value.trim();
    if (!raw) throw new Error('No data provided');

    const d = JSON.parse(raw);
    const data = d.months || d.weeks || {};
    const offset = typeof d.monthOffset === 'number' ? d.monthOffset : 
                   typeof d.weekOffset === 'number' ? d.weekOffset : 0;

    if (Object.keys(data).length === 0) throw new Error('No valid tracker data found');

    // Stage new data before touching existing data — prevents data loss on error
    const newData = {};
    Object.keys(data).forEach(key => {
      let mk = key;
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        mk = key.slice(DATE.ISO_DATE_START, DATE.ISO_MONTH_SLICE) + '-01';
      }
      if (!newData[mk]) newData[mk] = { doing: [], planned: [], blocked: [], done: [], cancelled: [] };

      const src = data[key];
      const dest = newData[mk];

      COLS.forEach(col => { if (Array.isArray(src[col])) dest[col].push(...src[col].map(item => structuredClone(item))); });
      if (Array.isArray(src.done)) dest.done.push(...src.done.map(item => structuredClone(item)));
      if (Array.isArray(src.cancelled)) dest.cancelled.push(...src.cancelled.map(item => structuredClone(item)));
    });

    // Only clear and replace once staging succeeded
    Object.keys(weeks).forEach(k => delete weeks[k]);
    Object.assign(weeks, newData);
    monthOffset = offset;
    save();
    closeModal('import-modal');
    document.getElementById('import-ta').value = '';
    refresh();
    showToast('Data imported successfully.', 'success');
  } catch (e) {
    showToast('Import failed: ' + e.message, 'error');
    console.error(e);
  } finally {
    importBtn.textContent = origText;
    importBtn.disabled = false;
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.value = '';
  }
}

// ── Month helpers ─────────────────────────────────────────
function monthKey(off) {
  const now = new Date();
  const mon = new Date(now.getFullYear(), now.getMonth() + off, 1);
  return mon.toISOString().slice(DATE.ISO_DATE_START, DATE.ISO_MONTH_SLICE) + '-01';
}

function getMonthLabel(off) {
  const now = new Date();
  const mon = new Date(now.getFullYear(), now.getMonth() + off, 1);
  const s = off === 0 ? ' (this month)' : off === -1 ? ' (last month)' : off === 1 ? ' (next month)' : '';
  return formatMonthYear(mon) + s;
}

function getMonthLabelFromKey(k) {
  const mon = new Date(k + 'T00:00:00');
  return formatMonthYear(mon);
}

function getOrCreate(k) {
  if (!weeks[k]) weeks[k] = { doing: [], planned: [], blocked: [], done: [], cancelled: [] };
  if (!weeks[k].cancelled) weeks[k].cancelled = [];
  return weeks[k];
}

// ── Carry over ────────────────────────────────────────────
function checkCarry() {
  const bar = document.getElementById('carry-bar');
  const prev = Object.keys(weeks).filter(k => k < currentKey).sort();
  let n = 0;
  const monthCounts = {};
  prev.forEach(k => {
    const w = weeks[k];
    const cnt = w.doing.length + w.planned.length + w.blocked.length;
    if (cnt > 0) { n += cnt; monthCounts[k] = cnt; }
  });
  if (n > 0) {
    bar.style.display = 'flex';
    const prevMonths = Object.keys(monthCounts).length;
    const sourceMsg = prevMonths === 1 
      ? 'from ' + getMonthLabelFromKey(Object.keys(monthCounts)[0])
      : 'from ' + prevMonths + ' previous month' + (prevMonths > 1 ? 's' : '');
    document.getElementById('carry-msg').textContent = `${n} incomplete task${n > 1 ? 's' : ''} ${sourceMsg}.`;
  } else bar.style.display = 'none';
}

/**
 * Manually carries incomplete tasks from previous months to the current month.
 * All tasks (ongoing or not) can be carried. Removes them from source months.
 * Updates order values to ensure consistency. Called when user clicks 'Carry' banner.
 * @returns {void}
 */
function carryOver() {
  const prev = Object.keys(weeks).filter(k => k < currentKey).sort();
  const cur = getOrCreate(currentKey);
  let carriedCount = 0;

  prev.forEach(k => {
    const w = weeks[k];
    COLS.forEach(col => {
      w[col].forEach(it => {
        const cloned = structuredClone(it);
        cloned.carried = true;
        cloned.order = undefined;
        cur[col].unshift(cloned);
        carriedCount++;
      });
      w[col] = [];
    });
  });

  normalizeOrders(cur);  // Set proper order values for all tasks
  save();
  document.getElementById('carry-bar').style.display = 'none';
  render();
  if (carriedCount > 0) showToast(`Carried ${carriedCount} task${carriedCount > 1 ? 's' : ''} to this month.`, 'success');
}

function changeMonth(dir) {
  monthOffset += dir;
  currentKey = monthKey(monthOffset);
  getOrCreate(currentKey);
  document.getElementById('wk-lbl').textContent = getMonthLabel(monthOffset);
  save();
  checkCarry();
  render();
}

// ── Item actions ──────────────────────────────────────────
/**
 * Sorts tasks in a column by priority level (High → Medium → Low).
 * Within each priority tier, maintains the existing manual order.
 * @param {Array<Object>} tasks - Array of task objects from a column
 * @returns {Array<Object>} Sorted tasks array (modifies in place and returns)
 */
function sortByPriority(tasks) {
  const priorityOrder = { high: 0, med: 1, low: 2 };
  return tasks.sort((a, b) => {
    const aPrio = priorityOrder[a.priority || 'med'] ?? 1;
    const bPrio = priorityOrder[b.priority || 'med'] ?? 1;
    return aPrio - bPrio;
  });
}

function sortColumnByPriority(col) {
  const w = getOrCreate(currentKey);
  sortByPriority(w[col]);
  normalizeOrders(w);
  save();
  render();
}

// Assign consistent order values (0, 1, 2...) to all tasks in a month
/**
 * Assigns consistent order values (0, 1, 2...) to all tasks in a month.
 * Ensures stable ordering when tasks are added, reordered, or moved between columns.
 * @param {Object} w - Week/month object containing {doing, planned, blocked, done, cancelled} arrays
 * @returns {void}
 */
function normalizeOrders(w) {
  COLS.forEach(col => {
    w[col].forEach((task, idx) => {
      task.order = idx;           // order = position in array
    });
  });
  // Also normalize resolved sections if you want
  ['done', 'cancelled'].forEach(sec => {
    w[sec].forEach((task, idx) => task.order = idx);
  });
}

// When creating a new task, give it the highest order so it appears at bottom
function addItem(col) {
  const inp = document.getElementById('in-' + col);
  const v = inp.value.trim();
  if (!v) return;

  const w = getOrCreate(currentKey);
  const maxOrder = w[col].length > 0 ? Math.max(...w[col].map(t => t.order || 0)) : -1;

  w[col].push({
    text: v,
    note: '',
    carried: false,
    ongoing: false,
    progress: null,
    order: maxOrder + 1,
    priority: 'med'
  });

  inp.value = '';
  save();
  render();
}

function setProgress(col, i, val, commit = false) {
  const trimmed = val.trim();
  const n = parseInt(trimmed, 10);
  const it = getOrCreate(currentKey)[col][i];
  if (trimmed === '' || isNaN(n)) it.progress = null;
  else it.progress = Math.min(100, Math.max(0, n));
  save();

  const k = col + i;
  const wrap = document.getElementById('prog-wrap-' + k);
  const fill = document.getElementById('prog-fill-' + k);
  const label = document.getElementById('prog-label-' + k);

  if (it.progress === null) {
    if (wrap) wrap.style.display = 'none';
  } else {
    const pct = it.progress;
    const color = pct === 100 ? 'var(--green)' : pct >= 50 ? 'var(--blue)' : 'var(--amber)';
    if (wrap) wrap.style.display = 'flex';
    if (fill) { fill.style.width = pct + '%'; fill.style.background = color; }
    if (label) { label.textContent = pct + '%'; label.style.color = color; }
    if (commit && pct === 100) {
      markDone(col, i);
      return;
    }
  }
  updateSummary(getOrCreate(currentKey));
}

function shiftEditingKeys(col, removedIdx) {
  [editing, editingName].forEach(map => {
    const keys = Object.keys(map)
      .filter(k => k.startsWith(col) && !isNaN(parseInt(k.slice(col.length), 10)))
      .sort((a, b) => parseInt(a.slice(col.length), 10) - parseInt(b.slice(col.length), 10));
    keys.forEach(k => {
      const idx = parseInt(k.slice(col.length), 10);
      if (idx === removedIdx) delete map[k];
      else if (idx > removedIdx) { map[col + (idx - 1)] = map[k]; delete map[k]; }
    });
  });
}

function removeItem(col, i) {
  const w = getOrCreate(currentKey);
  const removed = w[col].splice(i, 1)[0];
  shiftEditingKeys(col, i);
  save();
  render();
  showToast('Task deleted.', 'warning', 'Undo', () => {
    getOrCreate(currentKey)[col].splice(i, 0, removed);
    save();
    render();
  });
}

function markDone(col, i) {
  const w = getOrCreate(currentKey);
  const it = w[col].splice(i, 1)[0];
  shiftEditingKeys(col, i);
  it.completedFrom = col;
  it.completedDate = new Date().toISOString().slice(DATE.ISO_DATE_START, DATE.ISO_DATE_SLICE);
  w.done.push(it);
  save();
  render();
  launchConfetti();
}

function markCancelled(col, i) {
  const w = getOrCreate(currentKey);
  const it = w[col].splice(i, 1)[0];
  shiftEditingKeys(col, i);
  it.cancelledFrom = col;
  w.cancelled.push(it);
  save();
  render();
}

function restoreItem(sec, i) {
  const w = getOrCreate(currentKey);
  const it = w[sec].splice(i, 1)[0];
  const col = it.completedFrom || it.cancelledFrom || 'doing';
  w[col].push(it);
  save();
  render();
}

function removeResolved(sec, i) {
  const w = getOrCreate(currentKey);
  const removed = w[sec].splice(i, 1)[0];
  save();
  render();
  showToast('Task deleted.', 'warning', 'Undo', () => {
    getOrCreate(currentKey)[sec].splice(i, 0, removed);
    save();
    render();
  });
}

const lastCleared = { done: null, cancelled: null };

function clearSec(sec) {
  const w = getOrCreate(currentKey);
  if (w[sec].length === 0) return;
  lastCleared[sec] = structuredClone(w[sec]);
  w[sec] = [];
  save();
  render();
  showToast(`Cleared all ${sec} tasks.`, 'warning', 'Undo', () => {
    if (!lastCleared[sec]) return;
    getOrCreate(currentKey)[sec] = lastCleared[sec];
    lastCleared[sec] = null;
    save();
    render();
    showToast('Undo successful — tasks restored.', 'success', null, null, 3000);
  }, TIMING.TOAST_DEFAULT_DURATION);
  setTimeout(() => { lastCleared[sec] = null; }, TIMING.TOAST_DEFAULT_DURATION + 2000);
}

function toggleOngoing(col, i) {
  const it = getOrCreate(currentKey)[col][i];
  it.ongoing = !it.ongoing;
  save();
  render();
}

function cyclePriority(col, i) {
  const task = getOrCreate(currentKey)[col][i];
  
  if (!task.priority || task.priority === 'low') {
    task.priority = 'med';
  } else if (task.priority === 'med') {
    task.priority = 'high';
  } else {
    task.priority = 'low';
  }
  
  save();
  render();
}

function toggleEditName(col, i) {
  const k = col + i;
  editingName[k] = !editingName[k];
  render();
  if (editingName[k]) {
    setTimeout(() => {
      const inp = document.getElementById('itxt-' + k);
      if (inp) {
        inp.focus();
        inp.setSelectionRange(DATE.ISO_DATE_START, inp.value.length);
      }
    }, 0);
  }
}

function saveTaskName(col, i) {
  const k = col + i;
  const inp = document.getElementById('itxt-' + k);
  if (inp) {
    const newName = inp.value.trim();
    if (newName) getOrCreate(currentKey)[col][i].text = newName;
  }
  editingName[k] = false;
  save();
  render();
}

function handleTaskNameKey(e, col, i) {
  if (e.key === 'Enter') { e.preventDefault(); saveTaskName(col, i); return; }
  if (e.key === 'Escape') { e.preventDefault(); editingName[col + i] = false; render(); return; }
}

function toggleNote(col, i) {
  const k = col + i;
  editing[k] = !editing[k];
  render();
  if (editing[k]) {
    setTimeout(() => {
      const ta = document.getElementById('nte-' + k);
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, TIMING.ASYNC_TASK_SCHEDULE);
  }
}

function saveNote(col, i) {
  const k = col + i;
  const ta = document.getElementById('nte-' + k);
  if (ta) getOrCreate(currentKey)[col][i].note = ta.value;
  editing[k] = false;
  save();
  render();
}

function toggleSec(sec) {
  secOpen[sec] = !secOpen[sec];
  document.getElementById('body-' + sec).style.display = secOpen[sec] ? 'block' : 'none';
  document.getElementById('tog-' + sec).innerHTML = secOpen[sec] ? '&#9660;' : '&#9654;';
  try { localStorage.setItem(STORAGE_SEC, JSON.stringify(secOpen)); } catch(e) {}
}

/**
 * Toggles the hideCompleted flag on a task, hiding strikethrough lines in the note view.
 * Persists the preference in localStorage.
 * @param {string} col - Column identifier ('doing', 'planned', 'blocked', etc)
 * @param {number} i - Zero-based index of the task within its column
 * @returns {void}
 */
function toggleHideCompleted(col, i) {
  const task = getOrCreate(currentKey)[col][i];
  task.hideCompleted = !task.hideCompleted;
  save();
  render();
}

// ── Note formatting ───────────────────────────────────────
function handleNoteKey(e, col, i) {
  const ta = e.target;
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNote(col, i); return; }
  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
    const pos = ta.selectionStart, val = ta.value;
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const lineContent = val.substring(lineStart, pos);
    if (lineContent.startsWith('• ')) {
      e.preventDefault();
      if (lineContent === '• ') {
        ta.value = val.substring(0, lineStart) + val.substring(pos);
        ta.selectionStart = ta.selectionEnd = lineStart;
      } else {
        const insert = '\n• ';
        ta.value = val.substring(0, pos) + insert + val.substring(pos);
        ta.selectionStart = ta.selectionEnd = pos + insert.length;
      }
    }
  }
}

function insertBullet(id) {
  const ta = document.getElementById(id); if (!ta) return;
  const s = ta.selectionStart, val = ta.value;
  const ls = val.lastIndexOf('\n', s - 1) + 1;
  const le = val.indexOf('\n', s);
  const line = val.substring(ls, le === -1 ? val.length : le);
  if (line.startsWith('• ')) {
    ta.value = val.substring(0, ls) + line.substring(2) + val.substring(ls + line.length);
    ta.selectionStart = ta.selectionEnd = Math.max(ls, s - 2);
  } else {
    ta.value = val.substring(0, ls) + '• ' + val.substring(ls);
    ta.selectionStart = ta.selectionEnd = s + 2;
  }
  ta.focus();
}

function insertStrike(id) {
  const ta = document.getElementById(id); if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd, val = ta.value, sel = val.substring(s, e);
  if (sel) {
    if (sel.startsWith('~~') && sel.endsWith('~~') && sel.length > MARKUP.STRIKETHROUGH_MIN_LENGTH) {
      const u = sel.slice(MARKUP.STRIKETHROUGH_DELIMITER, -MARKUP.STRIKETHROUGH_DELIMITER);
      ta.value = val.substring(0, s) + u + val.substring(e);
      ta.selectionStart = s;
      ta.selectionEnd = s + u.length;
    } else {
      const w = `~~${sel}~~`;
      ta.value = val.substring(0, s) + w + val.substring(e);
      ta.selectionStart = s;
      ta.selectionEnd = s + w.length;
    }
  } else {
    const p = '~~text~~';
    ta.value = val.substring(0, s) + p + val.substring(e);
    ta.selectionStart = s + 2;
    ta.selectionEnd = s + 6;
  }
  ta.focus();
}

const datePickerState = { taId: null, curDate: new Date() };

function toggleDatePicker(taId) {
  const picker = document.getElementById('dp-' + taId);
  if (picker.classList.contains('open')) {
    picker.classList.remove('open');
    datePickerState.taId = null;
  } else {
    closeAllOpenElements();
    datePickerState.taId = taId;
    datePickerState.curDate = new Date();
    renderDatePicker(taId);
    picker.classList.add('open');
    const rect = picker.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 20) {
      picker.style.top = 'auto';
      picker.style.bottom = '100%';
    } else {
      picker.style.top = '100%';
      picker.style.bottom = 'auto';
    }
  }
}

function renderDatePicker(taId) {
  const picker = document.getElementById('dp-' + taId);
  const month = datePickerState.curDate.getMonth(), year = datePickerState.curDate.getFullYear();
  const first = new Date(year, month, 1), last = new Date(year, month + 1, 0);
  const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month];
  const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html = `<div class="dp-header">
    <div class="dp-title" style="flex:1">${monthName} ${year}</div>
    <div class="dp-nav">
      <button class="dp-btn" aria-label="Previous month" onclick="changeDateMonth(-1,'${taId}')">◀</button>
      <button class="dp-btn" aria-label="Next month" onclick="changeDateMonth(1,'${taId}')">▶</button>
    </div>
  </div>
  <div class="dp-calendar" role="grid" aria-label="Calendar">`;
  days.forEach(d => html += `<div class="dp-day-header" role="columnheader" aria-label="${d}">${d}</div>`);
  const startDay = first.getDay();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -(i));
    html += `<div class="dp-day other-month" role="gridcell" aria-disabled="true">${d.getDate()}</div>`;
  }
  for (let i = 1; i <= last.getDate(); i++) {
    const d = new Date(year, month, i);
    const isToday = d.toISOString().slice(DATE.ISO_DATE_START, DATE.ISO_DATE_SLICE) === new Date().toISOString().slice(DATE.ISO_DATE_START, DATE.ISO_DATE_SLICE);
    html += `<div class="dp-day${isToday?' today':''}" role="gridcell" tabindex="0"
      data-year="${year}" data-month="${month}" data-day="${i}"
      data-taid="${taId}"
      onclick="selectDate('${taId}',${year},${month},${i})"
      onkeydown="handleDpKeydown(event,'${taId}')"
      aria-label="${formatFullDate(d)}"
      ${isToday?'aria-current="date"':''}>${i}</div>`;
  }
  const endDays = CALENDAR.GRID_TOTAL_CELLS - last.getDate() - startDay;
  for (let i = 1; i <= endDays; i++) html += `<div class="dp-day other-month" role="gridcell" aria-disabled="true">${i}</div>`;
  html += `</div>`;
  picker.innerHTML = html;
  setTimeout(() => {
    const focused = picker.querySelector('.dp-day.today') || picker.querySelector('.dp-day:not(.other-month)');
    if (focused) focused.focus();
  }, TIMING.ASYNC_TASK_SCHEDULE);
}

function changeDateMonth(dir, taId) {
  const d = datePickerState.curDate;
  datePickerState.curDate = new Date(d.getFullYear(), d.getMonth() + dir, 1);
  renderDatePicker(taId);
}

function selectDate(taId, year, month, day) {
  const ta = document.getElementById(taId); if (!ta) return;
  const d = new Date(year, month, day);
  if (d.getMonth() !== month) return; // invalid day guard
  const dateStr = String(d.getDate()).padStart(DATE.PADSTART_LENGTH,'0') + '/' +
                  String(d.getMonth()+1).padStart(DATE.PADSTART_LENGTH,'0') + '/' +
                  String(d.getFullYear()).slice(-DATE.YEAR_SLICE_LENGTH);
  const pos = ta.selectionStart, val = ta.value;
  ta.value = val.substring(0, pos) + dateStr + val.substring(pos);
  ta.selectionStart = ta.selectionEnd = pos + dateStr.length;
  document.getElementById('dp-' + taId).classList.remove('open');
  datePickerState.taId = null;
  ta.focus();
}

function handleDpKeydown(e, taId) {
  const key = e.key;
  if (key === 'Enter' || key === ' ') {
    e.preventDefault();
    const el = e.currentTarget;
    selectDate(taId, +el.dataset.year, +el.dataset.month, +el.dataset.day);
    return;
  }
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)) return;
  e.preventDefault();
  const picker = document.getElementById('dp-' + taId);
  const cells = Array.from(picker.querySelectorAll('.dp-day:not(.other-month)'));
  const idx = cells.indexOf(e.currentTarget);
  let next = -1;
  if (key === 'ArrowLeft') next = idx - 1;
  else if (key === 'ArrowRight') next = idx + 1;
  else if (key === 'ArrowUp') next = idx - CALENDAR.GRID_COLUMNS;
  else if (key === 'ArrowDown') next = idx + CALENDAR.GRID_COLUMNS;

  if (next < 0) {
    changeDateMonth(-1, taId);
    setTimeout(() => {
      const newCells = document.getElementById('dp-' + taId).querySelectorAll('.dp-day:not(.other-month)');
      if (newCells.length) newCells[newCells.length-1].focus();
    }, TIMING.ASYNC_TASK_SCHEDULE);
  } else if (next >= cells.length) {
    changeDateMonth(1, taId);
    setTimeout(() => {
      const newCells = document.getElementById('dp-' + taId).querySelectorAll('.dp-day:not(.other-month)');
      if (newCells.length) newCells[0].focus();
    }, TIMING.ASYNC_TASK_SCHEDULE);
  } else {
    cells[next].focus();
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.date-picker.open').forEach(p => p.classList.remove('open'));
    datePickerState.taId = null;
  }
});

function renderNoteHtml(raw, hideCompleted = false) {
  if (!raw) return '';
  const lines = raw.split('\n');
  let html = '', inList = false;
  lines.forEach(line => {
    // If hideCompleted is true, skip lines that are entirely struck through
    if (hideCompleted && /^~~.*~~$/.test(line.trim())) {
      return;
    }
    const escaped = esc(line);
    const fmt = escaped.replace(/~~(.*?)~~/g, '<s>$1</s>');
    if (line.startsWith('• ') || line === '•') {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${fmt.replace(/^•\s*/,'')}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += fmt ? `<span>${fmt}</span><br>` : '<br>';
    }
  });
  if (inList) html += '</ul>';
  return html.replace(/(<br>)+$/, '');
}

/**
 * Transforms raw note text into formatted lines for the manager update summary.
 * Converts bullet points (•) to dashes, removes strikethrough, and filters empty lines.
 * @param {string} raw - Raw note text containing bullet points and strikethrough formatting
 * @returns {Array<string>} Array of formatted text lines ready for summary display
 */
function noteToUpdateLines(raw) {
  if (!raw) return [];
  return raw.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remove leading bullet if present and replace with dash for notes
      if (line.startsWith('• ')) {
        return `- ${line.slice(MARKUP.BULLET_PREFIX_LENGTH)}`;
      }
      if (line.startsWith('•')) {
        return `- ${line.slice(1).trim()}`;
      }
      // Remove strikethrough for clean output
      return line.replace(/~~(.*?)~~/g, '$1 [Done]');
    });
}

// ── Render ────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/**
 * Renders an individual task item as HTML with action buttons, editors, and metadata.
 * Handles both expanded (editing) and collapsed states, including note editor and progress bar.
 * @param {string} col - Column identifier ('doing', 'planned', 'blocked')
 * @param {Object} it - Task item object containing {text, note, progress, priority, ongoing, carried, etc}
 * @param {number} i - Zero-based index of the task within its column
 * @returns {string} HTML string ready to insert into the DOM
 */
function renderItem(col, it, i) {
  const k = col + i;
  const isEd = editing[k];
  const isEdName = editingName[k];

  const tags = (it.carried ? `<span class="tag t-car">carried</span>` : '') + 
               (it.ongoing ? `<span class="tag t-ong">ongoing</span>` : '');

  const progHtml = `<div class="prog-wrap" id="prog-wrap-${k}" style="${(it.progress === null || it.progress === undefined) ? 'display:none' : ''}">
    <div class="prog-bar-bg"><div class="prog-bar-fill" id="prog-fill-${k}" style="width:${it.progress||0}%;background:${it.progress===100?'var(--green)':it.progress>=50?'var(--blue)':'var(--amber)'}"></div></div>
    <span class="prog-pct" id="prog-label-${k}" style="color:${it.progress===100?'var(--green)':it.progress>=50?'var(--blue)':'var(--amber)'}">${it.progress !== null && it.progress !== undefined ? it.progress + '%' : ''}</span>
  </div>`;

  let noteHtml = '';
  if (isEd) {
    const tid = 'nte-' + k;
    noteHtml = `<div class="note-ed">
      <div class="note-tb">
        <button class="ntb-btn" onclick="insertBullet('${tid}')">• List</button>
        <div class="ntb-sep"></div>
        <button class="ntb-btn ntb-strike" onclick="insertStrike('${tid}')">S</button>
        <div class="ntb-sep"></div>
        <div class="date-picker-wrapper">
          <button class="ntb-btn" onclick="toggleDatePicker('${tid}')" title="Insert date">📅</button>
          <div class="date-picker" id="dp-${tid}"></div>
        </div>
      </div>
      <textarea class="note-area" id="${tid}" onkeydown="handleNoteKey(event,'${col}',${i})">${esc(it.note || '')}</textarea>
      <div class="note-ft">
        <div class="prog-input-wrap">
          <label for="prog-${k}">Progress</label>
          <input class="prog-input" id="prog-${k}" type="text" inputmode="numeric" placeholder="0–100"
            value="${it.progress !== null && it.progress !== undefined ? it.progress : ''}"
            oninput="setProgress('${col}',${i},this.value,false)"
            onblur="setProgress('${col}',${i},this.value,true)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" />
          %
        </div>
        <div class="note-ft-actions">
          <span class="note-hint">Cmd/Ctrl+Enter to save</span>
          <button class="note-sv" onclick="saveNote('${col}',${i})">Save note</button>
        </div>
      </div>
    </div>`;
  } else if (it.note) {
    const hasStrikethrough = /~~/.test(it.note);
    const hideCompletedBtn = hasStrikethrough ? 
      `<button class="note-hide-btn" title="${it.hideCompleted ? 'Show completed items' : 'Hide completed items'}" 
               onclick="toggleHideCompleted('${col}',${i}); event.stopPropagation();">
        👁
      </button>` : '';
    noteHtml = `<div class="note-view-wrapper">
      <div class="note-view">${renderNoteHtml(it.note, it.hideCompleted)}</div>
      ${hasStrikethrough ? hideCompletedBtn : ''}
    </div>`;
  }

  const taskNameHtml = isEdName ?
    `<input type="text" id="itxt-${k}" class="item-name-input" value="${esc(it.text)}"
            onkeydown="handleTaskNameKey(event,'${col}',${i})" onblur="saveTaskName('${col}',${i})"/>` :
    `<span class="item-txt editable" ondblclick="toggleEditName('${col}',${i})" title="Double-click to edit">
      ${esc(it.text)}${tags}
    </span>`;

  return `<div class="item i-${col.slice(DATE.ISO_DATE_START, MARKUP.COL_IDENTIFIER_LENGTH)}" 
               ${isEd || isEdName ? '' : 'draggable="true"'}
               data-col="${col}" 
               data-index="${i}"
               ondragstart="dragStart(event)"
               ondragend="dragEnd(event)"
               ondragover="dragOver(event)"
               ondragleave="dragLeave(event)"
               ondrop="drop(event)">
    <div class="item-top">
      <!-- Priority dot -->
      <div class="priority-dot ${it.priority === 'high' ? 'p-high' : it.priority === 'med' ? 'p-med' : 'p-low'}"
           onclick="cyclePriority('${col}', ${i}); event.stopPropagation();" 
           title="Click to cycle priority (High / Medium / Low)"></div>

      ${taskNameHtml}
      <div class="ibtns">
        <button class="ibt tick" title="Mark as complete" onclick="markDone('${col}',${i})">&#10003;</button>
        <button class="ibt xbt" title="Mark as cancelled" onclick="markCancelled('${col}',${i})">&#10007;</button>
        <button class="ibt" title="${it.ongoing ? 'Remove ongoing flag' : 'Mark as ongoing'}" 
                onclick="toggleOngoing('${col}',${i})" style="${it.ongoing ? 'color:var(--purple)' : ''}">
          ${it.ongoing ? '&#9670;' : '&#9671;'}
        </button>
        <button class="ibt" title="${isEd ? 'Close note editor' : 'Add or edit note'}" 
                onclick="toggleNote('${col}',${i})">
          ${isEd ? '&#9650;' : '&#9998;'}
        </button>
        <button class="ibt del" title="Delete permanently" onclick="removeItem('${col}',${i})">&#x2715;</button>
      </div>
    </div>
    ${progHtml}
    ${noteHtml}
  </div>`;
}

function renderResolved(sec, it, i) {
  const isCan = sec === 'cancelled';
  const noteHtml = it.note ? `<div class="note-view">${renderNoteHtml(it.note)}</div>` : '';
  const tags = it.carried ? `<span class="tag t-car">carried</span>` : '';
  const tc = isCan ? 'can-txt' : 'struck';
  const ct = isCan ? `<span class="tag t-can">cancelled</span>` : '';
  const completedDateHtml = !isCan && it.completedDate ? `<span class="tag t-date" title="Completed on ${it.completedDate}">${it.completedDate}</span>` : '';
  const priorityDot = `<div class="priority-dot ${it.priority === 'high' ? 'p-high' : it.priority === 'med' ? 'p-med' : 'p-low'}"></div>`;
  return `<div class="item ${isCan?'i-ca':'i-dn'}">
    <div class="item-top">
      ${priorityDot}
      <span class="item-txt ${tc}">${esc(it.text)}${tags}${completedDateHtml}${ct}</span>
      <div class="ibtns">
        <button class="ibt" title="Restore to active" onclick="restoreItem('${sec}',${i})" style="font-size:14px">&#8617;</button>
        <button class="ibt del" title="Remove permanently" onclick="removeResolved('${sec}',${i})">&#x2715;</button>
      </div>
    </div>${noteHtml}</div>`;
}

function render() {
  const w = getOrCreate(currentKey);
  COLS.forEach(col => {
    document.getElementById('cnt-' + col).textContent = w[col].length;
    const el = document.getElementById('list-' + col);
    el.innerHTML = w[col].length === 0 ? '<div class="empty">Nothing here yet</div>' : w[col].map((it, i) => renderItem(col, it, i)).join('');
  });
  ['done','cancelled'].forEach(sec => {
    document.getElementById('cnt-' + sec).textContent = w[sec].length;
    const el = document.getElementById('list-' + sec);
    el.innerHTML = w[sec].length === 0 ? `<div class="empty">No ${sec} tasks</div>` : w[sec].map((it, i) => renderResolved(sec, it, i)).join('');
  });
  updateSummary(w);

  normalizeOrders(getOrCreate(currentKey));

  // Allow dropping on empty active column containers only (not done/cancelled)
  COLS.forEach(col => {
    const container = document.getElementById('list-' + col);
    if (!container) return;
    container.ondragover = e => {
      e.preventDefault();
      container.classList.add('drag-over');
    };
    container.ondragleave = () => container.classList.remove('drag-over');
    container.ondrop = e => {
      e.preventDefault();
      container.classList.remove('drag-over');
      if (!draggedItem) return;
      const fromCol = draggedItem.dataset.col;
      if (fromCol === col) return;
      const w = getOrCreate(currentKey);
      const [movedTask] = w[fromCol].splice(parseInt(draggedItem.dataset.index), 1);
      w[col].push(movedTask);
      save();
      render();
    };
  });
}

/**
 * Generates the manager update summary text from all tasks in the current month.
 * Organises tasks by status with indented notes underneath each task.
 * Called after render to update the summary box.
 * @param {Object} w - Month object containing task arrays {doing, planned, blocked, done, cancelled}
 * @returns {void}
 */
function updateSummary(w) {
  const total = w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length;
  const el = document.getElementById('summary');
  
  if (total === 0) {
    el.textContent = 'Add tasks above to generate your update.';
    return;
  }

  const L = [];
  L.push(`Monthly update — ${getMonthLabel(monthOffset)}`, '');

  // Summary line
  L.push(`Summary: ${w.doing.length} in progress, ${w.planned.length} planned, ${w.blocked.length} blocked, ${w.done.length} completed, ${w.cancelled.length} cancelled`);
  L.push('');

  /**
   * Formats a section of tasks for the summary (e.g., IN PROGRESS, PLANNED).
   * Adds task titles with priority/flags and indented notes underneath.
   * @param {string} title - Section heading (e.g., 'IN PROGRESS', 'COMPLETED')
   * @param {Array<Object>} items - Array of task items to display in this section
   * @returns {void}
   */
  function addSection(title, items) {
    if (items.length === 0) return;
    L.push(title);
    items.forEach(it => {
      // Main task title
      let line = ` • ${it.text}`;
      if (it.priority === 'high') line += ' [High Priority]';
      else if (it.priority === 'low') line += ' [Low Priority]';

      if (it.ongoing) line += ' [ongoing]';
      if (it.carried) line += ' [carried]';
      if (it.completedDate) line += ` — Completed: ${it.completedDate}`;
      else if (it.progress != null) line += ` — ${it.progress}% complete`;
      L.push(line);

      // Notes indented under the task (only for active items and cancelled, not completed)
      if (it.note && title !== 'COMPLETED') {
        const noteLines = noteToUpdateLines(it.note);
        noteLines.forEach(noteLine => {
          L.push(`     ${noteLine}`);   // 5 spaces indentation
        });
      }
    });
    L.push('');   // blank line between sections
  }

  addSection('IN PROGRESS', w.doing);
  addSection('PLANNED', w.planned);
  addSection('BLOCKED', w.blocked);
  addSection('COMPLETED', w.done);
  addSection('CANCELLED', w.cancelled);

  el.textContent = L.join('\n').trim();
}

function copyUpdate() {
  const txt = document.getElementById('summary').textContent;
  if (!txt || txt === 'Add tasks above to generate your update.') return;
  navigator.clipboard.writeText(txt).then(() => {
    const el = document.getElementById('copy-ok');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), TIMING.COPY_CONFIRMATION_FADE);
  }).catch(() => showToast('Copy failed — please copy the text manually.', 'error', null, null, 4000));
}

function init() {
  refresh();
}

function refresh() {
  currentKey = monthKey(monthOffset);
  const w = getOrCreate(currentKey);
  normalizeOrders(w);
  document.getElementById('wk-lbl').textContent = getMonthLabel(monthOffset);
  ['done', 'cancelled'].forEach(sec => {
    const body = document.getElementById('body-' + sec);
    const tog = document.getElementById('tog-' + sec);
    if (body) body.style.display = secOpen[sec] ? 'block' : 'none';
    if (tog) tog.innerHTML = secOpen[sec] ? '&#9660;' : '&#9654;';
  });
  checkCarry();
  render();
}

// ── PDF Export ────────────────────────────────────────────
function openPdfExport() {
  document.querySelector('input[name="pdf-range"][value="current"]').checked = true;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelector(`input[name="pdf-theme"][value="${isDark ? 'dark' : 'light'}"]`).checked = true;
  document.getElementById('pdf-week-picker').style.display = 'none';
  openModal('pdf-modal');
}

function onPdfRangeChange() {
  const val = document.querySelector('input[name="pdf-range"]:checked').value;
  const picker = document.getElementById('pdf-week-picker');
  if (val === 'pick') {
    picker.style.display = 'flex';
    const keys = Object.keys(weeks).filter(k => {
      const w = weeks[k];
      return w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length > 0;
    }).sort().reverse();
    picker.innerHTML = keys.length === 0 ? '<span style="font-size:12px;color:var(--text-3);font-style:italic">No months with data found.</span>' : keys.map(k => `
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-2);cursor:pointer">
        <input type="checkbox" value="${k}" checked style="accent-color:var(--blue)"> ${getMonthLabelFromKey(k)}
      </label>`).join('');
  } else {
    picker.style.display = 'none';
  }
}

function generatePdf() {
  const range = document.querySelector('input[name="pdf-range"]:checked').value;
  let keys = [];
  if (range === 'current') keys = [currentKey];
  else if (range === 'all') {
    keys = Object.keys(weeks).filter(k => {
      const w = weeks[k];
      return w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length > 0;
    }).sort();
  } else {
    keys = Array.from(document.querySelectorAll('#pdf-week-picker input[type=checkbox]:checked')).map(c => c.value).sort();
  }
  if (keys.length === 0) { showToast('No months selected or no data found.', 'warning'); return; }
  const theme = document.querySelector('input[name="pdf-theme"]:checked').value;
  closeModal('pdf-modal');
  const html = buildPdfHtml(keys, theme);
  const win = window.open('', '_blank');
  if (!win) { showToast('Popup blocked. Please allow popups and try again.', 'warning'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, TIMING.PDF_PRINT_DIALOG_DELAY);
}
// buildPdfHtml — generates a self-contained HTML document for printing/saving as PDF.
// Opens in a new tab; the browser's native print dialog handles PDF conversion.
// Keys is an array of ISO week-start dates (YYYY-MM-DD) to include.
// Theme is 'light' or 'dark' — colours are defined in PDF_THEMES and applied inline
// since external stylesheets are unreliable in print contexts.
// The @media print block sets -webkit-print-color-adjust:exact so browsers don't
// strip background colours when saving to PDF (user still needs "Background graphics"
// ticked in the Chrome print dialog for dark mode to render correctly).
/**
 * Generates a self-contained HTML document for PDF export with inline styles.
 * Creates a printable report with all tasks grouped by month and status.
 * Handles colour themes and applies exact colour rendering for PDF output.
 * @param {Array<string>} keys - Array of month keys (YYYY-MM-01 format) to include
 * @param {string} theme - Theme identifier: 'light' or 'dark'
 * @returns {string} Complete HTML document as a string
 */
function buildPdfHtml(keys,theme){
  const colors=theme==='light'?PDF_THEMES.light:PDF_THEMES.dark;
  const {BG,TEXT,TEXT2,TEXT3,DIVIDER,TITLE_LINE,GREEN,GREEN_BG,BLUE,BLUE_BG,RED,RED_BG,AMBER,AMBER_BG,GREY,GREY_BG,ITEM_BORDER}=colors;
  
  // Note: dates in notes won't be styled specially in PDF, just rendered as plain text

  function noteHtml(raw){
    if(!raw)return'';
    const lines=raw.split('\n');let html='',inList=false;
    lines.forEach(line=>{
      const escaped=esc(line);
      const fmt=escaped.replace(/~~(.*?)~~/g,`<s style="color:${TEXT3}">$1</s>`);
      if(line.startsWith('• ')||line==='•'){
        if(!inList){html+=`<ul style="margin:3px 0 3px 16px;padding:0">`;inList=true;}
        html+=`<li style="margin:1px 0;font-size:11px;color:${TEXT2}">${fmt.replace(/^•\s*/,'')}</li>`;
      }else{
        if(inList){html+='</ul>';inList=false;}
        if(fmt.trim())html+=`<div style="font-size:11px;color:${TEXT2};line-height:1.5">${fmt}</div>`;
      }
    });
    if(inList)html+='</ul>';
    return html?`<div style="margin-top:4px;padding-top:4px;border-top:0.5px solid ${DIVIDER}">${html}</div>`:'';
  }

  const weekSections=keys.map(k=>{
    const w=getOrCreate(k);
    const total=w.doing.length+w.planned.length+w.blocked.length+w.done.length+w.cancelled.length;
    if(total===0)return'';

    // Build summary text lines — same logic as the manager update preview
    const L=[];
    function sec(lbl,items){
      if(!items.length)return;
      L.push({type:'heading',text:lbl});
      items.forEach(it=>{
        const flags=(it.priority==='high'?' [High Priority]':it.priority==='low'?' [Low Priority]':'')+(it.ongoing?' [ongoing]':'')+(it.carried?' [carried]':'');
        const note=(lbl!=='COMPLETED')?it.note||'':'';
        L.push({type:'item',text:it.text+flags,note:note,col:lbl,progress:it.progress??null,completedDate:it.completedDate??null});
      });
    }
    sec('IN PROGRESS',w.doing);
    sec('PLANNED',w.planned);
    sec('BLOCKED',w.blocked);
    sec('COMPLETED',w.done);
    sec('CANCELLED',w.cancelled);

    const colColor={
      'IN PROGRESS':GREEN,'PLANNED':BLUE,'BLOCKED':RED,
      'COMPLETED':GREY,'CANCELLED':AMBER
    };
    const colBg={
      'IN PROGRESS':GREEN_BG,'PLANNED':BLUE_BG,'BLOCKED':RED_BG,
      'COMPLETED':GREY_BG,'CANCELLED':AMBER_BG
    };

    let currentCol='';
    const rows=L.map(line=>{
      if(line.type==='heading'){
        currentCol=line.text;
        return`<div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${colColor[line.text]};margin:14px 0 6px;padding-bottom:4px;border-bottom:1.5px solid ${colColor[line.text]}">${line.text}</div>`;
      }
      const noteLines=line.note?noteHtml(line.note):'';
      const completedDate=line.completedDate??null;
      const dateDisplay=completedDate?`<div style="margin-top:4px;font-size:11px;color:${TEXT2}">Completed: ${completedDate}</div>`:'';
      const pct=!completedDate&&line.progress!==null&&line.progress!==undefined?line.progress:null;
      const pBar=pct!==null?`<div style="margin-top:4px;display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:4px;background:${ITEM_BORDER};border-radius:2px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${colColor[currentCol]};border-radius:2px"></div>
        </div>
        <span style="font-size:10px;font-weight:500;color:${colColor[currentCol]};min-width:26px;text-align:right">${pct}%</span>
      </div>`:'';
      return`<div style="margin-bottom:6px;padding:7px 10px;background:${colBg[currentCol]};border-radius:6px;border:.5px solid ${ITEM_BORDER};border-left:3px solid ${colColor[currentCol]}">
        <div style="font-size:12px;font-weight:500;color:${TEXT}">${esc(line.text)}</div>
        ${dateDisplay}
        ${pBar}
        ${noteLines}
      </div>`;
    }).join('');

    return`<div style="margin-bottom:28px;page-break-inside:avoid">
      <div style="font-size:22px;font-weight:600;color:${TEXT};margin-bottom:6px;letter-spacing:-.02em">${getMonthLabelFromKey(k)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid ${DIVIDER}">
        <span style="font-size:12px;font-weight:500;background:${GREEN_BG};color:${GREEN};border-radius:5px;padding:3px 10px">${w.doing.length} in progress</span>
        <span style="font-size:12px;font-weight:500;background:${BLUE_BG};color:${BLUE};border-radius:5px;padding:3px 10px">${w.planned.length} planned</span>
        <span style="font-size:12px;font-weight:500;background:${RED_BG};color:${RED};border-radius:5px;padding:3px 10px">${w.blocked.length} blocked</span>
        <span style="font-size:12px;font-weight:500;background:${GREY_BG};color:${GREY};border-radius:5px;padding:3px 10px">${w.done.length} completed</span>
        <span style="font-size:12px;font-weight:500;background:${AMBER_BG};color:${AMBER};border-radius:5px;padding:3px 10px">${w.cancelled.length} cancelled</span>
      </div>
      ${rows}
    </div>`;
  }).join('');

  const now=new Date();
  const generated=formatFullDateWithWeekday(now);

  return`<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8">
  <title>Monthly Update</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:${BG};color:${TEXT};padding:32px 40px;font-size:13px;line-height:1.6}
    @media print{
      body{padding:20px 28px;background:${BG} !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{margin:1.2cm 1.5cm;size:A4}
    }
  </style>
  </head><body>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid ${TITLE_LINE}">
    <div>
      <div style="font-size:22px;font-weight:600;letter-spacing:-.02em;color:${TEXT}">Monthly Update</div>
      <div style="font-size:12px;color:${TEXT2};margin-top:2px">Generated ${generated}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:${TEXT2};padding-top:4px">${keys.length} month${keys.length>1?'s':''} included</div>
  </div>
  ${weekSections||`<p style="color:${TEXT3};font-style:italic">No data to display.</p>`}
  </body></html>`;
}

// ── Global search ─────────────────────────────────────────
let _searchTimer = null;
function debouncedSearch(val) {
  clearTimeout(_searchTimer);
  if (!val.trim()) { performGlobalSearch(val); return; }
  _searchTimer = setTimeout(() => performGlobalSearch(val), 250);
}

/**
 * Searches all months and tasks for a matching query string.
 * Searches both task titles and note content (case-insensitive).
 * Displays results in a modal sorted by month.
 * @param {string} query - Search term entered by user
 * @returns {void}
 */
function performGlobalSearch(query) {
  if (!query.trim()) {
    closeModal('search-modal');
    return;
  }
  const results = [];
  const STATUS_LABELS = { doing: 'In progress', planned: 'Planned', blocked: 'Blocked', done: 'Completed', cancelled: 'Cancelled' };
  Object.keys(weeks).forEach(k => {
    const w = weeks[k];
    [...COLS, 'done', 'cancelled'].forEach(col => {
      (w[col] || []).forEach(it => {
        if (it.text.toLowerCase().includes(query.toLowerCase()) ||
            (it.note && it.note.toLowerCase().includes(query.toLowerCase()))) {
          results.push({ month: k, item: it, monthLabel: getMonthLabelFromKey(k), col });
        }
      });
    });
  });

  results.sort((a, b) => b.month.localeCompare(a.month));
  const html = results.length === 0
    ? '<div style="color:var(--text-3);font-style:italic;padding:20px;text-align:center">No matches found.</div>'
    : results.map(r => `
      <div style="padding:10px;border-bottom:.5px solid var(--border);">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:4px">${r.monthLabel} · ${STATUS_LABELS[r.col] || r.col}</div>
        <div style="font-weight:500">${esc(r.item.text)}</div>
        ${r.item.note ? `<div style="font-size:12px;color:var(--text-2);margin-top:6px">${renderNoteHtml(r.item.note.slice(0,200))}${r.item.note.length>200?'…':''}</div>` : ''}
      </div>
    `).join('');

  document.getElementById('search-results').innerHTML = html;
  openModal('search-modal');
}

function launchConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colours = ['#1a7a56','#1a5fa8','#b83232','#9a6200','#6b3fa0','#f0b429','#3ecf8e','#5b9cf6','#f07070','#b07ef5'];
  const particles = Array.from({length: 130}, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 120,
    w: 7 + Math.random() * 7,
    h: 4 + Math.random() * 5,
    color: colours[Math.floor(Math.random() * colours.length)],
    vx: (Math.random() - 0.5) * 5,
    vy: 3 + Math.random() * 5,
    tilt: Math.random() * Math.PI * 2,
    tiltV: (Math.random() - 0.5) * 0.18,
    alpha: 1
  }));
  const start = performance.now();
  function tick(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = now - start;
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.tilt += p.tiltV;
      p.vy += 0.13;
      if (elapsed > 1800) p.alpha = Math.max(0, p.alpha - 0.022);
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tilt);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });
    if (alive && elapsed < 4000) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
}

// Global variable to track what is being dragged
let draggedItem = null;

function dragStart(e) {
  draggedItem = e.currentTarget;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ''); // Firefox fix
}

function dragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedItem = null;
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.currentTarget;
  if (item !== draggedItem) item.classList.add('drag-over');
}

function dragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function drop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove('drag-over');

  if (!draggedItem || draggedItem === target) return;

  const fromCol = draggedItem.dataset.col;
  const fromIdx = parseInt(draggedItem.dataset.index);
  const toCol = target.dataset.col;
  const toIdx = parseInt(target.dataset.index);

  const w = getOrCreate(currentKey);
  const [moved] = w[fromCol].splice(fromIdx, 1);
  const insertIdx = (fromCol === toCol && toIdx > fromIdx) ? toIdx - 1 : toIdx;
  w[toCol].splice(insertIdx, 0, moved);

  normalizeOrders(w);   // Important: re-assign order values
  save();
  render();
}

// Run once everything is defined
load();
init();
