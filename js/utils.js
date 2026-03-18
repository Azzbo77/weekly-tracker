function formatMonthYear(date) {
  return date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}

function formatFullDate(date) {
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFullDateWithWeekday(date) {
  return date.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function closeAllOpenElements() {
  document.querySelectorAll('.mv-menu.open, .date-picker.open').forEach(el => el.classList.remove('open'));
}

function clearAllToasts() {
  document.querySelectorAll('.toast').forEach(el => el.remove());
}

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
    btn.addEventListener('click', () => {
      actionFn();
      t.remove();
    });
  }

  if (duration > 0) {
    setTimeout(() => {
      if (t.parentNode) t.remove();
    }, duration);
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}