/* =====================================================================
   ClaimPulse · Financial Stress Test
   ---------------------------------------------------------------------
   The screen for the room's hardest question: "what if you're wrong?"

   Nothing here is pre-computed. Every lever writes into the same R6
   engine the workbook runs, the whole chain recomputes, and the charts
   redraw. The tornado is genuinely measured — each bar is the model run
   twice with that one input at its stated low and high, everything else
   held. So the ranking is a result, not a claim.

   The panel refuses to hide its own weak points: the levers are tagged
   with their assumption tier, and B-29 — the largest Tier 4 input in the
   model — is flagged as a placeholder wherever it appears.
   ===================================================================== */

const ViewStress = (() => {
  const { el, mount, fmt, $ } = CP;

  /* ---------------- Lever definitions ----------------
     `apply` writes the lever's value into a model-override object. Green
     lane share rebalances amber and red on their existing 5:2 ratio, so
     the three lanes always sum to one. */
  const LEVERS = [
    { key:'rollout', label:'Rollout of the addressable book', ref:'C-01', tier:'Plan',
      min:0.05, max:1, step:0.05, def:0.6, fmtv:v=>fmt.pct(v,0),
      note:'The defining lever between the three plans. Base recommends 60%.',
      apply:(o,v)=>{ o.rollout = v; } },

    { key:'green', label:'Green lane share, auto-settled', ref:'B-03', tier:'TIER 2',
      min:0.35, max:0.88, step:0.01, def:0.65, fmtv:v=>fmt.pct(v,0),
      note:'Amber and red rebalance on their 5:2 ratio, so the lanes always sum to 100%.',
      apply:(o,v)=>{ const rest = 1 - v; o.B03_green = v;
                     o.B04_amber = rest * (5/7); o.B05_red = rest * (2/7); } },

    { key:'touches', label:'Manual touches per claim, today', ref:'B-02', tier:'TIER 4',
      min:3, max:10, step:0.5, def:7, fmtv:v=>fmt.n1(v),
      note:'Workflow-mapped, not filed. The single largest driver of the capacity line.',
      apply:(o,v)=>{ o.B02_touchesToday = v; } },

    { key:'touchCost', label:'Cost per manual touch', ref:'C-02', tier:'TIER 4',
      min:83, max:400, step:1, def:250, fmtv:v=>'₹'+fmt.n(v),
      note:'BPO transaction pricing. ₹83 is the in-house rate the downside test uses.',
      apply:(o,v)=>{ o.touchCost = v; } },

    { key:'redeploy', label:'Redeployment realisation', ref:'B-29', tier:'TIER 4', flag:true,
      min:0, max:1, step:0.05, def:0.70, fmtv:v=>fmt.pct(v,0),
      note:'PLACEHOLDER. The share of released capacity that becomes real output. Headcount is not cut, so 0% means the capacity line disappears entirely.',
      apply:(o,v)=>{ o.B29_redeployRealisation = v; } },

    { key:'detection', label:'Fraud detection rate, target', ref:'B-14', tier:'TARGET',
      min:0.62, max:0.98, step:0.01, def:0.90, fmtv:v=>fmt.pct(v,0),
      note:'62% is today\'s rule-based engine — at that value the entire fraud benefit is zero.',
      apply:(o,v)=>{ o.B14_detTarget = v; } },

    { key:'leakage', label:'Fraud leakage pool', ref:'B-17', tier:'TIER 2',
      min:0.005, max:0.06, step:0.0025, def:0.0315, fmtv:v=>fmt.pct(v,2),
      note:'Share of claims value lost to fraud and duplicates. A life-and-health benchmark used as a motor proxy.',
      apply:(o,v)=>{ o.B17_leakage = v; } },

    { key:'synthetic', label:'Synthetic-media incidence', ref:'B-18', tier:'TIER 4',
      min:0, max:0.03, step:0.0025, def:0.01, fmtv:v=>fmt.pct(v,2),
      note:'A new vector, so no published incidence exists. This is the line nobody else defends against.',
      apply:(o,v)=>{ o.B18_synthIncidence = v; } },

    { key:'claim', label:'Average claim size', ref:'B-01', tier:'TIER 4',
      min:25000, max:85000, step:1000, def:45000, fmtv:v=>'₹'+fmt.n(v/1000)+'k',
      note:'Sets the claim count. A LOWER figure means more claims and more benefit, so the default is conservative.',
      apply:(o,v)=>{ o.B01_avgClaim = v; } },

    { key:'friction', label:'Live-capture friction', ref:'B-20', tier:'TIER 4',
      min:0, max:0.25, step:0.01, def:0.08, fmtv:v=>fmt.pct(v,0),
      note:'Honest claimants who cannot use live capture and drop green to amber. The cost of our own hard rule.',
      apply:(o,v)=>{ o.B20_friction = v; } },

    { key:'mkt', label:'Marketing investment', ref:'W-23a', tier:'Plan',
      min:0, max:2, step:0.1, def:1, fmtv:v=>fmt.x(v,1),
      note:'Scales the whole Hunt & Farm plan. 1.0× is the plan as costed, ₹8.73 Cr at full rollout.',
      apply:(o,v)=>{ o.MKT_SCALE = v; } },

    { key:'realY1', label:'Benefit realisation, Year 1', ref:'B-24', tier:'Plan',
      min:0.1, max:1, step:0.05, def:0.45, fmtv:v=>fmt.pct(v,0),
      note:'How much of steady-state benefit lands in the first year. Drives payback from kickoff.',
      apply:(o,v)=>{ o.B24_realisationY1 = v; } }
  ];

  /* Plan presets move two levers, exactly as Table C does */
  const PLANS = {
    conservative: { rollout: 0.2, touchCost: 300 },
    base:         { rollout: 0.6, touchCost: 250 },
    aggressive:   { rollout: 1.0, touchCost: 200 }
  };

  let state = {};
  let plan = 'base';
  let root = null;

  function resetTo(p) {
    plan = p;
    state = {};
    LEVERS.forEach(l => state[l.key] = l.def);
    Object.assign(state, PLANS[p]);
    // touchCost/rollout live under their own keys in state
    state.rollout = PLANS[p].rollout;
    state.touchCost = PLANS[p].touchCost;
  }

  function overrides(st = state) {
    const o = {};
    LEVERS.forEach(l => l.apply(o, st[l.key]));
    return o;
  }

  const compute = (st = state) => CPModel.run(plan, overrides(st));

  /* ---------------- Sensitivity, measured not asserted ----------------
     Each lever is run at its own low and high with everything else held
     at the current board state. The ranking that comes out is whatever
     the model says it is. */
  function sensitivity() {
    const base = compute().net;
    return LEVERS.map(l => {
      const lo = compute(Object.assign({}, state, { [l.key]: l.min })).net;
      const hi = compute(Object.assign({}, state, { [l.key]: l.max })).net;
      return { label: `${l.label}`, ref: l.ref, low: lo, high: hi,
               swing: Math.abs(hi - lo),
               lowNote:  `at ${l.fmtv(l.min)}`, highNote: `at ${l.fmtv(l.max)}` };
    }).sort((a, b) => b.swing - a.swing).slice(0, 9);
  }

  /* ---------------- Render ----------------
     The levers used to own a third of the screen. They now live in a
     drawer: a handle bottom-right says how many are off their default,
     the drawer slides over, you move what you want, and it slides away.
     The charts get the whole stage, which is what a scenario engine is
     supposed to look like. */
  function render(host) {
    root = host;
    resetTo('base');
    mount(host, [

      /* ---- the scenario header: state, plan, integrity ---- */
      el('div.panel.hero.rise', { 'data-dom': 'fin' }, [
        el('div.spread.wrap', { style: { alignItems: 'flex-start', gap: 'var(--s-6)' } }, [
          el('div', { style: { minWidth: 0, maxWidth: '52ch' } }, [
            el('p.eyebrow', { style: { margin: 0 }, text: 'Simulation · financial stress test' }),
            el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
              'Move any assumption. ', el('span.grad-ink', { text: 'The whole model recomputes.' })
            ]),
            el('div.row.wrap', { style: { marginTop: 'var(--s-5)' } }, [
              el('div.seg.accent', { id: 'planSeg' }, Object.keys(PLANS).map(p =>
                el('button', { type: 'button', 'data-plan': p, 'aria-pressed': String(p === plan),
                  text: p[0].toUpperCase() + p.slice(1) }))),
              el('button.gbtn', { id: 'resetBtn', type: 'button', text: '↺ reset' }),
              el('div', { id: 'integrity' })
            ])
          ]),
          el('div', { id: 'stressScen', style: { minWidth: 0 } })
        ]),
        el('div', { id: 'kpis', style: { marginTop: 'var(--s-6)' } })
      ]),

      /* ---- the charts, full width ---- */
      UI.clus('Where the annual benefit comes from', 'fin',
        el('button.gbtn', { id: 'tblBtn', type: 'button', text: 'table view' })),
      el('div.panel.rise', { 'data-dom': 'fin' }, [
        el('div', { id: 'bridge' }),
        el('div', { id: 'bridgeTable', hidden: 'hidden' })
      ]),

      el('div.g-phi', { style: { marginTop: 'var(--s-6)', alignItems: 'stretch' } }, [
        el('div.panel.rise', { 'data-dom': 'fin' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'Cumulative cash position' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Build spent up front, benefit ramping on B-24 to B-26. The dashed line is where the build has repaid itself.' }),
          el('div', { id: 'cash' })
        ]),
        el('div.panel.rise', { 'data-dom': 'ops' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'Annual run cost' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Two lines scale with volume; four are fixed.' }),
          el('div', { id: 'runcost' })
        ])
      ]),

      UI.clus('What actually moves the answer', 'risk'),
      el('div.panel.rise', { 'data-dom': 'risk' }, [
        el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
          text: 'Each bar is the model re-run with that one lever at its limits, everything else held where you have it. The ranking is measured, not asserted.' }),
        el('div', { id: 'tornado' })
      ]),

      el('div', { id: 'verdict', style: { marginTop: 'var(--s-6)' } }),

      /* ---- the drawer ---- */
      el('div.dr-scrim', { id: 'drScrim' }),
      el('aside.wsdrawer', { id: 'drawer', 'aria-label': 'Assumptions' }, [
        el('div.dr-head', {}, [
          el('div', {}, [
            el('div', { style: { fontWeight: 660, fontSize: 'var(--fs-md)' }, text: 'Assumptions' }),
            el('div.small.muted', { style: { marginTop: '2px' },
              text: 'Twelve levers over the R6 engine. Tagged by tier.' })
          ]),
          el('button.gbtn', { id: 'drClose', type: 'button', 'aria-label': 'Close', text: '✕' })
        ]),
        el('div.dr-body', { id: 'levers' })
      ]),
      el('button.dr-handle', { id: 'drOpen', type: 'button' }, [
        el('span', { text: '⚙ Assumptions' }),
        el('span.n', { id: 'drCount', text: '0' })
      ])
    ]);

    buildLevers();
    $('#planSeg').addEventListener('click', e => {
      const b = e.target.closest('button[data-plan]'); if (!b) return;
      resetTo(b.dataset.plan);
      CP.$$('#planSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      buildLevers(); update();
    });
    $('#resetBtn').addEventListener('click', () => { resetTo(plan); buildLevers(); update(); });
    $('#tblBtn').addEventListener('click', () => {
      const t = $('#bridgeTable'), c = $('#bridge');
      const showing = t.hasAttribute('hidden');
      t.toggleAttribute('hidden', !showing);
      c.toggleAttribute('hidden', showing);
      $('#tblBtn').textContent = showing ? 'chart view' : 'table view';
    });

    const openDr = on => {
      $('#drawer').classList.toggle('open', on);
      $('#drScrim').classList.toggle('open', on);
    };
    $('#drOpen').addEventListener('click', () => openDr(true));
    $('#drClose').addEventListener('click', () => openDr(false));
    $('#drScrim').addEventListener('click', () => openDr(false));
    document.addEventListener('keydown', escClose);

    update();
  }

  function escClose(e) {
    if (e.key !== 'Escape') return;
    const d = document.getElementById('drawer');
    if (d && d.classList.contains('open')) {
      d.classList.remove('open');
      document.getElementById('drScrim').classList.remove('open');
    }
  }

  function buildLevers() {
    const host = CP.$('#levers');
    mount(host, LEVERS.map(l => {
      const wrap = el('div.lever', { 'data-key': l.key });
      const input = el('input', {
        type: 'range', min: l.min, max: l.max, step: l.step, value: state[l.key],
        'aria-label': l.label
      });
      const val = el('span.lever-val', { text: l.fmtv(state[l.key]) });
      const setPct = () => input.style.setProperty('--pct',
        ((state[l.key] - l.min) / (l.max - l.min) * 100) + '%');
      input.addEventListener('input', () => {
        state[l.key] = parseFloat(input.value);
        val.textContent = l.fmtv(state[l.key]);
        wrap.setAttribute('data-moved', String(Math.abs(state[l.key] - l.def) > 1e-9));
        setPct(); update();
      });
      setPct();
      wrap.setAttribute('data-moved', String(Math.abs(state[l.key] - l.def) > 1e-9));
      mount(wrap, [
        el('div.lever-head', {}, [
          el('span.lever-name', {}, [
            l.label,
            el('span.ref', { text: l.ref }),
            l.flag ? el('span.badge.warn', { text: 'placeholder' }) : null
          ]),
          val
        ]),
        input,
        el('div.lever-note', { text: l.note })
      ]);
      return wrap;
    }));
  }

  const movedCount = () => LEVERS.filter(l => Math.abs(state[l.key] - l.def) > 1e-9).length;

  /* ---------------- Update everything ---------------- */
  function update() {
    const r = compute();
    const d = CPModel.run(plan, {});      // the plan's own default, for deltas

    /* --- KPI strip: one panel, four cells, values that flash on change --- */
    const tiles = [
      { k:'Net annual benefit', ref:'W-35', v: fmt.cr(r.net), unit:'₹ Cr', dom:'fin', size:'xl',
        base: d.net, now: r.net, d:'Gross benefit less annual run cost, steady state.' },
      { k:'Payback from kickoff', ref:'FS-05', v: r.paybackKickoff ? fmt.n1(r.paybackKickoff) : '—', unit:'months',
        dom:'ops', base: d.paybackKickoff, now: r.paybackKickoff, invert:true,
        d:'Includes the ten-month build window. The honest headline.' },
      { k:'3-year NPV at 12%', ref:'FS-04', v: fmt.cr(r.npv3), unit:'₹ Cr', dom:'fin',
        base: d.npv3, now: r.npv3, d:'Discounted at the WACC, net of the build.' },
      { k:'Combined ratio, Motor OD', ref:'W-43', v: fmt.cr(r.combinedPP), unit:'pp', dom:'cap',
        base: d.combinedPP, now: r.combinedPP,
        d:'Loss plus expense. Excludes capacity — headcount does not fall.' }
    ];
    mount(CP.$('#kpis'), [el('div.cells.c-4', {
      style: { border: '1px solid var(--hairline)', borderRadius: 'var(--r-4)',
               background: 'color-mix(in srgb, var(--surface) 30%, transparent)' } },
      tiles.map(t => {
        const delta = (t.now !== null && t.base !== null && Math.abs(t.now - t.base) > 0.005)
          ? t.now - t.base : 0;
        const good = t.invert ? delta < 0 : delta > 0;
        return el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({
          dom: t.dom, size: t.size, k: t.k, ref: t.ref, v: t.v, unit: t.unit, d: t.d,
          delta: delta ? (delta > 0 ? '▲ +' : '▼ ') + fmt.cr(delta) + ' vs plan default' : null,
          deltaGood: delta ? good : undefined
        })]);
      }))]);

    /* Any value that just changed flashes once — the cheapest possible
       signal that this screen is computing rather than displaying. */
    if (movedCount() > 0) CP.$$('#kpis .m-v').forEach(n => {
      n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash');
    });

    /* --- what is off default, stated plainly --- */
    const off = LEVERS.filter(l => Math.abs(state[l.key] - l.def) > 1e-9);
    if (CP.$('#drCount')) CP.$('#drCount').textContent = String(off.length);
    mount(CP.$('#stressScen'), [
      el('div.panel', { 'data-dom': off.length ? 'cust' : 'none',
        style: { padding: 'var(--s-6)', minWidth: '260px' } }, [
        el('div.row', { style: { marginBottom: 'var(--s-4)' } }, [
          el('span.orb' + (off.length ? '.warn' : '')),
          el('span.small', { style: { fontWeight: 640 },
            text: off.length ? off.length + ' assumption' + (off.length > 1 ? 's' : '') + ' moved'
                             : plan[0].toUpperCase() + plan.slice(1) + ' plan, untouched' })
        ]),
        off.length
          ? el('div.stack-3', {}, off.slice(0, 5).map(l => el('div.row', {
              style: { justifyContent: 'space-between', gap: 'var(--s-5)' } }, [
              el('span.xsmall.muted', { text: l.label }),
              el('span.xsmall', { style: { fontWeight: 700, color: 'var(--dom-cust)' },
                text: l.fmtv(state[l.key]) })
            ])).concat(off.length > 5 ? [el('div.xsmall.muted', { text: '+' + (off.length - 5) + ' more' })] : []))
          : el('div.xsmall.muted', { text: 'Open the assumptions drawer to stress any of the twelve levers.' })
      ])
    ]);

    /* --- integrity --- */
    const chk = CPModel.selfCheck();
    const ok = chk.allPass && Math.abs(r.stake.check) < 1e-9;
    mount(CP.$('#integrity'), [
      el('span.integrity.' + (ok ? 'ok' : 'bad'), {
        title: 'The stakeholder split must reconcile to net annual benefit exactly (W-60 = 0), and the engine must reproduce the workbook on all 35 anchors.',
        text: ok ? `✓ engine ties to R6 · ${chk.passed}/${chk.total} anchors · W-60 = 0`
                 : `✕ ${chk.total - chk.passed} anchor(s) drifting` })
    ]);

    /* --- benefit bridge --- */
    const L = r.lines;
    const items = [
      { label:'Fraud avoided, graph', value: L.fraudGraph, kind:'add', note:'W-19 · hits the loss ratio' },
      { label:'Fraud avoided, capture gate', value: L.fraudGate, kind:'add', note:'W-20 · EXIF and metadata contradiction' },
      { label:'Synthetic media avoided', value: L.synthetic, kind:'add', note:'W-21 · the vector nobody else defends' },
      { label:'Capacity redeployed', value: L.capacity, kind:'add', note:'W-22a · at the B-29 realisation, outside both ratios' },
      { label:'Renewal retention', value: L.renewal, kind:'add', note:'W-22 · distribution income' },
      { label:'Live-capture friction', value: L.frictionCost, kind:'sub', note:'W-23 · the cost of our own hard rule' },
      { label:'Marketing investment', value: L.marketingCost, kind:'sub', note:'W-23a · a spend, not a saving' },
      { label:'Gross annual benefit', value: r.gross, kind:'total', note:'W-24' },
      { label:'Annual run cost', value: -r.runCost, kind:'sub', note:'W-32' },
      { label:'NET ANNUAL BENEFIT', value: r.net, kind:'total', note:'W-35' }
    ];
    // waterfall wants a running sequence; totals reset to zero
    const seq = items.filter(i => i.kind !== 'total' || i.label === 'NET ANNUAL BENEFIT');
    Charts.waterfall(CP.$('#bridge'), { items: seq.map(i =>
      i.label === 'NET ANNUAL BENEFIT' ? { ...i, kind:'total' } : i) });

    /* table view — the relief rule, and the accessible fallback */
    mount(CP.$('#bridgeTable'), [el('div.tbl-wrap', {}, [
      el('table.tbl', {}, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Ref' }), el('th', { text: 'Line' }),
          el('th', { class:'n', text: '₹ Cr' }), el('th', { text: 'Which ratio it moves' })])]),
        el('tbody', {}, items.map(i => el('tr', { class: i.kind === 'total' ? 'total' : '' }, [
          el('td', {}, [el('span.ref', { text: (i.note || '').split(' ')[0] })]),
          el('td', { text: i.label }),
          el('td', { class: 'n ' + (i.value < 0 ? 'neg' : ''), text: fmt.cr(i.value) }),
          el('td.small.muted', { text:
            /Fraud|Synthetic/.test(i.label) ? 'Loss ratio' :
            /friction/i.test(i.label) ? 'Expense ratio' :
            /Capacity|Renewal|Marketing/.test(i.label) ? 'Outside both ratios' : '—' })
        ])))
      ])
    ])]);

    /* --- cumulative cash --- */
    const pts = [{ m:0, v:-r.buildTotal, tick:'Build', label:'Build complete' }];
    const yearCF = [r.cf1, r.cf2, r.cf3];
    let cum = -r.buildTotal;
    for (let yr = 0; yr < 3; yr++) {
      for (let mo = 1; mo <= 12; mo++) {
        cum += yearCF[yr] / 12;
        pts.push({ m: yr*12 + mo, v: cum,
          tick: mo === 12 ? `Year ${yr+1}` : null,
          label: `Year ${yr+1}, month ${mo}` });
      }
    }
    // x-axis is months after go-live; payback from kickoff includes the build
    Charts.cashflow(CP.$('#cash'), { points: pts, buildCost: r.buildTotal,
      paybackMonths: r.paybackKickoff ? r.paybackKickoff - CPModel.INPUTS.B27_buildMonths : null,
      paybackLabel: r.paybackKickoff
        ? `build repaid · ${fmt.n1(r.paybackKickoff)} mo from kickoff` : null });

    /* --- run cost --- */
    Charts.stack(CP.$('#runcost'), { segments: [
      { label:'GPU compute', value: r.gpu,      display: fmt.cr(r.gpu),      color:'var(--d1)' },
      { label:'MLOps',       value: r.mlops,    display: fmt.cr(r.mlops),    color:'var(--d2)' },
      { label:'Operations',  value: r.opsTeam,  display: fmt.cr(r.opsTeam),  color:'var(--d3)' },
      { label:'Security',    value: r.security, display: fmt.cr(r.security), color:'var(--d4)' },
      { label:'Storage',     value: r.storage,  display: fmt.cr(r.storage),  color:'var(--d5)' },
      { label:'Legal',       value: r.legal,    display: fmt.cr(r.legal),    color:'var(--d7)' }
    ]});
    CP.$('#runcost').appendChild(UI.disc('There is a floor under this',
      `<p>Variable lines total ₹${fmt.cr(r.runVariable)} Cr and fixed lines ₹${fmt.cr(r.runFixed)} Cr. No optimisation programme, however good, can take annual run cost below that fixed floor at this operating design.</p>`));

    /* --- tornado --- */
    Charts.tornado(CP.$('#tornado'), { items: sensitivity(), baseline: r.net });

    /* --- verdict --- */
    const survives = r.net > 0 && r.npv3 > 0;
    mount(CP.$('#verdict'), [
      el('div.callout' + (survives ? '' : '.neg'), { html: survives
        ? `<strong>At this setting the case still clears.</strong> Net annual benefit is ₹${fmt.cr(r.net)} Cr, three-year NPV is ₹${fmt.cr(r.npv3)} Cr and the build repays ${r.paybackKickoff ? 'in ' + fmt.n1(r.paybackKickoff) + ' months from kickoff' : 'beyond the three-year window'}. Capacity is booked at ${fmt.pct(state.redeploy,0)} realisation — it is redeployed output, not a headcount cut, so it never touches the expense ratio.`
        : `<strong>At this setting the case does not clear.</strong> Net annual benefit is ₹${fmt.cr(r.net)} Cr and three-year NPV is ₹${fmt.cr(r.npv3)} Cr. This is the honest answer for these inputs — the levers are not bounded to keep the case alive.` })
    ]);
  }

  return { render };
})();
