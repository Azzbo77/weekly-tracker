// -- Export / Import --

function openJsonExport() {
  // Default to all
  document.querySelector('input[name="json-range"][value="all"]').checked = true;
  document.getElementById('json-month-picker').style.display = 'none';
  openModal('json-modal');
}

function onJsonRangeChange() {
  const val = document.querySelector('input[name="json-range"]:checked').value;
  const picker = document.getElementById('json-month-picker');
  if (val === 'pick') {
    picker.style.display = 'flex';
    const keys = Object.keys(weeks).filter(k => {
      const w = weeks[k];
      return w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length > 0;
    }).sort().reverse();
    picker.innerHTML = keys.length === 0
      ? '<span style="font-size:12px;color:var(--text-3);font-style:italic">No months with data found.</span>'
      : keys.map(k => `
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-2);cursor:pointer">
          <input type="checkbox" value="${k}" checked style="accent-color:var(--blue)"> ${getMonthLabelFromKey(k)}
        </label>`).join('');
  } else {
    picker.style.display = 'none';
  }
}

function exportData() {
  const range = document.querySelector('input[name="json-range"]:checked').value;
  let keysToExport;

  if (range === 'current') {
    keysToExport = [currentKey];
  } else if (range === 'pick') {
    keysToExport = Array.from(document.querySelectorAll('#json-month-picker input[type=checkbox]:checked'))
      .map(c => c.value).sort();
    if (keysToExport.length === 0) {
      showToast('No months selected.', 'warning');
      return;
    }
  } else {
    // all — filter to months that have data
    keysToExport = null;
  }

  const toExport = {};
  Object.keys(weeks).forEach(k => {
    if (keysToExport && !keysToExport.includes(k)) return;
    const w = weeks[k];
    if (w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length > 0) {
      toExport[k] = w;
    }
  });

  const b = new Blob([JSON.stringify({ months: toExport, monthOffset }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'monthly-tracker-' + new Date().toISOString().slice(0, DATE.ISO_DATE_SLICE) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  closeModal('json-modal');
}

/**
 * Imports and processes exported monthly JSON data, replacing current local storage.
 * Validates data structure and displays appropriate error/success messages.
 * @returns {void}
 */
function doImport() {
  const importBtn = document.getElementById('import-confirm-btn');
  const origText = importBtn.textContent;
  importBtn.textContent = 'Importing\u2026';
  importBtn.disabled = true;

  try {
    const raw = document.getElementById('import-ta').value.trim();
    if (!raw) throw new Error('No data provided');

    const d = JSON.parse(raw);
    const data = d.months;
    const offset = typeof d.monthOffset === 'number' ? d.monthOffset : 0;

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('No valid monthly tracker data found. Make sure you are importing a monthly tracker export.');
    }

    // Stage new data before touching existing data -- prevents data loss on error
    const newData = {};
    Object.keys(data).forEach(key => {
      // Normalise key to YYYY-MM-01: accept YYYY-MM-DD, YYYY-MM, or YYYY-MM-01
      const keyMatch = key.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
      if (!keyMatch) throw new Error(`Invalid month key "${key}" in import data. Expected YYYY-MM or YYYY-MM-DD format.`);
      const month = parseInt(keyMatch[2], 10);
      if (month < 1 || month > 12) throw new Error(`Invalid month "${keyMatch[2]}" in key "${key}". Month must be 01–12.`);
      const normKey = `${keyMatch[1]}-${keyMatch[2]}-01`;

      const src = data[key];
      if (!src || typeof src !== 'object' || Array.isArray(src)) {
        throw new Error(`Invalid data for month "${key}" — expected an object.`);
      }
      if (!newData[normKey]) newData[normKey] = { doing: [], planned: [], blocked: [], done: [], cancelled: [] };
      const dest = newData[normKey];
      COLS.forEach(col => { if (Array.isArray(src[col])) dest[col].push(...src[col].map(item => structuredClone(item))); });
      if (Array.isArray(src.done)) dest.done.push(...src.done.map(item => structuredClone(item)));
      if (Array.isArray(src.cancelled)) dest.cancelled.push(...src.cancelled.map(item => structuredClone(item)));
    });

    // Only clear and replace once staging succeeded
    Object.keys(weeks).forEach(k => delete weeks[k]);
    Object.assign(weeks, newData);
    monthOffset = offset;
    save();
    closeModal('import-modal');
    document.getElementById('import-ta').value = '';
    init(); // defined in init.js -- re-initialises month state and re-renders
    showToast('Data imported successfully.', 'success');
  } catch (e) {
    showToast('Import failed: ' + e.message, 'error');
    console.error(e);
  } finally {
    importBtn.textContent = origText;
    importBtn.disabled = false;
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.value = '';
  }
}


// -- PDF Export --
function openPdfExport() {
  document.querySelector('input[name="pdf-range"][value="current"]').checked = true;
  document.querySelector('input[name="pdf-type"][value="full"]').checked = true;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelector(`input[name="pdf-theme"][value="${isDark ? 'dark' : 'light'}"]`).checked = true;
  document.getElementById('pdf-week-picker').style.display = 'none';
  openModal('pdf-modal');
}

function onPdfRangeChange() {
  const val = document.querySelector('input[name="pdf-range"]:checked').value;
  const picker = document.getElementById('pdf-week-picker');
  if (val === 'pick') {
    picker.style.display = 'flex';
    const keys = Object.keys(weeks).filter(k => {
      const w = weeks[k];
      return w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length > 0;
    }).sort().reverse();
    picker.innerHTML = keys.length === 0 ? '<span style="font-size:12px;color:var(--text-3);font-style:italic">No months with data found.</span>' : keys.map(k => `
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-2);cursor:pointer">
        <input type="checkbox" value="${k}" checked style="accent-color:var(--blue)"> ${getMonthLabelFromKey(k)}
      </label>`).join('');
  } else {
    picker.style.display = 'none';
  }
}

function generatePdf() {
  const range = document.querySelector('input[name="pdf-range"]:checked').value;
  const reportType = document.querySelector('input[name="pdf-type"]:checked').value;
  let keys = [];
  if (range === 'current') keys = [currentKey];
  else if (range === 'all') {
    keys = Object.keys(weeks).filter(k => {
      const w = weeks[k];
      return w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length > 0;
    }).sort();
  } else {
    keys = Array.from(document.querySelectorAll('#pdf-week-picker input[type=checkbox]:checked')).map(c => c.value).sort();
  }
  if (keys.length === 0) { showToast('No months selected or no data found.', 'warning'); return; }
  const theme = document.querySelector('input[name="pdf-theme"]:checked').value;
  closeModal('pdf-modal');
  const html = reportType === 'accomplishments'
    ? buildAccomplishmentsHtml(keys, theme)
    : buildPdfHtml(keys, theme);
  const win = window.open('', '_blank');
  if (!win) { showToast('Popup blocked. Please allow popups and try again.', 'warning'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, TIMING.PDF_PRINT_DIALOG_DELAY);
}
// buildPdfHtml -- generates a self-contained HTML document for printing/saving as PDF.
// Opens in a new tab; the browser's native print dialog handles PDF conversion.
// Keys is an array of month keys (YYYY-MM-01 format) to include.
// Theme is 'light' or 'dark' -- colours are defined in PDF_THEMES and applied inline
// since external stylesheets are unreliable in print contexts.
// The @media print block sets -webkit-print-color-adjust:exact so browsers don't
// strip background colours when saving to PDF (user still needs "Background graphics"
// ticked in the Chrome print dialog for dark mode to render correctly).
/**
 * Generates a self-contained HTML document for PDF export with inline styles.
 * Creates a printable report with all tasks grouped by month and status.
 * Handles colour themes and applies exact colour rendering for PDF output.
 * @param {Array<string>} keys - Array of month keys (YYYY-MM-01 format) to include
 * @param {string} theme - Theme identifier: 'light' or 'dark'
 * @returns {string} Complete HTML document as a string
 */
function buildPdfHtml(keys,theme){
  const colors=theme==='light'?PDF_THEMES.light:PDF_THEMES.dark;
  const {BG,TEXT,TEXT2,TEXT3,DIVIDER,TITLE_LINE,GREEN,GREEN_BG,BLUE,BLUE_BG,RED,RED_BG,AMBER,AMBER_BG,GREY,GREY_BG,ITEM_BORDER}=colors;
  
  // Note: dates in notes won't be styled specially in PDF, just rendered as plain text

  function noteHtml(raw){
    if(!raw)return'';
    const lines=raw.split('\n');let html='',inList=false;
    lines.forEach(line=>{
      const escaped=esc(line);
      const fmt=escaped.replace(/~~(.*?)~~/g,`<s style="color:${TEXT3}">$1</s>`);
      if(line.startsWith('\u2022 ')||line==='\u2022'){
        if(!inList){html+=`<ul style="margin:3px 0 3px 16px;padding:0">`;inList=true;}
        html+=`<li style="margin:1px 0;font-size:11px;color:${TEXT2}">${fmt.replace(/^\u2022\s*/,'')}</li>`;
      }else{
        if(inList){html+='</ul>';inList=false;}
        if(fmt.trim())html+=`<div style="font-size:11px;color:${TEXT2};line-height:1.5">${fmt}</div>`;
      }
    });
    if(inList)html+='</ul>';
    return html?`<div style="margin-top:4px;padding-top:4px;border-top:0.5px solid ${DIVIDER}">${html}</div>`:'';
  }

  const weekSections=keys.map(k=>{
    const w=getOrCreate(k);
    const total=w.doing.length+w.planned.length+w.blocked.length+w.done.length+w.cancelled.length;
    if(total===0)return'';

    // Build summary text lines — same logic as the manager update preview
    const L=[];
    function sec(lbl,items){
      if(!items.length)return;
      L.push({type:'heading',text:lbl});
      items.forEach(it=>{
        const isResolved = lbl === 'COMPLETED' || lbl === 'CANCELLED';
        // Active items get priority/flag annotations; resolved items show task name only
        const flags = isResolved ? '' :
          (it.priority==='high'?' [High Priority]':it.priority==='low'?' [Low Priority]':'')
          +(it.ongoing?' [ongoing]':'')+(it.carried?' [carried]':'');
        // For resolved items: pass only the resolution note (high-level view for manager)
        // For active items: pass the full note
        const rawNote = isResolved ? extractResolutionNote(it.note) : (it.note || '');
        const noteLabel = isResolved && rawNote ? (lbl === 'COMPLETED' ? 'Completion Note' : 'Cancellation Note') : '';
        const note = noteLabel ? `${noteLabel}: ${rawNote}` : rawNote;
        L.push({type:'item',text:it.text+flags,note:note,col:lbl,progress:it.progress??null,completedDate:it.completedDate??null,cancelledDate:it.cancelledDate??null,createdDate:it.createdDate??null});
      });
    }
    sec('IN PROGRESS',w.doing);
    sec('PLANNED',w.planned);
    sec('BLOCKED',w.blocked);
    sec('COMPLETED',w.done);
    sec('CANCELLED',w.cancelled);

    const colColor={
      'IN PROGRESS':GREEN,'PLANNED':BLUE,'BLOCKED':RED,
      'COMPLETED':GREY,'CANCELLED':AMBER
    };
    const colBg={
      'IN PROGRESS':GREEN_BG,'PLANNED':BLUE_BG,'BLOCKED':RED_BG,
      'COMPLETED':GREY_BG,'CANCELLED':AMBER_BG
    };

    let currentCol='';
    const rows=L.map(line=>{
      if(line.type==='heading'){
        currentCol=line.text;
        return`<div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${colColor[line.text]};margin:14px 0 6px;padding-bottom:4px;border-bottom:1.5px solid ${colColor[line.text]}">${line.text}</div>`;
      }
      const noteLines=line.note?noteHtml(line.note):'';
      const completedDate=line.completedDate??null;
      const cancelledDate=line.cancelledDate??null;
      const createdDate=line.createdDate??null;
      const createdDisplay=createdDate
        ?`<div style="margin-top:4px;font-size:11px;color:${TEXT3}">Created: ${createdDate}</div>`
        :'';
      const dateDisplay=completedDate
        ?`<div style="margin-top:4px;font-size:11px;color:${TEXT2}">Completed: ${completedDate}</div>`
        :cancelledDate
        ?`<div style="margin-top:4px;font-size:11px;color:${TEXT2}">Cancelled: ${cancelledDate}</div>`
        :'';
      const pct=!completedDate&&!cancelledDate&&line.progress!==null&&line.progress!==undefined?line.progress:null;
      const pBar=pct!==null?`<div style="margin-top:4px;display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:4px;background:${ITEM_BORDER};border-radius:2px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${colColor[currentCol]};border-radius:2px"></div>
        </div>
        <span style="font-size:10px;font-weight:500;color:${colColor[currentCol]};min-width:26px;text-align:right">${pct}%</span>
      </div>`:'';
      return`<div style="margin-bottom:6px;padding:7px 10px;background:${colBg[currentCol]};border-radius:6px;border:.5px solid ${ITEM_BORDER};border-left:3px solid ${colColor[currentCol]}">
        <div style="font-size:12px;font-weight:500;color:${TEXT}">${esc(line.text)}</div>
        ${createdDisplay}
        ${dateDisplay}
        ${pBar}
        ${noteLines}
      </div>`;
    }).join('');

    // Completion donut + coloured pill legend
    const mTotal=w.doing.length+w.planned.length+w.blocked.length+w.done.length+w.cancelled.length;
    const mDone=w.done.length;
    const completionPct=mTotal>0?Math.round((mDone/mTotal)*100):0;
    const r=26,cx=32,cy=32,stroke=7;
    const arcAngle=(completionPct/100)*2*Math.PI;
    const x2=cx+r*Math.sin(arcAngle),y2=cy-r*Math.cos(arcAngle);
    const largeArc=completionPct>50?1:0;
    const arcPath=completionPct>=100
      ?`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GREEN}" stroke-width="${stroke}"/>`
      :completionPct===0?''
      :`<path d="M ${cx} ${cy-r} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" fill="none" stroke="${GREEN}" stroke-width="${stroke}" stroke-linecap="round"/>`;
    const monthChart=mTotal>0?`
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid ${DIVIDER}">
        <div style="display:flex;flex-wrap:wrap;gap:10px;flex:1;align-items:center">
          ${w.doing.length?`<span style="font-size:13px;font-weight:500;background:${GREEN_BG};color:${GREEN};border-radius:5px;padding:3px 10px">&#9679; ${w.doing.length} in progress</span>`:''}
          ${w.planned.length?`<span style="font-size:13px;font-weight:500;background:${BLUE_BG};color:${BLUE};border-radius:5px;padding:3px 10px">&#9679; ${w.planned.length} planned</span>`:''}
          ${w.blocked.length?`<span style="font-size:13px;font-weight:500;background:${RED_BG};color:${RED};border-radius:5px;padding:3px 10px">&#9679; ${w.blocked.length} blocked</span>`:''}
          ${w.done.length?`<span style="font-size:13px;font-weight:500;background:${GREY_BG};color:${GREY};border-radius:5px;padding:3px 10px">&#9679; ${w.done.length} completed</span>`:''}
          ${w.cancelled.length?`<span style="font-size:13px;font-weight:500;background:${AMBER_BG};color:${AMBER};border-radius:5px;padding:3px 10px">&#9679; ${w.cancelled.length} cancelled</span>`:''}
        </div>
        <div style="text-align:center;flex-shrink:0">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ITEM_BORDER}" stroke-width="${stroke}"/>
            ${arcPath}
            <text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="12" font-weight="600" fill="${completionPct===0?TEXT3:GREEN}" font-family="DM Sans,sans-serif">${completionPct}%</text>
          </svg>
          <div style="font-size:9px;color:${TEXT3};margin-top:1px">complete</div>
        </div>
      </div>`:'';

    return`<div style="margin-bottom:28px;page-break-inside:avoid">
      <div style="font-size:22px;font-weight:600;color:${TEXT};margin-bottom:10px;letter-spacing:-.02em">${getMonthLabelFromKey(k)}</div>
      ${monthChart}
      ${rows}
    </div>`;
  }).join('');

  const now=new Date();
  const generated=formatFullDateWithWeekday(now);

  return`<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8">
  <title>Monthly Update</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:${BG};color:${TEXT};padding:32px 40px;font-size:13px;line-height:1.6}
    @media print{
      body{padding:20px 28px;background:${BG} !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{margin:1.2cm 1.5cm;size:A4}
    }
  </style>
  </head><body>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid ${TITLE_LINE}">
    <div>
      <div style="font-size:22px;font-weight:600;letter-spacing:-.02em;color:${TEXT}">Monthly Update</div>
      <div style="font-size:12px;color:${TEXT2};margin-top:2px">Generated ${generated}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:${TEXT2};padding-top:4px">${keys.length} month${keys.length>1?'s':''} included</div>
  </div>
  ${weekSections||`<p style="color:${TEXT3};font-style:italic">No data to display.</p>`}
  </body></html>`;
}


/**
 * Builds a self-contained HTML accomplishments report for PDF export.
 * Shows only completed tasks across the selected months, grouped by month,
 * with completion date, creation date, time taken, and any completion note.
 * Designed for end-of-year appraisals or performance reviews.
 * @param {Array<string>} keys  - Month keys (YYYY-MM-01) to include, sorted ascending
 * @param {string}        theme - 'light' or 'dark'
 * @returns {string} Complete HTML document as a string
 */
function buildAccomplishmentsHtml(keys, theme) {
  const colors = theme === 'light' ? PDF_THEMES.light : PDF_THEMES.dark;
  const {BG,TEXT,TEXT2,TEXT3,DIVIDER,TITLE_LINE,GREEN,GREEN_BG,ITEM_BORDER} = colors;

  // Collect only achievement-flagged completed tasks across selected months
  const allDone = [];
  keys.forEach(k => {
    const w = getOrCreate(k);
    w.done.forEach(it => {
      if (!it.achievement) return;
      allDone.push({ it, monthLabel: getMonthLabelFromKey(k) });
    });
  });

  // Helper: calculate days between two DD/MM/YYYY display dates
  function daysBetween(from, to) {
    if (!from || !to) return null;
    const parse = s => {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y, m - 1, d);
    };
    const diff = parse(to) - parse(from);
    if (isNaN(diff)) return null;
    return Math.round(diff / 86400000);
  }

  const now = new Date();
  const generated = formatFullDateWithWeekday(now);
  const totalCount = allDone.length;

  // Group by month for the summary stat
  const monthCounts = {};
  allDone.forEach(({ monthLabel }) => {
    monthCounts[monthLabel] = (monthCounts[monthLabel] || 0) + 1;
  });

  const taskRows = allDone.length === 0
    ? `<p style="color:${TEXT3};font-style:italic;margin-top:24px">No achievements found in the selected months — tick "Mark as achievement" when completing a task to flag it here.</p>`
    : allDone.map(({ it, monthLabel }, idx) => {
        const resNote = extractResolutionNote(it.note);
        const days = daysBetween(it.createdDate, it.completedDate);
        const daysStr = days !== null ? `${days} day${days === 1 ? '' : 's'}` : null;

        const meta = [
          it.completedDate ? `<span>Completed: <strong>${it.completedDate}</strong></span>` : '',
          it.createdDate   ? `<span>Created: <strong>${it.createdDate}</strong></span>` : '',
          daysStr          ? `<span>Time taken: <strong>${daysStr}</strong></span>` : '',
          it.priority === 'high' ? `<span style="color:${colors.RED};font-weight:600">High Priority</span>` : '',
        ].filter(Boolean).join(`<span style="color:${TEXT3};margin:0 6px">&middot;</span>`);

        return `
          <div style="margin-bottom:10px;padding:10px 14px;background:${GREEN_BG};border-radius:7px;border:.5px solid ${ITEM_BORDER};border-left:3px solid ${GREEN}">
            <div style="display:flex;align-items:baseline;gap:10px">
              <span style="font-size:11px;font-weight:600;color:${GREEN};min-width:22px;text-align:right">${idx + 1}.</span>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:${TEXT};margin-bottom:4px">${esc(it.text)}</div>
                <div style="font-size:11px;color:${TEXT2};display:flex;flex-wrap:wrap;gap:4px;align-items:center">${meta}</div>
                ${resNote ? `<div style="margin-top:6px;font-size:12px;color:${TEXT2};font-style:italic;padding-left:2px">&ldquo;${esc(resNote)}&rdquo;</div>` : ''}
              </div>
            </div>
          </div>`;
      }).join('');

  // Month breakdown summary pills
  const summaryPills = Object.entries(monthCounts).map(([label, count]) =>
    `<span style="font-size:12px;font-weight:500;background:${GREEN_BG};color:${GREEN};border-radius:5px;padding:3px 10px;white-space:nowrap">${label}: ${count}</span>`
  ).join('');

  // Date range label for the report header
  const firstKey = keys[0], lastKey = keys[keys.length - 1];
  const rangeLabel = firstKey === lastKey
    ? getMonthLabelFromKey(firstKey)
    : `${getMonthLabelFromKey(firstKey)} – ${getMonthLabelFromKey(lastKey)}`;

  // Monthly output bar chart — only months with at least one achievement, bars show achievement count
  const barData = keys
    .map(k => ({ label: getMonthLabelFromKey(k).replace(/\s\(.*\)/, ''), count: getOrCreate(k).done.filter(t => t.achievement).length }))
    .filter(d => d.count > 0);
  const maxCount = Math.max(...barData.map(d => d.count), 1);
  const barW = 28, barGap = 8, chartH = 80, labelH = 28;
  const chartW = barData.length * (barW + barGap) - barGap;
  const bars = barData.map((d, i) => {
    const bh = d.count === 0 ? 2 : Math.max(4, Math.round((d.count / maxCount) * chartH));
    const x = i * (barW + barGap);
    const y = chartH - bh;
    return `<g>
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="2" fill="${GREEN}" opacity="${d.count === 0 ? '0.18' : '0.85'}"/>
      ${d.count > 0 ? `<text x="${x + barW/2}" y="${y - 4}" text-anchor="middle" font-size="9" font-weight="600" fill="${GREEN}" font-family="DM Sans,sans-serif">${d.count}</text>` : ''}
      <text x="${x + barW/2}" y="${chartH + 12}" text-anchor="middle" font-size="8" fill="${TEXT3}" font-family="DM Sans,sans-serif">${d.label.split(' ')[0].substring(0,3)}</text>
      <text x="${x + barW/2}" y="${chartH + 22}" text-anchor="middle" font-size="7.5" fill="${TEXT3}" font-family="DM Sans,sans-serif">${d.label.split(' ')[1] || ''}</text>
    </g>`;
  }).join('');
  // Fix width so chart doesn't blow up to full page width in PDF
  const svgPxW = Math.max(chartW, 120);
  const monthBarChart = barData.length > 1 ? `
    <div style="margin:16px 0 20px;padding:14px 16px;background:${GREEN_BG};border-radius:8px;border:.5px solid ${ITEM_BORDER}">
      <div style="font-size:10px;font-weight:600;color:${GREEN};letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px">Tasks completed by month</div>
      <svg width="${svgPxW}" height="${chartH + labelH}" viewBox="0 0 ${svgPxW} ${chartH + labelH}" style="display:block;overflow:visible">
        <line x1="0" y1="${chartH}" x2="${svgPxW}" y2="${chartH}" stroke="${ITEM_BORDER}" stroke-width="1"/>
        ${bars}
      </svg>
    </div>` : '';

  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8">
  <title>Accomplishments Report</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:${BG};color:${TEXT};padding:32px 40px;font-size:13px;line-height:1.6}
    @media print{
      body{padding:20px 28px;background:${BG} !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{margin:1.2cm 1.5cm;size:A4}
    }
  </style>
  </head><body>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;padding-bottom:14px;border-bottom:2px solid ${TITLE_LINE}">
    <div>
      <div style="font-size:22px;font-weight:600;letter-spacing:-.02em;color:${TEXT}">Achievements Report</div>
      <div style="font-size:14px;color:${TEXT2};margin-top:3px;font-weight:500">${rangeLabel}</div>
      <div style="font-size:12px;color:${TEXT3};margin-top:2px">Generated ${generated}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:28px;font-weight:600;color:${GREEN}">${totalCount}</div>
      <div style="font-size:11px;color:${TEXT2}">task${totalCount === 1 ? '' : 's'} completed</div>
    </div>
  </div>
  ${summaryPills ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 20px">${summaryPills}</div>` : ''}
  ${monthBarChart}
  ${taskRows}
  </body></html>`;
}
