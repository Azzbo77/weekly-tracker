// -- Note formatting --
function handleNoteKey(e, col, i) {
  const ta = e.target;
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNote(col, i); return; }
  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
    const pos = ta.selectionStart, val = ta.value;
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const lineContent = val.substring(lineStart, pos);
    if (lineContent.startsWith('\u2022 ')) {
      e.preventDefault();
      if (lineContent === '\u2022 ') {
        ta.value = val.substring(0, lineStart) + val.substring(pos);
        ta.selectionStart = ta.selectionEnd = lineStart;
      } else {
        const insert = '\n\u2022 ';
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
  if (line.startsWith('\u2022 ')) {
    ta.value = val.substring(0, ls) + line.substring(2) + val.substring(ls + line.length);
    ta.selectionStart = ta.selectionEnd = Math.max(ls, s - 2);
  } else {
    ta.value = val.substring(0, ls) + '\u2022 ' + val.substring(ls);
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
      <button class="dp-btn" aria-label="Previous month" onclick="changeDateMonth(-1,'${taId}')">&#x25C0;</button>
      <button class="dp-btn" aria-label="Next month" onclick="changeDateMonth(1,'${taId}')">&#x25B6;</button>
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
    const isToday = d.toISOString().slice(0, DATE.ISO_DATE_SLICE) === new Date().toISOString().slice(0, DATE.ISO_DATE_SLICE);
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
  const dateStr = String(d.getDate()).padStart(2,'0') + '/' +
                  String(d.getMonth()+1).padStart(2,'0') + '/' +
                  String(d.getFullYear()).slice(-2);
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
    if (line.startsWith('\u2022 ') || line === '\u2022') {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${fmt.replace(/^\u2022\s*/,'')}</li>`;
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
      // Replace strikethrough on all lines first
      const stripped = line.replace(/~~(.*?)~~/g, '$1 [Done]');
      // Remove leading bullet if present and replace with dash for notes
      if (stripped.startsWith('\u2022 ')) {
        return `- ${stripped.slice(2)}`;
      }
      if (stripped.startsWith('\u2022')) {
        return `- ${stripped.slice(1).trim()}`;
      }
      return stripped;
    });
}

/**
 * Renders an individual task item as HTML with action buttons, editors, and metadata.
 * Handles both expanded (editing) and collapsed states, including note editor and progress bar.
 * @param {string} col - Column identifier ('doing', 'planned', 'blocked')
 * @param {Object} it - Task item object containing {text, note, progress, priority, ongoing, carried, etc}
 * @param {number} i - Zero-based index of the task within its column
 * @returns {string} HTML string ready to insert into the DOM
 */

/**
 * Extracts only the resolution note added by the completion/cancellation toast.
 * Returns the text after [Completed] or [Cancelled] if present, otherwise empty string.
 * Used by the manager update and PDF to show a high-level resolution reason
 * without exposing the full working notes.
 * @param {string} note - Raw note content
 * @returns {string} The resolution note text, or '' if none was saved
 */
function extractResolutionNote(note) {
  if (!note) return '';
  const match = note.match(/\[Completed\] (.+)$/) || note.match(/\[Cancelled\] (.+)$/);
  return match ? match[1].trim() : '';
}
