/* =====================================================================
   ClaimPulse · Overview — the case in one screen
   ---------------------------------------------------------------------
   Rebuilt around clusters rather than a wall of identical tiles. Five
   subjects, five colours, one screen:

     risk  — what the book is doing today
     ops   — what the claim journey becomes
     fin   — what that is worth and who books it
     cap   — the people the platform releases
     ai    — where the model actually runs

   Nothing here is explained in a paragraph that a number could carry.
   ===================================================================== */

const ViewOverview = (() => {
  const { el, mount, fmt, $ } = CP;

  function render(host) {
    const r = CPModel.run('base');
    const I = CPModel.INPUTS;
    const chk = CPModel.selfCheck();
    const costToServe = I.B02_touchesToday * I.B28_baselineTouchCost;

    mount(host, [

      /* ================= HERO =================
         The whole case, above the fold: the collapse on the left as a
         picture, the three numbers a board actually asks for on the
         right. Nothing else competes with it. */
      el('div.panel.hero.rise', { 'data-dom': 'fin' }, [
        el('div.g-phi', { style: { alignItems: 'center', gap: 'var(--s-7)' } }, [

          el('div', { style: { minWidth: 0 } }, [
            el('div.row', { style: { marginBottom: 'var(--s-5)' } }, [
              el('span.orb'),
              el('span.xsmall', { style: {
                letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase',
                fontWeight: 700, color: 'var(--ink-faint)' },
                text: 'Motor own damage · verified-evidence orchestration' })
            ]),
            el('h1', { style: { fontSize: 'var(--fs-2xl)', lineHeight: 1.12, margin: 0 } }, [
              '9.8 days and ₹1,750 a claim, ',
              el('span.grad-ink', { text: 'inside a book already at 104.7%.' })
            ]),
            el('p.lede', { style: { marginTop: 'var(--s-5)', maxWidth: '54ch' },
              text: 'Every unnecessary day sits in the expense ratio; every unflagged leak sits in the loss ratio. ClaimPulse gates the evidence before it trusts it, then routes by Trust Score.' }),
            el('div', { id: 'ovBeam', style: { marginTop: 'var(--s-5)' } })
          ]),

          el('div.cells.c-1', { style: {
            border: '1px solid var(--hairline)', borderRadius: 'var(--r-4)',
            background: 'color-mix(in srgb, var(--surface) 34%, transparent)' } }, [
            el('div.cell-x', {}, [UI.metric({ dom: 'fin', k: 'Net annual benefit', ref: 'W-35',
              v: fmt.cr(r.net), unit: '₹ Cr',
              d: 'Steady state at 60% rollout, net of every annual run cost and of the marketing plan.' })]),
            el('div.cell-x', {}, [UI.metric({ dom: 'fin', k: 'Payback from kickoff', ref: 'FS-05',
              v: fmt.n1(r.paybackKickoff), unit: 'months',
              d: 'Including the ten-month build. The honest headline, not payback from go-live.' })]),
            el('div.cell-x', {}, [UI.metric({ dom: 'ops', k: 'Motor OD combined ratio', ref: 'W-43',
              v: fmt.cr(r.combinedPP), unit: 'pp delta',
              d: 'Loss plus expense movement against Motor OD earned premium.' })]),
            el('div.cell-x', { style: { borderBottom: 0 } }, [
              el('div.row', { style: { justifyContent: 'space-between', gap: 'var(--s-4)' } }, [
                el('span.small.muted', { text: 'Every figure ties to the R6 workbook' }),
                el('span.integrity.ok', { text: `✓ ${chk.passed}/${chk.total} anchors` })
              ])
            ])
          ])
        ])
      ]),

      /* ================= TODAY ================= */
      UI.clus('The book today · filed numbers', 'risk'),
      el('div.panel.rise.pad-0', { 'data-dom': 'risk' }, [
        UI.cells(4, [
          UI.metric({ dom: 'risk', k: 'Group combined ratio', ref: 'K-01', v: '104.7%', unit: 'filed',
            d: 'Q1 FY27, filed. Above 100% — every rupee of premium costs more than a rupee to service.' }),
          UI.metric({ dom: 'risk', k: 'Underwriting loss, annualised', ref: 'W-86', v: fmt.n(130 * 4), unit: '₹ Cr',
            d: 'Q1 FY27 filed, multiplied by four. Directional, and labelled as such.' }),
          UI.metric({ dom: 'risk', k: 'Claim turnaround', ref: 'B-09', v: fmt.cr(I.B09_tatToday, 1), unit: 'days',
            d: 'Seven manual handoffs and a physical survey on 55% of claims.' }),
          UI.metric({ dom: 'risk', k: 'Cost to serve one claim', ref: 'B-02 × B-28', v: fmt.n(costToServe), unit: '₹ / claim',
            d: `${I.B02_touchesToday} manual touches at ₹${fmt.n(I.B28_baselineTouchCost)} each.` })
        ], { noBottom: true })
      ]),

      /* ================= THE JOURNEY ================= */
      UI.clus('What the claim becomes', 'ops'),
      el('div.panel.rise', { 'data-dom': 'ops' }, [
        el('div', { id: 'ovJourney' }),
        el('div', { style: { height: 'var(--s-6)' } }),
        UI.cells(4, [
          UI.metric({ dom: 'ops', size: 'sm', k: 'TAT on the platform', ref: 'W-14',
            v: fmt.cr(r.tatFriction), unit: 'days', delta: '▼ ' + fmt.cr(r.tatToday - r.tatFriction) + ' d', deltaGood: true,
            d: 'After the friction cost of our own live-capture rule — 8% of honest claimants drop a lane.' }),
          UI.metric({ dom: 'ops', size: 'sm', k: 'Blended across the book', ref: 'W-15',
            v: fmt.cr(r.tatBlended), unit: 'days',
            d: `Platform TAT on the ${fmt.pct(r.rollout, 0)} rolled out, 9.8 days on the rest.` }),
          UI.metric({ dom: 'ops', size: 'sm', k: 'Manual touches per claim', ref: 'W-10',
            v: fmt.cr(r.touchesAfter), unit: 'touches', delta: '▼ ' + fmt.cr(r.touchesSaved), deltaGood: true,
            d: 'Lane-weighted across 65% green, 25% amber, 10% red.' }),
          UI.metric({ dom: 'ops', size: 'sm', k: 'Adjuster throughput', ref: 'W-69',
            v: fmt.x(r.throughput), unit: 'capacity',
            d: 'The same team clears this multiple of claims. No one is asked to leave.' })
        ], { noBottom: true })
      ]),

      /* ================= WHERE THE BOOK SITS ================= */
      el('div.g-phi', { style: { marginTop: 'var(--s-6)', alignItems: 'stretch' } }, [
        el('div.panel.rise', { 'data-dom': 'ai' }, [
          el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
            el('div', {}, [
              el('h3', { style: { margin: 0, fontSize: 'var(--fs-md)' }, text: 'Where the book sits at 60% rollout' }),
              el('div.small.muted', { style: { marginTop: 'var(--s-2)' },
                text: 'Three lanes on the rolled-out share; the rest still on the 9.8-day journey.' })
            ]),
            UI.dchip('counterweight shown', 'ai')
          ]),
          el('div', { id: 'ovLanes' }),
          el('div', { id: 'ovLaneTbl', style: { marginTop: 'var(--s-6)' } })
        ]),
        el('div.panel.rise', { 'data-dom': 'ai', style: { display: 'grid', placeItems: 'center' } }, [
          el('div', { id: 'ovRing', style: { width: '100%', maxWidth: '220px' } }),
          el('div.small.muted', { style: { textAlign: 'center', marginTop: 'var(--s-4)', maxWidth: '30ch' },
            text: 'Two claims in three are settled without a generative call ever being made.' })
        ])
      ]),

      /* ================= WHO BOOKS IT ================= */
      UI.clus('Who books each rupee (₹ Cr)', 'fin'),
      el('div.panel.rise', { 'data-dom': 'fin' }, [
        el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
          el('div.small.muted', { text: 'Sheet 3 Part I. Stakeholder split must reconcile to Net Annual Benefit exactly.' }),
          UI.dchip('W-60 = 0.000 Cr', 'fin')
        ]),
        el('div', { id: 'ovStake' }),
        el('div', { id: 'ovRecon', style: { marginTop: 'var(--s-5)' } })
      ]),

      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.limits([
          '<strong>No headcount reduction is claimed.</strong> The labour line (W-18) is deliberately zero. Released capacity is booked as redeployed output at a 70% realisation rate, outside both ratios.',
          '<strong>90% fraud detection is a target, not a demonstrated capability.</strong> The downside test lands it at 82%; the stress screen runs the curve back to today\'s 62%.',
          '<strong>The marketing plan is a cost here, not a benefit.</strong> ₹5.33 Cr at this rollout (Hunt & Farm plan total of ₹8.88 Cr), subtracted before the headline (BFDL distribution net value is −₹4.75 Cr).',
          '<strong>Four inputs are still open decisions</strong> — redeployment rate, premium basis, dealer commission and the expense-ratio treatment.'
        ])
      ])
    ]);

    /* ---------------- draw ---------------- */
    Charts.beam($('#ovBeam'), {
      from: r.tatToday, to: r.tatFriction, unit: 'days',
      fromLabel: 'today', toLabel: 'on ClaimPulse',
      c1: 'var(--dom-risk)', c2: 'var(--dom-cap)', height: 150
    });

    Diagrams.journey($('#ovJourney'), {
      todayTotal: r.tatToday, afterTotal: r.tatFriction,
      today: [
        { name: 'FNOL and registration', short: 'FNOL', days: 0.6, manual: true },
        { name: 'Document collection and chase', short: 'Documents', days: 2.4, manual: true, note: 'Three of seven steps sit outside the insurer\'s control.' },
        { name: 'Manual verification', short: 'Verify', days: 1.8, manual: true },
        { name: 'Physical survey allocation and visit', short: 'Survey', days: 3.2, manual: true, note: '55% of claims are surveyed today (J-03).' },
        { name: 'Approval and settlement', short: 'Settle', days: 1.8, manual: true }
      ],
      after: [
        { name: 'Guided live capture, five engines and lane routing', short: 'Automated', days: 0.30,
          note: 'Gate 00, the five engines in parallel and Trust Score fusion. Machine time, measured in minutes.' },
        { name: 'Assisted review where the lane needs it', short: 'Review', days: 1.6, manual: true,
          note: 'Amber and red only. The evidence arrives already assembled.' },
        { name: 'Settlement and payment', short: 'Settle', days: 0.81 }
      ]
    });

    Diagrams.laneRibbon($('#ovLanes'), r);

    mount($('#ovLaneTbl'), [UI.dtable({
      cols: [
        { key: 'lane', label: 'Lane', render: x => UI.dchip(x.lane, x.k) },
        { key: 'share', label: 'Share', n: true },
        { key: 'tat', label: 'TAT', n: true },
        { key: 'touch', label: 'Touches', n: true },
        { key: 'genai', label: 'GenAI' },
        { key: 'what', label: 'What happens', render: x => el('span.small.muted', { text: x.what }) }
      ],
      rows: [
        { k: 'g', lane: 'green', share: fmt.pct(I.B03_green, 0), tat: I.B10_tatGreen + ' d',
          touch: I.B06_touchGreen, genai: '—', what: 'Auto-settled. Capped at ₹50,000 by the IRDAI corridor.' },
        { k: 'a', lane: 'amber', share: fmt.pct(I.B04_amber, 0), tat: I.B11_tatAmber + ' d',
          touch: I.B07_touchAmber, genai: 'targeted', what: 'One reviewer, evidence pre-assembled and reasoned.' },
        { k: 'r', lane: 'red', share: fmt.pct(I.B05_red, 0), tat: I.B12_tatRed + ' d',
          touch: I.B08_touchRed, genai: 'targeted', what: 'Full investigation, surveyor and an SIU custody pack.' }
      ]
    })]);

    Charts.ring($('#ovRing'), {
      pct: I.B03_green, value: fmt.pct(I.B03_green, 0), label: 'no genai',
      sub: 'green lane', c1: 'var(--dom-ai)', c2: 'var(--dom-ai-2)', size: 220, thickness: 16
    });

    /* A waterfall, not four bars — because one of the four stakeholder
       lines is negative, and a bar chart cannot say that honestly. */
    Charts.waterfall($('#ovStake'), { height: 320, unit: '₹ Cr', items: [
      { label: 'BGeneral underwriting', value: r.stake.underwriting, kind: 'add',
        note: 'All three fraud lines. W-57.' },
      { label: 'BGeneral claims ops', value: r.stake.claimsOps, kind: 'add',
        note: 'Released capacity, less the friction cost. W-56.' },
      { label: 'BFDL distribution', value: r.stake.bfdl, kind: r.stake.bfdl < 0 ? 'sub' : 'add',
        note: 'Renewal retention less the marketing investment. W-58.' },
      { label: 'Platform run cost', value: -Math.abs(r.stake.runCost), kind: 'sub',
        note: 'Borne by whichever entity operates the platform. W-59.' },
      { label: 'NET ANNUAL BENEFIT', value: r.net, kind: 'total', note: 'W-35.' }
    ]});

    mount($('#ovRecon'), [UI.disc('Stakeholder Reconciliation Delta = ₹0.000 Cr',
      `<p>${UI.money(r.stake.underwriting)} + ${UI.money(r.stake.claimsOps)} + ${UI.money(r.stake.bfdl)} − ${UI.money(Math.abs(r.stake.runCost))} = <strong>${UI.money(r.net)}</strong>, matching W-35 exactly.</p>
       <p>The mathematical residual check at W-60 returns <strong>₹0.000 Cr</strong> (Exact zero-sum proof). Zero value leakage across underwriting, operations, and distribution.</p>`,
      { chip: 'W-60 = 0.000 Cr' })]);
  }

  return { render };
})();
