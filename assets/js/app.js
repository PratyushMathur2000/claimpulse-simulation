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
        el('div.rail-downloads', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginBottom: 'var(--s-4)', width: '100%' } }, [
          el('a.dl-btn.xls', { href: 'downloads/ClaimPulse_Investor_Dashboard_R6.xlsx', download: 'ClaimPulse_Investor_Dashboard_R6.xlsx', title: 'Download Financial Bible Excel' }, [
            el('span.fmt-badge', { text: 'XLSX' }),
            el('span', { text: 'Excel Model (R6)' })
          ]),
          el('a.dl-btn.pdf', { href: 'downloads/ClaimPulse_Executive_Report.pdf', download: 'ClaimPulse_Executive_Report.pdf', title: 'Download Executive Report PDF' }, [
            el('span.fmt-badge', { text: 'PDF' }),
            el('span', { text: 'Executive Report' })
          ]),
          el('a.dl-btn.ppt', { href: 'downloads/SaiMahimaK_Finsighters_NMIMS_PS6_BFDL.pptx', download: 'SaiMahimaK_Finsighters_NMIMS_PS6_BFDL.pptx', title: 'Download Pitch Deck PPTX' }, [
            el('span.fmt-badge', { text: 'PPTX' }),
            el('span', { text: 'Pitch Deck' })
          ])
        ]),
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
    overview: 'Strategic Investment Case: Audited financial returns, combined ratio decompression (−1.81 pp), 4.4-month payback, and inter-entity value attribution reconciling exactly to ₹0.000 Cr leakage.',
    architecture: 'Zero-Trust Forensic Architecture: End-to-end multi-modal ingestion pipeline — Gate 00 hardware attestation, parallel vision/document/graph engines, Bayesian trust score fusion, and deterministic-first triage with Human-in-the-Loop (HITL) exception routing.',
    tat: 'Human Capital Repurposing & Ecosystem Velocity: Reallocating 175.9 FTE of administrative capacity into high-severity forensic loss adjusting, saving 74,063 physical surveys, and accelerating garage bay velocity by +75%.',
    tokens: 'Bounded Unit Economics & Technology Moat: Sub-₹18 per claim GenAI inference bounded across an 18-fold stress range; proves 8.4× NPV advantage of self-hosting proprietary forensic classifiers while consuming commodity language APIs.',
    assumptions: 'Institutional Governance & Parameter Registry: Comprehensive four-tier assumptions matrix mapping filed statutory disclosures, empirical benchmarks, and conservative team placeholders with 35 self-checking model validation anchors.',
    command: 'Chief Claims Officer Telemetry & War Room: Live operational queue balancing, straight-through processing (STP) velocity tracking, and cognitive workload distribution across triage teams.',
    inspector: 'Explainable AI (XAI) Forensic Dossier: Granular evidentiary decomposition of document authenticity, photogrammetric damage assessment, and fraud ring graph signals with complete audit trail integrity.',
    customer: 'Zero-Friction Conversational FNOL: Hardware-attested dynamic live video capture eliminating gallery injection, instant coverage validation, and sub-minute settlement liquidity.',
    garage: 'Distributed Ecosystem Orchestration: Real-time repair estimate harmonization, 1.0-day bay turnaround, and elevation of licensed surveyors exclusively to statutory corridors (>₹50,000).',
    value: 'Executive Committee Value Realization: Comprehensive Corporate Finance breakdown of underwriting loss ratio improvement, operating expense leverage, and balance-sheet-neutral deployment.'
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
