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

    /* Breakeven from Sheet 12 Part D rows 88-91 */
    const thresholds = [
      { share: 0.01, rs: 26.19, tokens: 150156, videoMin: 9.51 },
      { share: 0.05, rs: 130.94, tokens: 750778, videoMin: 47.58 },
      { share: 0.10, rs: 261.87, tokens: 1501557, videoMin: 95.16 },
      { share: 0.50, rs: 1309.35, tokens: 7507785, videoMin: 475.78 }
    ];

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
      UI.head('Simulation · Token economics & inference risk',
        el('h1', {}, ['We cannot measure tokens yet. ',
          el('span.grad-ink', { text: 'So we bounded them, and the answer did not move.' })]),
        el('div.stack-2', { style: { marginTop: 'var(--s-3)' } }, [
          el('div.row', { style: { alignItems: 'flex-start', gap: 'var(--s-2)' } }, [
            el('span', { style: { color: 'var(--dom-ai)', fontWeight: 800 }, text: '•' }),
            el('span.small', {}, [el('strong', { style: { color: 'var(--ink-strong)' }, text: 'AI Inference Scalability: ' }), 'Token consumption rates scale with claim volume. Rather than relying on a single point estimate, we bound costs across an 18-fold range.'])
          ]),
          el('div.row', { style: { alignItems: 'flex-start', gap: 'var(--s-2)' } }, [
            el('span', { style: { color: 'var(--dom-fin)', fontWeight: 800 }, text: '•' }),
            el('span.small', {}, [el('strong', { style: { color: 'var(--ink-strong)' }, text: 'Payback Resilience: ' }), 'Across the entire 18× token range, steady-state payback moves by only ', el('strong', { style: { color: 'var(--dom-fin)' }, text: '0.02 months' }), '. Inference cannot break this business case.'])
          ]),
          el('div.row', { style: { alignItems: 'flex-start', gap: 'var(--s-2)' } }, [
            el('span', { style: { color: 'var(--dom-cap)', fontWeight: 800 }, text: '•' }),
            el('span.small', {}, [el('strong', { style: { color: 'var(--ink-strong)' }, text: 'Architectural Defense: ' }), '60% of claims (Green Lane) incur ', el('strong', { style: { color: 'var(--dom-cap)' }, text: '₹0 GenAI inference' }), ' via deterministic validation. The cheapest token is the one never run.'])
          ])
        ])),

      el('div.g-4', { style: { marginBottom: 'var(--s-7)' } }, [
        UI.tile({ hero: true, accent: true, k: 'Inference, medium case', ref: 'Sheet 12 Part D',
          v: '₹' + fmt.cr(central), unit: 'per claim',
          d: `${fmt.n(totalIn('central'))} input tokens on the blended mid-tier rate card.` }),
        UI.tile({ hero: true, k: 'Annual inference cost', ref: '',
          v: fmt.cr(centralCr), unit: '₹ Cr',
          d: `Against ${UI.money(r.runCost)} of total annual run cost.` }),
        UI.tile({ hero: true, k: 'Share of run cost', ref: '',
          v: fmt.pct(centralCr / r.runCost, 1), unit: '',
          d: 'Even the high consumption case stays under a tenth of run cost.' }),
        UI.tile({ hero: true, warm: true, k: 'Payback swing, low → high', ref: '',
          v: fmt.cr(Math.abs(payback('high') - payback('low')), 3), unit: 'months',
          d: 'Across an 18× token range. Proves complete cost resilience.' })
      ]),

      UI.card('The bounded component table', 'Rates are vendor-published with dated retrievals (Sheet 1 Table M). Volumes are derived or assumed, and each row states which.', [
        el('div', { id: 'tkTable' })
      ]),

      el('div.g-2', { style: { marginTop: 'var(--s-6)' } }, [
        UI.card('Cost per claim, four delivery paths', 'The economy tier with batching executes the same workload on specialized models with a 50% discount for asynchronous processing.', [
          el('div', { id: 'tkPaths' })
        ]),
        UI.card('How large would inference have to become before it mattered?', 'Sheet 12 Part D breakeven analysis against net annual benefit.', [
          el('div', { id: 'tkBreak' })
        ])
      ]),

      UI.card('The nine cost optimisation decisions', 'Architectural design choices that aggressively suppress compute overhead. The cheapest inference is the one never run.', [
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
          '<strong>We self-host the moat and buy the commodity language models.</strong> DPDP and data residency require self-hosting the Capture Integrity Gate and fraud graph. Buying document/policy processing saves ₹2.70 Cr over five years.'
        ])
      ])
    ]);

    /* ---- component table with explicit units ---- */
    mount($('#tkTable'), [UI.table(
      [{ label: 'Component' }, { label: 'Low (Tokens)', n: true }, { label: 'Medium (Tokens)', n: true },
       { label: 'High (Tokens)', n: true }, { label: 'Basis & Methodology' }],
      COMPONENTS.map(c => [
        { node: el('span', { style: { fontWeight: 580 } }, [c.name, el('span.small.muted', { text: ` (${c.unit})` })]) },
        fmt.n(c.tok(c.low)), fmt.n(c.tok(c.central)), fmt.n(c.tok(c.high)),
        { node: el('span.small.muted', { text: c.basis }) }
      ]).concat([
        [{ node: el('span', { style: { fontWeight: 580 } }, ['Output Tokens (tokens)']) },
         fmt.n(OUTPUT.low), fmt.n(OUTPUT.central), fmt.n(OUTPUT.high),
         { node: el('span.small.muted', { text: 'ASSUMED. 300 is a structured JSON decision; 4,000 is a full prose explanation.' }) }],
        { total: true, cells: ['TOTAL INPUT TOKENS', fmt.n(totalIn('low')), fmt.n(totalIn('central')),
          fmt.n(totalIn('high')), fmt.x(totalIn('high') / totalIn('low'), 1) + ' span between low and high'] }
      ]))]);

    /* ---- delivery paths ---- */
    Charts.hbar($('#tkPaths'), { items: [
      { label: 'Mid-tier, HIGH consumption', value: rsPerClaim('high'), color: 'var(--d8)' },
      { label: 'Mid-tier, MEDIUM consumption', value: rsPerClaim('central'), color: 'var(--d1)' },
      { label: 'Mid-tier, LOW consumption', value: rsPerClaim('low'), color: 'var(--d3)' },
      { label: 'Economy + batching, MEDIUM', value: rsPerClaim('central', true, true), color: 'var(--d6)' }
    ], unit: '₹ per claim' });
    $('#tkPaths').appendChild(UI.disc('Economic batching & cost hierarchy', `<p>The most expensive path costs ${UI.money(highCr)} a year against ${UI.money(r.runCost)} of run cost and ${UI.money(r.net)} of net benefit. The cheapest batched path costs only ${fmt.cr(rsPerClaim('central', true, true) * r.claims / 1e7, 3)} Cr/year.</p>`));

    /* ---- breakeven ---- */
    mount($('#tkBreak'), [UI.table(
      [{ label: 'If inference reached…' }, { label: '₹ per claim', n: true },
       { label: 'Tokens per claim required', n: true }, { label: 'Equivalent workload' }],
      thresholds.map(t => [
        fmt.pct(t.share, 0) + ' of net annual benefit',
        '₹' + fmt.cr(t.rs),
        fmt.n(t.tokens),
        { node: el('span.small.muted', { text: 'about ' + (t.videoMin >= 60 ? (t.videoMin/60).toFixed(0) + ' hours' : fmt.n1(t.videoMin) + ' min') + ' video per claim' }) }
      ])),
      UI.disc('Read this to the panel', `<p>A standard ClaimPulse claim carries forty seconds of video. For inference to consume even 1% of annual benefit, a claim would have to carry <strong>~10 minutes of video (150,156 tokens)</strong> — roughly 6× the medium estimate. For it to consume 10%, it would require <strong>~95 minutes of video (1.5 million tokens)</strong> per claim.</p>`, { open: true })
    ]);

    /* ---- the nine decisions ---- */
    mount($('#tkDecisions'), [UI.table(
      [{ label: '#' }, { label: 'Architectural optimization' }, { label: 'Cost driver suppressed' }, { label: 'Implementation status' }, { label: 'Operational impact' }],
      [
        ['1', 'Directed mobile intake form rather than unconstrained free text', 'W-26 GPU compute & token volume', 'Core Architecture', 'Pre-structured intake bounds input tokens to baseline'],
        ['2', 'Policy wordings parsed once, offline, into indexed clause tables', 'W-26, and per-claim document reasoning', 'Offline Pre-processing', 'Pre-indexed clause embeddings save ~40k tokens/claim'],
        ['3', 'Deterministic OCR prior to any multimodal reasoning call', 'W-26 GPU compute', 'Deterministic Filter', 'OCR resolves valid registrations before multimodal vision'],
        ['4', 'Video frame de-duplication and damage keyframe extraction', 'E-01 vision inference workload', 'CV Pre-filter', 'Frame deduplication isolates key damage angles only'],
        ['5', 'Asynchronous fraud graph batching in 10-minute micro-batches', 'W-26 GPU peak capacity & graph recall', 'Economic Batching', '10-min micro-batches for fraud graphs; green lane stays synchronous'],
        ['6', 'Workload peak flattening through elastic priority queueing', 'E-02 peak-to-average multiplier', 'Queue Orchestration', 'Elastic priority buffers flatten peak GPU provisioning'],
        ['7', 'Prompt context caching for static schema & system instructions', 'Inference token rate on API pathways', 'Cloud Caching Active', 'Prompt context caching delivers 90% discount on static prompts'],
        ['8', 'Dynamic model routing with lightweight models for initial triage', 'Inference token rate on API pathways', 'Model Routing Active', 'Lightweight models handle initial triage and classification'],
        ['9', 'Deterministic-first straight-through processing on Green lane', 'W-26 compute workload', 'Deterministic Baseline', '65% STP claims settle via deterministic rules with ₹0 GenAI cost']
      ].map(([n, d, line, st, imp]) => [
        { node: el('span.ref', { text: n }) },
        { node: el('span', { style: { fontWeight: 580 }, text: d }) },
        { node: el('span.small.muted', { text: line }) },
        { node: UI.badge(st, st.includes('Active') || st.includes('Core') ? 'pass' : 'info') },
        { node: el('span.small.muted', { text: imp }) }
      ]))]);
    $('#tkDecisions').appendChild(UI.disc('Decision 9 is the primary cost governor', `<p>${fmt.pct(CPModel.INPUTS.B03_green, 0)} of claims clear entirely on deterministic checks and specialised CV models with no generative language call at all. The cheapest inference is the one never run.</p>`));

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
