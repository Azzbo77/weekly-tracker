// Run once everything is defined
load();
init();

// Press / when not in a text field to cycle focus through the three column add inputs.
// First press focuses In Progress; subsequent presses cycle to Planned then Blocked then back.
(function () {
  const addInputIds = ['in-doing', 'in-planned', 'in-blocked'];
  document.addEventListener('keydown', e => {
    if (e.key !== '/') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.modal-bg.open')) return;
    e.preventDefault();
    const current = document.activeElement?.id;
    const idx = addInputIds.indexOf(current);
    const next = addInputIds[(idx + 1) % addInputIds.length];
    const inp = document.getElementById(next);
    if (inp) inp.focus();
  });
})();
