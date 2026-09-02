/* =====================================================================
   ClaimPulse · Live claim — the processing theatre
   ---------------------------------------------------------------------
   This screen used to be a diagram with a play button next to it. It is
   now a room you watch a claim move through.

   Three things carry it:

   THE STAGE RAIL. Six stages across the top. The one the claim is
   inside is lit and pulsing, the ones behind it are done, and each one
   reports what it actually found rather than "complete".

   THE PIPELINE. The same nine-layer architecture the team drew, but the
   nodes the claim has cleared stay lit, the node it is inside carries a
   halo, and everything it has not reached dims out of the way. A gate
   hard fail visibly leaves the gate and touches no engine.

   THE DECISION ENVIRONMENT. One panel, not six boxes. The engine
   results, the retrieved policy wording, the trust arithmetic and the
   token cost are four tabs of a single component, because that is what
   they are to the system: one decision, assembled.
   ===================================================================== */

const ViewArchitecture = (() => {
  const { el, mount, fmt, $, $$ } = CP;

  /* stage → the pipeline nodes that are inside it */
  const STAGES = [
    { k: 'intake',  n: '01', t: 'Intake',       nodes: ['intake'] },
    { k: 'gate',    n: '02', t: 'Gate 00',      nodes: ['gate'] },
    { k: 'engines', n: '03', t: 'Five engines', nodes: ['e1', 'e2', 'e3', 'e4', 'e5'] },
    { k: 'fusion',  n: '04', t: 'Trust Score',  nodes: ['fusion'] },
    { k: 'lane',    n: '05', t: 'Lane routing', nodes: ['green', 'amber', 'red'] },
    { k: 'settle',  n: '06', t: 'Settlement',   nodes: ['eco'] }
  ];

  let claimId = null;
  let stage = -1;            // -1 idle · 0..5 walking · 6 resolved
  let playing = false;
  let timer = null;
  let selected = 'gate';     // the node whose detail is open
  let tab = 'engines';
  let speed = 1150;

  const res = () => CPClaims.byId(claimId);
  const at = i => stage >= i;
  const lastStage = () => (res().skipped ? 1 : STAGES.length - 1);
  const resolved = () => stage >= lastStage();

  /* ------------------------------------------------------------------
     render
     ------------------------------------------------------------------ */
  function render(host) {
    const stories = CPClaims.stories();
    claimId = claimId || stories[0].claim.id;

    mount(host, [

      /* ============ THE THEATRE ============ */
      el('div.panel.hero.rise', { 'data-dom': 'ops', id: 'lcHero' }, [
        el('div.spread.wrap', { style: { alignItems: 'flex-start', gap: 'var(--s-6)' } }, [
          el('div', { style: { minWidth: 0 } }, [
            el('p.eyebrow', { style: { margin: 0 }, text: 'Simulation · Zero-Trust Multi-Modal Decision Engine' }),
            el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
              'Zero-Trust Forensic Pipeline: ', el('span.grad-ink', { text: 'Watch parallel neural engines adjudicate live claims' })
            ]),
            el('div.row', { id: 'lcStatus', style: { marginTop: 'var(--s-4)' } })
          ]),
          el('div.row.wrap', {}, [
            el('div.seg', { id: 'lcSpeed' }, [['slow', 1600], ['live', 1150], ['fast', 480]].map(([l, v]) =>
              el('button', { type: 'button', 'data-v': String(v),
                'aria-pressed': String(v === speed), text: l }))),
            el('button.btn', { id: 'lcNext', type: 'button', title: 'Load a different claim',
              text: '⟲ another claim' }),
            el('button.btn.primary', { id: 'lcPlay', type: 'button' }, [
              el('span', { id: 'lcPlayIcon', text: '▶' }),
              el('span', { id: 'lcPlayLabel', text: 'Execute Pipeline' })
            ])
          ])
        ]),

        /* the claim under the lens */
        el('div', { id: 'lcSubject', style: { marginTop: 'var(--s-6)' } }),

        /* the stage rail */
        el('div.stages', { id: 'lcStages', style: { marginTop: 'var(--s-6)' } })
      ]),

      /* ============ THE PIPELINE ============ */
      el('div.panel.rise', { 'data-dom': 'ops', style: { marginTop: 'var(--s-6)' } }, [
        el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
          el('div', {}, [
            el('h3', { style: { margin: 0, fontSize: 'var(--fs-md)' }, text: 'Nine-Layer End-to-End Enterprise Architecture' }),
            el('div.small.muted', { style: { marginTop: 'var(--s-2)' },
              text: 'Hardware-attested intake, deterministic Gate 00, five parallel inference engines, Bayesian trust fusion, and tri-lane triage' })
          ]),
          el('div.row.wrap', {}, [
            UI.dchip('Deterministic First', 'cap'), UI.dchip('Targeted GenAI', 'ai')
          ])
        ]),
        el('div.dtable-wrap', {}, [
          el('div', { id: 'archPipe', style: { minWidth: '1000px' } })
        ])
      ]),

      /* ============ THE DECISION ENVIRONMENT ============ */
      UI.clus('Unified Decision and Governance', 'ai'),
      el('div.panel.rise.pad-0', { 'data-dom': 'ai' }, [
        el('div', { style: { padding: 'var(--s-6) var(--s-6) 0' } }, [
          el('div.tabstrip', { id: 'lcTabs' }, [
            ['engines', 'Inference Engine Telemetry'],
            ['policy',  'Policy RAG & Clause Retrieval'],
            ['trust',   'Bayesian Trust Score'],
            ['cost',    'Compute & Token Consumption'],
            ['node',    'Selected Node Architecture']
          ].map(([k, l]) => el('button', { type: 'button', 'data-k': k,
            'aria-pressed': String(k === tab), text: l })))
        ]),
        el('div', { id: 'lcTabBody', style: { padding: 'var(--s-6)' } })
      ]),

      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.limits([
          '<strong>The Trust Score floors are our calibration, not a workbook input.</strong> The workbook sets how many claims land in each lane; 82 and 55 decide which ones. They would be re-fitted against real claims in the pilot',
          '<strong>Nothing above ₹50,000 auto-settles</strong>, however clean. That is the IRDAI corridor, and it caps the green lane by law rather than by choice',
          '<strong>ClaimPulse never auto-declines.</strong> Where the wording excludes a loss the claim goes to a person — a repudiation carries consequences an engine should not sign'
        ])
      ])
    ]);

    paint();

    $('#lcPlay').addEventListener('click', () => playing ? stop() : play());
    $('#lcNext').addEventListener('click', () => {
      const list = CPClaims.stories();
      const i = list.findIndex(s => s.claim.id === claimId);
      claimId = list[(i + 1) % list.length].claim.id;
      stop(); stage = -1; paint();
    });
    $('#lcSpeed').addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      speed = +b.dataset.v;
      $$('#lcSpeed button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    });
    $('#lcTabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-k]'); if (!b) return;
      tab = b.dataset.k;
      $$('#lcTabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      drawTab();
    });
  }

  /* ------------------------------------------------------------------
     the walk
     ------------------------------------------------------------------ */
  function play() {
    if (resolved()) stage = -1;      // a second press replays
    playing = true; stage = 0; tick();
  }
  function stop() {
    playing = false; clearTimeout(timer); paint();
  }
  function tick() {
    if (!playing) return;
    paint();
    if (stage >= lastStage()) { playing = false; paint(); return; }
    stage++;
    timer = setTimeout(tick, speed);
  }

  /* ------------------------------------------------------------------
     paint — one function, so every surface always agrees
     ------------------------------------------------------------------ */
  function paint() {
    const R = res();
    drawStatus(R); drawSubject(R); drawStages(R); drawPipe(R); drawTab();
    const ic = $('#lcPlayIcon'), lb = $('#lcPlayLabel');
    if (ic) ic.textContent = playing ? '■' : '▶';
    if (lb) lb.textContent = playing ? 'Stop' : (resolved() ? 'Run it again' : stage >= 0 ? 'Resume' : 'Run it');
  }

  function drawStatus(R) {
    const host = $('#lcStatus'); if (!host) return;
    const s = STAGES[Math.max(0, Math.min(stage, STAGES.length - 1))];
    const txt = stage < 0 ? 'Idle · press run'
      : resolved() ? (R.skipped ? 'Stopped at the gate · no engine ran' : 'Resolved · ' + R.laneMeta.name)
      : 'Processing · ' + s.t.toLowerCase() + ' · stage ' + s.n + ' of 06';
    mount(host, [
      el('span.orb' + (playing ? '.busy' : resolved() ? '' : '.idle')),
      el('span.small', { style: { fontWeight: 620, color: 'var(--ink)' }, text: txt })
    ]);
  }

  /* The claim itself, so the viewer knows what they are watching. */
  function drawSubject(R) {
    const c = R.claim;
    mount($('#lcSubject'), [el('div.cells.c-4', {
      style: { border: '1px solid var(--hairline)', borderRadius: 'var(--r-3)',
               background: 'color-mix(in srgb, var(--surface) 30%, transparent)' } }, [
      el('div.cell-x', {}, [UI.metric({ size: 'sm', dom: 'ops', k: 'Claim', v: c.id,
        d: c.story || 'A claim from the seeded book' })]),
      el('div.cell-x', {}, [UI.metric({ size: 'sm', k: 'Vehicle', v: c.vehicle.model,
        d: c.vehicle.reg + ' · ' + c.claimant + ' · ' + c.city })]),
      el('div.cell-x', {}, [UI.metric({ size: 'sm', k: 'Cause of loss', v: c.cause,
        d: 'What the claimant reported at first notification' })]),
      el('div.cell-x', {}, [UI.metric({ size: 'sm', dom: 'fin', k: 'Garage estimate',
        v: '₹' + fmt.n(c.repair.garageEstimate),
        d: 'What the network garage has quoted for the repair' })])
    ])]);
  }

  function drawStages(R) {
    const host = $('#lcStages'); if (!host) return;
    const notes = stageNotes(R);
    mount(host, STAGES.map((s, i) => {
      const dead = R.skipped && i > 1;
      const cls = dead && stage >= 1 ? 'fail'
        : stage === i && playing ? 'act'
        : stage > i || (resolved() && !dead) ? 'done' : '';
      return el('div.stage' + (cls ? '.' + cls : ''), {}, [
        el('div.s-n', { text: s.n }),
        el('div.s-t', { text: s.t }),
        el('div.s-s', { text: stage >= i ? notes[i] : '' })
      ]);
    }));
  }

  /* What each stage reports once the claim has passed through it. */
  function stageNotes(R) {
    const g = R.gate;
    return [
      '4 frames · live capture, gallery disabled',
      g.hardFail ? 'rejected — ' + (g.checks.filter(c => !c.ok)[0] || {}).label : g.passed + '/' + g.total + ' checks clear',
      R.skipped ? 'never executed' : '5 of 5 scored in parallel',
      R.skipped ? 'never computed' : 'score ' + fmt.cr(R.trust.score, 1) + ' / 100',
      R.skipped ? 'routed red by the gate' : R.laneMeta.label + ' · ' + R.laneMeta.name,
      R.skipped ? 'investigation opened' : '₹' + fmt.n(R.money.payable) + ' payable'
    ];
  }

  function drawPipe(R) {
    const host = $('#archPipe'); if (!host) return;
    const lit = [], reached = Math.min(stage, lastStage());
    if (stage >= 0) {
      for (let i = 0; i <= reached; i++) {
        if (R.skipped && i > 1) break;
        STAGES[i].nodes.forEach(n => lit.push(n));
      }
      /* a hard fail lights RED without lighting anything between */
      if (R.skipped && stage >= 1) lit.push('red');
      /* lane routing only lights the lane the claim actually took */
      if (!R.skipped && reached >= 4) {
        const keep = { G: 'green', A: 'amber', R: 'red' }[R.lane];
        for (let i = lit.length - 1; i >= 0; i--)
          if (['green', 'amber', 'red'].includes(lit[i]) && lit[i] !== keep) lit.splice(i, 1);
      }
    }
    /* Every node inside the current stage haloes — the five engines run
       in parallel, so all five pulse at once. The lane stage haloes only
       the lane this claim is actually taking. */
    let pulse = null;
    if (playing && stage >= 0 && stage < STAGES.length) {
      pulse = STAGES[stage].nodes.slice();
      if (STAGES[stage].k === 'lane') pulse = [{ G: 'green', A: 'amber', R: 'red' }[R.lane]];
      if (R.skipped && stage >= 1) pulse = ['gate'];
    }

    Pipeline.draw(host, { selected, animate: playing, lit, pulse });
    const svg = host.querySelector('svg');
    if (svg && stage >= 0) svg.classList.add('walking');
    bindNodes();
  }

  function showNodePopup(nodeKey) {
    const n = Pipeline.NODES[nodeKey];
    if (!n) return;
    const existing = document.getElementById('archNodePopupOverlay');
    if (existing) existing.remove();

    const overlay = el('div.node-popup-overlay', { id: 'archNodePopupOverlay' });
    const card = el('div.node-popup-card', {}, [
      el('div.node-popup-head', {}, [
        el('div', {}, [
          el('p.eyebrow', { style: { margin: 0, color: n.tone }, text: n.sub || 'ARCHITECTURE COMPONENT' }),
          el('h2', { style: { margin: 'var(--s-2) 0 0', fontSize: 'var(--fs-lg)' }, text: n.label })
        ]),
        el('button.node-popup-close', { type: 'button', 'aria-label': 'Close dialog', onclick: () => overlay.remove(), text: '✕' })
      ]),
      el('p', { style: { fontSize: 'var(--fs-base)', fontWeight: 650, color: 'var(--ink-strong)', marginBottom: 'var(--s-4)', fontStyle: 'italic' }, text: '“' + n.q + '”' }),
      el('p.muted', { style: { marginBottom: 'var(--s-5)', lineHeight: '1.6' }, text: n.body }),
      el('div.stack-3', { style: { marginBottom: 'var(--s-5)', background: 'var(--surface-raised)', padding: 'var(--s-4)', borderRadius: 'var(--r-3)', border: '1px solid var(--border)' } }, [
        el('div.small.bold', { style: { marginBottom: 'var(--s-2)', color: 'var(--ink-strong)' }, text: 'Key Operational Mechanics:' }),
        ...(n.bullets || []).map(b => el('div.row', { style: { alignItems: 'flex-start', gap: 'var(--s-2)' } }, [
          el('span', { style: { color: n.tone, fontWeight: 800 }, text: '✓' }),
          el('span.small', { text: b })
        ]))
      ]),
      el('div.spread.wrap', { style: { gap: 'var(--s-3)', paddingTop: 'var(--s-4)', borderTop: '1px solid var(--border)' } }, [
        el('div.row.wrap', { style: { gap: 'var(--s-2)' } }, [
          UI.dchip(n.genai ? 'Targeted GenAI' : '₹0 GenAI Tokens (Deterministic/ML)', n.genai ? 'ai' : 'cap'),
          n.weight ? UI.dchip(`${n.weight()}% weight in Trust Score`, 'fin')
                   : n.note ? UI.dchip(n.note, 'fin') : null
        ]),
        el('span.badge.neutral', { text: n.build })
      ])
    ]);

    overlay.appendChild(card);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    const onKey = e => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  }

  function bindNodes() {
    $$('#archPipe [data-node]').forEach(n => {
      n.style.cursor = 'pointer';
      n.addEventListener('click', () => {
        selected = n.dataset.node;
        showNodePopup(selected);
        drawPipe(res());
      });
      n.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); n.click(); }
      });
    });
  }

  /* ------------------------------------------------------------------
     the decision environment
     ------------------------------------------------------------------ */
  function drawTab() {
    const host = $('#lcTabBody'); if (!host) return;
    const R = res();
    mount(host, [({ engines: tabEngines, policy: tabPolicy, trust: tabTrust,
                    cost: tabCost, node: tabNode })[tab](R)]);
  }

  const ENG_ROWS = [
    ['01', 'doc',    'Documents and VAHAN',      'var(--d1)'],
    ['02', 'cv',     'Damage assessment',        'var(--d3)'],
    ['03', 'fraud',  'Fraud and duplicate graph','var(--d2)'],
    ['04', 'repair', 'Repair cost band',         'var(--d4)'],
    ['05', 'policy', 'Policy wording, RAG',      'var(--d7)']
  ];

  function tabEngines(R) {
    const ran = at(2) && !R.skipped;
    return el('div.g-phi', {}, [
      el('div', {}, ENG_ROWS.map(([n, key, label, c]) => {
        const e = R[key];
        const ok = ran && e;
        return el('div.erow' + (ok ? '' : '.pend'), {}, [
          el('div.e-n', { style: { '--e-c': c }, text: n }),
          el('div', { style: { minWidth: 0 } }, [
            el('div.e-t', { text: label }),
            el('div.e-s', { text: ok ? (e.detail || describe(key, e)) : (R.skipped ? 'not executed — the gate stopped this claim' : 'waiting') })
          ]),
          ok ? el('span.dchip', {
            class: badTone(key, e) ? 'a' : 'g', text: e.headline }) : el('span.small.muted', { text: '—' })
        ]);
      })),
      /* The verdict, in the same panel — because "what did the engines
         find" and "so what happened" are one question. */
      el('div.stack-5', {}, [
        ran || R.skipped ? el('div.panel', { 'data-dom': R.skipped ? 'risk' : R.lane === 'G' ? 'cap' : R.lane === 'A' ? 'cust' : 'risk',
          style: { padding: 'var(--s-6)' } }, [
          el('div.row', { style: { marginBottom: 'var(--s-4)' } }, [
            UI.dchip(R.skipped ? 'RED' : R.laneMeta.label, R.skipped ? 'r' : R.lane === 'G' ? 'g' : R.lane === 'A' ? 'a' : 'r'),
            el('span.small.muted', { text: R.claim.id })
          ]),
          el('div', { style: { fontSize: 'var(--fs-md)', fontWeight: 640, color: 'var(--ink-strong)',
            lineHeight: 1.35 }, text: verdict(R) }),
          el('div', { style: { marginTop: 'var(--s-5)' } }, [
            UI.metric({ dom: R.skipped ? 'risk' : 'fin', size: 'sm',
              k: R.skipped ? 'Claimed, pending investigation' : 'Payable',
              v: '₹' + fmt.n(R.skipped ? R.money.claimed : R.money.payable) })
          ])
        ]) : el('div.small.muted', { text: 'Run the claim and the verdict lands here' }),
        el('div.small.muted', { style: { fontWeight: 640, color: 'var(--ink)' },
          text: 'Why the ordering matters' }),
        el('div.small.muted', { text: 'Gate 00 runs before any engine. A forged or re-captured frame is rejected at the cheapest possible moment — no model call, no token, no inference bill' }),
        el('div', { id: 'lcMini' })
      ])
    ]);
  }

  /* One sentence. What a person would say if you asked them what
     happened to this claim. */
  function verdict(R) {
    if (R.skipped) return 'Gate 00 rejected the evidence, so nothing downstream ran — no engine, no model, no token. The claim goes to investigation with the reason attached.';
    if (R.lane === 'G') return 'Everything checked out, so it settled itself — no reviewer, no surveyor, no generative model.';
    if (R.capped) return 'Clean on every check, but above the ₹50,000 corridor. A registered surveyor is required by regulation, so it cannot auto-settle however good it looks.';
    if (R.lane === 'A') return 'The signals were inconclusive rather than contradictory, so one reviewer decides — with the evidence already assembled and the reasoning written out.';
    return 'Something contradicted something else, so this claim goes to a person with the conflict and the evidence in front of them.';
  }

  function describe(key, e) {
    if (key === 'doc')   return e.passed + ' of ' + e.total + ' document checks clear.';
    if (key === 'fraud') return 'Ring score ' + fmt.cr(e.ring, 2) + ' against a ' + CPEngine.RING_FLOOR + ' threshold.';
    return '';
  }
  function badTone(key, e) {
    return (key === 'cv' && e.fail) || (key === 'fraud' && e.ringFail) ||
           (key === 'policy' && e.fail) || (key === 'repair' && e.over);
  }

  /* One unified intelligence view: the wording the RAG engine actually
     retrieved, its verdict on each clause, and what that did to the
     routing. Not three separate boxes. */
  function tabPolicy(R) {
    const ran = at(2) && !R.skipped;
    if (!ran) return el('div.small.muted', {
      text: R.skipped ? 'Engine 05 never ran. Gate 00 rejected the evidence, so no policy wording was retrieved and no generative call was made.'
                      : 'The policy engine has not been reached yet. Run the claim' });
    const p = R.policy;
    return el('div.g-phi', {}, [
      el('div.stack-5', {}, [
        el('div.small.muted', { text: 'Clauses retrieved against this loss, in the order the retriever ranked them' }),
        ...p.clauses.map(c => el('div.clause', {
          style: c.status === 'EXCLUDED' ? { borderLeftColor: 'var(--lane-red)',
            background: 'color-mix(in srgb, var(--lane-red) 8%, transparent)' } : {} }, [
          el('div.cl-h', { style: c.status === 'EXCLUDED' ? { color: 'var(--lane-red)' } : {},
            text: c.ref + ' · ' + c.status }),
          el('div.cl-b', { text: c.name }),
          el('div.cl-m', { text: c.note || 'retrieved from the policy wording, not from a summary' })
        ]))
      ]),
      el('div.stack-5', {}, [
        UI.metric({ dom: 'ai', size: 'sm', k: 'Verdict', v: p.headline,
          d: p.detail }),
        el('div.small.muted', { text: p.fail
          ? 'An exclusion was found. ClaimPulse does not auto-decline: the claim escalates to a person, because a repudiation is a signature with consequences.'
          : 'Cover, add-ons and the depreciation schedule all resolve against the actual wording rather than a summary of it' }),
        UI.disc('Why RAG rather than a fine-tuned model',
          '<p>Policy wording changes by product, by endorsement and by state. Retrieval means a wording change is a document upload, not a retraining cycle — and every answer can be traced back to the clause it came from, which is what an audit needs.</p>'),
        UI.disc('What the model never sees',
          '<p>Engine 05 receives the dossier the deterministic engines already assembled — the parsed fields and the clause candidates. It does not receive the raw claim, the images, or the claimant\'s identity. That is a privacy control and a cost control at the same time.</p>')
      ])
    ]);
  }

  function tabTrust(R) {
    if (R.skipped) return el('div.small.muted', {
      text: 'No Trust Score exists for this claim. Gate 00 rejected the evidence before fusion, so there was nothing to fuse' });
    if (!at(3)) return el('div.small.muted', { text: 'Fusion has not been reached yet. Run the claim' });
    const w = el('div', {}, [
      el('div', { id: 'lcMeter' }),
      el('div', { id: 'lcContrib', style: { marginTop: 'var(--s-6)' } }),
      el('div.stack-4', { style: { marginTop: 'var(--s-6)' } },
        R.reasons.map(x => el('div.row', { style: { alignItems: 'flex-start' } }, [
          el('span', { style: { color: x.hard ? 'var(--lane-red)' : x.cap ? 'var(--lane-amber)' : 'var(--dom-cap)',
            fontWeight: 700, flex: '0 0 auto' }, text: x.hard ? '✕' : x.cap ? '!' : '✓' }),
          el('span.small', { text: x.t })
        ])))
    ]);
    setTimeout(() => {
      if ($('#lcMeter')) Charts.meter($('#lcMeter'), { score: R.trust.score,
        floors: { green: CPEngine.GREEN_FLOOR, amber: CPEngine.AMBER_FLOOR } });
      if ($('#lcContrib')) Charts.contrib($('#lcContrib'), R.trust.parts);
    }, 0);
    return w;
  }

  function tabCost(R) {
    const I = CPModel.INPUTS;
    const calls = R.modelCalls;
    return el('div', {}, [
      UI.cells(3, [
        UI.metric({ dom: 'ai', size: 'sm', k: 'Generative calls made', v: String(calls),
          d: calls === 0 ? 'None. This claim resolved on deterministic checks and specialised ML alone.'
                         : 'One targeted call, on a dossier the other engines had already assembled' }),
        UI.metric({ dom: 'fin', size: 'sm', k: 'Manual touches', v: String(R.touches),
          d: 'Against seven on the same claim today' }),
        UI.metric({ dom: 'ops', size: 'sm', k: 'Turnaround', v: fmt.cr(R.tat, 1), unit: 'days',
          d: 'Against 9.8 days today' })
      ], { noBottom: true }),
      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.disc('Where this lands in the P&L',
          `<p>A green claim spends nothing on inference and 0.2 of a manual touch. An amber claim spends one targeted call. The blended token cost across the whole book is bounded on the token-economics screen across an eighteen-fold price range, and payback moves by nine thousandths of a month.</p>
           <p>The cost that matters is not tokens. It is the ${I.B02_touchesToday} manual touches at ₹${fmt.n(I.B28_baselineTouchCost)} each that this claim no longer needs.</p>`,
          { open: true })
      ])
    ]);
  }

  function tabNode() {
    const n = Pipeline.NODES[selected];
    return el('div.g-phi', {}, [
      el('div', {}, [
        el('p.eyebrow', { style: { margin: 0 }, text: n.sub }),
        el('h3', { style: { margin: 'var(--s-3) 0 var(--s-5)' }, text: n.label }),
        el('p', { style: { fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--ink-strong)',
          marginBottom: 'var(--s-5)' }, text: '“' + n.q + '”' }),
        el('p.small.muted', { text: n.body }),
        el('div.stack-4', { style: { marginTop: 'var(--s-5)' } }, n.bullets.map(b =>
          el('div.row', { style: { alignItems: 'flex-start' } }, [
            el('span', { style: { color: n.tone, flex: '0 0 auto', fontWeight: 700 }, text: '·' }),
            el('span.small', { text: b })
          ])))
      ]),
      el('div.stack-5', {}, [
        el('div.row.wrap', {}, [
          UI.dchip(n.genai ? 'genai' : 'no genai', n.genai ? 'ai' : 'cap'),
          n.weight ? UI.dchip(n.weight() + '% of trust', 'fin')
                   : n.note ? UI.dchip(n.note, 'fin') : null
        ]),
        el('div.small.muted', { text: n.build }),
        n.purpose ? el('div.small.muted', { text: n.purpose }) : null,
        el('div', { id: 'lcGenai', style: { marginTop: 'var(--s-4)' } })
      ])
    ]);
  }

  /* GenAI share, drawn into whichever tab asked for it */
  function drawGenaiInto(id) {
    const host = $('#' + id); if (!host) return;
    const I = CPModel.INPUTS;
    const notGen = I.B03_green, gen = I.B04_amber + I.B05_red;
    Charts.stack(host, { segments: [
      { label: 'No generative call at all', value: notGen, color: 'var(--dom-cap)', display: fmt.pct(notGen, 0) },
      { label: 'Targeted GenAI on a prepared dossier', value: gen, color: 'var(--dom-ai)', display: fmt.pct(gen, 0) }
    ], height: 28 });
  }

  /* after every tab draw, fill any chart slots the tab declared */
  const _drawTab = drawTab;
  drawTab = function () {
    _drawTab();
    if ($('#lcGenai')) drawGenaiInto('lcGenai');
    if ($('#lcMini')) drawGenaiInto('lcMini');
  };

  return { render, stop: () => { playing = false; clearTimeout(timer); } };
})();
