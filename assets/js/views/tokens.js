/* =====================================================================
   ClaimPulse · Token economics
   ---------------------------------------------------------------------
   The GenAI cost question, answered by bounding it rather than guessing.

   We do not know how many tokens a ClaimPulse claim consumes. Nobody
   does, until it runs. So instead of publishing a point estimate we
   cannot defend, we bound the range across an eighteen-fold span and
   show that the answer does not move. That is a stronger position than
   a precise number, and an honest one.

   Every RATE here is vendor-published with a dated retrieval. Every
   VOLUME is derived or assumed and labelled as such.
   ===================================================================== */

const ViewTokens = (() => {
  const { el, mount, fmt, $ } = CP;

  /* Vendor rate card — Sheet 1 Table M, retrieved 12 August 2026 */
  const RATES = {
    midIn: 1.83, midOut: 10.33, midCached: 0.183,
    ecoIn: 0.50, ecoOut: 2.90,
    batchDiscount: 0.50, cacheDiscount: 0.90,
    video: 263, image: 258, fx: CPModel.INPUTS.A08_fx
  };

  /* Sheet 12 Part D — the bounded component table */
  const COMPONENTS = [
    { name: 'Video seconds analysed',       low: 10,   central: 40,   high: 120,
      unit: 's', tok: v => v * RATES.video,
      basis: 'DERIVED. 40 seconds is E-01\'s own stated derivation. Video is 263 tokens/second (M-21, vendor-published).' },
    { name: 'Photo tiles',                  low: 4,    central: 8,    high: 20,
      unit: 'tiles', tok: v => v * RATES.image,
      basis: 'Rate DERIVED at 258 tokens per 768×768 tile (M-22). Count per claim ASSUMED.' },
    { name: 'Policy wording tokens',        low: 0,    central: 8000, high: 40000,
      unit: 'tok', tok: v => v,
      basis: 'ASSUMED. Zero if wordings are parsed offline once per product; 40,000 if a full wording is sent raw on every claim.' },
    { name: 'Claim text and documents',     low: 300,  central: 1500, high: 4000,
      unit: 'tok', tok: v => v,
      basis: 'ASSUMED. 300 is a structured intake form; 4,000 is free text plus attachments.' },
    { name: 'System prompt',                low: 1000, central: 3000, high: 8000,
      unit: 'tok', tok: v => v,
      basis: 'ASSUMED. Cacheable at roughly 90% off (M-20).' }
  ];
  const OUTPUT = { low: 300, central: 1200, high: 4000 };

  const totalIn = k => COMPONENTS.reduce((s, c) => s + c.tok(c[k]), 0);

  /* Rupees per claim on the blended mid-tier rate card */
  function rsPerClaim(k, eco, batch) {
    const inTok = totalIn(k), outTok = OUTPUT[k];
    const ri = eco ? RATES.ecoIn : RATES.midIn;
    const ro = eco ? RATES.ecoOut : RATES.midOut;
    const usd = (inTok / 1e6) * ri + (outTok / 1e6) * ro;
    return usd * RATES.fx * (batch ? (1 - RATES.batchDiscount) : 1);
  }

  function render(host) {
    const r = CPModel.run('base');

    /* Breakeven, computed live off the R6 net — not the pre-R6 figure
       the workbook's own Part D still carries. */
    const thresholds = [0.01, 0.05, 0.10, 0.50].map(share => {
      const rs = (r.net * share * 1e7) / r.claims;
      const tokens = (rs / RATES.fx) / (RATES.midIn / 1e6);
      return { share, rs, tokens, videoMin: (tokens / RATES.video) / 60 };
    });

    const central = rsPerClaim('central');
    const centralCr = central * r.claims / 1e7;
    const highCr = rsPerClaim('high') * r.claims / 1e7;
    const lowCr = rsPerClaim('low') * r.claims / 1e7;

    /* Payback under each token case — the insensitivity, measured */
    const payback = k => {
      const cost = rsPerClaim(k) * r.claims / 1e7;
      const rr = CPModel.run('base');
      const net = rr.net - cost;
      return rr.buildTotal / (net / 12);
    };

    mount(host, [
      UI.head('Simulation · Token economics',
        el('h1', {}, ['We cannot measure tokens yet. ',
          el('span.grad-ink', { text: 'So we bounded them, and the answer did not move.' })]),
        'Input token volume varies eighteen-fold between the low and high cases below. Steady-state payback moves by nine thousandths of a month. Inference cost cannot break this case at any plausible volume — which is why we can put GenAI where it genuinely helps without carrying cost risk.'),

      el('div.g-4', { style: { marginBottom: 'var(--s-7)' } }, [
        UI.tile({ hero: true, accent: true, k: 'Inference, central case', ref: 'Sheet 12 Part D',
          v: '₹' + fmt.cr(central), unit: 'per claim',
          d: `${fmt.n(totalIn('central'))} input tokens on the blended mid-tier rate card.` }),
        UI.tile({ hero: true, k: 'Annual inference cost', ref: '',
          v: fmt.cr(centralCr), unit: '₹ Cr',
          d: `Against ${UI.money(r.runCost)} of total annual run cost.` }),
        UI.tile({ hero: true, k: 'Share of run cost', ref: '',
          v: fmt.pct(centralCr / r.runCost, 1), unit: '',
          d: 'Even the high case stays under a tenth of run cost.' }),
        UI.tile({ hero: true, warm: true, k: 'Payback swing, low → high', ref: '',
          v: fmt.cr(Math.abs(payback('high') - payback('low')), 3), unit: 'months',
          d: 'Across an 18× token range. This is the whole argument.' })
      ]),

      UI.card('The bounded component table', 'Rates are vendor-published with a dated retrieval. Volumes are derived or assumed, and each row says which.', [
        el('div', { id: 'tkTable' })
      ]),

      el('div.g-2', { style: { marginTop: 'var(--s-6)' } }, [
        UI.card('Cost per claim, four delivery paths', 'The economy tier with batching is the same workload on cheaper models — triage and classification do not need a frontier model.', [
          el('div', { id: 'tkPaths' })
        ]),
        UI.card('How large would inference have to become before it mattered?', 'Computed live against the R6 net annual benefit, not the pre-R6 figure the workbook\'s own Part D still carries.', [
          el('div', { id: 'tkBreak' })
        ])
      ]),

      UI.card('The nine cost decisions', 'Design choices that attack a named cost line. The cheapest inference is the one never run.', [
        el('div', { id: 'tkDecisions' })
      ]),

      el('div.g-phi-r', { style: { marginTop: 'var(--s-6)' } }, [
        UI.card('Build versus buy, for the GenAI layer only', 'Sheet 13. The comparison is narrowed to the workload that could genuinely be served either way — 45% of GPU hours. Baseline ML and the moat are excluded because there is no buy option for them.', [
          el('div', { id: 'tkBvB' })
        ]),
        el('div.stack-6', {}, [
          UI.tile({ k: '5-year NPV, BUY', ref: 'T-07', v: fmt.cr(0.2396), unit: '₹ Cr',
            d: 'Total incremental cost of the API route, with published price deflation applied.' }),
          UI.tile({ k: '5-year NPV, BUILD', ref: 'T-08', v: fmt.cr(2.938), unit: '₹ Cr',
            d: 'Compute only. Excludes serving, engineering and upgrades, so it is a floor.' }),
          UI.tile({ k: 'Advantage to buying', ref: 'T-09', warm: true, v: fmt.cr(2.698), unit: '₹ Cr',
            d: 'Self-hosting loses on compute alone, before a single engineer is hired.' })
        ])
      ]),

      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.limits([
          '<strong>Per-claim token volumes are estimated, not measured.</strong> The rate card is vendor-verified; the volumes are not. `countTokens` instrumentation over a pilot sample collapses Part D to a single column — that is pilot gate 2.',
          '<strong>The in-house GPU line and the API line are not like-for-like.</strong> The in-house row prices the vision workload; the API rows price the text-and-reasoning workload. Sheet 13 narrows the comparison properly.',
          '<strong>We would self-host part of it anyway.</strong> DPDP and data residency, a moat classifier trained on our own media that no API sells, and vendor price risk. The defensible architecture is split, not either-or.'
        ])
      ])
    ]);

    /* ---- component table ---- */
    mount($('#tkTable'), [UI.table(
      [{ label: 'Component' }, { label: 'Low', n: true }, { label: 'Central', n: true },
       { label: 'High', n: true }, { label: 'Basis' }],
      COMPONENTS.map(c => [
        { node: el('span', { style: { fontWeight: 580 }, text: c.name }) },
        fmt.n(c.low), fmt.n(c.central), fmt.n(c.high),
        { node: el('span.small.muted', { text: c.basis }) }
      ]).concat([
        [{ node: el('span', { style: { fontWeight: 580 }, text: 'Output tokens' }) },
         fmt.n(OUTPUT.low), fmt.n(OUTPUT.central), fmt.n(OUTPUT.high),
         { node: el('span.small.muted', { text: 'ASSUMED. 300 is a structured JSON decision; 4,000 is a full prose explanation.' }) }],
        { total: true, cells: ['TOTAL INPUT TOKENS', fmt.n(totalIn('low')), fmt.n(totalIn('central')),
          fmt.n(totalIn('high')), fmt.x(totalIn('high') / totalIn('low'), 1) + ' span between low and high'] }
      ]))]);

    /* ---- delivery paths ---- */
    Charts.hbar($('#tkPaths'), { items: [
      { label: 'Mid-tier, HIGH token case', value: rsPerClaim('high'), color: 'var(--d8)' },
      { label: 'Mid-tier, CENTRAL', value: rsPerClaim('central'), color: 'var(--d1)' },
      { label: 'Mid-tier, LOW', value: rsPerClaim('low'), color: 'var(--d3)' },
      { label: 'Economy + batching, CENTRAL', value: rsPerClaim('central', true, true), color: 'var(--d6)' }
    ], unit: '₹ per claim' });
    $('#tkPaths').appendChild(UI.disc('Why all four of these are noise', `<p> The most expensive path costs ${UI.money(highCr)} a year against ${UI.money(r.runCost)} of run cost and ${UI.money(r.net)} of net benefit. The cheapest costs ${fmt.cr(rsPerClaim('central', true, true) * r.claims / 1e7, 3)} Cr.</p>`));

    /* ---- breakeven ---- */
    mount($('#tkBreak'), [UI.table(
      [{ label: 'If inference reached…' }, { label: '₹ per claim', n: true },
       { label: 'Tokens per claim', n: true }, { label: 'That is…' }],
      thresholds.map(t => [
        fmt.pct(t.share, 0) + ' of net annual benefit',
        '₹' + fmt.cr(t.rs),
        fmt.n(t.tokens),
        { node: el('span.small.muted', { text: 'about ' + fmt.n1(t.videoMin) + ' minutes of video per claim' }) }
      ])),
      UI.disc('Read this to the panel', `<p> A ClaimPulse claim carries forty seconds of video. For inference to consume even ${fmt.pct(0.01, 0)} of the annual benefit, a single claim would have to carry about ${fmt.n1(thresholds[0].videoMin)} minutes of it — roughly ${fmt.x(thresholds[0].tokens / totalIn('central'), 0)} the central token estimate.</p>`, { open: true })
    ]);

    /* ---- the nine decisions ---- */
    mount($('#tkDecisions'), [UI.table(
      [{ label: '#' }, { label: 'Decision' }, { label: 'Line it attacks' }, { label: 'Status' }],
      [
        ['1', 'Directed intake form rather than free-text description', 'W-26 GPU, and inference volume generally', 'DESIGNED · sets the LOW case'],
        ['2', 'Policy wordings parsed once, offline, into a clause table', 'W-26, and any per-claim policy processing', 'DESIGNED · worth 40,000 tokens/claim at the HIGH end'],
        ['3', 'OCR before any multimodal call', 'W-26 GPU', 'DESIGNED'],
        ['4', 'Video de-duplication and damage-frame selection', 'E-01, therefore W-26 directly', 'DESIGNED · reduction ratio NOT MEASURED'],
        ['5', 'Fraud scoring queued in 10-minute clusters', 'W-26 twice over, and detection quality', 'DESIGNED · green lane stays synchronous'],
        ['6', 'Peak flattening through queueing', 'E-02 peak-to-average multiplier', 'DESIGNED · achievable multiplier NOT MEASURED'],
        ['7', 'Context caching of the system prompt', 'Inference cost on any API path', 'AVAILABLE · API path only'],
        ['8', 'Model routing, economy tier for triage', 'Inference cost on any API path', 'AVAILABLE · API path only'],
        ['9', 'Deterministic-first on the green lane', 'W-26', 'DESIGNED, and already in the lane mix']
      ].map(([n, d, line, st]) => [
        { node: el('span.ref', { text: n }) },
        { node: el('span', { style: { fontWeight: 580 }, text: d }) },
        { node: el('span.small.muted', { text: line }) },
        { node: UI.badge(st.split('·')[0].trim(), st.includes('NOT MEASURED') ? 'warn' : 'pass') }
      ]))]);
    $('#tkDecisions').appendChild(UI.disc('Decision 9 is the one that matters', `<p> ${fmt.pct(CPModel.INPUTS.B03_green, 0)} of claims are designed to clear on deterministic checks and specialised ML with no generative call at all. The cheapest inference is the one never run.</p>`));

    /* ---- build vs buy ---- */
    Charts.hbar($('#tkBvB'), { items: [
      { label: 'BUILD · 5-year compute NPV', value: 2.938, color: 'var(--d8)',
        note: 'Compute only. A floor — excludes serving, engineering and upgrades.' },
      { label: 'BUY · 5-year API NPV', value: 0.2396, color: 'var(--d1)',
        note: 'With A-12 price deflation applied across the window.' }
    ]});
    $('#tkBvB').appendChild(UI.disc('Why volume does not decide this', '<p> Both options scale linearly with claims, so there is no crossover volume — doubling claims doubles both. What would flip it is efficiency: self-hosting wins below <strong>77 provisioned GPU-seconds per claim</strong>, and E-01 currently assumes 648. That gap, 8.4× over breakeven, is the honest reason the answer is "buy the commodity layer, self-host the moat".</p>'));
  }

  return { render };
})();
