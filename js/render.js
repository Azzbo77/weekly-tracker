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
        <button class="ntb-btn" onclick="insertBullet('${tid}')">&#x2022; List</button>
        <div class="ntb-sep"></div>
        <button class="ntb-btn ntb-strike" onclick="insertStrike('${tid}')">S</button>
        <div class="ntb-sep"></div>
        <div class="date-picker-wrapper">
          <button class="ntb-btn" onclick="toggleDatePicker('${tid}')" title="Insert date">&#x1F4C5;</button>
          <div class="date-picker" id="dp-${tid}"></div>
        </div>
      </div>
      <textarea class="note-area" id="${tid}" onkeydown="handleNoteKey(event,'${col}',${i})">${esc(it.note || '')}</textarea>
      <div class="note-ft">
        <div class="prog-input-wrap">
          <label for="prog-${k}">Progress</label>
          <input class="prog-input" id="prog-${k}" type="text" inputmode="numeric" placeholder="0&#x2013;100"
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
        &#x1F441;
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

  return `<div class="item i-${col.slice(0, 2)}" 
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
           title="${it.priority === 'high' ? 'Priority: High \u2014 click to set Medium' : it.priority === 'low' ? 'Priority: Low \u2014 click to set Medium' : 'Priority: Medium \u2014 click to set High'}"></div>

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
    container.ondragleave = e => { if (!container.contains(e.relatedTarget)) container.classList.remove('drag-over'); };
    container.ondrop = e => {
      e.preventDefault();
      e.stopPropagation();
      container.classList.remove('drag-over');
      if (!draggedItem) return;
      const fromCol = draggedItem.dataset.col;
      if (fromCol === col) return;
      const w = getOrCreate(currentKey);
      const idx = parseInt(draggedItem.dataset.index);
      if (isNaN(idx) || idx < 0 || idx >= w[fromCol].length) return;
      const [movedTask] = w[fromCol].splice(idx, 1);
      if (!movedTask) return;
      w[col].push(movedTask);
      normalizeOrders(w);
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
  L.push(`Monthly update \u2014 ${getMonthLabel(monthOffset)}`, '');

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
      let line = ` \u2022 ${it.text}`;
      if (it.priority === 'high') line += ' [High Priority]';
      else if (it.priority === 'low') line += ' [Low Priority]';

      if (it.ongoing) line += ' [ongoing]';
      if (it.carried) line += ' [carried]';
      if (it.completedDate) line += ` \u2014 Completed: ${it.completedDate}`;
      else if (it.progress != null) line += ` \u2014 ${it.progress}% complete`;
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
  }).catch(() => showToast('Copy failed \u2014 please copy the text manually.', 'error', null, null, 4000));
}

function init() {
  refresh();
}

function refresh() {
  currentKey = monthKey(monthOffset);
  const w = getOrCreate(currentKey);
  normalizeOrders(w);
  document.getElementById('wk-lbl').textContent = getMonthLabel(monthOffset);
  _syncTodayBtn();
  ['done', 'cancelled'].forEach(sec => {
    const body = document.getElementById('body-' + sec);
    const tog = document.getElementById('tog-' + sec);
    if (body) body.style.display = secOpen[sec] ? 'block' : 'none';
    if (tog) tog.innerHTML = secOpen[sec] ? '&#9660;' : '&#9654;';
  });
  checkCarry();
  render();
}

