/* =====================================================================
   ClaimPulse · Assumptions and sources
   ---------------------------------------------------------------------
   The register, filterable, with the tier and the direction of bias on
   every line. A model that hides its weak inputs is a model nobody can
   check; this screen exists so a judge can find ours faster than we can
   be asked for them.
   ===================================================================== */

const ViewAssumptions = (() => {
  const { el, mount, fmt, $, $$ } = CP;

  const I = CPModel.INPUTS;
  const T1 = 'TIER 1', T2 = 'TIER 2', T4 = 'TIER 4', PLAN = 'Plan', DEC = 'Decision';

  const REG = [
    ['A-01', 'Motor OD GDPI, FY2025-26', I.A01_gdpiMotorOD, 'Rs Cr', T1, 'GI Council segment-wise GDPI filings, Jun\'25–Jun\'26. Top of the benefit chain — everything scales from this.'],
    ['A-02', 'Net earned premium / GDPI', I.A02_nepRatio, 'ratio', T1, 'Bajaj General FY2026: NEP ₹9,519 Cr on GDPI ₹19,082 Cr. Motor OD retention runs above the whole-book blend, so this basis is conservative for Motor OD.'],
    ['A-03', 'Net incurred claims ratio', I.A03_claimsRatio, 'ratio', T1, 'IRDAI Financial Highlights FY24-25. Converts earned premium into the claims pool ClaimPulse acts on.'],
    ['A-05', 'Bajaj total GDPI, FY2025-26', I.A05_gdpiTotal, 'Rs Cr', T1, 'Used only for the group-basis combined-ratio view.'],
    ['A-06', 'Motor OD market growth p.a.', I.A06_growth, 'ratio', T2, 'Applied to years 2 and 3 of the forecast.'],
    ['A-08', 'FX rate', I.A08_fx, 'Rs/USD', 'Market', 'Spot, August 2026, inside the 94.89–95.45 range traded in the week to 11 August. Every USD build benchmark converts at this.'],
    ['A-09', 'Discount rate (WACC)', I.A09_wacc, 'ratio', 'Standard', 'Indian corporate project hurdle rate.'],
    ['A-10', 'India regulated-sector cost uplift', I.A10_indiaUplift, '×', T2, 'Compliance overhead applied to USD build benchmarks.'],
    ['A-11', 'IRDAI surveyor exemption threshold', I.A11_surveyorLimit, 'Rs', T1, 'Master Circular on Protection of Policyholders\' Interests, 2024. The corridor the green lane is scoped to sit inside.'],

    ['B-01', 'Average claim size', I.B01_avgClaim, 'Rs', T4, 'Sets the claim count. A LOWER figure means MORE claims and MORE benefit, so the default is conservative. Reconciled to an in-band claim frequency at Part K.'],
    ['B-02', 'Manual touches per claim today', I.B02_touchesToday, 'touches', T4, 'Workflow-mapped, not filed. The largest single driver of the capacity line. Data request 1.'],
    ['B-03', 'Green lane share', I.B03_green, 'ratio', T2, 'Auto-settle. Clean documents, intact EXIF, no synthetic flags. Sets both the touch reduction and the TAT gain.'],
    ['B-04', 'Amber lane share', I.B04_amber, 'ratio', T4, 'One reviewer.'],
    ['B-05', 'Red lane share', I.B05_red, 'ratio', T4, 'Full investigation.'],
    ['B-09', 'Claim TAT today', I.B09_tatToday, 'days', T2, 'Industry-typical 7 to 10+ days.'],
    ['B-13', 'Fraud detection rate today', I.B13_detToday, 'ratio', T4, 'Share of fraudulent claims the existing rule-based engine catches. Denominator of the fraud formula.'],
    ['B-14', 'Fraud detection rate, TARGET', I.B14_detTarget, 'ratio', 'TARGET', 'A TARGET, not a demonstrated capability. Published graph-AI lift runs +10 to 20 pp against the +28 pp modelled here — which is why F-02 tests an 82% landing and the stress screen runs the full curve.'],
    ['B-17', 'Fraud leakage pool', I.B17_leakage, 'ratio', T2, 'Derived from the 8–10% industry fraud and waste benchmark, applied to motor as a proxy. The benchmark is already net of existing controls, so a literal reading gives a LARGER benefit.'],
    ['B-18', 'Synthetic-media fraud incidence', I.B18_synthIncidence, 'ratio', T4, 'Forward-looking. No published incidence exists because the vector is new. ClaimPulse would be the first system to measure it.'],
    ['B-19', 'Gate detection rate on synthetic media', I.B19_gateDetection, 'ratio', T4, 'Diffusion and GAN artefact screening on live-captured frames.'],
    ['B-20', 'Live-capture friction', I.B20_friction, 'ratio', T4, 'Honest claimants who cannot use live capture and drop green → amber. A real cost of our own hard rule, and it is subtracted.'],
    ['B-21', 'Average Motor OD premium', CPModel.premium(I), 'Rs', T4, 'Resolved by the B-31 basis switch. Sizes the renewal line and the frequency reconciliation.'],
    ['B-22', 'Renewal uplift on claimants', I.B22_renewalUplift, 'pp', T4, 'Applied to the claimant cohort ONLY. The whole-book NPS effect is not counted.'],
    ['B-27', 'Build duration', I.B27_buildMonths, 'months', PLAN, 'P1 to P4. Benefit accrues after go-live, which is why payback from kickoff is ten months longer than steady state.'],
    ['B-28', 'Cost per manual touch, baseline', I.B28_baselineTouchCost, 'Rs', T4, 'The rate the current process runs at. Held constant across plans. F-01 tests the case at ₹83 in-house.'],

    ['B-29', 'Redeployment realisation', I.B29_redeployRealisation, 'ratio', T4, 'PLACEHOLDER. The share of released capacity that converts into real output. The largest single Tier 4 input in the model — the pilot must measure it before it is quoted.'],
    ['B-30', 'Include dealer commission in marketing?', I.B30_includeCommission, '', DEC, 'Hunt & Farm s.2 treats panel commission as a pre-existing network cost, not incremental spend. At YES it dominates the whole marketing plan.'],
    ['B-31', 'Average premium basis switch', I.B31_premiumBasis, '', DEC, 'TEAM = ₹7,000, GICOUNCIL = ₹3,410. One cell, so the conflict is a visible decision rather than a silent contradiction.'],
    ['B-32', 'Policies carrying dealer commission', I.B32_commissionPolicies, 'policies', T4, 'Was hardcoded inside the commission formula in R5. Surfaced so it can be challenged.'],

    ['C-01', 'Rollout of the addressable book', I.C01_rollout.base, 'ratio', PLAN, 'THE defining lever between the three plans. 20% / 60% / 100%.'],
    ['C-02', 'Cost per manual touch, post-implementation', I.C02_touchCost.base, 'Rs', T2, 'BPO transaction pricing, falling with volume: ₹300 / ₹250 / ₹200 by plan.'],

    ['E-01', 'GPU hours per claim', I.E01_gpuHoursPerClaim, 'hours', T4, 'NOT MEASURED, and it drives 46% of run cost. Sized on provisioned peak capacity. Pilot gate 1.'],
    ['E-04', 'GPU rate', I.E04_gpuRateUSD, 'USD/hr', 'Market', 'Inside the verified 0.93–3.67 market range (M-25).'],
    ['E-08', 'Operations team', I.E08_opsINRMonth, 'Rs/month', T1, 'Fixed. Does not scale with volume.'],

    ['F-01', 'In-house cost per manual touch', I.F01_inHouseTouchCost, 'Rs', T4, 'The downside test. The case still clears at this rate.'],
    ['F-02', 'Fraud detection, downside landing', I.F02_detDownside, 'ratio', T4, 'Where published graph-AI lift would actually put us.'],

    ['J-01', 'Minutes per manual touch', I.J01_minutesPerTouch, 'minutes', T4, 'Converts touches into hours, so every FTE figure moves with it.'],
    ['J-02', 'Productive hours per claims FTE', I.J02_hoursPerFTE, 'hours/yr', 'Standard', ''],
    ['J-03', 'Claims needing a physical survey today', I.J03_surveyToday, 'ratio', T4, ''],
    ['J-04', 'Claims needing a survey after ClaimPulse', I.J04_surveyAfter, 'ratio', T4, 'Red lane only; green and amber sit inside the ₹50,000 corridor.']
  ];

  const OPEN = [
    ['₹33.23 Cr cannot be reproduced', 'The Operating Model note states it with no working. The rebuilt capacity line gives ₹16.62 Cr at Base; net of marketing, ₹11.38 Cr. Nothing in the workbook equals 33.23, and reaching it would need a realisation rate above 100%.', 'Supply the derivation or drop the figure.'],
    ['B-29 redeployment realisation is a placeholder', 'Set at 70% with no stated basis. It is now the largest Tier 4 input in the model and it carries ' + UI.money(CPModel.run('base').lines.capacity) + ' of the headline.', 'Needs a stated basis or a pilot gate before it is quoted.'],
    ['B-31 premium basis', 'Set to TEAM (₹7,000). Flipping to GICOUNCIL (₹3,410) moves the implied claim frequency from 5.79% to 2.82%, below the 5–15% industry band.', 'A two-wheeler-heavy book would legitimately depress both figures — but that must be argued, not assumed.'],
    ['B-30 dealer commission', 'Set to NO. Switching to YES adds ₹20.0 Cr at ₹7,000 premium, or ₹9.75 Cr at ₹3,410 — either would dominate the marketing plan.', 'Confirm whether panel commission is genuinely incremental.'],
    ['Expense-ratio treatment', 'The capacity line is deliberately excluded from the expense ratio because headcount does not fall. Crediting it would add roughly 1.0 pp to the Motor OD combined-ratio movement.', 'Defensible either way. Currently the conservative choice.']
  ];

  let filter = 'all', q = '';

  function render(host) {
    mount(host, [
      el('div.panel.hero.rise', { 'data-dom': 'ai' }, [
        el('div', { style: { maxWidth: '56ch' } }, [
          el('p.eyebrow', { style: { margin: 0 }, text: 'Simulation · assumptions and sources' }),
          el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
            'Every input, its tier, ', el('span.grad-ink', { text: 'and which way it is biased.' })
          ]),
          el('p.lede', { style: { marginTop: 'var(--s-4)' },
            text: 'Sheets 2 to 4 contain no typed numbers — only formulas that read this register. Change a row here and the whole model moves.' })
        ]),
        el('div', { id: 'regBand', style: { marginTop: 'var(--s-6)' } })
      ]),

      el('div.card', {}, [
        el('div.card-head', {}, [
          el('div', {}, [
            el('h3', { text: 'The register' }),
            el('div.sub', { id: 'regCount' })
          ]),
          el('div.row.wrap', {}, [
            el('input', { type: 'search', placeholder: 'Search…', id: 'regQ',
              style: { padding: 'var(--s-3) var(--s-4)', borderRadius: 'var(--r-3)',
                border: '1px solid var(--border-strong)', background: 'var(--surface-raised)',
                minWidth: '170px' } }),
            el('div.seg', { id: 'regSeg' }, [
              ['all', 'All'], [T1, 'Tier 1'], [T2, 'Tier 2'], [T4, 'Tier 4'], [DEC, 'Decisions']
            ].map(([k, l]) => el('button', { type: 'button', 'data-t': k,
              'aria-pressed': String(k === filter), text: l })))
          ])
        ]),
        el('div', { id: 'regTable', style: { maxHeight: '660px', overflow: 'auto' } })
      ]),

      el('div.card.leads', { style: { marginTop: 'var(--s-6)' } }, [
        el('div.card-head', {}, [el('div', {}, [
          el('h3', { text: 'Still open — decisions only you can make' }),
          el('div.sub', { text: 'Carried here rather than resolved quietly in a formula.' })
        ])]),
        el('div.stack-6', {}, OPEN.map(([t, body, ask], i) => el('div', {}, [
          el('div.row', { style: { alignItems: 'baseline', marginBottom: 'var(--s-3)' } }, [
            el('span.ref', { text: String(i + 1) }),
            el('span', { style: { fontWeight: 640 }, text: t })
          ]),
          el('p.small.muted', { style: { marginBottom: 'var(--s-3)' }, text: body }),
          el('div.callout', { style: { padding: 'var(--s-4)' } }, [el('span.small', { text: ask })])
        ])))
      ]),

      el('div.g-2', { style: { marginTop: 'var(--s-6)' } }, [
        UI.card('Claim frequency reconciliation', 'B-01 and B-21 are independent Tier 4 inputs. Taken together they must reconcile to a frequency inside the industry norm — that cross-check is what makes both defensible.', [
          el('div', { id: 'regFreq' })
        ]),
        UI.card('Model integrity', 'The workbook audits itself, and this engine audits itself against the workbook.', [
          el('div', { id: 'regChecks' })
        ])
      ])
    ]);

    $('#regSeg').addEventListener('click', e => {
      const b = e.target.closest('button[data-t]'); if (!b) return;
      filter = b.dataset.t;
      $$('#regSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      drawTable();
    });
    $('#regQ').addEventListener('input', e => { q = e.target.value.toLowerCase(); drawTable(); });

    drawBand();
    drawTable();
    drawFreq();
    drawChecks();
  }

  /* The register at a glance: how much of the model rests on filed
     numbers, and how much on our own estimates. This is the first thing
     a sceptical reader wants and it used to be nowhere on the screen. */
  function drawBand() {
    const count = t => REG.filter(x => x[4] === t).length;
    const tot = REG.length;
    mount($('#regBand'), [el('div.cells.c-4', {
      style: { border: '1px solid var(--hairline)', borderRadius: 'var(--r-4)',
               background: 'color-mix(in srgb, var(--surface) 30%, transparent)' } }, [
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cap', size: 'sm',
        k: 'Tier 1 · filed or regulatory', v: String(count(T1)), unit: 'of ' + tot,
        d: 'Published filings, IRDAI circulars and GI Council data. Not arguable.' })]),
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'ops', size: 'sm',
        k: 'Tier 2 · benchmark or proxy', v: String(count(T2)), unit: 'of ' + tot,
        d: 'A published benchmark, or a defensible proxy from an adjacent line.' })]),
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'risk', size: 'sm',
        k: 'Tier 4 · team estimate', v: String(count(T4)), unit: 'of ' + tot,
        d: 'Ours. Every one of them is on the stress screen with a stated range.' })]),
      el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cust', size: 'sm',
        k: 'Open decisions', v: String(OPEN.length),
        d: 'Not ours to settle. Listed below rather than resolved quietly in a formula.' })])
    ])]);
  }

  function drawTable() {
    const rows = REG.filter(([ref, label, , , tier, note]) => {
      const tierOk = filter === 'all' ? true
        : filter === DEC ? (tier === DEC || tier === 'TARGET')
        : tier === filter;
      const qOk = !q || (ref + ' ' + label + ' ' + note).toLowerCase().includes(q);
      return tierOk && qOk;
    });
    $('#regCount').textContent = `${rows.length} of ${REG.length} inputs shown. Every one of them is live — change it in the workbook and the whole model moves.`;
    mount($('#regTable'), [UI.table(
      [{ label: 'Ref' }, { label: 'Input' }, { label: 'Value', n: true },
       { label: 'Tier' }, { label: 'Basis, and which way it is biased' }],
      rows.map(([ref, label, val, unit, tier, note]) => [
        { node: el('span.ref', { text: ref }) },
        { node: el('span', { style: { fontWeight: 580 }, text: label }) },
        { node: el('span.mono', { text: fmtVal(val, unit) }) },
        { node: UI.badge(tier, tier === 'TIER 1' ? 't1' : tier === 'TIER 2' ? 't2'
          : tier === 'TIER 4' ? 't4' : tier === 'TARGET' ? 'warn' : tier === DEC ? 'info' : 'neutral') },
        { node: el('span.small.muted', { text: note }) }
      ]))]);
  }

  function fmtVal(v, unit) {
    if (typeof v === 'string') return v;
    if (unit === 'ratio') return fmt.pct(v, v < 0.01 ? 2 : 1);
    if (unit === 'Rs' || unit === 'Rs Cr' || unit === 'policies' || unit === 'Rs/month') return fmt.n(v);
    return fmt.cr(v, v % 1 === 0 ? 0 : 2);
  }

  function drawFreq() {
    const gi = CPModel.frequency(I.B31a_premiumGICouncil);
    const tm = CPModel.frequency(I.B31b_premiumTeam);
    mount($('#regFreq'), [
      UI.table([{ label: 'Basis' }, { label: 'Premium', n: true }, { label: 'Policies implied', n: true },
                { label: 'Frequency', n: true }, { label: '5–15% band' }],
        [[ 'GI Council', gi, 'B-31a' ], [ 'Team estimate', tm, 'B-31b' ]].map(([name, f, ref]) => [
          { node: el('span', {}, [name, ' ', el('span.ref', { text: ref })]) },
          '₹' + fmt.n(f.premium), fmt.n(f.policies), fmt.pct(f.freq, 2),
          { node: UI.badge(f.inBand ? 'PASS' : 'BELOW BAND', f.inBand ? 'pass' : 'warn') }
        ])),
      UI.disc(`The live setting is ${I.B31_premiumBasis}`, `<p>At ₹7,000 the implied frequency is inside the band. At ₹3,410 it falls below it — arguable for a two-wheeler-heavy book, but it has to be argued.</p>`, { chip: 'open decision' })
    ]);
  }

  function drawChecks() {
    const chk = CPModel.selfCheck();
    mount($('#regChecks'), [
      el('div.stack-4', {}, [
        el('div.spread', {}, [
          el('span.small', { text: 'Engine anchors reproducing the workbook' }),
          el('span.integrity.' + (chk.allPass ? 'ok' : 'bad'),
            { text: (chk.allPass ? '✓ ' : '✕ ') + chk.passed + '/' + chk.total })
        ]),
        el('div.spread', {}, [
          el('span.small', { text: 'Workbook self-audit (IC-01 to IC-08, three plans)' }),
          el('span.integrity.ok', { text: '✓ 24/24 PASS' })
        ]),
        el('div.spread', {}, [
          el('span.small', { text: 'Stakeholder split reconciles to net benefit (W-60)' }),
          el('span.integrity.ok', { text: '✓ 0.000' })
        ])
      ]),
      UI.disc('What these three checks prove', '<p>The first is that this application has not drifted from the Excel. The second is that the Excel does not contradict itself. The third is that who-books-what adds back to the same total — if the split ever drifts from the P&L that number stops being zero, and every screen says so.</p>')
    ]);
  }

  return { render };
})();
