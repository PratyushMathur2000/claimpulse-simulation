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
      note:'Scales the whole Hunt & Farm plan. 1.0× is the plan as costed, ₹8.88 Cr at full rollout.',
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
    const baseVal = compute().net;
    return LEVERS.map(l => {
      const oLow = Object.assign({}, state, { [l.key]: l.min });
      const oHigh = Object.assign({}, state, { [l.key]: l.max });
      const rLow = compute(oLow).net;
      const rHigh = compute(oHigh).net;

      // Determine which end is downside and which is upside
      const isLowAdverse = rLow <= rHigh;
      const downside = Math.min(rLow, rHigh);
      const upside = Math.max(rLow, rHigh);
      const downsideNote = isLowAdverse ? `at ${l.fmtv(l.min)} (low)` : `at ${l.fmtv(l.max)} (high)`;
      const upsideNote = isLowAdverse ? `at ${l.fmtv(l.max)} (high)` : `at ${l.fmtv(l.min)} (low)`;

      return {
        label: l.label,
        ref: l.ref,
        downside,
        upside,
        downsideDelta: downside - baseVal,
        upsideDelta: upside - baseVal,
        swing: upside - downside,
        downsideNote,
        upsideNote,
        rangeDesc: `${l.fmtv(l.min)} to ${l.fmtv(l.max)} (default: ${l.fmtv(l.def)})`
      };
    }).sort((a, b) => b.swing - a.swing).slice(0, 9);
  }

  /* ---------------- Render ----------------
     The levers live in a left-docked collapsible panel attached to the menu.
     Opened via the prominent header button, cleanly out of the way of the
     scenario charts. */
  function render(host) {
    root = host;
    resetTo('base');
    mount(host, [

      /* ---- the scenario header: state, plan, control panel trigger on right ---- */
      el('div.panel.hero.rise', { 'data-dom': 'fin' }, [
        el('div.spread.wrap', { style: { alignItems: 'flex-start', gap: 'var(--s-6)' } }, [
          el('div', { style: { minWidth: 0, maxWidth: '56ch' } }, [
            el('p.eyebrow', { style: { margin: 0 }, text: 'Simulation · Multi-Parametric Financial Stress Test' }),
            el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
              'Macroeconomic & Stress Engine: ', el('span.grad-ink', { text: 'Dynamic sensitivity across 12 levers recomputes the financial thesis.' })
            ]),
            el('p.lede', { style: { marginTop: 'var(--s-4)', color: 'var(--ink-muted)' },
              text: 'Every operational parameter feeds dynamically into the R6 financial engine, live-recomputing underwriting margin expansion, combined ratio impact, cash-flow breakeven curves, and shareholder IRR.' })
          ]),
          el('div.stack-4', { style: { alignItems: 'flex-end', minWidth: 0 } }, [
            el('div.row.wrap', { style: { gap: 'var(--s-3)', alignItems: 'center' } }, [
              el('button.btn.accent', { id: 'leverToggleBtn', type: 'button',
                style: { display: 'inline-flex', alignItems: 'center', gap: 'var(--s-3)', boxShadow: '0 4px 14px -3px var(--accent-glow)' } }, [
                el('span', { text: '⚙ Control Panel' }),
                el('span.badge.neutral', { id: 'drCountBadge', text: 'Base Plan' })
              ]),
              el('button.gbtn', { id: 'resetBtn', type: 'button', text: '↺ reset all' })
            ]),
            el('div', { id: 'stressScen', style: { minWidth: 0 } })
          ])
        ]),
        el('div', { id: 'kpis', style: { marginTop: 'var(--s-6)' } })
      ]),

      /* ---- the charts, 2-column layout ---- */
      UI.clus('Annual Operating Alpha Breakdown (Benefit Waterfall)', 'fin',
        el('button.gbtn', { id: 'tblBtn', type: 'button', text: 'table view' })),
      el('div.g-phi', { style: { alignItems: 'stretch' } }, [
        el('div.panel.rise', { 'data-dom': 'fin' }, [
          el('div', { id: 'bridge' }),
          el('div', { id: 'bridgeTable', hidden: 'hidden' })
        ]),
        el('div.panel.rise', { 'data-dom': 'fin', style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          el('div', {}, [
            el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' }, text: 'P&L Value Realization Ledger' }),
            el('div.small.muted', { style: { marginBottom: 'var(--s-4)' }, text: 'Sheet 3 Part II: Full P&L lines under active scenario levers.' }),
            el('div', { id: 'bridgeSummary' })
          ]),
          el('div', { id: 'bridgeFooterCells', style: { marginTop: 'var(--s-4)' } })
        ])
      ]),

      el('div.g-phi', { style: { marginTop: 'var(--s-6)', alignItems: 'stretch' } }, [
        el('div.panel.rise', { 'data-dom': 'fin' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'Cumulative Net Cash Flow & Capital Payback Runway' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Upfront capital deployment amortized against phased benefit realization (B-24 to B-26). The dashed line marks the institutional breakeven threshold.' }),
          el('div', { id: 'cash' })
        ]),
        el('div.panel.rise', { 'data-dom': 'ops' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'Annual Operating Expenditure: Fixed Floor vs. Elastic Volume Scaling' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: '₹4.24 Cr fixed infrastructure floor (cybersecurity, software, governance) plus volume-variable API inference scaling.' }),
          el('div', { id: 'runcost' })
        ])
      ]),

      UI.clus('Assumption Sensitivity & Key Value Drivers (Tornado Analysis)', 'risk'),
      el('div.panel.rise', { 'data-dom': 'risk' }, [
        el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
          text: 'Each bar represents the model re-run with that individual assumption swung between bounded limits while holding all other parameters constant. Proves model resilience and ranks core drivers by impact.' }),
        el('div', { id: 'tornado' })
      ]),

      el('div', { id: 'verdict', style: { marginTop: 'var(--s-6)' } }),

      /* ---- the right-docked collapsible Control Panel ---- */
      el('div.dr-scrim', { id: 'drScrim' }),
      el('aside.wsdrawer', { id: 'drawer', 'aria-label': 'Control Panel' }, [
        el('div.dr-head', {}, [
          el('div', {}, [
            el('div', { style: { fontWeight: 700, fontSize: 'var(--fs-md)', color: 'var(--ink)' }, text: 'Control Panel' }),
            el('div.small.muted', { style: { marginTop: '2px' },
              text: 'Master scenario presets & 12 financial / operating dials.' })
          ]),
          el('button.gbtn', { id: 'drClose', type: 'button', 'aria-label': 'Close', style: { fontSize: '15px', fontWeight: 700, padding: '4px 10px' }, text: '✕' })
        ]),
        el('div.dr-body', {}, [
          /* Section 1: Scenario Presets */
          el('div.lever-grp', {}, [
            el('div.lever-grp-title', {}, [
              el('span', { text: 'Scenario Presets' }),
              UI.dchip('Master Plans', 'fin')
            ]),
            el('div.seg.accent', { id: 'planSeg', style: { width: '100%', display: 'flex' } }, Object.keys(PLANS).map(p =>
              el('button', { type: 'button', 'data-plan': p, 'aria-pressed': String(p === plan),
                style: { flex: '1', textAlign: 'center', padding: '6px 8px', fontSize: '12px' },
                text: p === 'base' ? 'Base (60%)' : p === 'conservative' ? 'Cons. (20%)' : 'Aggr. (100%)' })))
          ]),
          /* Section 2: Levers container */
          el('div', { id: 'levers', style: { display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' } })
        ]),
        el('div.dr-foot', {}, [
          el('div', {}, [
            el('div.xsmall.muted', { text: 'Simulated Net Annual Benefit' }),
            el('div.mono', { id: 'drFootVal', style: { fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--dom-fin)' }, text: '₹30.86 Cr' })
          ]),
          el('button.gbtn', { id: 'drResetAllBtn', type: 'button', text: '↺ Reset All' })
        ])
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
    if ($('#drResetAllBtn')) $('#drResetAllBtn').addEventListener('click', () => { resetTo(plan); buildLevers(); update(); });
    $('#tblBtn').addEventListener('click', () => {
      const t = $('#bridgeTable'), c = $('#bridge');
      const showing = t.hasAttribute('hidden');
      t.toggleAttribute('hidden', !showing);
      c.toggleAttribute('hidden', showing);
      $('#tblBtn').textContent = showing ? 'chart view' : 'table view';
    });

    const openDr = on => {
      const d = $('#drawer'), s = $('#drScrim');
      if (d) d.classList.toggle('open', on);
      if (s) s.classList.toggle('open', on);
    };
    $('#leverToggleBtn').addEventListener('click', () => openDr(!$('#drawer').classList.contains('open')));
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
      const sc = document.getElementById('drScrim');
      if (sc) sc.classList.remove('open');
    }
  }

  const LEVER_GROUPS = [
    { title: 'Plan Strategy & Rollout', tier: 'Plan', keys: ['rollout', 'realY1', 'mkt'] },
    { title: 'Tier 2 · Statutory & Benchmarks', tier: 'Tier 2', keys: ['green', 'leakage'] },
    { title: 'Tier 3 · Operating Targets', tier: 'Tier 3', keys: ['detection', 'touchCost'] },
    { title: 'Tier 4 · Workflow Map & Models', tier: 'Tier 4', keys: ['redeploy', 'touches', 'claim', 'friction', 'synthetic'] }
  ];

  function buildLevers() {
    const host = CP.$('#levers');
    if (!host) return;

    mount(host, LEVER_GROUPS.map(grp => {
      const groupLevers = LEVERS.filter(l => grp.keys.includes(l.key));
      return el('div.lever-grp', {}, [
        el('div.lever-grp-title', {}, [
          el('span', { text: grp.title }),
          UI.dchip(grp.tier, grp.tier === 'Plan' ? 'fin' : grp.tier === 'Tier 2' ? 'cap' : grp.tier === 'Tier 3' ? 'ops' : 'risk')
        ]),
        ...groupLevers.map(l => {
          const wrap = el('div.lever', { 'data-key': l.key });
          const input = el('input', {
            type: 'range', min: l.min, max: l.max, step: l.step, value: state[l.key],
            'aria-label': l.label
          });
          const val = el('span.lever-val', { text: l.fmtv(state[l.key]) });
          const resetSingleBtn = el('button.gbtn', {
            type: 'button', title: 'Reset to default (' + l.fmtv(l.def) + ')',
            style: { padding: '1px 5px', fontSize: '11px', lineHeight: '1', display: 'none' },
            text: '↺'
          });

          const setPct = () => {
            const pct = ((state[l.key] - l.min) / (l.max - l.min) * 100);
            input.style.setProperty('--pct', pct + '%');
          };

          const checkMoved = () => {
            const isMoved = Math.abs(state[l.key] - l.def) > 1e-9;
            wrap.setAttribute('data-moved', String(isMoved));
            resetSingleBtn.style.display = isMoved ? 'inline-block' : 'none';
          };

          input.addEventListener('input', () => {
            state[l.key] = parseFloat(input.value);
            val.textContent = l.fmtv(state[l.key]);
            checkMoved();
            setPct();
            update();
          });

          resetSingleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state[l.key] = l.def;
            input.value = l.def;
            val.textContent = l.fmtv(l.def);
            checkMoved();
            setPct();
            update();
          });

          setPct();
          checkMoved();

          mount(wrap, [
            el('div.lever-head', {}, [
              el('span.lever-name', {}, [
                el('span', { text: l.label }),
                l.flag ? el('span.badge.warn', { text: 'placeholder' }) : null
              ]),
              el('div.row', { style: { gap: 'var(--s-2)', alignItems: 'center' } }, [
                resetSingleBtn,
                val
              ])
            ]),
            input,
            el('div.lever-limits', {}, [
              el('span', { text: l.fmtv(l.min) }),
              el('span', { text: l.fmtv(l.max) })
            ]),
            el('div.lever-note', { text: l.note })
          ]);
          return wrap;
        })
      ]);
    }));
  }

  const movedCount = () => LEVERS.filter(l => Math.abs(state[l.key] - l.def) > 1e-9).length;

  /* ---------------- Update everything ---------------- */
  function update() {
    const r = compute();
    const d = CPModel.run(plan, {});      // the plan's own default, for deltas

    if (CP.$('#drFootVal')) {
      CP.$('#drFootVal').textContent = '₹' + fmt.cr(r.net) + ' Cr';
    }

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
    const planName = plan === 'base' ? 'Base (60%)' : plan === 'conservative' ? 'Cons. (20%)' : 'Aggr. (100%)';
    if (CP.$('#drCountBadge')) CP.$('#drCountBadge').textContent = off.length ? `${planName} · ${off.length} mod` : `${planName} · Defaults`;
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
          : el('div.xsmall.muted', { text: 'Open the Control Panel to stress any of the twelve levers.' })
      ])
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
    Charts.waterfall(CP.$('#bridge'), {
      items: seq.map(i => i.label === 'NET ANNUAL BENEFIT' ? { ...i, kind:'total' } : i),
      unit: '₹ Cr',
      width: 520,
      height: 290
    });

    mount(CP.$('#bridgeSummary'), [UI.dtable({
      cols: [
        { key: 'l', label: 'Benefit Driver' },
        { key: 'v', label: 'Value (₹ Cr)', n: true, render: x => el('span', {
          style: { fontWeight: 700, color: x.kind === 'sub' ? 'var(--neg)' : x.kind === 'total' ? 'var(--dom-fin)' : 'var(--dom-cap)' },
          text: (x.kind === 'total' ? '' : (x.value >= 0 ? '+₹' : '−₹')) + fmt.cr(Math.abs(x.value)) + (x.kind === 'total' ? ' Cr' : '') }) }
      ],
      rows: [
        { l: 'Fraud Avoided (Graph & Gate)', value: L.fraudGraph + L.fraudGate, kind: 'add' },
        { l: 'Synthetic Media Defense', value: L.synthetic, kind: 'add' },
        { l: 'Released Capacity (Redeployed)', value: L.capacity, kind: 'add' },
        { l: 'Renewal Retention (BFDL)', value: L.renewal, kind: 'add' },
        { l: 'Live Capture Friction & Mktg', value: L.frictionCost + L.marketingCost, kind: 'sub' },
        { l: 'Annual Infrastructure Run Cost', value: -r.runCost, kind: 'sub' },
        { l: 'Net Annual Operating Alpha', value: r.net, kind: 'total' }
      ]
    })]);

    mount(CP.$('#bridgeFooterCells'), [el('div.cells.c-2', {
      style: { border: '1px solid var(--hairline)', borderRadius: 'var(--r-3)' } }, [
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'fin', size: 'sm', k: 'Net P&L Alpha', ref: 'W-35', v: fmt.cr(r.net), unit: '₹ Cr' })]),
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cap', size: 'sm', k: 'Combined Ratio', ref: 'W-43', v: fmt.cr(r.combinedPP), unit: 'pp' })])
    ])]);

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

    /* --- run cost donut chart --- */
    Charts.donut(CP.$('#runcost'), { slices: [
      { label:'GPU compute', value: r.gpu,      d:'Vision damage assessment compute overhead', color:'var(--d1)' },
      { label:'MLOps & infra', value: r.mlops,    d:'Pipeline orchestration, monitoring & pipelines', color:'var(--d2)' },
      { label:'Operations team', value: r.opsTeam,  d:'Specialized SIU & human audit queue operations', color:'var(--d3)' },
      { label:'Security & DPDP', value: r.security, d:'Data protection, audit logging & encryption', color:'var(--d4)' },
      { label:'Media storage',   value: r.storage,  d:'360° video evidence retention & archival', color:'var(--d5)' },
      { label:'Legal & governance', value: r.legal, d:'IRDAI compliance review & surveyor network audit', color:'var(--d7)' }
    ], height: 260 });
    CP.$('#runcost').appendChild(UI.disc('Fixed floor vs Variable scalability',
      `<p>Variable lines total <strong>₹${fmt.cr(r.runVariable)} Cr</strong> and fixed infrastructure lines total <strong>₹${fmt.cr(r.runFixed)} Cr</strong>. No optimisation programme can take annual run cost below that fixed floor at this operating design.</p>`));

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
