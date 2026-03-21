// -- Global search --
let _searchTimer = null;
function debouncedSearch(val) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => performGlobalSearch(val), 250);
}

/**
 * Navigates to the month containing a search result and closes the search modal.
 * Calculates the offset from the current real month to the target month key.
 * @param {string} targetKey - Month key in YYYY-MM-01 format
 * @returns {void}
 */
function goToMonthFromSearch(targetKey) {
  const now = new Date();
  const target = new Date(targetKey + 'T00:00:00');
  // Calculate offset in whole months between now and target
  const newOffset = (target.getFullYear() - now.getFullYear()) * 12
                  + (target.getMonth() - now.getMonth());
  monthOffset = newOffset;
  currentKey = targetKey;
  getOrCreate(currentKey);
  document.getElementById('wk-lbl').textContent = getMonthLabel(monthOffset);
  _syncTodayBtn();
  save();
  checkCarry();
  render();
  closeModal('search-modal');
}

/**
 * Searches all months and tasks for a matching query string.
 * Searches both task titles and note content (case-insensitive).
 * Displays results in a modal sorted by month (most recent first).
 * @param {string} query - Search term entered by user
 * @returns {void}
 */
function performGlobalSearch(query) {
  if (!query.trim()) {
    closeModal('search-modal');
    return;
  }

  const STATUS_LABELS = {
    doing: 'In progress',
    planned: 'Planned',
    blocked: 'Blocked',
    done: 'Completed',
    cancelled: 'Cancelled'
  };

  const results = [];
  const q = query.toLowerCase();

  Object.keys(weeks).forEach(k => {
    const w = weeks[k];
    [...COLS, 'done', 'cancelled'].forEach(col => {
      (w[col] || []).forEach(it => {
        if (it.text.toLowerCase().includes(q) ||
            (it.note && it.note.toLowerCase().includes(q))) {
          results.push({ month: k, item: it, monthLabel: getMonthLabelFromKey(k), col });
        }
      });
    });
  });

  results.sort((a, b) => b.month.localeCompare(a.month));

  const html = results.length === 0
    ? '<div style="color:var(--text-3);font-style:italic;padding:20px;text-align:center">No matches found.</div>'
    : results.map(r => {
        const notePreview = r.item.note
          ? (() => {
              // Trim to 200 chars and close any open ~~ to avoid broken strikethrough rendering
              const s = r.item.note.slice(0, 200);
              const fixed = (s.match(/~~/g) || []).length % 2 ? s + '~~' : s;
              return `<div style="font-size:12px;color:var(--text-2);margin-top:6px">${renderNoteHtml(fixed)}${r.item.note.length > 200 ? '&#x2026;' : ''}</div>`;
            })()
          : '';
        return `
          <div style="padding:10px;border-bottom:.5px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;color:var(--text-3)">${r.monthLabel} &middot; ${STATUS_LABELS[r.col] || r.col}</span>
              <button onclick="goToMonthFromSearch('${r.month}')"
                style="font-size:11px;padding:2px 8px;border-radius:4px;border:.5px solid var(--border-mid);background:var(--surface2);color:var(--text-2);cursor:pointer;white-space:nowrap;font-family:inherit">
                Go to month
              </button>
            </div>
            <div style="font-weight:500">${esc(r.item.text)}</div>
            ${notePreview}
          </div>`;
      }).join('');

  document.getElementById('search-results').innerHTML = html;
  // Update the modal title to show result count
  const titleEl = document.querySelector('#search-modal .modal-title');
  if (titleEl) {
    titleEl.textContent = results.length === 0
      ? 'Search Results'
      : `${results.length} result${results.length === 1 ? '' : 's'} for \u201c${query.trim()}\u201d`;
  }
  openModal('search-modal');
}
