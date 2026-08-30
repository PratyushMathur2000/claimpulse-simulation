/* =====================================================================
   ClaimPulse · Value to management
   ---------------------------------------------------------------------
   The executive dashboard. Six questions, in the order a board asks
   them, and each one gets a picture rather than a paragraph:

     what changed              — the before/after band
     what are we saving        — the money, by ratio and by owner
     where did capacity go     — the people question, answered honestly
     what is the operational   — the desk, at book scale
       impact
     what is the financial     — cash, payback, NPV
       impact
     what is the future        — the three plans, and what full rollout
       potential                 would be worth

   The command centre used to carry a "what this desk saved" panel. It
   was the right content in the wrong room; it lives here now.
   ===================================================================== */

const ViewValue = (() => {
  const { el, mount, fmt, $, $$ } = CP;

  let plan = 'base';

  function render(host) {
    mount(host, [
      el('div.panel.hero.rise', { 'data-dom': 'fin' }, [
        el('div.spread.wrap', { style: { alignItems: 'flex-start', gap: 'var(--s-6)' } }, [
          el('div', { style: { minWidth: 0, maxWidth: '50ch' } }, [
            el('p.eyebrow', { style: { margin: 0 }, text: 'Demo · value to management' }),
            el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
              'What the board is actually ', el('span.grad-ink', { text: 'being asked to approve.' })
            ])
          ]),
          el('div.seg.accent', { id: 'vlPlan' }, ['conservative', 'base', 'aggressive'].map(p =>
            el('button', { type: 'button', 'data-p': p, 'aria-pressed': String(p === plan),
              text: p[0].toUpperCase() + p.slice(1) })))
        ]),
        el('div', { id: 'vlBand', style: { marginTop: 'var(--s-6)' } })
      ]),

      UI.clus('What changed', 'ops'),
      el('div.panel.rise', { 'data-dom': 'ops' }, [el('div', { id: 'vlChanged' })]),

      UI.clus('What we are saving, and who books it', 'fin'),
      el('div.g-phi', { style: { alignItems: 'stretch' } }, [
        el('div.panel.rise', { 'data-dom': 'fin' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'The benefit, line by line' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Sheet 3 Part C at steady state. Labour is deliberately zero.' }),
          el('div', { id: 'vlBridge' }),
          el('div', { style: { marginTop: 'var(--s-5)' } }, [
            UI.disc('Why the marketing line is negative',
              '<p>The Hunt &amp; Farm plan is carried at full cost against a renewal line smaller than itself. The acquisition benefit — new business won on a two-day claim promise — is real and we cannot size it, so it is not counted. A benefit we cannot size does not get to offset a cost we can.</p>'),
            UI.disc('Why there is no labour line',
              '<p>W-18 is zero by decision. Headcount does not fall, so no salary leaves the P&amp;L. What the platform releases is capacity, and capacity is booked as redeployed output at a stated realisation rate, outside both ratios.</p>')
          ])
        ]),
        el('div.panel.rise', { 'data-dom': 'fin' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'Which ratio each rupee moves' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'The distinction the finance function will make first.' }),
          el('div', { id: 'vlRatio' }),
          el('div', { id: 'vlStake', style: { marginTop: 'var(--s-6)' } })
        ])
      ]),

      UI.clus('Where capacity went', 'cap'),
      el('div.panel.rise', { 'data-dom': 'cap' }, [el('div', { id: 'vlCap' })]),

      UI.clus('Operational impact', 'ops'),
      el('div.panel.rise.pad-0', { 'data-dom': 'ops' }, [el('div', { id: 'vlOps' })]),

      UI.clus('Financial impact', 'fin'),
      el('div.g-phi', { style: { alignItems: 'stretch' } }, [
        el('div.panel.rise', { 'data-dom': 'fin' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'Cumulative cash position' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Build spent up front; benefit ramps on the realisation curve.' }),
          el('div', { id: 'vlCash' })
        ]),
        el('div.panel.rise', { 'data-dom': 'risk' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'What has to be true' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'The four decisions that are not ours to make.' }),
          el('div', { id: 'vlOpen' })
        ])
      ]),

      UI.clus('Future potential', 'ai'),
      el('div.panel.rise', { 'data-dom': 'ai' }, [
        el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
          text: 'The same engine at three rollouts. Nothing here is a separate model — only C-01 and the touch cost move.' }),
        el('div', { id: 'vlPlans' })
      ]),

      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.limits([
          '<strong>This is a decision paper, not a forecast.</strong> Every figure is the R6 model at the stated plan; move any assumption on the stress screen and these numbers move with it.',
          '<strong>No headcount reduction is claimed anywhere in it.</strong> The capacity line is redeployed output at a 70% realisation rate, booked outside both ratios.',
          '<strong>The marketing plan is carried at full cost</strong> against a renewal line smaller than itself, because the acquisition benefit is real and we cannot size it.'
        ])
      ])
    ]);

    $('#vlPlan').addEventListener('click', e => {
      const b = e.target.closest('button[data-p]'); if (!b) return;
      plan = b.dataset.p;
      $$('#vlPlan button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      paint();
    });
    paint();
  }

  function paint() {
    const r = CPModel.run(plan);
    const I = CPModel.INPUTS;
    const all = CPClaims.all();

    /* ---- the band ---- */
    mount($('#vlBand'), [el('div.cells.c-5', {
      style: { border: '1px solid var(--hairline)', borderRadius: 'var(--r-4)',
               background: 'color-mix(in srgb, var(--surface) 30%, transparent)' } }, [
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'fin',
        k: 'Net annual benefit', ref: 'W-35', v: fmt.cr(r.net), unit: '₹ Cr',
        d: 'Steady state at ' + fmt.pct(r.rollout, 0) + ' rollout, net of run cost and marketing.' })]),
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'fin',
        k: 'Payback', ref: 'FS-05', v: r.paybackKickoff ? fmt.n1(r.paybackKickoff) : '—', unit: 'months',
        d: 'From kickoff, including the ten-month build.' })]),
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'fin',
        k: '3-year NPV', ref: 'FS-04', v: fmt.cr(r.npv3), unit: '₹ Cr',
        d: 'Discounted at the 12% WACC, net of the build.' })]),
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'ops',
        k: 'Combined ratio', ref: 'W-43', v: fmt.cr(r.combinedPP), unit: 'pp',
        d: 'Motor OD. Loss plus expense, excluding the capacity line.' })]),
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'risk',
        k: 'Investment', ref: 'W-25', v: fmt.cr(r.buildTotal), unit: '₹ Cr',
        d: 'One-off build across fifteen costed components and four phases.' })])
    ])]);

    /* ---- what changed ---- */
    mount($('#vlChanged'), [UI.dtable({
      cols: [
        { key: 'm', label: 'Measure' },
        { key: 'a', label: 'Today', n: true, render: x => el('span', {
          style: { color: 'var(--dom-risk)', fontWeight: 620 }, text: x.a }) },
        { key: 'b', label: 'On ClaimPulse', n: true, render: x => el('span', {
          style: { color: 'var(--dom-cap)', fontWeight: 700 }, text: x.b }) },
        { key: 'g', label: '', render: x => UI.cbar(x.f, 'var(--dom-cap-grad)') },
        { key: 'w', label: 'Why it moves', render: x => el('span.small.muted', { text: x.w }) }
      ],
      rows: [
        { m: 'Claim turnaround', a: fmt.cr(I.B09_tatToday, 1) + ' d', b: fmt.cr(r.tatFriction, 2) + ' d',
          f: 1 - r.tatFriction / I.B09_tatToday,
          w: 'Decisions stop waiting for handoffs that add no judgement.' },
        { m: 'Manual touches per claim', a: String(I.B02_touchesToday), b: fmt.cr(r.touchesAfter, 2),
          f: 1 - r.touchesAfter / I.B02_touchesToday,
          w: 'The green lane needs none; amber needs one.' },
        { m: 'Claims settled with no human touch', a: '0%', b: fmt.pct(I.B03_green, 0),
          f: I.B03_green, w: 'Gate 00 plus five engines agreeing above the trust floor.' },
        { m: 'Physical surveys a year', a: fmt.compact(r.surveyToday), b: fmt.compact(r.surveyAfter),
          f: r.visitsAvoided / r.surveyToday,
          w: 'Below the ₹50,000 corridor the evidence already resolves the claim.' },
        { m: 'Garage estimate to approval', a: I.J06_garageToday + ' d', b: I.J07_garageAfter + ' d',
          f: 1 - I.J07_garageAfter / I.J06_garageToday,
          w: 'An indicative band arrives at first notification, not after an inspection.' },
        { m: 'Adjuster throughput', a: '1.0×', b: fmt.x(r.throughput),
          f: Math.min(1, 1 - 1 / r.throughput),
          w: 'The same team, clearing more — nobody is asked to leave.' }
      ]
    })]);

    /* ---- benefit bridge ---- */
    const L = r.lines;
    Charts.waterfall($('#vlBridge'), { height: 330, items: [
      { label: 'Fraud, graph', value: L.fraudGraph, kind: 'add', note: 'W-19 · loss ratio' },
      { label: 'Fraud, capture gate', value: L.fraudGate, kind: 'add', note: 'W-20 · loss ratio' },
      { label: 'Synthetic media', value: L.synthetic, kind: 'add', note: 'W-21 · loss ratio' },
      { label: 'Capacity redeployed', value: L.capacity, kind: 'add', note: 'W-22a · outside both ratios' },
      { label: 'Renewal retention', value: L.renewal, kind: 'add', note: 'W-22 · distribution income' },
      { label: 'Live-capture friction', value: L.frictionCost, kind: 'sub', note: 'W-23 · our own hard rule' },
      { label: 'Marketing', value: L.marketingCost, kind: 'sub', note: 'W-23a · a spend, not a saving' },
      { label: 'Run cost', value: -r.runCost, kind: 'sub', note: 'W-32' },
      { label: 'Net benefit', value: r.net, kind: 'total', note: 'W-35' }
    ]});

    /* ---- ratio attribution ---- */
    const lossCr = L.fraudGraph + L.fraudGate + L.synthetic;
    const expCr  = Math.abs(L.frictionCost) + r.runCost;
    const outside = L.capacity + L.renewal + L.marketingCost;
    Charts.gaugebar($('#vlRatio'), { rows: [
      { label: 'Moves the loss ratio', value: lossCr, max: Math.max(lossCr, expCr, Math.abs(outside)) * 1.15,
        display: '₹' + fmt.cr(lossCr) + ' Cr', c1: 'var(--dom-cap)', c2: 'var(--dom-cap-2)' },
      { label: 'Moves the expense ratio', value: expCr, max: Math.max(lossCr, expCr, Math.abs(outside)) * 1.15,
        display: '−₹' + fmt.cr(expCr) + ' Cr', c1: 'var(--dom-risk)', c2: 'var(--dom-risk-2)' },
      { label: 'Outside both ratios', value: Math.abs(outside), max: Math.max(lossCr, expCr, Math.abs(outside)) * 1.15,
        display: '₹' + fmt.cr(outside) + ' Cr', c1: 'var(--dom-fin)', c2: 'var(--dom-fin-2)' }
    ]});

    mount($('#vlStake'), [
      UI.dtable({
        cols: [
          { key: 'w', label: 'Books the benefit', tip: x => ({ title: x.w, rows: [['Workbook ref', x.r], ['Contribution', fmt.cr(x.v) + ' ₹ Cr']] }) },
          { key: 'v', label: '₹ Cr', n: true, render: x => el('span', {
            style: { fontWeight: 680, color: x.v < 0 ? 'var(--neg)' : 'var(--ink)' },
            text: fmt.cr(x.v) }) }
        ],
        rows: [
          { w: 'BGeneral underwriting', v: r.stake.underwriting, r: 'W-57' },
          { w: 'BGeneral claims operations', v: r.stake.claimsOps, r: 'W-56' },
          { w: 'BFDL distribution', v: r.stake.bfdl, r: 'W-58' },
          { w: 'less: platform run cost', v: r.stake.runCost, r: 'W-59' }
        ]
      }),
      el('div', { style: { marginTop: 'var(--s-5)' } }, [
        UI.disc('Does the split reconcile to the P&L?',
          `<p>The four lines sum to <strong>${UI.money(r.net)}</strong>, which is W-35 exactly. The check at W-60 returns ${fmt.cr(r.stake.check, 0)}. If the stakeholder split ever drifts from the P&amp;L that number stops being zero.</p>`,
          { chip: 'W-60 = 0' })
      ])
    ]);

    /* ---- capacity ---- */
    mount($('#vlCap'), [
      UI.flow([
        { k: 'Effort reduced', v: fmt.compact(r.touchesAvoided), d: 'manual touches automated a year',
          color: 'var(--dom-risk)' },
        { k: 'Hours released', v: fmt.compact(r.hoursReleased), d: 'at ' + I.J01_minutesPerTouch + ' minutes a touch',
          color: 'var(--dom-ops)' },
        { k: 'Resources redeployed', v: fmt.n1(r.fteReleased) + ' FTE', d: 'headcount retained; capacity repurposed',
          color: 'var(--dom-cap)' },
        { k: 'Productive capacity value', v: '₹' + fmt.cr(r.lines.capacity) + ' Cr',
          d: 'at ' + fmt.pct(I.B29_redeployRealisation, 0) + ' realisation, reported outside both ratios',
          color: 'var(--dom-fin)' }
      ]),
      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.dtable({
          cols: [
            { key: 'w', label: 'Capacity repurposed into' },
            { key: 'f', label: 'FTE', n: true },
            { key: 'why', label: 'Strategic operational value', render: x => el('span.small.muted', { text: x.why }) }
          ],
          rows: [
            { w: 'Complex and disputed claims', f: fmt.n1(r.fteReleased * 0.35),
              why: 'Amber and red claims require adjuster judgement — now arriving with all forensic evidence pre-compiled.' },
            { w: 'Claims above ₹50,000 corridor', f: fmt.n1(r.fteReleased * 0.25),
              why: 'Statutory rules mandate physical surveyor assessment. Surveyors elevate into high-severity loss management.' },
            { w: 'Fraud network investigation', f: fmt.n1(r.fteReleased * 0.22),
              why: 'Graph AI surfaces syndicates and collusive rings; investigators focus on high-yield fraud recovery.' },
            { w: 'Proactive customer recovery & renewal', f: fmt.n1(r.fteReleased * 0.18),
              why: 'Claimants represent the highest-risk churn cohort. Liberated capacity enables direct outbound retention calls.' }
          ]
        })
      ]),
      el('div', { style: { marginTop: 'var(--s-5)' } }, [
        UI.disc('Why we do not claim this as a headcount reduction',
          `<p>Headcount is preserved, so payroll expense does not leave the P&amp;L. Crediting the capacity line to the expense ratio would add roughly 1.0 pp to the combined-ratio movement and artificially inflate operational efficiency. It is deliberately reported outside both ratios, at a conservative ${fmt.pct(I.B29_redeployRealisation, 0)} realisation rate.</p>`,
          { chip: 'conservative standard' })
      ])
    ]);

    /* ---- operational impact, at book scale ---- */
    const counts = CPClaims.laneCounts();
    mount($('#vlOps'), [
      el('div.cells.c-4', {}, [
        UI.metric({ dom: 'ops', size: 'sm', k: 'Claims a year on the platform', ref: 'W-05',
          v: fmt.compact(r.claims),
          d: 'The addressable Motor OD book at ' + fmt.pct(r.rollout, 0) + ' rollout.' }),
        UI.metric({ dom: 'cap', size: 'sm', k: 'Settled with no human touch', ref: 'W-63',
          v: fmt.compact(r.autoSettled),
          d: 'Green lane. On the demo desk that is ' + counts.G + ' of ' + all.length + '.' }),
        UI.metric({ dom: 'cust', size: 'sm', k: 'Claimant-days returned', ref: 'W-62',
          v: fmt.compact(r.claimantDays), unit: 'a year',
          d: 'On-platform claims multiplied by the days each one saves.' }),
        UI.metric({ dom: 'ai', size: 'sm', k: 'Surveyor visits avoided', ref: 'W-72',
          v: fmt.compact(r.visitsAvoided), unit: 'a year',
          d: 'All below ₹50,000, where the evidence already resolved the claim.' })
      ], { noBottom: true })
    ]);

    /* ---- cash ---- */
    const pts = [{ m: 0, v: -r.buildTotal, tick: 'Build', label: 'Build complete' }];
    const yearCF = [r.cf1, r.cf2, r.cf3];
    let cum = -r.buildTotal;
    for (let yr = 0; yr < 3; yr++) for (let mo = 1; mo <= 12; mo++) {
      cum += yearCF[yr] / 12;
      pts.push({ m: yr * 12 + mo, v: cum, tick: mo === 12 ? 'Year ' + (yr + 1) : null,
        label: `Year ${yr + 1}, month ${mo}` });
    }
    Charts.cashflow($('#vlCash'), { points: pts, buildCost: r.buildTotal,
      paybackMonths: r.paybackKickoff ? r.paybackKickoff - I.B27_buildMonths : null,
      paybackLabel: r.paybackKickoff ? 'build repaid · ' + fmt.n1(r.paybackKickoff) + ' mo from kickoff' : null });

    /* ---- open decisions ---- */
    mount($('#vlOpen'), [UI.dtable({
      cols: [
        { key: 'q', label: 'Decision', render: x => el('span', {}, [
          el('span', { style: { fontWeight: 620 }, text: x.q }),
          el('div.sub', { text: x.w })
        ]) },
        { key: 'r', label: 'Ref', render: x => el('span.mono', { text: x.r }) },
        { key: 'i', label: 'If it goes the other way', render: x => el('span.small.muted', { text: x.i }) }
      ],
      rows: [
        { q: 'Redeployment realisation', r: 'B-29',
          w: 'How much released capacity becomes real output.',
          i: 'At 0% the capacity line disappears and net benefit falls to ' + UI.money(CPModel.run(plan, { B29_redeployRealisation: 0 }).net) + '.' },
        { q: 'Premium basis for the ratio', r: 'A-02',
          w: 'Motor OD earned premium versus the group book.',
          i: 'The pp movement rescales; the rupees do not change.' },
        { q: 'Dealer commission treatment', r: 'B-30',
          w: 'Incremental spend, or a pre-existing network cost.',
          i: 'Switching it on adds the commission to the marketing cost line.' },
        { q: 'Expense-ratio treatment of capacity', r: 'B-31',
          w: 'Whether redeployed output may be credited to the ratio.',
          i: 'Crediting it improves the combined ratio by roughly 1.0 pp. We do not.' }
      ]
    })]);

    /* ---- the three plans ---- */
    const plans = ['conservative', 'base', 'aggressive'].map(p => ({ p, r: CPModel.run(p) }));
    mount($('#vlPlans'), [UI.dtable({
      cols: [
        { key: 'p', label: 'Plan', render: x => el('span', {}, [
          el('span', { style: { fontWeight: 660, color: x.p === plan ? 'var(--accent)' : 'var(--ink)' },
            text: x.p[0].toUpperCase() + x.p.slice(1) }),
          el('div.sub', { text: fmt.pct(x.r.rollout, 0) + ' of the addressable book' })
        ]) },
        { key: 'net', label: 'Net benefit', n: true, render: x => el('span', {}, [
          el('span', { style: { fontWeight: 700 }, text: '₹' + fmt.cr(x.r.net) + ' Cr' }),
          UI.cbar(x.r.net / plans[2].r.net, 'var(--dom-fin-grad)')
        ]) },
        { key: 'pb', label: 'Payback', n: true, render: x => el('span', {
          text: x.r.paybackKickoff ? fmt.n1(x.r.paybackKickoff) + ' mo' : '—' }) },
        { key: 'npv', label: '3-yr NPV', n: true, render: x => el('span', {
          text: '₹' + fmt.cr(x.r.npv3) + ' Cr' }) },
        { key: 'cr', label: 'Combined ratio', n: true, render: x => el('span', {
          text: fmt.cr(x.r.combinedPP) + ' pp' }) },
        { key: 'note', label: '', render: x => el('span.small.muted', { text:
          x.p === 'conservative' ? 'One region, one product. Proves the mechanism before it is scaled.'
          : x.p === 'base' ? 'The recommendation. Enough scale to matter, enough caution to survive a bad quarter.'
          : 'Full rollout. The ceiling, if every assumption holds.' }) }
      ],
      rows: plans,
      selected: x => x.p === plan,
      onRow: x => {
        plan = x.p;
        $$('#vlPlan button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === plan)));
        paint();
      }
    })]);
  }

  return { render };
})();
