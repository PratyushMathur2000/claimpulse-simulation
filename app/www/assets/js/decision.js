/* =====================================================================
   ClaimPulse · Decision
   ---------------------------------------------------------------------
   The business case, the levers behind it, the pilot that would validate
   it, and the audit trail that makes any of it defensible. Four things
   that answer one question — should we do this, and how would we know —
   so they sit behind one tab with internal sections rather than four
   top-level tabs, which made the product look like it had four separate
   business cases.

   This module owns nothing except which section is showing. Each section
   is the module that already rendered it, drawing into the same element
   ids it always used, so nothing about impact, sim, pilot or audit had to
   be rewritten to live here.
   ===================================================================== */

const CPDecision = (() => {

  const TABS = [
    { k: 'impact', nm: 'Business case', d: 'What it is worth, and on what basis',
      mod: () => CPImpact },
    { k: 'sim',    nm: 'Scenarios',     d: 'Move an assumption, watch the model answer',
      mod: () => CPSim },
    { k: 'pilot',  nm: 'Pilot',         d: 'How we would find out on real claims',
      mod: () => CPPilot },
    { k: 'audit',  nm: 'Audit',         d: 'Every decision replayed, in order',
      mod: () => CPAudit }
  ];

  let open = 'impact';

  function init() { TABS.forEach(t => { const m = t.mod(); if (m && m.init) m.init(); }); }

  /* Data reaches every section, not only the visible one, so switching
     sections never shows a stale board for a frame. */
  function onData(all) {
    TABS.forEach(t => { const m = t.mod(); if (m && m.onData) m.onData(all); });
    if (CPApp.surface === 'decision') render();
  }

  function show(k) {
    if (TABS.some(t => t.k === k)) open = k;
    render();
  }

  function render() {
    UI.set('decisionTabs', TABS.map(t => `
      <button class="subtab ${t.k === open ? 'on' : ''}" onclick="CPDecision.show('${t.k}')"
              title="${UI.esc(t.d)}">
        <span class="st-nm">${UI.esc(t.nm)}</span>
        <span class="st-d">${UI.esc(t.d)}</span>
      </button>`).join(''));

    TABS.forEach(t => {
      const el = UI.$('d-' + t.k);
      if (el) el.classList.toggle('on', t.k === open);
    });

    const m = TABS.find(t => t.k === open).mod();
    if (m && m.render) m.render();
  }

  return { init, onData, render, show, get open() { return open; } };
})();
