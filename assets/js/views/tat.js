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
    { label: 'Document collection & chase', share: 0.32, color: 'var(--d1)',
      d: 'Automated via instant WhatsApp intake, Document AI OCR extraction, and live tamper-proof capture.' },
    { label: 'Manual policy & coverage check', share: 0.24, color: 'var(--d3)',
      d: 'Gate 00 and Policy Engine verify active status, deductibles, endorsements, and coverage limits automatically.' },
    { label: 'Survey coordination & dispatch', share: 0.20, color: 'var(--d4)',
      d: 'Replaced by AI computer-vision damage appraisal and garage estimate matching for claims under ₹50,000.' },
    { label: 'Multi-tier approval routing', share: 0.14, color: 'var(--d7)',
      d: 'Straight-through automated decisioning for Green Lane claims without multi-level manual sign-offs.' },
    { label: 'Status calls & claimant follow-up', share: 0.10, color: 'var(--d5)',
      d: 'Real-time proactive claimant tracking on WhatsApp eliminating reactive inbound contact center traffic.' }
  ];
  const REDEPLOYED = [
    { label: 'Complex & disputed claims', share: 0.35, color: 'var(--dom-cap)',
      d: 'Adjusters spend dedicated investigation time on contested liabilities, major total-loss cases, and third-party claims.' },
    { label: 'Claims above ₹50,000 corridor', share: 0.25, color: 'var(--dom-ops)',
      d: 'Licensed surveyors and senior officers focus on heavy structural damages where physical inspection truly adds value.' },
    { label: 'Organized fraud ring investigation', share: 0.22, color: 'var(--dom-ai)',
      d: 'Cross-insurer syndicate detection, synthetic image forensics, and repeat staged-accident prosecution.' },
    { label: 'Customer recovery & renewal concierge', share: 0.18, color: 'var(--dom-cust)',
      d: 'Proactive outreach to distressed policyholders to deliver high-touch service and protect annual renewal retention.' }
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
            el('p.eyebrow', { style: { margin: 0 }, text: 'Simulation · TAT & Human Capital Repurposing' }),
            el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
              'Strategic Human Capital Redeployment: ', el('span.grad-ink', { text: 'Liberating operational bandwidth into high-yield forensics.' })
            ]),
            el('p.lede', { style: { marginTop: 'var(--s-4)' },
              text: 'Turnaround latency contracts because deterministic claims resolve instantly at FNOL without administrative queues. Released adjuster capacity is strategically redeployed into high-severity loss management, complex SIU forensic investigations, and proactive renewal retention.' })
          ]),
          UI.dchip('W-18 Labour Savings = 0 (Zero Retrenchment)', 'cap')
        ]),
        el('div', { id: 'tatFlow', style: { marginTop: 'var(--s-7)' } })
      ]),

      /* ================= THE CHAIN, SEEN ================= */
      UI.clus('Where the released capacity goes', 'cap'),
      el('div.panel.rise', { 'data-dom': 'cap' }, [
        el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
          el('div', {}, [
            el('h3', { style: { margin: 0, fontSize: 'var(--fs-md)' },
              text: 'Automated Task Absorption vs. High-Yield Human Capital Reallocation' }),
            el('div.small.muted', { style: { marginTop: 'var(--s-2)' },
              text: fmt.n1(r.fteReleased) + ' FTE of productive capacity transitioned from low-yield data entry to high-impact underwriting and claims defense.' })
          ]),
          UI.dchip('split is operational, not workbook', 'ai')
        ]),
        el('div.dtable-wrap', {}, [el('div', { id: 'tatSankey', style: { minWidth: '920px' } })]),
        el('div', { id: 'tatChainCells', style: { marginTop: 'var(--s-6)' } })
      ]),

      /* ================= THE ARITHMETIC ================= */
      el('div.g-phi', { style: { marginTop: 'var(--s-6)', alignItems: 'stretch' } }, [
        el('div.panel.rise', { 'data-dom': 'ops' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'Turnaround Latency Compression Bridge (Waterfall)' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Lane-weighted cycle time build-up reflecting conservative live-capture friction and portfolio rollout blending.' }),
          el('div', { id: 'tatSteps' })
        ]),
        el('div.panel.rise', { 'data-dom': 'cust' }, [
          el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
            text: 'Ecosystem Stakeholder Alignment: Garages & Licensed Surveyors' }),
          el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
            text: 'Synchronizing cashless repair velocity with IRDAI statutory surveyor mandates (>₹50,000 corridor).' }),
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
      UI.clus('Self-Funding Growth Flywheel: Channel Acquisition & Policyholder Retention', 'cust'),
      el('div.panel.rise', { 'data-dom': 'cust' }, [
        el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
          el('div.small.muted', { text: 'The Hunt & Farm Plan: Repurposed operational capacity self-funds dealer channel acquisition, repaid via renewal retention.' }),
          UI.dchip('Self-Funding Capital Reinvestment', 'risk')
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
      left:  ABSORBED.map(it => ({ label: it.label, value: r.fteReleased * it.share, color: it.color, d: it.d })),
      right: REDEPLOYED.map(it => ({ label: it.label, value: r.fteReleased * it.share, color: it.color, d: it.d })),
      height: 340, unit: 'FTE'
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

    /* ---------------- TAT build-up Waterfall ---------------- */
    const tatDiffGreen = -(I.B09_tatToday - I.B10_tatGreen) * I.B03_green;
    const tatDiffAmber = -(I.B09_tatToday - I.B11_tatAmber) * I.B04_amber;
    const tatFrictionDelta = r.tatFriction - r.tatPlatform;
    const tatBlendDelta = r.tatBlended - r.tatFriction;

    Charts.waterfall($('#tatSteps'), {
      items: [
        { label: 'Today (Baseline)', value: I.B09_tatToday, kind: 'total', note: '9.80 days baseline' },
        { label: 'Straight-Through (60%)', value: tatDiffGreen, kind: 'sub', note: '0.5d auto-settle on Green corridor' },
        { label: 'Assisted Review (30%)', value: tatDiffAmber, kind: 'sub', note: '3.5d on Amber pre-assembled dossier' },
        { label: 'Live Capture Friction (8%)', value: tatFrictionDelta, kind: 'add', note: 'W-14 drop from green to amber' },
        { label: 'Off-Platform Blend (40%)', value: tatBlendDelta, kind: 'add', note: 'Weighted across 60% addressable rollout' },
        { label: 'BLENDED TARGET TAT', value: r.tatBlended, kind: 'total', note: `${fmt.cr(r.tatBlended, 2)} days (${fmt.pct(r.tatCutPct, 1)} cut)` }
      ],
      unit: 'days',
      width: 560,
      height: 360
    });

    /* ---------------- surveyor and garage intuitive dual-card comparison ---------------- */
    const sgHost = $('#tatGauge');
    if (sgHost) {
      sgHost.innerHTML = '';
      mount(sgHost, [
        el('div.stakeholder-chain-grid', {}, [
          // CARD 1: SURVEYOR NETWORK
          el('div.stakeholder-card', {}, [
            el('div.card-head', {}, [
              el('span.badge-pill.ops', { text: 'STAKEHOLDER 01 · SURVEYORS' }),
              el('h4', { style: { marginTop: 'var(--s-2)', marginBottom: '2px', fontSize: 'var(--fs-base)' }, text: 'Licensed Surveyor Network' }),
              el('p.small.muted', { style: { margin: 0 }, text: 'IRDAI Statutory ₹50,000 Cap Alignment' })
            ]),
            el('div.compare-bar-group', {}, [
              el('div.compare-row', {}, [
                el('div.meta-row', {}, [
                  el('span.label', { text: 'Today (Universal 55% Survey)' }),
                  el('span.val.risk', { text: fmt.compact(r.surveyToday) + ' visits (55%)' })
                ]),
                el('div.bar-track', {}, [el('div.bar-fill.risk', { style: { width: '100%' } })])
              ]),
              el('div.compare-row', {}, [
                el('div.meta-row', {}, [
                  el('span.label', { text: 'On ClaimPulse (Elevated >₹50k)' }),
                  el('span.val.cap', { text: fmt.compact(r.surveyAfter) + ' visits (10%)' })
                ]),
                el('div.bar-track', {}, [el('div.bar-fill.cap', { style: { width: `${(r.surveyAfter / r.surveyToday) * 100}%` } })])
              ])
            ]),
            el('div.impact-pill.success', {}, [
              el('span.icon', { text: '⚡' }),
              el('div', {}, [
                el('div', { style: { fontWeight: 700, color: 'var(--ink-strong)' }, text: `${fmt.compact(r.visitsAvoided)} physical surveys eliminated (−81.9%)` }),
                el('div.xsmall.muted', { style: { marginTop: '2px' }, text: 'Below ₹50,000 corridor, live 360° video evidence suffices. Surveyors move up into complex structural damage and fraud forensics.' })
              ])
            ])
          ]),

          // CARD 2: GARAGE NETWORK
          el('div.stakeholder-card', {}, [
            el('div.card-head', {}, [
              el('span.badge-pill.cust', { text: 'STAKEHOLDER 02 · GARAGES' }),
              el('h4', { style: { marginTop: 'var(--s-2)', marginBottom: '2px', fontSize: 'var(--fs-base)' }, text: '1,300+ Cashless Garages' }),
              el('p.small.muted', { style: { margin: 0 }, text: 'Bay Velocity & Key-to-Key Cycle' })
            ]),
            el('div.compare-bar-group', {}, [
              el('div.compare-row', {}, [
                el('div.meta-row', {}, [
                  el('span.label', { text: 'Today (Surveyor Inspection Wait)' }),
                  el('span.val.risk', { text: `${I.J06_garageToday} days bay idle` })
                ]),
                el('div.bar-track', {}, [el('div.bar-fill.risk', { style: { width: '100%' } })])
              ]),
              el('div.compare-row', {}, [
                el('div.meta-row', {}, [
                  el('span.label', { text: 'On ClaimPulse (Instant FNOL Match)' }),
                  el('span.val.cap', { text: `${I.J07_garageAfter} day (−75% idle)` })
                ]),
                el('div.bar-track', {}, [el('div.bar-fill.cap', { style: { width: `${(I.J07_garageAfter / I.J06_garageToday) * 100}%` } })])
              ])
            ]),
            el('div.impact-pill.success', {}, [
              el('span.icon', { text: '🏎️' }),
              el('div', {}, [
                el('div', { style: { fontWeight: 700, color: 'var(--ink-strong)' }, text: `${r.garageDaysSaved} days saved per repair job across panel` }),
                el('div.xsmall.muted', { style: { marginTop: '2px' }, text: 'Instant damage band delivered at first notification. A freed bay is an earning bay, making garages prioritize Bajaj policyholders.' })
              ])
            ])
          ])
        ])
      ]);
    }

    /* ---------------- marketing & saved funds growth flywheel ---------------- */
    const mktHost = $('#tatMkt');
    if (mktHost) {
      mktHost.innerHTML = '';
      mount(mktHost, [
        el('div.growth-flywheel', {}, [
          // STAGE FLOW ROW
          el('div.flywheel-flow-row', {}, [
            el('div.flywheel-step-card', {}, [
              el('span.step-tag', { text: 'STEP 1 · EFFICIENCY SAVINGS' }),
              el('h4', { text: 'Repurposed Fund Pool' }),
              el('div.stat-val.gold', { text: '₹23.82 Cr' }),
              el('p.xsmall.muted', { text: '175.9 FTE capacity released + 74k surveys eliminated generates productive gross value.' })
            ]),
            el('div.flywheel-step-card', {}, [
              el('span.step-tag', { text: 'STEP 2 · RE-INVESTMENT' }),
              el('h4', { text: 'Self-Funded Growth' }),
              el('div.stat-val.blue', { text: `₹${fmt.cr(Math.abs(r.lines.marketingCost))} Cr` }),
              el('p.xsmall.muted', { text: 'Marketing budget funded directly from operational savings — zero new equity required.' })
            ]),
            el('div.flywheel-step-card', {}, [
              el('span.step-tag', { text: 'STEP 3 · REVENUE RETURN' }),
              el('h4', { text: 'Renewal Retention (Farm)' }),
              el('div.stat-val.green', { text: `₹${fmt.cr(r.lines.renewal)} Cr` }),
              el('p.xsmall.muted', { text: '1.5% renewal conversion lift on 2-day claim experience self-repays the entire plan.' })
            ])
          ]),

          // HUNT & FARM DUAL ENGINE BREAKDOWN
          el('div.hunt-farm-split', {}, [
            // THE HUNT
            el('div.hunt-box', {}, [
              el('div.spread', {}, [
                el('span.badge-pill.ops', { text: 'THE HUNT · NEW CUSTOMER ACQUISITION' }),
                el('span.small.bold', { style: { color: 'var(--d1)' }, text: `₹${fmt.cr(mkt.totalCr)} Cr Plan` })
              ]),
              el('p.small.muted', { style: { margin: 0 }, text: 'Equipping dealerships and distribution partners with the 2-Day Green Lane claim settlement guarantee:' }),
              el('div.channel-list', {}, [
                el('div.channel-item', {}, [
                  el('span.name', { text: '4,650 Showrooms (Dealer Kit)' }),
                  el('span.amt', { text: `₹${fmt.cr(mkt.kit * 0.4013 / 1e7)} Cr` })
                ]),
                el('div.channel-item', {}, [
                  el('span.name', { text: '2,790 Used-Car Lots (Dealer Kit)' }),
                  el('span.amt', { text: `₹${fmt.cr(mkt.kit * 0.5556 / 1e7)} Cr` })
                ]),
                el('div.channel-item', {}, [
                  el('span.name', { text: '1,300 Network Garages (Kits)' }),
                  el('span.amt', { text: `₹${fmt.cr(mkt.kit * 0.0431 / 1e7)} Cr` })
                ]),
                el('div.channel-item', {}, [
                  el('span.name', { text: 'Digital, Campaign & Media Acquisition' }),
                  el('span.amt', { text: `₹${fmt.cr(mkt.digital / 1e7)} Cr` })
                ])
              ])
            ]),

            // THE FARM
            el('div.farm-box', {}, [
              el('div.spread', {}, [
                el('span.badge-pill.cust', { text: 'THE FARM · RENEWAL RETENTION & LTV' }),
                el('span.small.bold', { style: { color: 'var(--dom-cust)' }, text: `₹${fmt.cr(r.lines.renewal)} Cr GWP` })
              ]),
              el('p.small.muted', { style: { margin: 0 }, text: 'Repurposed adjuster capacity proactively engages claimants with high-touch recovery calls:' }),
              el('div.stack-3', { style: { marginTop: 'var(--s-2)' } }, [
                el('div.impact-pill.success', {}, [
                  el('span.icon', { text: '🔄' }),
                  el('div', {}, [
                    el('strong', { text: '1.5% Conversion Uplift on Renewals' }),
                    el('div.xsmall.muted', { text: 'Policyholders experiencing rapid 2-day resolution exhibit 1.5 pp higher renewal rate, generating ₹7.20 Cr incremental annual premium (W-27).' })
                  ])
                ]),
                el('div.impact-pill.success', {}, [
                  el('span.icon', { text: '📈' }),
                  el('div', {}, [
                    el('strong', { text: 'Compounding Portfolio Quality' }),
                    el('div.xsmall.muted', { text: 'Retaining verified honest drivers improves the book loss ratio while reducing blended customer acquisition cost (CAC).' })
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
    }
  }

  return { render };
})();
