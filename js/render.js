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

  const createdLabel = it.createdDate
    ? `<span class="item-created">Added ${it.createdDate}</span>`
    : '';

  const mid = `mm-${col}-${i}`;
  const mopts = COLS.filter(c => c !== col).map(c =>
    `<button class="mv-opt" onclick="moveItem('${col}',${i},'${c}');event.stopPropagation()">
      <span class="mv-dot" style="background:${COL_COLORS[c]}"></span>${COL_LABELS[c]}
    </button>`
  ).join('');

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
           title="${it.priority === 'high' ? 'Priority: High' : it.priority === 'low' ? 'Priority: Low' : 'Priority: Medium'} \u2014 click to change"></div>

      ${taskNameHtml}
      <div class="ibtns">
        <button class="ibt tick" title="Mark as complete" onclick="markDone('${col}',${i})">&#10003;</button>
        <button class="ibt xbt" title="Mark as cancelled" onclick="markCancelled('${col}',${i})">&#10007;</button>
        <div class="mv-wrap">
          <button class="ibt" title="Move to another column" onclick="toggleMoveMenu(event,'${mid}')">&#8594;</button>
          <div class="mv-menu" id="${mid}">${mopts}</div>
        </div>
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
    ${createdLabel}
    ${noteHtml}
  </div>`;
}

function renderResolved(sec, it, i) {
  const isCan = sec === 'cancelled';
  // Strip internal resolution tags before displaying the note — they're for data extraction only
  const displayNote = it.note
    ? it.note
        .replace(/\n\n\[Completed\][^]*$/, '')
        .replace(/\n\n\[Cancelled\][^]*$/, '')
        .replace(/^\[Completed\][^]*$/, '')
        .replace(/^\[Cancelled\][^]*$/, '')
        .trimEnd()
    : '';
  const noteHtml = displayNote ? `<div class="note-view">${renderNoteHtml(displayNote)}</div>` : '';
  const tags = it.carried ? `<span class="tag t-car">carried</span>` : '';
  const tc = isCan ? 'can-txt' : 'struck';
  const ct = isCan ? `<span class="tag t-can">cancelled</span>` : '';
  const completedDateHtml = !isCan && it.completedDate ? `<span class="tag t-date" title="Completed on ${it.completedDate}">Completed: ${it.completedDate}</span>` : '';
  const cancelledDateHtml = isCan && it.cancelledDate ? `<span class="tag t-date" title="Cancelled on ${it.cancelledDate}">Cancelled: ${it.cancelledDate}</span>` : '';
  const createdDateHtml = it.createdDate ? `<span class="tag t-created" title="Created on ${it.createdDate}">Created: ${it.createdDate}</span>` : '';
  const achievementHtml = !isCan && it.achievement ? `<span class="tag t-ach" title="Marked as achievement">achievement</span>` : '';
  const priorityDot = `<div class="priority-dot ${it.priority === 'high' ? 'p-high' : it.priority === 'med' ? 'p-med' : 'p-low'}"></div>`;
  return `<div class="item ${isCan?'i-ca':'i-dn'}">
    <div class="item-top">
      ${priorityDot}
      <span class="item-txt ${tc}">${esc(it.text)}${tags}${createdDateHtml}${completedDateHtml}${cancelledDateHtml}${achievementHtml}${ct}</span>
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
    // Smart empty state: if there are resolved tasks this month, be encouraging
    if (w[col].length === 0) {
      const hasResolved = w.done.length > 0 || w.cancelled.length > 0;
      el.innerHTML = `<div class="empty">${hasResolved ? 'All tasks resolved this month' : 'Nothing here yet'}</div>`;
    } else {
      el.innerHTML = w[col].map((it, i) => renderItem(col, it, i)).join('');
    }
    // Update sort button label to reflect current sorted state
    const sortBtn = document.getElementById('sort-btn-' + col);
    if (sortBtn) {
      if (colSorted[col]) {
        sortBtn.textContent = '✓ Sorted';
        sortBtn.title = 'Currently sorted by priority — drag to reorder, or click to re-sort';
        sortBtn.style.color = 'var(--green)';
      } else {
        sortBtn.textContent = '↕ Priority';
        sortBtn.title = 'Sort by priority (High → Med → Low)';
        sortBtn.style.color = '';
      }
    }
  });
  ['done','cancelled'].forEach(sec => {
    document.getElementById('cnt-' + sec).textContent = w[sec].length;
    const el = document.getElementById('list-' + sec);
    const secLabel = sec === 'done' ? 'completed' : 'cancelled';
    el.innerHTML = w[sec].length === 0 ? `<div class="empty">No ${secLabel} tasks</div>` : w[sec].map((it, i) => renderResolved(sec, it, i)).join('');
  });
  updateSummary(w);
  setupColumnDropZones();
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
    const isResolved = title === 'COMPLETED' || title === 'CANCELLED';
    items.forEach(it => {
      let line = ` \u2022 ${it.text}`;

      if (!isResolved) {
        // Active tasks: show priority, flags and progress
        if (it.priority === 'high') line += ' [High Priority]';
        else if (it.priority === 'low') line += ' [Low Priority]';
        if (it.ongoing) line += ' [ongoing]';
        if (it.carried) line += ' [carried]';
        if (it.progress != null) line += ` \u2014 ${it.progress}% complete`;
      } else {
        // Resolved tasks: created date first, then resolution date
        if (it.createdDate) line += ` \u2014 Created: ${it.createdDate}`;
        if (it.completedDate) line += ` \u2014 Completed: ${it.completedDate}`;
        else if (it.cancelledDate) line += ` \u2014 Cancelled: ${it.cancelledDate}`;
      }
      L.push(line);

      if (!isResolved) {
        // Active tasks: include full note content
        if (it.note) {
          noteToUpdateLines(it.note).forEach(noteLine => L.push(`     ${noteLine}`));
        }
      } else {
        // Resolved tasks: only the resolution note from the toast, if one was saved
        const resNote = extractResolutionNote(it.note);
        const resLabel = title === 'COMPLETED' ? 'Completion Note' : 'Cancellation Note';
        if (resNote) L.push(`     ${resLabel}: ${resNote}`);
      }
    });
    L.push('');
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
  // Prepend a generated-on line to the copied text so it's self-contained
  // when pasted into email or Slack, without cluttering the on-screen preview.
  const generated = `Generated: ${formatFullDate(new Date())}\n\n`;
  navigator.clipboard.writeText(generated + txt).then(() => {
    const el = document.getElementById('copy-ok');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), TIMING.COPY_CONFIRMATION_FADE);
  }).catch(() => showToast('Copy failed \u2014 please copy the text manually.', 'error', null, null, 4000));
}




