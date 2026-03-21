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
/**
 * Shows a toast with an embedded text input and optional achievement checkbox
 * for capturing a completion note and flagging the task as an achievement.
 * Pressing Enter confirms; Escape or Skip dismisses without saving.
 * Does NOT auto-dismiss — stays until the user explicitly saves or skips.
 * @param {string}   label       - Label shown above the input
 * @param {string}   accentColor - CSS colour for the left border accent
 * @param {function} onSave      - Called with (noteText, isAchievement) on confirm
 * @param {boolean}  [showAchievement=false] - Whether to show the achievement checkbox
 */
function showNoteToast(label, accentColor, onSave, showAchievement = false) {
  // Only clear other note toasts — do not kill action toasts like delete Undo
  document.querySelectorAll('.toast-note').forEach(el => el.remove());

  const t = document.createElement('div');
  t.setAttribute('role', 'dialog');
  t.setAttribute('aria-label', 'Optional note');
  t.className = 'toast toast-note';
  t.style.cssText = `border-left: 4px solid ${accentColor};`;

  const labelEl = document.createElement('span');
  labelEl.className = 'toast-note-label';
  labelEl.textContent = label;

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'toast-input';
  inp.placeholder = 'Type a note…';
  inp.maxLength = 200;

  // Achievement checkbox — only shown on completion toast, not cancellation
  let achCheck = null;
  if (showAchievement) {
    const achRow = document.createElement('label');
    achRow.className = 'toast-ach-row';
    achRow.title = 'Flag this as an achievement for your appraisal report';
    achCheck = document.createElement('input');
    achCheck.type = 'checkbox';
    achCheck.className = 'toast-ach-check';
    const achLabel = document.createElement('span');
    achLabel.textContent = 'Mark as achievement';
    achRow.appendChild(achCheck);
    achRow.appendChild(achLabel);
    t.appendChild(labelEl);
    t.appendChild(inp);
    t.appendChild(achRow);
  } else {
    t.appendChild(labelEl);
    t.appendChild(inp);
  }

  const saveBtn = document.createElement('button');
  saveBtn.className = 'toast-action-btn toast-action-btn--accent';
  saveBtn.style.cssText = `background:${accentColor};border-color:${accentColor};`;
  saveBtn.textContent = 'Save';

  const skipBtn = document.createElement('button');
  skipBtn.className = 'toast-action-btn';
  skipBtn.textContent = 'Skip';

  const actionsRow = document.createElement('div');
  actionsRow.className = 'toast-note-actions';
  actionsRow.appendChild(saveBtn);
  actionsRow.appendChild(skipBtn);
  t.appendChild(actionsRow);

  document.body.appendChild(t);
  setTimeout(() => inp.focus(), 50);

  const confirm = () => {
    const val = inp.value.trim();
    const isAch = achCheck ? achCheck.checked : false;
    t.remove();
    onSave(val, isAch);
  };

  const dismiss = () => t.remove();

  saveBtn.addEventListener('click', confirm);
  skipBtn.addEventListener('click', dismiss);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
  });
}

/**
 * Returns today's date as a DD/MM/YYYY string for display on task cards.
 * Distinct from ISO date slicing which is used only for month keys and internal logic.
 * @returns {string} e.g. "20/03/2026"
 */
function todayDisplayDate() {
  const d = new Date();
  return String(d.getDate()).padStart(2, '0') + '/' +
         String(d.getMonth() + 1).padStart(2, '0') + '/' +
         d.getFullYear();
}
