// â”€â”€ Month helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Carry over â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

