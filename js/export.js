// â”€â”€ Export / Import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function exportData() {
  const toExport = {};
  Object.keys(weeks).forEach(k => {
    const w = weeks[k];
    if (w.doing.length + w.planned.length + w.blocked.length + w.done.length + w.cancelled.length > 0) toExport[k] = w;
  });
  const b = new Blob([JSON.stringify({ months: toExport, monthOffset }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'monthly-tracker-' + new Date().toISOString().slice(0, DATE.ISO_DATE_SLICE) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
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

    // Stage new data before touching existing data — prevents data loss on error
    const newData = {};
    Object.keys(data).forEach(key => {
      const src = data[key];
      if (!newData[key]) newData[key] = { doing: [], planned: [], blocked: [], done: [], cancelled: [] };
      const dest = newData[key];
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
    init(); // defined in render.js — re-initialises month state and re-renders
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


// â”€â”€ PDF Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openPdfExport() {
  document.querySelector('input[name="pdf-range"][value="current"]').checked = true;
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
  const html = buildPdfHtml(keys, theme);
  const win = window.open('', '_blank');
  if (!win) { showToast('Popup blocked. Please allow popups and try again.', 'warning'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, TIMING.PDF_PRINT_DIALOG_DELAY);
}
// buildPdfHtml â€” generates a self-contained HTML document for printing/saving as PDF.
// Opens in a new tab; the browser's native print dialog handles PDF conversion.
// Keys is an array of ISO week-start dates (YYYY-MM-DD) to include.
// Theme is 'light' or 'dark' â€” colours are defined in PDF_THEMES and applied inline
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

    // Build summary text lines â€” same logic as the manager update preview
    const L=[];
    function sec(lbl,items){
      if(!items.length)return;
      L.push({type:'heading',text:lbl});
      items.forEach(it=>{
        const flags=(it.priority==='high'?' [High Priority]':it.priority==='low'?' [Low Priority]':'')+(it.ongoing?' [ongoing]':'')+(it.carried?' [carried]':'');
        const note=(lbl!=='COMPLETED')?it.note||'':'';
        L.push({type:'item',text:it.text+flags,note:note,col:lbl,progress:it.progress??null,completedDate:it.completedDate??null});
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
      const dateDisplay=completedDate?`<div style="margin-top:4px;font-size:11px;color:${TEXT2}">Completed: ${completedDate}</div>`:'';
      const pct=!completedDate&&line.progress!==null&&line.progress!==undefined?line.progress:null;
      const pBar=pct!==null?`<div style="margin-top:4px;display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:4px;background:${ITEM_BORDER};border-radius:2px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${colColor[currentCol]};border-radius:2px"></div>
        </div>
        <span style="font-size:10px;font-weight:500;color:${colColor[currentCol]};min-width:26px;text-align:right">${pct}%</span>
      </div>`:'';
      return`<div style="margin-bottom:6px;padding:7px 10px;background:${colBg[currentCol]};border-radius:6px;border:.5px solid ${ITEM_BORDER};border-left:3px solid ${colColor[currentCol]}">
        <div style="font-size:12px;font-weight:500;color:${TEXT}">${esc(line.text)}</div>
        ${dateDisplay}
        ${pBar}
        ${noteLines}
      </div>`;
    }).join('');

    return`<div style="margin-bottom:28px;page-break-inside:avoid">
      <div style="font-size:22px;font-weight:600;color:${TEXT};margin-bottom:6px;letter-spacing:-.02em">${getMonthLabelFromKey(k)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid ${DIVIDER}">
        <span style="font-size:12px;font-weight:500;background:${GREEN_BG};color:${GREEN};border-radius:5px;padding:3px 10px">${w.doing.length} in progress</span>
        <span style="font-size:12px;font-weight:500;background:${BLUE_BG};color:${BLUE};border-radius:5px;padding:3px 10px">${w.planned.length} planned</span>
        <span style="font-size:12px;font-weight:500;background:${RED_BG};color:${RED};border-radius:5px;padding:3px 10px">${w.blocked.length} blocked</span>
        <span style="font-size:12px;font-weight:500;background:${GREY_BG};color:${GREY};border-radius:5px;padding:3px 10px">${w.done.length} completed</span>
        <span style="font-size:12px;font-weight:500;background:${AMBER_BG};color:${AMBER};border-radius:5px;padding:3px 10px">${w.cancelled.length} cancelled</span>
      </div>
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

