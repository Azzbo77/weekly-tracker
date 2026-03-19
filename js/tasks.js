// -- Item actions --
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
  showToast(`${COL_LABELS[col]} sorted by priority.`, 'info', null, null, 2500);
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
    const target = getOrCreate(currentKey)[col];
    target.splice(Math.min(i, target.length), 0, removed);
    save();
    render();
  });
}

function markDone(col, i) {
  const w = getOrCreate(currentKey);
  const it = w[col].splice(i, 1)[0];
  shiftEditingKeys(col, i);
  if (it.progress !== null && it.progress !== undefined) it.progress = 100;
  it.completedFrom = col;
  it.completedDate = new Date().toISOString().slice(0, DATE.ISO_DATE_SLICE);
  w.done.push(it);
  save();
  render();
  launchConfetti();
  // Offer an optional completion note -- delayed so confetti renders first
  setTimeout(() => {
    showNoteToast('Add a completion note… (optional)', 'var(--green)', val => {
      it.note = it.note ? it.note + '\n\n[Completed] ' + val : '[Completed] ' + val;
      save();
      render();
    });
  }, 400);
}

function markCancelled(col, i) {
  const w = getOrCreate(currentKey);
  const it = w[col].splice(i, 1)[0];
  shiftEditingKeys(col, i);
  it.cancelledFrom = col;
  it.cancelledDate = new Date().toISOString().slice(0, DATE.ISO_DATE_SLICE);
  w.cancelled.push(it);
  save();
  render();
  // Offer an optional cancellation reason note
  setTimeout(() => {
    showNoteToast('Add a reason for cancelling… (optional)', 'var(--amber)', val => {
      it.note = it.note ? it.note + '\n\n[Cancelled] ' + val : '[Cancelled] ' + val;
      save();
      render();
    });
  }, 100);
}

function restoreItem(sec, i) {
  const w = getOrCreate(currentKey);
  const it = w[sec].splice(i, 1)[0];
  const col = COLS.includes(it.completedFrom) ? it.completedFrom :
              COLS.includes(it.cancelledFrom) ? it.cancelledFrom : 'doing';
  // Clear resolution metadata so the task is clean when reactivated
  delete it.completedFrom;
  delete it.completedDate;
  delete it.cancelledFrom;
  delete it.cancelledDate;
  // Strip any completion/cancellation note appended by the note toast.
  // Two cases: note was the entire content (starts with tag),
  // or it was appended after existing content (preceded by \n\n).
  if (it.note) {
    it.note = it.note
      .replace(/\n\n\[Completed\][^]*$/, '')
      .replace(/\n\n\[Cancelled\][^]*$/, '')
      .replace(/^\[Completed\][^]*$/, '')
      .replace(/^\[Cancelled\][^]*$/, '')
      .trimEnd();
  }
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
    const target = getOrCreate(currentKey)[sec];
    target.splice(Math.min(i, target.length), 0, removed);
    save();
    render();
  });
}

function clearSec(sec) {
  const w = getOrCreate(currentKey);
  if (w[sec].length === 0) return;
  const snapshot = structuredClone(w[sec]);
  w[sec] = [];
  save();
  render();
  showToast(`Cleared all ${sec} tasks.`, 'warning', 'Undo', () => {
    getOrCreate(currentKey)[sec] = snapshot;
    save();
    render();
    showToast('Undo successful \u2014 tasks restored.', 'success', null, null, 3000);
  }, TIMING.TOAST_DEFAULT_DURATION);
}

function moveItem(fc, i, tc) {
  if (fc === tc) return;
  const w = getOrCreate(currentKey);
  // Clear editor state for the moved task and shift indices for tasks below it
  // in the source column, so no editor ends up applied to the wrong task.
  shiftEditingKeys(fc, i);
  w[tc].push(w[fc].splice(i, 1)[0]);
  normalizeOrders(w);
  save();
  render();
}

function toggleMoveMenu(e, id) {
  e.stopPropagation();
  document.querySelectorAll('.mv-menu.open').forEach(m => { if (m.id !== id) m.classList.remove('open'); });
  document.getElementById(id).classList.toggle('open');
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
        inp.setSelectionRange(0, inp.value.length);
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
  const progInp = document.getElementById('prog-' + k);
  if (progInp) setProgress(col, i, progInp.value, false);
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

