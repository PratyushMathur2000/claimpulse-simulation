/* =====================================================================
   ClaimPulse · The pipeline diagram
   ---------------------------------------------------------------------
   Built from the team's end-to-end architecture flowchart. Nine layers,
   every node clickable, and a claim you can watch travel through it.

   The ordering carries the argument, so the drawing has to as well:
   intake creates evidence, Gate 00 decides whether to trust it, and only
   then do five engines look at what the claim says. A hard fail at the
   gate leaves by the red path without touching an engine.

   NODES is the single source of truth for both the drawing and the
   detail panel, so a node can never show one thing and explain another.
   ===================================================================== */

const Pipeline = (() => {
  const { el, clear, fmt } = CP;
  const I = () => CPModel.INPUTS;

  /* ---------------------------------------------------------------
     The nine layers, as content. Every entry answers: what is this,
     what question does it answer, what does it use, does it call a
     generative model, and do we build it or buy it.
     --------------------------------------------------------------- */
  const NODES = {
    intake: {
      label: 'Claim intake', sub: 'Guided digital FNOL', tone: 'var(--d1)',
      q: 'Can we create evidence worth trusting in the first place?',
      body: 'The claimant reports the accident inside our journey — policy and vehicle come from the account, then live photos, 360° video and documents are captured in the app. Nothing is uploaded from a camera roll.',
      bullets: ['Gallery upload is disabled, not discouraged',
                'Evidence is captured inside a controlled journey',
                'EXIF, timestamp and GPS written and signed at capture'],
      genai: false, build: 'BUILD / INTEGRATE',
      purpose: 'Create reliable evidence at the source.'
    },
    gate: {
      label: 'Gate 00', sub: 'Capture Integrity', tone: 'var(--warm)',
      q: 'Can we trust the evidence?',
      body: 'Six forensic checks run on the raw media before any engine is called. This is the ordering the whole architecture rests on — a forgery is rejected at the cheapest possible moment, having cost nothing.',
      bullets: ['EXIF · GPS · camera signature', 'Diffusion and GAN artefact screening',
                'Screen re-capture detection', 'Clean → five engines. Suspicious → flag and escalate.'],
      genai: false, build: 'BUILD · specialised forensics and ML',
      purpose: 'Reject what cannot be trusted before spending a rupee on it.'
    },
    e1: {
      label: '01 · Document AI', sub: 'OCR + VAHAN', tone: 'var(--d1)',
      q: 'Are the documents valid and consistent?',
      body: 'OCR and document AI read the registration, chassis plate, odometer and licence, then match them against VAHAN and the policy master.',
      bullets: ['OCR before any multimodal call', 'VAHAN registration check', 'Policy master reconciliation'],
      genai: false, build: 'BUY / INTEGRATE', weight: () => CPEngine.WEIGHTS.doc
    },
    e2: {
      label: '02 · Damage CV', sub: '360° video + depth', tone: 'var(--d3)',
      q: 'What damage is actually present?',
      body: 'Panel-level assessment from 360° video and depth. The test that matters is not how much damage there is, but whether the pattern is consistent with the cause of loss the claimant reported.',
      bullets: ['360° video and depth', 'Panel-level segmentation', 'Cause-of-loss consistency test'],
      genai: false, build: 'BUILD / ML', weight: () => CPEngine.WEIGHTS.cv
    },
    e3: {
      label: '03 · Fraud graph', sub: 'ring + duplicate', tone: 'var(--d2)',
      q: 'Is this claim connected to suspicious claims?',
      body: 'Claimant, garage, workshop and media hashes are one graph. A ring is invisible when claims are scored one at a time, which is why fraud scoring is batched in ten-minute clusters rather than run per claim.',
      bullets: ['Duplicate-claim detection', 'Ring detection across the network', 'Cluster analysis on a 10-minute window'],
      genai: false, build: 'BUILD / ML', weight: () => CPEngine.WEIGHTS.fraud
    },
    e4: {
      label: '04 · Repair cost', sub: 'band at FNOL', tone: 'var(--d4)',
      q: 'What should this repair cost?',
      body: 'Returns an indicative band at first notification instead of after a physical inspection. That single change is why a garage waits one day for approval instead of four.',
      bullets: ['Parts catalogue and live feeds', 'Settled-claim history', 'Band returned at FNOL, not after a visit'],
      genai: false, build: 'BUILD / INTEGRATE'
    },
    e5: {
      label: '05 · Policy RAG', sub: 'GenAI, selective', tone: 'var(--d7)',
      q: 'Is this damage covered?',
      body: 'The only generative component in the pipeline, and it reads the actual wording rather than a summary of it. Policy wordings are parsed once, offline, into a clause table — so the per-claim cost is a lookup, not an inference.',
      bullets: ['Policy wording parsed offline, once per product', 'Retrieval over the clause table',
                'Runs only where the deterministic engines did not resolve the claim'],
      genai: true, build: 'BUILD / RAG', weight: () => CPEngine.WEIGHTS.policy
    },
    fusion: {
      label: 'Trust Score', sub: 'Signal fusion', tone: 'var(--accent)',
      q: 'Do the signals agree enough to resolve this claim?',
      body: 'Five sub-scores, five weights, one number between 0 and 100. It is a weighted sum and nothing else, so the contribution column on any claim always adds to the headline figure.',
      bullets: ['Document + damage + fraud + cost + policy signal',
                'Green floor ' + CPEngine.GREEN_FLOOR + ' · amber floor ' + CPEngine.AMBER_FLOOR,
                'No generative model anywhere in the fusion'],
      genai: false, build: 'BUILD · ClaimPulse orchestration layer',
      purpose: 'Turn five opinions into one defensible decision.'
    },
    green: {
      label: 'GREEN', sub: 'Auto-settle', tone: 'var(--lane-green)', lane: 'G',
      q: 'Signals agree, evidence trusted, claim deterministic.',
      body: 'Settles with no human touch and no generative call at all. Capped at ₹50,000 by the IRDAI surveyor corridor, however clean the evidence is.',
      bullets: ['Automation → auto-approval → settlement', 'Zero GenAI tokens',
                'Bounded by regulation, not by ambition'],
      genai: false, build: 'The cheapest inference is the one never run.'
    },
    amber: {
      label: 'AMBER', sub: 'Assisted review', tone: 'var(--lane-amber)', lane: 'A',
      q: 'Signals are inconclusive. Judgement is required.',
      body: 'Targeted GenAI on a bought API — and it receives only the prepared dossier, never the raw claim. It drafts the policy reasoning and the explanation; a person decides.',
      bullets: ['GenAI sees only the prepared dossier', 'Policy reasoning and explanation drafting',
                'HUMAN DECIDES — the model recommends'],
      genai: true, build: 'BUY API'
    },
    red: {
      label: 'RED', sub: 'Investigate', tone: 'var(--lane-red)', lane: 'R',
      q: 'Evidence or signals are suspicious, or highly ambiguous.',
      body: 'Deep forensics and an SIU custody pack. Specialised ML assembles the evidence; a human investigator runs the case and owns the decision.',
      bullets: ['Deep forensics + SIU custody pack', 'Specialised ML, not generative',
                'Human investigation → decision'],
      genai: false, build: 'BUILD / ML + human'
    },
    gov: {
      label: 'Governance', sub: 'Human + system layer', tone: 'var(--d7)',
      q: 'Who is accountable when the model is wrong?',
      body: 'AI recommends; Bajaj retains accountability for every judgemental and investigative decision. That is a design constraint, not a disclaimer — the override path and the audit record are built, and they carry costed build lines.',
      bullets: ['Human override on every lane', 'Per-decision audit trail',
                'Decision explanation in words', 'Rollback', 'SIU escalation'],
      genai: false, build: 'BUILD · D-10 production hardening, D-15 DPDP and SOC2'
    },
    eco: {
      label: 'Settlement', sub: 'Ecosystem orchestration', tone: 'var(--d6)',
      q: 'Who else is waiting, and what do they get?',
      body: 'One routing decision, four stakeholders. The claimant gets status and payment, the garage gets repair approval, the surveyor gets only the complex cases, and Bajaj ops gets an exception queue instead of a universal queue.',
      bullets: ['GREEN → no unnecessary survey or queue', 'AMBER → assisted repair and approval',
                'RED → investigation and controlled settlement'],
      genai: false, build: 'INTEGRATE · consoles at D-11'
    }
  };

  /* ---------------------------------------------------------------
     Geometry
     --------------------------------------------------------------- */
  const W = 1240, H = 662;
  const COL = { intake: 24, gate: 206, eng: 428, fusion: 682, lane: 890 };
  const MID = 262;
  const ENG = ['e1', 'e2', 'e3', 'e4', 'e5'];
  const EH = 66, EGAP = 10;
  const ETOP = MID - (ENG.length * (EH + EGAP) - EGAP) / 2;
  const LANES = ['green', 'amber', 'red'];
  const LH = 96, LGAP = 20;
  const LTOP = MID - (LANES.length * (LH + LGAP) - LGAP) / 2;
  const STRIP_Y = { gov: 500, eco: 578 };
  const HF_Y = 466;

  const nodeBox = {};   // id -> {x,y,w,h}

  function box(s, id, x, y, w, h, { title, sub, meta, tone, dashed }) {
    nodeBox[id] = { x, y, w, h };
    const g = el('g.hot', { 'data-node': id, tabindex: 0, role: 'button',
      'aria-label': title + (sub ? ', ' + sub : '') });
    g.appendChild(el('rect', {
      x, y, width: w, height: h, rx: 11,
      fill: 'var(--surface-raised)', stroke: tone, 'stroke-width': 1.6,
      'stroke-dasharray': dashed ? '6 4' : null, class: 'nbox'
    }));
    g.appendChild(el('rect', { x, y, width: 4, height: h, rx: 2, fill: tone, class: 'nedge' }));
    g.appendChild(el('text', { x: x + 16, y: y + (sub ? 24 : h / 2 + 4.5),
      'font-size': 12.5, 'font-weight': 680, fill: 'var(--ink-strong)', text: title }));
    if (sub) g.appendChild(el('text', { x: x + 16, y: y + 41,
      'font-size': 10.5, fill: 'var(--ink-muted)', text: sub }));
    if (meta) g.appendChild(el('text', { x: x + w - 14, y: y + (sub ? 24 : h / 2 + 4.5),
      'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'end', fill: tone, text: meta }));
    s.appendChild(g);
    return g;
  }

  function edge(s, from, to, opts = {}) {
    const a = nodeBox[from], b = nodeBox[to];
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
    const mx = x1 + (x2 - x1) / 2;
    const d = Math.abs(y1 - y2) < 1 ? `M${x1},${y1} H${x2 - 7}`
      : `M${x1},${y1} H${mx - 12} Q${mx},${y1} ${mx},${y1 + Math.sign(y2 - y1) * 12} V${y2 - Math.sign(y2 - y1) * 12} Q${mx},${y2} ${mx + 12},${y2} H${x2 - 7}`;

    /* Base background track */
    s.appendChild(el('path', {
      d, fill: 'none', stroke: opts.color || 'var(--border)',
      'stroke-width': opts.width || 1.3, opacity: 0.5,
      'data-edge-bg': from + '-' + to
    }));

    /* Continuous flowing telemetry line */
    s.appendChild(el('path', {
      d, fill: 'none', stroke: opts.color || 'var(--dom-ops)',
      'stroke-width': (opts.width || 1.3) + 0.3,
      class: 'pipe-flow-line' + (opts.flow ? ' active' : ''),
      'data-edge': from + '-' + to
    }));

    /* Arrowhead */
    s.appendChild(el('path', { d: `M${x2 - 7},${y2 - 4} L${x2},${y2} L${x2 - 7},${y2 + 4} Z`,
      fill: opts.color || 'var(--border-strong)' }));

    /* Looping data packet particle */
    if (opts.particle !== false) {
      const p = el('circle', { r: 3.2, fill: opts.color || 'var(--accent)', opacity: opts.flow ? 0.95 : 0.65 });
      p.appendChild(el('animateMotion', {
        dur: (opts.dur || 2.4) + 's',
        repeatCount: 'indefinite',
        path: d
      }));
      s.appendChild(p);
    }

    return d;
  }

  /* ---------------------------------------------------------------
     Draw
     --------------------------------------------------------------- */
  function draw(host, { selected, animate, lit, pulse } = {}) {
    clear(host);
    const s = el('svg.chart.pipe', { viewBox: `0 0 ${W} ${H}`, width: '100%',
      preserveAspectRatio: 'xMidYMid meet' });
    host.appendChild(s);

    /* today baseline, small and grey — the thing we are replacing */
    s.appendChild(el('text', { x: COL.intake, y: 18, 'font-size': 10,
      'font-weight': 700, 'letter-spacing': '.1em', fill: 'var(--ink-faint)',
      text: 'TODAY · 7 MANUAL TOUCHES · 55% PHYSICAL SURVEY · 9.8 DAYS' }));
    s.appendChild(el('line', { x1: COL.intake, x2: W - 24, y1: 28, y2: 28,
      stroke: 'var(--border)', 'stroke-dasharray': '3 4' }));

    box(s, 'intake', COL.intake, MID - 40, 152, 80,
      { title: 'Claim intake', sub: 'Guided FNOL', meta: '100%', tone: NODES.intake.tone });
    box(s, 'gate', COL.gate, MID - 52, 186, 104,
      { title: 'GATE 00', sub: 'Capture integrity', tone: NODES.gate.tone });
    s.appendChild(el('text', { x: COL.gate + 16, y: MID + 6, 'font-size': 9.5,
      fill: 'var(--ink-muted)', text: 'EXIF · GPS · camera' }));
    s.appendChild(el('text', { x: COL.gate + 16, y: MID + 20, 'font-size': 9.5,
      fill: 'var(--ink-muted)', text: 'GAN screen · re-capture' }));
    s.appendChild(el('text', { x: COL.gate + 16, y: MID + 36, 'font-size': 9,
      'font-weight': 700, fill: 'var(--lane-red)', text: 'NO GENAI' }));

    ENG.forEach((id, i) => {
      const y = ETOP + i * (EH + EGAP);
      const n = NODES[id];
      box(s, id, COL.eng, y, 218, EH,
        { title: n.label, sub: n.sub, meta: n.weight ? n.weight() + '%' : null, tone: n.tone });
    });
    s.appendChild(el('text', { x: COL.eng, y: ETOP - 12, 'font-size': 10,
      'font-weight': 700, 'letter-spacing': '.1em', fill: 'var(--ink-faint)',
      text: 'FIVE ENGINES IN PARALLEL' }));

    box(s, 'fusion', COL.fusion, MID - 54, 168, 108,
      { title: 'TRUST SCORE', sub: 'signal fusion, 0–100', tone: NODES.fusion.tone });
    s.appendChild(el('text', { x: COL.fusion + 16, y: MID + 16, 'font-size': 9.5,
      fill: 'var(--ink-muted)', text: 'do the signals agree' }));
    s.appendChild(el('text', { x: COL.fusion + 16, y: MID + 29, 'font-size': 9.5,
      fill: 'var(--ink-muted)', text: 'enough to resolve it?' }));

    LANES.forEach((id, i) => {
      const y = LTOP + i * (LH + LGAP);
      const n = NODES[id];
      const share = { green: I().B03_green, amber: I().B04_amber, red: I().B05_red }[id];
      box(s, id, COL.lane, y, 200, LH,
        { title: n.label, sub: n.sub, meta: fmt.pct(share, 0), tone: n.tone });
      const tat = { green: I().B10_tatGreen, amber: I().B11_tatAmber, red: I().B12_tatRed }[id];
      const tch = { green: I().B06_touchGreen, amber: I().B07_touchAmber, red: I().B08_touchRed }[id];
      s.appendChild(el('text', { x: COL.lane + 16, y: y + 62, 'font-size': 9.5,
        fill: 'var(--ink-muted)', text: `${tat} days · ${tch} touches` }));
      s.appendChild(el('text', { x: COL.lane + 16, y: y + 78, 'font-size': 9, 'font-weight': 700,
        fill: n.genai ? 'var(--warm)' : 'var(--lane-green)',
        text: n.genai ? 'TARGETED GENAI · BUY API' : (id === 'green' ? '₹0 GENAI TOKEN' : 'SPECIALISED ML + HUMAN') }));
    });

    /* edges with continuous flow & particle animation */
    edge(s, 'intake', 'gate', { flow: animate, dur: 1.8 });
    ENG.forEach((id, i) => {
      edge(s, 'gate', id, { color: 'var(--border-strong)', dur: 1.6 + i * 0.2 });
      edge(s, id, 'fusion', { color: 'var(--border-strong)', dur: 1.8 + i * 0.15 });
    });
    LANES.forEach((id, i) => edge(s, 'fusion', id, { color: NODES[id].tone, width: 1.6, flow: animate, dur: 1.5 + i * 0.3 }));

    /* the hard-fail bypass — leaves the gate, touches no engine */
    const g = nodeBox.gate, rl = nodeBox.red;
    const hfY = HF_Y, redCx = rl.x + rl.w / 2;
    const hfPath = `M${g.x + g.w / 2},${g.y + g.h} V${hfY} H${redCx} V${rl.y + rl.h + 9}`;
    s.appendChild(el('path', {
      d: hfPath,
      fill: 'none', stroke: 'var(--lane-red)', 'stroke-width': 1.6,
      class: 'pipe-flow-line gate-fail' + (animate ? ' active' : '') }));
    s.appendChild(el('path', { d: `M${redCx - 4},${rl.y + rl.h + 9} L${redCx},${rl.y + rl.h + 2} L${redCx + 4},${rl.y + rl.h + 9} Z`,
      fill: 'var(--lane-red)' }));

    /* Hard fail particle */
    const hfParticle = el('circle', { r: 3, fill: 'var(--lane-red)', opacity: 0.8 });
    hfParticle.appendChild(el('animateMotion', { dur: '2.5s', repeatCount: 'indefinite', path: hfPath }));
    s.appendChild(hfParticle);

    s.appendChild(el('text', { x: COL.intake + 4, y: hfY - 22, 'font-size': 11,
      'font-weight': 700, fill: 'var(--lane-red)', text: 'HARD FAIL' }));
    ['leaves the gate and touches no engine —', 'no model called, no token spent'].forEach((t, i) =>
      s.appendChild(el('text', { x: COL.intake + 4, y: hfY - 6 + i * 13, 'font-size': 9.5,
        fill: 'var(--ink-muted)', text: t })));

    /* governance and ecosystem strips */
    [['gov', 'HUMAN + SYSTEM GOVERNANCE', 'override · audit trail · explanation · rollback · SIU escalation'],
     ['eco', 'SETTLEMENT + ECOSYSTEM', 'customer · garage · surveyor · Bajaj ops']]
      .forEach(([id, title, sub]) => {
        const y = STRIP_Y[id];
        box(s, id, COL.gate, y, W - COL.gate - 24, 62,
          { title, sub, tone: NODES[id].tone, dashed: true });
      });
    s.appendChild(el('path', { d: `M${COL.lane + 100},${LTOP + 3 * (LH + LGAP) - LGAP} V${STRIP_Y.gov}`,
      fill: 'none', stroke: 'var(--border-strong)', 'stroke-dasharray': '4 4' }));

    /* the travelling claim */
    if (animate) {
      const path = `M${nodeBox.intake.x + nodeBox.intake.w},${MID} H${nodeBox.gate.x}`;
      const dot = el('circle', { r: 5.5, fill: 'var(--accent)', opacity: .95 });
      dot.appendChild(el('animateMotion', { dur: '1.2s', repeatCount: 'indefinite', path }));
      s.appendChild(dot);
    }

    /* ---- live walk state -------------------------------------------
       `lit` are the nodes a claim has already cleared; `pulse` is the one
       it is inside right now. The classes do the work in CSS so the
       animation survives a redraw. */
    (lit || []).forEach(id => {
      const g = s.querySelector(`[data-node="${id}"]`);
      if (g) g.classList.add('lit');
    });
    (Array.isArray(pulse) ? pulse : pulse ? [pulse] : []).forEach(id => {
      const g = s.querySelector(`[data-node="${id}"]`);
      if (!g) return;
      g.classList.add('pulsing');
      const b = nodeBox[id];
      if (!b) return;
      s.appendChild(el('rect', { x: b.x - 5, y: b.y - 5, width: b.w + 10, height: b.h + 10,
        rx: 14, fill: 'none', stroke: NODES[id] ? NODES[id].tone : 'var(--accent)',
        'stroke-width': 2, class: 'halo' }));
    });

    /* selection state */
    if (selected) {
      const sel = s.querySelector(`[data-node="${selected}"] .nbox`);
      if (sel) { sel.setAttribute('stroke-width', '2.6'); sel.setAttribute('fill', 'var(--accent-soft)'); }
    }
    return s;
  }

  return { NODES, draw, W, H };
})();
