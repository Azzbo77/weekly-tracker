const weeks = {};
const COLS = ['doing', 'planned', 'blocked'];

const secOpen = { done: true, cancelled: true };
const editing = {};
const editingName = {};

let currentKey = '';
let monthOffset = 0;
let draggedItem = null;