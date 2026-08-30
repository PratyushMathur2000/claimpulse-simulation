/* =====================================================================
   ClaimPulse · TAT and the repurposing of capacity
   ---------------------------------------------------------------------
   Two questions, one screen, and the second one is the one R6 turns on.

   Where do the 9.8 days go — answered by a table, because a table is
   what an arithmetic build-up wants to be.

   What happens to the people — answered by a picture, because the
   argument is a movement and movements are seen, not read. Nobody is
   cut. Work moves. The chain runs touches → hours → FTE → output, and
   only the last link is a judgement, which is flagged as one.
   ===================================================================== */

const ViewTat = (() => {
  const { el, mount, fmt, $ } = CP;

  /* How the released hours divide by activity, and where they go. Both
     splits are our own operational read of the workflow map, not
     workbook inputs — the screen says so rather than implying otherwise. */
  const ABSORBED = [
    ['Document collection and chase', 0.32, 'var(--d1)'],
    ['Manual verification',           0.24, 'var(--d3)'],
    ['Survey coordination',           0.20, 'var(--d4)'],
    ['Approval routing',              0.14, 'var(--d7)'],
    ['Status calls to claimants',     0.10, 'var(--d5)']
  ];
  const REDEPLOYED = [
    ['Complex and disputed claims',      0.35, 'var(--dom-cap)'],
    ['Claims above the ₹50,000 corridor',0.25, 'var(--dom-ops)'],
    ['Fraud investigation',              0.22, 'var(--dom-ai)'],
    ['Customer recovery and renewal',    0.18, 'var(--dom-cust)']
  ];

  function render(host) {
    const r = CPModel.run('base');
    const I = CPModel.INPUTS;
    const mkt = r.marketing;
    const zero = CPModel.run('base', { B29_redeployRealisation: 0 });

    mount(host, [
      el('div.panel.hero.rise', { 'data-dom': 'cap' }, [
        el('div.spread.wrap', { style: { alignItems: 'flex-start', gap: 'var(--s-6)' } }, [
          el('div', { style: { minWidth: 0, maxWidth: '58ch' } }, [
            el('p.eyebrow', { style: { margin: 0 }, text: 'Simulation · TAT and repurposing' }),
            el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
              'Zero retrenchment. ', el('span.grad-ink', { text: 'Capacity is redeployed to higher value.' })
            ]),
            el('p.lede', { style: { marginTop: 'var(--s-4)' },
              text: 'Turnaround falls because deterministic claims stop waiting for redundant manual touchpoints. Adjuster capacity is redeployed into complex claims, proactive customer recovery, and fraud ring investigations.' })
          ]),
          UI.dchip('W-18 labour saving = 0', 'cap')
        ]),
        el('div', { id: 'tatFlow', style: { marginTop: 'var(--s-7)' } })
      ]),

      /* ================= THE CHAIN, SEEN ================= */
      UI.clus('Where the released capacity goes', 'cap'),
      el('div.panel.rise', { 'data-dom': 'cap' }, [
        el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
          el('div', {}, [
            el('h3', { style: { margin: 0, fontSize: 'var(--fs-md)' },
              text: 'What the platform absorbs, and what the team picks up instead' }),
            el('div.small.muted', { style: { marginTop: 'var(--s-2)' },
              text: fmt.n1(r.fteReleased) + ' FTE of capacity, moving left to right. Hover any ribbon.' })
          ]),
          UI.dchip('split is operational, not workbook', 'ai')
        ]),
        el('div.dtable-wrap', {}, [el('div', { id: 'tatSankey', style: { minWidth: '840px' } })]),
        el('div', { id: 'tatChainCells', style: { marginTop: 'var(--s-6)' } })
      ]),

      /* ================= THE ARITHMETIC ================= */
      el('div.g-phi', { style: { marginTop: 'var(--s-6)', alignItems: 'stretch' } }, [
        el('div.panel.rise', { 'data-dom': 'ops' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'How the turnaround number is built' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Lane-weighted, restated after live-capture friction, then blended across the share of the book actually reached.' }),
          el('div', { id: 'tatSteps' })
        ]),
        el('div.panel.rise', { 'data-dom': 'cust' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'The surveyor and garage chain' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Two stakeholders the case depends on and the deck usually forgets.' }),
          el('div', { id: 'tatGauge' }),
          el('div.cells.c-2', { style: { marginTop: 'var(--s-5)',
            border: '1px solid var(--hairline)', borderRadius: 'var(--r-3)' } }, [
            el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cap', size: 'sm',
              k: 'Days back to the network', ref: 'W-73', v: String(r.garageDaysSaved), unit: 'per job',
              d: 'A bay held for an unapproved job earns nothing. Three days a job, across the whole panel.' })]),
            el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'ops', size: 'sm',
              k: 'Surveyors move up, not out', v: fmt.pct(r.visitsAvoided / r.surveyToday, 0), unit: 'of visits',
              d: 'The visits avoided are all below ₹50,000, where the evidence already resolved the claim. Above the corridor a registered surveyor is still required.' })])
          ]),
          el('div', { style: { marginTop: 'var(--s-5)' } }, [
            UI.disc('The mechanism, not the wish',
              '<p>The repair cost engine returns an indicative band at first notification rather than after a physical inspection. That is why the garage waits one day instead of four — a bay freed is a bay earning.</p>')
          ])
        ])
      ]),

      /* ================= ACQUISITION ================= */
      UI.clus('And how we attract new customers with it', 'cust'),
      el('div.panel.rise', { 'data-dom': 'cust' }, [
        el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
          el('div.small.muted', { text: 'The Hunt & Farm plan. In R6 this is a COST line, not a benefit — the same rupees the plan proposes spending.' }),
          UI.dchip('cost, not benefit', 'risk')
        ]),
        el('div.g-phi', {}, [
          el('div', { id: 'tatMkt' }),
          el('div.stack-5', {}, [
            UI.metric({ dom: 'fin', size: 'sm', k: 'Marketing plan, total', ref: 'MARKETTING E51',
              v: fmt.cr(mkt.totalCr), unit: '₹ Cr',
              d: 'Physical dealer kit plus digital, campaign and event channels. Dealer commission is excluded by the B-30 switch.' }),
            UI.metric({ dom: 'risk', size: 'sm', k: 'Carried at 60% rollout', ref: 'W-23a',
              v: fmt.cr(Math.abs(r.lines.marketingCost)), unit: '₹ Cr',
              d: 'Subtracted before the headline benefit, and booked against BFDL distribution.' }),
            UI.metric({ dom: 'cust', size: 'sm', k: 'Renewal retention it defends', ref: 'W-22',
              v: fmt.cr(r.lines.renewal), unit: '₹ Cr',
              d: 'Uplift on the claimant cohort only. The whole-book NPS effect is not counted at all.' }),
            UI.disc('The plan costs more than the renewal line it defends',
              '<p>At this rollout that is simply true. It is carried anyway, at full cost, because the acquisition case rests on new business the model does not attempt to value — and a benefit we cannot size does not get to offset a cost we can.</p>',
              { chip: 'read this one' })
          ])
        ])
      ]),

      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.limits([
          '<strong>The 20 minutes per manual touch (J-01) is a team estimate.</strong> It converts touches into hours, so every FTE figure on this screen moves with it.',
          '<strong>The 70% redeployment realisation (B-29) is a placeholder</strong> and the largest Tier 4 input in the model. At 0% the capacity line disappears and net annual benefit falls to ' + UI.money(zero.net) + '.',
          '<strong>Seven touches per claim (B-02) is workflow-mapped, not filed.</strong> One session with Bajaj claims operations settles it, and it is data request 1.',
          '<strong>The activity split on this screen is ours.</strong> The totals are the workbook\'s; how the released hours divide across five activities and four destinations is our operational read of the workflow map.'
        ])
      ])
    ]);

    /* ---------------- the transformation ribbon ---------------- */
    const totalBookTouches = r.claimsFull * I.B02_touchesToday;
    mount($('#tatFlow'), [UI.flow([
      { k: 'Current book touches', v: '19.2L touches',
        d: '7.0 manual touches per claim across the entire 2.74L claim book (11.5L on platform)', color: 'var(--dom-risk)' },
      { k: 'AI absorbs', v: fmt.compact(r.touchesAvoided),
        d: 'Repetitive, checkable, evidence-bound work automated', color: 'var(--dom-ai)' },
      { k: 'Capacity released', v: fmt.compact(r.hoursReleased) + ' hrs',
        d: 'At ' + I.J01_minutesPerTouch + ' minutes a touch (Tier 4 workflow estimate)', color: 'var(--dom-ops)' },
      { k: 'Resources redeployed', v: fmt.n1(r.fteReleased) + ' FTE',
        d: 'Redeployed to high-value operations — headcount is preserved', color: 'var(--dom-cap)' },
      { k: 'Productive capacity value', v: '₹' + fmt.cr(r.lines.capacity) + ' Cr',
        d: 'At ' + fmt.pct(I.B29_redeployRealisation, 0) + ' realisation rate, outside both ratios',
        color: 'var(--dom-fin)' }
    ])]);

    /* ---------------- the sankey ---------------- */
    Charts.sankey($('#tatSankey'), {
      left:  ABSORBED.map(([label, sh, c]) => ({ label, value: r.fteReleased * sh, color: c })),
      right: REDEPLOYED.map(([label, sh, c]) => ({ label, value: r.fteReleased * sh, color: c })),
      height: 320, unit: 'FTE'
    });

    mount($('#tatChainCells'), [
      el('div.cells.c-4', { style: { border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-3)' } }, [
        el('div.cell-x', {}, [UI.metric({ dom: 'ops', size: 'sm', k: 'Touches avoided', ref: 'W-66',
          v: fmt.compact(r.touchesAvoided), unit: 'a year',
          d: 'On-platform claims × ' + fmt.cr(r.touchesSaved) + ' touches removed per claim.' })]),
        el('div.cell-x', {}, [UI.metric({ dom: 'ops', size: 'sm', k: 'Hours released', ref: 'W-67',
          v: fmt.compact(r.hoursReleased), unit: 'a year',
          d: 'Touches avoided × ' + I.J01_minutesPerTouch + ' minutes per touch.' })]),
        el('div.cell-x', {}, [UI.metric({ dom: 'cap', size: 'sm', k: 'FTE capacity released', ref: 'W-68',
          v: fmt.n1(r.fteReleased), unit: 'FTE',
          d: 'Hours released ÷ ' + fmt.n(I.J02_hoursPerFTE) + ' productive hours per FTE.' })]),
        el('div.cell-x', {}, [UI.metric({ dom: 'fin', size: 'sm', k: 'Booked as redeployed output', ref: 'W-22a',
          v: fmt.cr(r.lines.capacity), unit: '₹ Cr',
          d: 'At the ' + fmt.pct(I.B29_redeployRealisation, 0) + ' realisation rate at B-29.' })])
      ]),
      el('div', { style: { marginTop: 'var(--s-5)' } }, [
        UI.disc('Why this is not a labour saving',
          `<p>The full value of the released capacity is ${UI.money(r.touchesAvoided * r.touchCost / 1e7)}. We claim ${fmt.pct(I.B29_redeployRealisation, 0)} of it, ${UI.money(r.lines.capacity)}, and we book it <em>outside</em> both ratios — because headcount does not fall, so claims-handling cost does not fall either.</p>
           <p>Without considering capacity repurposing (${UI.money(r.lines.capacity)}) and marketing investment (${UI.money(r.lines.marketingCost)}), the baseline net benefit falls to <strong>₹14.24 Cr</strong>. Including redeployed capacity net of marketing brings net annual benefit to <strong>₹30.86 Cr</strong> (${UI.money(r.net)} steady state at Base).</p>
           <p>Crediting it to the expense ratio would add roughly 1.0 pp to the combined-ratio movement and make the case look artificially high. It is deliberately reported outside both ratios for audit integrity.</p>`,
          { open: true, chip: 'the R6 change' })
      ])
    ]);

    /* ---------------- TAT build-up ---------------- */
    mount($('#tatSteps'), [UI.dtable({
      cols: [
        { key: 'step', label: 'Step',
          tip: x => ({ title: x.step, rows: [['Workbook ref', x.ref], ['', x.how]] }),
          render: x => el('span', {}, [
            el('span', { style: { fontWeight: 620 } }, [x.step]),
            el('div.sub', { text: x.how })
          ])
        },
        { key: 'days', label: 'Days', n: true, render: x => el('span', {
          style: { fontWeight: x.total ? 700 : 600, color: x.total ? 'var(--dom-cap)' : 'var(--ink)' },
          text: x.days }) }
      ],
      rows: [
        { step: 'Claim TAT today', ref: 'B-09', days: fmt.cr(I.B09_tatToday, 2),
          how: 'Industry-typical 7 to 10+ days.' },
        { step: 'Lane-weighted on the platform', ref: 'W-12', days: fmt.cr(r.tatPlatform, 2),
          how: `${fmt.pct(I.B03_green,0)}×${I.B10_tatGreen}d + ${fmt.pct(I.B04_amber,0)}×${I.B11_tatAmber}d + ${fmt.pct(I.B05_red,0)}×${I.B12_tatRed}d` },
        { step: '…after live-capture friction', ref: 'W-14', days: fmt.cr(r.tatFriction, 2),
          how: `${fmt.pct(I.B20_friction, 0)} of claims drop green → amber because live capture was not possible.` },
        { step: 'Blended across the whole book', ref: 'W-15', days: fmt.cr(r.tatBlended, 2),
          how: `Platform TAT on ${fmt.pct(r.rollout, 0)} of the book, 9.8 days on the rest.` },
        { step: 'TAT REDUCTION', ref: 'W-16', days: fmt.cr(r.tatCut, 2), total: true,
          how: fmt.pct(r.tatCutPct, 1) + ' faster across the whole Motor OD book.' }
      ]
    })]);

    /* ---------------- surveyor and garage ---------------- */
    Charts.gaugebar($('#tatGauge'), { rows: [
      { label: 'Claims surveyed today', value: r.surveyToday, max: r.surveyToday * 1.1,
        display: fmt.compact(r.surveyToday), c1: 'var(--dom-risk)', c2: 'var(--dom-risk-2)' },
      { label: 'Surveyed on ClaimPulse', value: r.surveyAfter, max: r.surveyToday * 1.1,
        display: fmt.compact(r.surveyAfter), c1: 'var(--dom-cap)', c2: 'var(--dom-cap-2)' },
      { label: 'Visits avoided', value: r.visitsAvoided, max: r.surveyToday * 1.1,
        display: fmt.compact(r.visitsAvoided), c1: 'var(--dom-ops)', c2: 'var(--dom-ops-2)' },
      { label: 'Garage wait, today', value: I.J06_garageToday, max: I.J06_garageToday * 1.1,
        display: I.J06_garageToday + ' days', c1: 'var(--dom-risk)', c2: 'var(--dom-risk-2)' },
      { label: 'Garage wait, after', value: I.J07_garageAfter, max: I.J06_garageToday * 1.1,
        display: I.J07_garageAfter + ' day', c1: 'var(--dom-cap)', c2: 'var(--dom-cap-2)' }
    ]});

    /* ---------------- marketing channel split ---------------- */
    Charts.hbar($('#tatMkt'), { items: [
      { label: 'Dealer kit — showrooms', value: mkt.kit * 0.4013 / 1e7, color: 'var(--d1)' },
      { label: 'Dealer kit — used-car', value: mkt.kit * 0.5556 / 1e7, color: 'var(--d3)' },
      { label: 'Dealer kit — garages', value: mkt.kit * 0.0431 / 1e7, color: 'var(--d6)' },
      { label: 'Digital, campaign, event', value: mkt.digital / 1e7, color: 'var(--d4)' },
      { label: 'Dealer commission (excluded)', value: 0.0001, color: 'var(--border-strong)',
        note: 'Excluded by default under B-30: Hunt & Farm treats panel commission as a pre-existing network cost, not incremental spend.' }
    ], compact: true });
  }

  return { render };
})();
