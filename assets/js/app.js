/* =====================================================================
   ClaimPulse · App shell
   ---------------------------------------------------------------------
   One application, two wings. SIMULATION is the argument — how the thing
   works and whether the numbers survive contact. DEMO is that argument
   running, seen from each stakeholder's own screen.

   They share a rail, a design system and one model instance, because the
   whole point is that crossing between them should not feel like
   crossing between two products.
   ===================================================================== */

const App = (() => {
  const { el, mount, $, $$, fmt } = CP;

  const ROUTES = [
    // --- DEMO WING (TOP) ---
    { wing:'Demo', id:'command',  label:'Command centre',      icon:'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
    { wing:'Demo', id:'inspector',label:'Claim inspector',      icon:'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35' },
    { wing:'Demo', id:'customer', label:'Customer app',         icon:'M7 3h10v18H7zM11 18h2' },
    { wing:'Demo', id:'garage',   label:'Garage and surveyor',  icon:'M3 12l2-6h14l2 6v7h-3v-2H6v2H3zM7 15h2M15 15h2' },
    { wing:'Demo', id:'value',    label:'Value to management',  icon:'M4 19h16M7 16V9m5 7V5m5 11v-5' },

    // --- SIMULATION WING (BELOW) ---
    { wing:'Simulation', id:'overview',     label:'Overview',               icon:'M3 12h4l3-8 4 16 3-8h4' },
    { wing:'Simulation', id:'live',         label:'Live book',              icon:'M5 3l14 9-14 9V3z' },
    { wing:'Simulation', id:'architecture', label:'Solution architecture',  icon:'M4 5h16M4 12h16M4 19h16' },
    { wing:'Simulation', id:'tat',          label:'TAT and repurposing',    icon:'M12 7v5l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { wing:'Simulation', id:'tokens',       label:'Token economics',        icon:'M12 3v18M7 8h7a3 3 0 010 6H7' },
    { wing:'Simulation', id:'stress',       label:'Financial stress test',  icon:'M4 19V9m5 10V5m5 14v-7m5 7V8' },
    { wing:'Simulation', id:'assumptions',  label:'Assumptions and sources',icon:'M6 3h9l5 5v13H6zM15 3v5h5' }
  ];

  const VIEWS = {
    overview:     () => ViewOverview,
    live:         () => ViewLive,
    architecture: () => ViewArchitecture,
    tat:          () => ViewTat,
    tokens:       () => ViewTokens,
    stress:       () => ViewStress,
    assumptions:  () => ViewAssumptions,
    command:      () => ViewCommand,
    inspector:    () => ViewInspector,
    customer:     () => ViewCustomer,
    garage:       () => ViewGarage,
    value:        () => ViewValue
  };

  function icon(d) {
    return el('svg.ico', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      [el('path', { d })]);
  }

  function buildRail() {
    const rail = $('#rail');
    const wings = ['Demo', 'Simulation'];
    mount(rail, [
      ...wings.map(w => el('div.rail-group', {}, [
        el('div.rail-label', {}, [el('span', { text: w })]),
        ...ROUTES.filter(r => r.wing === w).map(r =>
          el('a.rail-link', { href: '#/' + r.id, 'data-route': r.id, 'data-label': r.label },
            [icon(r.icon), el('span', { text: r.label })]))
      ])),
      el('div.rail-foot', {}, [
        el('div.theme-toggle', { id: 'themeToggle', role: 'group', 'aria-label': 'Colour theme' }, [
          themeBtn('light',  'Light',         'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4'),
          themeBtn('system', 'Match system',  'M3 6a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM8 21h8'),
          themeBtn('dark',   'Dark',          'M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z')
        ]),
        el('div.rail-note.xsmall.faint', { style: { lineHeight: 'var(--lh-snug)' },
          html: 'Every figure computed live from<br><strong>ClaimPulse_Investor_Dashboard_R6.xlsx</strong>' })
      ])
    ]);
  }

  function themeBtn(mode, title, d) {
    return el('button', { type: 'button', 'data-mode': mode, title, 'aria-label': title,
      'aria-pressed': 'false' }, [
      el('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none',
        stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round',
        'stroke-linejoin': 'round' }, [el('path', { d })])
    ]);
  }

  /* Placeholder for the wings still in build — honest about what is and
     is not there yet, rather than a blank screen. */
  function stub(route) {
    const host = $('#main');
    const r = CPModel.run('base');
    mount(host, [el('div.view', {}, [
      el('div.view-head', {}, [
        el('p.eyebrow', { text: route.wing + ' · ' + route.label }),
        el('h1', { text: route.label }),
        el('p.lede', { style:{marginTop:'var(--s-4)'},
          text: 'This screen is next in the build. The design system, the R6 engine and the charting layer underneath it are already in place — this is the content pass.' })
      ]),
      el('div.card.leads', {}, [
        el('h3', { text: 'What this screen will carry' }),
        el('p.muted', { style:{marginTop:'var(--s-4)'}, text: BLURB[route.id] || '' })
      ]),
      el('div.g-4', { style:{marginTop:'var(--s-6)'} }, [
        ['Net annual benefit', fmt.cr(r.net), '₹ Cr', 'W-35'],
        ['Blended book TAT',   fmt.cr(r.tatBlended), 'days', 'W-15'],
        ['FTE capacity released', fmt.n1(r.fteReleased), 'FTE', 'W-68'],
        ['Claimant-days returned', fmt.compact(r.claimantDays), 'days/yr', 'W-62']
      ].map(([k, v, u, ref]) => el('div.tile', {}, [
        el('div.k', {}, [k, el('span.ref', { text: ref })]),
        el('div.v', {}, [v, el('span.unit', { text: u })])
      ])))
    ])]);
  }

  const BLURB = {
    overview: 'The case in one screen: the problem in Bajaj\'s own filed numbers, what ClaimPulse changes, and the four figures that matter — net benefit, payback, combined-ratio movement and the build.',
    architecture: 'One claim, watched end to end. Gate 00, the five engines, Trust Score fusion and lane routing, each lighting as the claim reaches it — with the engine results, the retrieved policy wording, the trust arithmetic and the token cost in one decision environment rather than six boxes.',
    tat: 'Where the 9.8 days go today and where they go after, then the consequence: 175.9 FTE of capacity released, 74,063 surveyor visits avoided, and what we do with all of it. Repurposed, not cut — the distinction the whole R6 model turns on.',
    tokens: 'The token economics behind the GenAI layer: what each claim actually costs to run, the rate card it is priced on, and why inference cost cannot break this case at any plausible volume.',
    assumptions: 'Every input, its tier, its source and its direction of bias — including the four decisions still open and the one Tier 4 placeholder the model leans on hardest.',
    command: 'The screen a claims manager opens at 09:00: workload, lane distribution, what needs a human, and the queue itself.',
    inspector: 'One claim in full — what the gate found, what each engine scored, why it routed where it did, and what the officer does next.',
    customer: 'The claimant\'s phone: guided live capture with no gallery button, live analysis, and an outcome in minutes rather than days.',
    garage: 'The repair network and the surveyor: an indicative cost band at first notification, and surveyors moved above the ₹50,000 corridor where judgement is actually needed.',
    value: 'The one-screen answer for the management committee: what lands, who books it, and what it does to the combined ratio.'
  };

  function go() {
    const raw = location.hash.replace(/^#\/?/, '') || 'command';
    const [id, qs] = raw.split('?');
    const params = new URLSearchParams(qs || '');
    const route = ROUTES.find(r => r.id === id) || ROUTES[0];
    $$('.rail-link').forEach(a => a.setAttribute('aria-current', String(a.dataset.route === route.id)));
    $('#railTitle').textContent = route.wing;
    document.title = `ClaimPulse · ${route.label}`;
    const host = $('#main');
    if (typeof ViewLive !== 'undefined' && ViewLive.stop) ViewLive.stop();
    host.scrollTop = 0; window.scrollTo(0, 0);
    if (VIEWS[route.id]) {
      const v = el('div.view');
      mount(host, [v]);
      VIEWS[route.id]().render(v, params);
    } else stub(route);
    $('#rail').setAttribute('data-open', 'false');
    $('#scrim').setAttribute('data-open', 'false');
  }

  function initTheme() {
    const box = $('#themeToggle');
    const set = m => {
      CP.theme.set(m);
      $$('#themeToggle button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-mode]'); if (b) set(b.dataset.mode);
    });
    $$('#themeToggle button').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.mode === CP.theme.get())));
    // Charts read theme tokens at draw time, so a theme change redraws
    // the current view rather than leaving stale gradients on screen.
    document.addEventListener('cp:theme', () => go());
  }

  /* One button, two jobs. On a wide screen it collapses the rail to
     icons; on a narrow one there is no room for a collapsed rail either,
     so it opens and closes the drawer instead. */
  const RAIL_KEY = 'cp.rail';
  const narrow = () => window.matchMedia('(max-width: 900px)').matches;

  function setRail(stateName) {
    $('#shell').setAttribute('data-rail', stateName);
    $('#railBtn').setAttribute('aria-expanded', String(stateName !== 'collapsed'));
    try { localStorage.setItem(RAIL_KEY, stateName); } catch {}
  }
  function toggleRail() {
    if (narrow()) {
      const r = $('#rail'), open = r.getAttribute('data-open') !== 'true';
      r.setAttribute('data-open', String(open));
      $('#scrim').setAttribute('data-open', String(open));
      $('#railBtn').setAttribute('aria-expanded', String(open));
    } else {
      setRail($('#shell').getAttribute('data-rail') === 'collapsed' ? 'open' : 'collapsed');
    }
  }

  function init() {
    CP.theme.init();
    buildRail();
    initTheme();
    let saved = 'open';
    try { saved = localStorage.getItem(RAIL_KEY) || 'open'; } catch {}
    if (!narrow()) setRail(saved);
    window.addEventListener('hashchange', go);
    $('#railBtn').addEventListener('click', toggleRail);
    $('#scrim').addEventListener('click', () => {
      $('#rail').setAttribute('data-open', 'false');
      $('#scrim').setAttribute('data-open', 'false');
    });
    window.addEventListener('resize', CP.debounce(() => {
      if (narrow()) $('#shell').setAttribute('data-rail', 'open');
      else { try { setRail(localStorage.getItem(RAIL_KEY) || 'open'); } catch { setRail('open'); } }
    }, 160));
    go();

    const chk = CPModel.selfCheck();
    console.log(`%cClaimPulse · model self-check ${chk.passed}/${chk.total} ${chk.allPass ? 'PASS' : 'FAIL'}`,
      `color:${chk.allPass ? '#0CA30C' : '#D03B3B'};font-weight:700`);
    if (!chk.allPass) console.table(chk.checks.filter(c => !c.ok));
  }

  return { init, ROUTES };
})();

document.addEventListener('DOMContentLoaded', App.init);
