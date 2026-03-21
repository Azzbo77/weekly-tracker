// -- Month helpers --
function monthKey(off) {
  const now = new Date();
  const mon = new Date(now.getFullYear(), now.getMonth() + off, 1);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
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
  if (!weeks[k].done) weeks[k].done = [];
  if (!weeks[k].cancelled) weeks[k].cancelled = [];
  return weeks[k];
}

// -- Carry over --
function checkCarry() {
  const bar = document.getElementById('carry-bar');
  const prev = Object.keys(weeks).filter(k => k < currentKey).sort();
  let n = 0;
  const monthCounts = {};
  let totalDoing = 0, totalPlanned = 0, totalBlocked = 0;
  prev.forEach(k => {
    const w = weeks[k];
    const cnt = w.doing.length + w.planned.length + w.blocked.length;
    if (cnt > 0) {
      n += cnt;
      monthCounts[k] = cnt;
      totalDoing += w.doing.length;
      totalPlanned += w.planned.length;
      totalBlocked += w.blocked.length;
    }
  });
  if (n > 0) {
    bar.style.display = 'flex';
    const prevMonths = Object.keys(monthCounts).length;
    const sourceMsg = prevMonths === 1
      ? 'from ' + getMonthLabelFromKey(Object.keys(monthCounts)[0])
      : 'from ' + prevMonths + ' previous month' + (prevMonths > 1 ? 's' : '');
    // Build a column breakdown string, only showing non-zero columns
    const breakdown = [
      totalDoing > 0 ? `${totalDoing} in progress` : '',
      totalPlanned > 0 ? `${totalPlanned} planned` : '',
      totalBlocked > 0 ? `${totalBlocked} blocked` : '',
    ].filter(Boolean).join(', ');
    document.getElementById('carry-msg').textContent =
      `${n} incomplete task${n > 1 ? 's' : ''} ${sourceMsg} (${breakdown}).`;
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

  Object.keys(editing).forEach(k => delete editing[k]);
  Object.keys(editingName).forEach(k => delete editingName[k]);

  // Snapshot for undo
  const snapshot = {
    cur: { doing: structuredClone(cur.doing), planned: structuredClone(cur.planned), blocked: structuredClone(cur.blocked) },
    sources: Object.fromEntries(prev.map(k => [k, {
      doing: structuredClone(weeks[k].doing),
      planned: structuredClone(weeks[k].planned),
      blocked: structuredClone(weeks[k].blocked)
    }]))
  };

  prev.forEach(k => {
    const w = weeks[k];
    COLS.forEach(col => {
      const clonedBatch = w[col].map(it => {
        const cloned = structuredClone(it);
        cloned.carried = true;
        cloned.order = undefined;
        delete cloned.achievement; // achievement flag belongs to the completion event, not the task itself
        return cloned;
      });
      cur[col].unshift(...clonedBatch);
      carriedCount += clonedBatch.length;
      w[col] = [];
    });
  });

  normalizeOrders(cur);
  save();
  document.getElementById('carry-bar').style.display = 'none';
  render();

  if (carriedCount > 0) {
    showToast(`Carried ${carriedCount} task${carriedCount > 1 ? 's' : ''} to this month.`, 'success', 'Undo', () => {
      COLS.forEach(col => { cur[col] = snapshot.cur[col]; });
      Object.entries(snapshot.sources).forEach(([k, src]) => {
        COLS.forEach(col => { weeks[k][col] = src[col]; });
      });
      normalizeOrders(cur);
      save();
      checkCarry();
      render();
      showToast('Carry undone — tasks restored to previous months.', 'success', null, null, 3000);
    }, TIMING.TOAST_DEFAULT_DURATION);
  }
}

function dismissCarry() {
  const bar = document.getElementById('carry-bar');
  if (bar.style.display === 'none') return;
  bar.style.display = 'none';
  showToast('Carry banner dismissed.', 'info', 'Undo', () => {
    checkCarry();
  }, TIMING.TOAST_DEFAULT_DURATION);
}

function _syncTodayBtn() {
  const btn = document.getElementById('btn-today');
  if (btn) btn.style.display = monthOffset === 0 ? 'none' : '';
}

function changeMonth(dir) {
  monthOffset += dir;
  currentKey = monthKey(monthOffset);
  getOrCreate(currentKey);
  document.getElementById('wk-lbl').textContent = getMonthLabel(monthOffset);
  _syncTodayBtn();
  save();
  checkCarry();
  render();
}

function goToCurrentMonth() {
  if (monthOffset === 0) return;
  monthOffset = 0;
  currentKey = monthKey(0);
  getOrCreate(currentKey);
  document.getElementById('wk-lbl').textContent = getMonthLabel(0);
  _syncTodayBtn();
  save();
  checkCarry();
  render();
}
