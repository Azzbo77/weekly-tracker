// ── Drag and drop ─────────────────────────────────────────────────────────────

function dragStart(e) {
  draggedItem = e.currentTarget;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ''); // Required for Firefox
}

function dragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedItem = null;
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.currentTarget;
  if (item !== draggedItem) item.classList.add('drag-over');
}

function dragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drag-over');
}

/**
 * Handles dropping a dragged task onto another task (item-level drop).
 * Moving within the same column reorders; moving to a different column inserts at target position.
 * Normalises order values and saves after every drop.
 * @param {DragEvent} e
 * @returns {void}
 */
function drop(e) {
  e.preventDefault();
  e.stopPropagation(); // Prevent bubbling to the column container drop handler
  const target = e.currentTarget;
  target.classList.remove('drag-over');

  if (!draggedItem || draggedItem === target) return;

  const fromCol = draggedItem.dataset.col;
  const fromIdx = parseInt(draggedItem.dataset.index, 10);
  const toCol = target.dataset.col;
  const toIdx = parseInt(target.dataset.index, 10);

  if (isNaN(fromIdx) || isNaN(toIdx)) return;

  const w = getOrCreate(currentKey);
  if (fromIdx < 0 || fromIdx >= w[fromCol].length) return;

  const [moved] = w[fromCol].splice(fromIdx, 1);
  const insertIdx = (fromCol === toCol && toIdx > fromIdx) ? toIdx - 1 : toIdx;
  w[toCol].splice(insertIdx, 0, moved);

  normalizeOrders(w);
  save();
  render();
}

/**
 * Wires up each active column container as a drop zone.
 * Called after every render() so the containers are always live.
 * Handles the case where a task is dropped onto the empty space in a column
 * (i.e. not onto a specific task item) — appends it to the end of that column.
 * @returns {void}
 */
function setupColumnDropZones() {
  COLS.forEach(col => {
    const container = document.getElementById('list-' + col);
    if (!container) return;

    container.ondragover = e => {
      e.preventDefault();
      container.classList.add('drag-over');
    };

    container.ondragleave = e => {
      if (!container.contains(e.relatedTarget)) container.classList.remove('drag-over');
    };

    container.ondrop = e => {
      e.preventDefault();
      e.stopPropagation();
      container.classList.remove('drag-over');
      if (!draggedItem) return;

      const fromCol = draggedItem.dataset.col;
      if (fromCol === col) return; // Reordering within same column is handled by item-level drop

      const w = getOrCreate(currentKey);
      const idx = parseInt(draggedItem.dataset.index, 10);
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
