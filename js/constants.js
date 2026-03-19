const STORAGE_KEY = 'mt8';
const STORAGE_THEME = 'mt8_theme';
const STORAGE_SEC = 'mt8_sec';

const TIMING = {
  TOAST_DEFAULT_DURATION: 10000,
  COPY_CONFIRMATION_FADE: 2000,
  PDF_PRINT_DIALOG_DELAY: 600,
  ASYNC_TASK_SCHEDULE: 0,
};

const DATE = {
  ISO_DATE_SLICE: 10,  // 'YYYY-MM-DD'.length — used when slicing ISO strings to date only
};

const CALENDAR = {
  GRID_COLUMNS: 7,
  GRID_TOTAL_CELLS: 42,
};

const MARKUP = {
  STRIKETHROUGH_DELIMITER: 2,   // length of '~~'
  STRIKETHROUGH_MIN_LENGTH: 4,  // minimum '~~~~' — delimiter on both sides with no content
};

const LOCALE = 'en-GB';

const COL_LABELS = { doing: 'In progress', planned: 'Planned', blocked: 'Blocked' };
const COL_COLORS = { doing: 'var(--green)', planned: 'var(--blue)', blocked: 'var(--red)' };

const PDF_THEMES = {
  light: { BG:'#ffffff',TEXT:'#1a1917',TEXT2:'#6b6860',TEXT3:'#a8a49e',DIVIDER:'#e0ddd8',
    GREEN:'#1a7a56',GREEN_BG:'#e8f5ef',BLUE:'#1a5fa8',BLUE_BG:'#e8f0fb',
    RED:'#b83232',RED_BG:'#fbeaea',AMBER:'#9a6200',AMBER_BG:'#fef3db',
    GREY:'#6b6860',GREY_BG:'#f0ede8',PURPLE:'#6b3fa0',PURPLE_BG:'#f0eafa',
    TITLE_LINE:'#1a1917',ITEM_BORDER:'rgba(0,0,0,0.06)' },
  dark: { BG:'#141312',TEXT:'#f0ede8',TEXT2:'#9e9a94',TEXT3:'#5c5955',DIVIDER:'rgba(255,255,255,0.12)',
    GREEN:'#3ecf8e',GREEN_BG:'#0e2a1e',BLUE:'#5b9cf6',BLUE_BG:'#0d1f3c',
    RED:'#f07070',RED_BG:'#2d1212',AMBER:'#f0b429',AMBER_BG:'#2a1f05',
    GREY:'#9e9a94',GREY_BG:'#272523',PURPLE:'#b07ef5',PURPLE_BG:'#1e1030',
    TITLE_LINE:'#f0ede8',ITEM_BORDER:'rgba(255,255,255,0.07)' }
};
