/* =====================================================================
   ClaimPulse · Claim inspector
   ---------------------------------------------------------------------
   The question this screen answers is "what happened to this claim?",
   so that is the first thing on it: a one-sentence verdict and the
   journey, above anything technical.

   The screen used to open on six sample cards and a wall of evidence.
   It now opens on the actual book — all sixty-four claims, searchable
   and filterable — because an inspector with no claims in it is not an
   inspector. Pick a row and the record opens beside it. Capture
   integrity, document parsing and the rest of the machinery are one
   collapsed section each: available, and out of the way.
   ===================================================================== */

const ViewInspector = (() => {
  const { el, mount, fmt, $, $$ } = CP;

  let sel = null;
  let query = '';
  let lane = 'all';

  function render(host, params) {
    const all = CPClaims.all();
    const wanted = (params && params.id) || sel;
    sel = (all.find(c => c.claim.id === wanted) || CPClaims.stories()[0]).claim.id;

    mount(host, [
      el('div.spread.wrap', { style: { alignItems: 'flex-end', marginBottom: 'var(--s-6)' } }, [
        el('div', {}, [
          el('p.eyebrow', { style: { margin: 0 }, text: 'Forensic Dossier · Explainable AI (XAI) & Audit Ledger' }),
          el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
            'Forensic Claim Dossier: ', el('span.grad-ink', { text: 'Evidentiary decomposition & trust audit' })
          ])
        ]),
        el('a.gbtn', { href: '#/command', text: '← the command centre' })
      ]),

      el('div.g-phi-r', { style: { alignItems: 'start' } }, [

        /* ---- the book ---- */
        el('div.panel.pad-0.rise', { 'data-dom': 'ops', style: { alignSelf: 'start',
          position: 'sticky', top: 'calc(var(--topbar-h) + var(--s-5))' } }, [
          el('div', { style: { padding: 'var(--s-6)' } }, [
            el('div.srch', {}, [
              el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
                'stroke-width': '2', 'stroke-linecap': 'round' }, [
                el('circle', { cx: '11', cy: '11', r: '7' }),
                el('path', { d: 'M21 21l-4.35-4.35' })
              ]),
              el('input', { id: 'insQ', type: 'search', value: query,
                placeholder: 'Search claims…', 'aria-label': 'Search claims' })
            ]),
            el('div.row.wrap', { id: 'insLane', style: { marginTop: 'var(--s-5)' } },
              [['all', 'All'], ['G', 'Green'], ['A', 'Amber'], ['R', 'Red'], ['story', '★ examples']]
                .map(([k, l]) => el('button.gbtn', { type: 'button', 'data-l': k,
                  'aria-pressed': String(k === lane), text: l })))
          ]),
          el('div', { id: 'insList', style: { maxHeight: '620px', overflow: 'auto' } })
        ]),

        /* ---- the record ---- */
        el('div.stack-6', { id: 'insRecord' })
      ])
    ]);

    $('#insQ').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); drawList(); });
    $('#insLane').addEventListener('click', e => {
      const b = e.target.closest('button[data-l]'); if (!b) return;
      lane = b.dataset.l;
      $$('#insLane button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      drawList();
    });

    drawList(); drawRecord();
  }

  function matches(c) {
    if (lane === 'story' && !c.claim.story) return false;
    if (['G', 'A', 'R'].includes(lane) && c.lane !== lane) return false;
    if (!query) return true;
    return (c.claim.id + ' ' + c.claim.claimant + ' ' + c.claim.vehicle.model + ' ' +
            c.claim.vehicle.reg + ' ' + c.claim.city).toLowerCase().includes(query);
  }

  function drawList() {
    const rows = CPClaims.all().filter(matches);
    mount($('#insList'), [UI.dtable({
      cols: [
        { key: 'c', label: rows.length + ' claims', render: c => el('span', {}, [
          el('span.row', { style: { gap: 'var(--s-3)' } }, [
            el('span.mono', { style: { fontWeight: 640,
              color: c.claim.id === sel ? 'var(--accent)' : 'var(--ink)' }, text: c.claim.id }),
            c.claim.story ? el('span', { style: { color: 'var(--dom-cust)', fontSize: '10px' }, text: '★' }) : null
          ]),
          el('div.sub', { text: c.claim.claimant + ' · ' + c.claim.vehicle.model })
        ]) },
        { key: 'l', label: 'Lane', render: c => UI.dchip(c.laneMeta.label,
          c.lane === 'G' ? 'g' : c.lane === 'A' ? 'a' : 'r') },
        { key: 't', label: 'Trust', n: true, render: c => el('span', {
          style: { fontWeight: 660, color: c.trust.score === null ? 'var(--ink-faint)'
            : c.trust.score >= CPEngine.GREEN_FLOOR ? 'var(--lane-green)'
            : c.trust.score >= CPEngine.AMBER_FLOOR ? 'var(--lane-amber)' : 'var(--lane-red)' },
          text: c.trust.score === null ? '—' : fmt.cr(c.trust.score, 1) }) }
      ],
      rows,
      selected: c => c.claim.id === sel,
      onRow: c => { sel = c.claim.id; drawList(); drawRecord(); },
      empty: 'No claim matches that'
    })]);
  }

  /* ------------------------------------------------------------------
     The record. Verdict and journey first; machinery collapsed below.
     ------------------------------------------------------------------ */
  function drawRecord() {
    const R = CPClaims.byId(sel);
    const c = R.claim;
    const dom = R.skipped || R.lane === 'R' ? 'risk' : R.lane === 'A' ? 'cust' : 'cap';

    mount($('#insRecord'), [

      /* ---- what happened ---- */
      el('div.panel.hero', { 'data-dom': dom }, [
        el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
          el('div.row.wrap', {}, [
            UI.dchip(R.laneMeta.label, R.lane === 'G' ? 'g' : R.lane === 'A' ? 'a' : 'r'),
            R.capped ? UI.dchip('corridor cap', 'cust') : null,
            R.skipped ? UI.dchip('gate hard fail', 'risk') : null,
            UI.dchip(R.modelCalls + ' genai call' + (R.modelCalls === 1 ? '' : 's'), 'ai')
          ]),
          el('span.small.muted', { text: c.claimant + ' · ' + c.vehicle.make + ' ' + c.vehicle.model + ' · ' + c.city })
        ]),
        el('div', { style: { fontSize: 'var(--fs-lg)', fontWeight: 640, lineHeight: 1.3,
          color: 'var(--ink-strong)', maxWidth: '48ch' }, text: plain(R) }),

        /* the journey, promoted to the top */
        el('div', { id: 'insJourney', style: { marginTop: 'var(--s-7)' } }),

        el('div.cells.c-4', { style: { marginTop: 'var(--s-6)',
          border: '1px solid var(--hairline)', borderRadius: 'var(--r-3)' } }, [
          el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'fin', size: 'sm',
            k: R.skipped ? 'Claimed' : 'Payable',
            v: '₹' + fmt.n(R.skipped ? R.money.claimed : R.money.payable),
            d: R.skipped ? 'Nothing is paid until the investigation closes.' : 'After the band, depreciation and the deductible' })]),
          el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'ops', size: 'sm',
            k: 'Turnaround', v: fmt.cr(R.tat, 1), unit: 'days',
            delta: '▼ ' + fmt.cr(R.daysSaved, 1) + ' d', deltaGood: true,
            d: 'Against 9.8 days on the legacy process' })]),
          el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cap', size: 'sm',
            k: 'Manual touches', v: String(R.touches),
            delta: '▼ ' + fmt.cr(R.touchesSaved, 1), deltaGood: true,
            d: 'Against seven on the same claim today' })]),
          el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cust', size: 'sm',
            k: 'Surveyor', v: R.surveyor.required ? 'yes' : 'no',
            d: R.surveyor.basis })])
        ])
      ]),

      /* ---- why ---- */
      el('div.panel', { 'data-dom': 'ai' }, [
        el('h3', { style: { margin: '0 0 var(--s-5)', fontSize: 'var(--fs-md)' },
          text: 'Algorithmic Routing Rationale & Multi-Vector Bayesian Weights' }),
        el('div.stack-4', {}, R.reasons.map(x => el('div.row', { style: { alignItems: 'flex-start' } }, [
          el('span', { style: { fontWeight: 700, flex: '0 0 auto',
            color: x.hard ? 'var(--lane-red)' : x.cap ? 'var(--lane-amber)' : 'var(--dom-cap)' },
            text: x.hard ? '✕' : x.cap ? '!' : '✓' }),
          el('span.small', { text: x.t })
        ]))),
        R.skipped ? null : el('div', { id: 'insMeter', style: { marginTop: 'var(--s-6)' } }),
        R.skipped ? null : el('div', { id: 'insContrib', style: { marginTop: 'var(--s-5)' } })
      ]),

      /* ---- the machinery, collapsed ---- */
      el('div.panel', { 'data-dom': 'ops' }, [
        el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
          text: 'Technical Evidentiary Ledger: Zero-Trust EXIF, Document OCR, CV Localization, and Syndicate Graph Signals' }),
        el('div', { id: 'insTech' })
      ]),

      /* ---- settlement ---- */
      R.skipped ? null : el('div.panel', { 'data-dom': 'fin' }, [
        el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' }, text: 'Adjudicated Settlement & Loss Calculation Matrix' }),
        el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
          text: 'Assessed against the band the repair engine returned at first notification' }),
        el('div', { id: 'insSettle' })
      ])
    ]);

    drawJourney(R);
    if (!R.skipped) {
      Charts.meter($('#insMeter'), { score: R.trust.score,
        floors: { green: CPEngine.GREEN_FLOOR, amber: CPEngine.AMBER_FLOOR } });
      Charts.contrib($('#insContrib'), R.trust.parts);
      drawSettle(R);
    }
    drawTech(R);
  }

  /* One sentence. What a person would say. */
  function plain(R) {
    if (R.skipped) return 'Zero-Trust Capture Failure: Media authenticity violation detected at Gate 00. Downstream model execution halted with ₹0 token expenditure. Escalated to SIU with evidentiary tamper report.';
    if (R.lane === 'G') return 'Automated Straight-Through Settlement: All deterministic and multi-modal trust vectors verified above threshold with zero manual touches or surveyor overhead.';
    if (R.capped) return 'Corridor Constraint Enforced: Exemplary trust score (>85/100), but loss estimate exceeds statutory ₹50,000 corridor; routed to licensed surveyor per IRDAI mandate.';
    if (R.lane === 'A') return 'Human-in-the-Loop (HITL) Assisted Review: Ambiguous damage correlation routed to single adjuster with pre-compiled evidentiary rationale and damage keyframes.';
    return 'High-Risk Contradiction Escalated: Critical discrepancies between photo metadata, police report, and vehicle telemetry. Dispatched for full SIU forensic investigation.';
  }

  /* ------------------------------------------------------------------
     The journey — a horizontal track, because "what happened" is a
     sequence, and a sequence reads left to right.
     ------------------------------------------------------------------ */
  function drawJourney(R) {
    const host = $('#insJourney'); if (!host) return;
    mount(host, [el('div.jrny', {}, R.timeline.map(s =>
      el('div.jstep' + (s.done ? '.done' : ''), {}, [
        el('span.jdot'),
        el('div.jt', { text: s.t }),
        el('div.jd', { text: s.at.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) })
      ])))]);
  }

  function drawSettle(R) {
    const m = R.money;
    mount($('#insSettle'), [UI.dtable({
      cols: [
        { key: 'l', label: 'Line' },
        { key: 'v', label: '₹', n: true, render: x => el('span', {
          style: { fontWeight: x.total ? 700 : 600,
                   color: x.total ? 'var(--dom-fin)' : x.v < 0 ? 'var(--neg)' : 'var(--ink)' },
          text: (x.v < 0 ? '−₹' : '₹') + fmt.n(Math.abs(x.v)) }) }
      ],
      rows: [
        { l: 'Garage estimate', v: R.repair.garageEstimate },
        { l: 'Assessed base, capped at the band ceiling', v: m.assessedBase },
        { l: 'less: disallowed above band', v: -m.disallowed },
        { l: m.zeroDep ? 'less: depreciation (zero-dep add-on)' : 'less: depreciation', v: -m.depreciation },
        { l: 'less: deductible', v: -m.deductible },
        { l: 'PAYABLE', v: m.payable, total: true }
      ]
    })]);
  }

  /* ------------------------------------------------------------------
     The machinery. Every section collapsed, because none of it is the
     first question anybody asks.
     ------------------------------------------------------------------ */
  function drawTech(R) {
    const host = $('#insTech');
    const secs = [];

    secs.push(UI.disc(
      el('span', {}, ['Capture integrity · Gate 00']),
      checkList(R.gate.checks),
      { chip: R.gate.hardFail ? 'HARD FAIL' : R.gate.passed + '/' + R.gate.total }));

    if (R.skipped) {
      secs.push(el('div.small.muted', { style: { marginTop: 'var(--s-5)' },
        text: 'Engines 01 to 05 were never executed. There is no document parse, no damage assessment, no fraud score, no repair band and no policy retrieval to show, because none of them ran. That is the architecture working, not a gap in the record' }));
      mount(host, secs);
      return;
    }

    secs.push(UI.disc(el('span', {}, ['Documents and VAHAN · Engine 01']),
      checkList(R.doc.checks), { chip: R.doc.headline }));

    secs.push(UI.disc(el('span', {}, ['Damage assessment · Engine 02']),
      el('div', {}, [
        el('div.small.muted', { style: { marginBottom: 'var(--s-5)' }, text: R.cv.detail }),
        el('div', { id: 'insPanels' })
      ]), { chip: R.cv.headline }));

    secs.push(UI.disc(el('span', {}, ['Fraud and duplicate graph · Engine 03']),
      checkList(R.fraud.signals), { chip: R.fraud.headline }));

    secs.push(UI.disc(el('span', {}, ['Repair cost band · Engine 04']),
      el('div', {}, [
        el('div.small.muted', { style: { marginBottom: 'var(--s-5)' }, text: R.repair.detail }),
        el('div', { id: 'insBand' })
      ]), { chip: R.repair.headline }));

    secs.push(UI.disc(el('span', {}, ['Policy wording · Engine 05']),
      el('div.stack-4', {}, R.policy.clauses.map(cl => el('div.clause', {
        style: cl.status === 'EXCLUDED' ? { borderLeftColor: 'var(--lane-red)',
          background: 'color-mix(in srgb, var(--lane-red) 8%, transparent)' } : {} }, [
        el('div.cl-h', { style: cl.status === 'EXCLUDED' ? { color: 'var(--lane-red)' } : {},
          text: cl.ref + ' · ' + cl.status }),
        el('div.cl-b', { text: cl.name }),
        el('div.cl-m', { text: cl.note })
      ]))), { chip: R.policy.headline }));

    mount(host, secs);

    if (R.cv) Charts.hbar($('#insPanels'), {
      items: R.cv.parts.map(p => ({ label: p.name, value: p.cost,
        note: 'confidence ' + fmt.pct(p.conf, 0) })),
      unit: '₹', valueFmt: v => '₹' + fmt.n(v), compact: true });
    if (R.repair) {
      const b = R.repair;
      Charts.hbar($('#insBand'), { items: [
        { label: 'Band floor', value: b.band[0], color: 'var(--border-strong)' },
        { label: 'Band ceiling', value: b.band[1], color: 'var(--d1)' },
        { label: 'Garage estimate', value: b.garageEstimate,
          color: b.over ? 'var(--lane-red)' : 'var(--lane-green)' }
      ], unit: '₹', valueFmt: v => '₹' + fmt.n(v), compact: true });
    }
  }

  function checkList(items) {
    return el('div.stack-4', {}, items.map(x => el('div.row', { style: { alignItems: 'flex-start' } }, [
      el('span', { style: { flex: '0 0 auto', fontWeight: 700,
        color: x.ok ? 'var(--lane-green)' : 'var(--lane-red)' }, text: x.ok ? '✓' : '✕' }),
      el('div', { style: { minWidth: 0 } }, [
        el('div.small', { style: { fontWeight: 600 }, text: x.label }),
        el('div.xsmall.muted', { text: x.detail })
      ])
    ])));
  }

  return { render };
})();
