// ── Global search ─────────────────────────────────────────────────────────────
let _searchTimer = null;
function debouncedSearch(val) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => performGlobalSearch(val), 250);
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
            <div style="font-size:12px;color:var(--text-3);margin-bottom:4px">${r.monthLabel} &middot; ${STATUS_LABELS[r.col] || r.col}</div>
            <div style="font-weight:500">${esc(r.item.text)}</div>
            ${notePreview}
          </div>`;
      }).join('');

  document.getElementById('search-results').innerHTML = html;
  openModal('search-modal');
}

// ── Confetti ──────────────────────────────────────────────────────────────────
/**
 * Launches a short confetti animation on task completion.
 * Respects the prefers-reduced-motion media query and skips if set.
 * @returns {void}
 */
function launchConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const colours = [
    '#1a7a56', '#1a5fa8', '#b83232', '#9a6200', '#6b3fa0',
    '#f0b429', '#3ecf8e', '#5b9cf6', '#f07070', '#b07ef5'
  ];

  const particles = Array.from({ length: 130 }, () => ({
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
