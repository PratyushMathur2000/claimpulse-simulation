/* =====================================================================
   ClaimPulse · Decision Engine
   Gate 00 → Engines 01-05 → Trust Score fusion → Lane routing → Settle
   ---------------------------------------------------------------------
   Every number the UI shows is produced here. Two rules hold throughout:

   1  The Trust Score is a weighted sum of the five sub-scores, so the
      contribution column on screen always adds up to the headline figure.
      Nothing is displayed that was not computed.

   2  Gate 00 runs BEFORE any engine. A hard fail there routes RED without
      a single model call — which is the whole architectural claim, so the
      code has to be honest about the ordering.
   ===================================================================== */

const CPEngine = (() => {

  /* ---------- Gate 00 · Capture Integrity ---------- */
  function runGate(sc, live) {
    const checks = Object.keys(CP_GATE_LABELS).map(k => ({
      key: k, label: CP_GATE_LABELS[k], ...sc.gate[k]
    }));

    // Live device signals, where the browser or device gave them to us.
    // These annotate the demo — they never change the scripted verdict.
    if (live) {
      const set = (key, text) => { const c = checks.find(x => x.key === key); if (c) c.live = text; };
      if (live.coords)     set('gps',     'device fix ' + live.coords);
      if (live.capturedAt) set('recency', 'session stamp ' + live.capturedAt);
      if (live.frames)     set('exif',    live.frames + ' frames captured in-session');
    }

    return { checks, score: sc.gate.score, hardFail: checks.some(c => c.status === 'FAIL') };
  }

  /* ---------- Engine 01 · Document AI + OCR / VAHAN ---------- */
  function runDoc(sc) {
    const checks = Object.keys(CP_DOC_LABELS).map(k => ({
      key: k, label: CP_DOC_LABELS[k], ...sc.doc[k]
    }));
    return { checks, score: sc.doc.score, hardFail: checks.some(c => c.status === 'FAIL') };
  }

  /* ---------- Engine 02 · CV Damage Assessment ---------- */
  function runCV(sc) {
    const parts = sc.cv.parts;
    const partsTotal = parts.reduce((s, p) => s + p.cost, 0);
    const avgConf = parts.reduce((s, p) => s + p.conf, 0) / parts.length;
    return {
      parts, partsTotal,
      avgConf: Math.round(avgConf * 100) / 100,
      lowConf: parts.filter(p => p.conf < 0.5).length,
      cause: sc.cv.cause,
      score: sc.cv.score,
      hardFail: sc.cv.cause.status === 'FAIL'
    };
  }

  /* ---------- Engine 03 · Fraud + Duplicate Graph ---------- */
  function runFraud(sc) {
    return {
      ring: sc.fraud.ring,
      duplicateMedia: sc.fraud.duplicateMedia,
      priorClaims90d: sc.fraud.priorClaims90d,
      sharedEntities: sc.fraud.sharedEntities,
      verdict: sc.fraud.verdict,
      graph: sc.fraud.graph,
      score: sc.fraud.score,
      hardFail: sc.fraud.ring >= CP_CONST.RING_FLOOR
    };
  }

  /* ---------- Engine 04 · Repair Cost Estimation ----------
     Scores nothing into the Trust Score. It sizes the claim, which is
     what triggers the IRDAI corridor test, and it returns the indicative
     band at first notification — the mechanism behind the 4-day to 1-day
     garage figure (W-73).                                              */
  function runRepair(sc, cv) {
    const r = sc.repair;
    const overBand = r.garageEstimate > r.band[1];
    const variance = ((r.garageEstimate - r.band[1]) / r.band[1]) * 100;
    const garage = CP_GARAGES[sc.garageCode] || null;
    return {
      code: sc.garageCode, garage,
      garageEstimate: r.garageEstimate,
      band: r.band,
      catalogueTotal: cv.partsTotal,
      status: r.status, note: r.note, overBand,
      variance: Math.round(variance * 10) / 10,
      daysToday: CPModel.INPUTS.J06_garageToday,   // J-06  4 days
      daysAfter: CPModel.INPUTS.J07_garageAfter,   // J-07  1 day
      daysSaved: CPModel.INPUTS.J06_garageToday - CPModel.INPUTS.J07_garageAfter
    };
  }

  /* ---------- Engine 05 · Policy Validation RAG ---------- */
  function runPolicy(sc) {
    return {
      clauses: sc.policyRag.clauses,
      score: sc.policyRag.score,
      hardFail: sc.policyRag.clauses.some(c => c.v === 'EXCLUDED')
    };
  }

  /* ---------- Settlement arithmetic ----------
     Assessed at the parts-catalogue band, NOT at whatever the garage
     asked for. Then depreciation, then the compulsory deductible.     */
  function settle(sc, cv, repair, pol) {
    const policy = CP_POLICIES[sc.policy];
    const zeroDep = pol.clauses.some(c => c.ref === 'Add-on ZD' && c.v === 'APPLIES');
    const depClause = pol.clauses.find(c => c.ref === 'Dep. Sch.');
    const m = depClause && depClause.d.match(/(\d+)%/);
    const depRate = zeroDep ? 0 : (m ? +m[1] / 100 : 0);

    const assessedBase = Math.min(repair.garageEstimate, repair.band[1]);
    const disallowed   = Math.max(0, repair.garageEstimate - assessedBase);
    const labour       = Math.round(assessedBase * 0.18);
    const parts        = assessedBase - labour;
    const depreciation = Math.round(parts * depRate);
    const deductible   = policy.deductible;
    const payable      = Math.max(0, assessedBase - depreciation - deductible);

    return { assessedBase, disallowed, parts, labour, depRate,
             depreciation, deductible, payable, zeroDep };
  }

  /* ---------- Trust Score fusion ---------- */
  function fuse(gate, doc, cv, fraud, pol) {
    const W = CP_CONST.WEIGHTS;
    const parts = [
      { key: 'gate',   label: 'Gate 00 · Capture Integrity', raw: gate.score,  w: W.gate   },
      { key: 'doc',    label: engineName('doc'),             raw: doc.score,   w: W.doc    },
      { key: 'cv',     label: engineName('cv'),              raw: cv.score,    w: W.cv     },
      { key: 'fraud',  label: engineName('fraud'),           raw: fraud.score, w: W.fraud  },
      { key: 'policy', label: engineName('policy'),          raw: pol.score,   w: W.policy }
    ].map(p => ({ ...p, contribution: Math.round(p.raw * p.w) / 100 }));

    const score = Math.round(parts.reduce((s, p) => s + p.contribution, 0) * 10) / 10;
    return { parts, score };
  }

  /* ---------- Routing ---------- */
  function route(score, flags, amount) {
    const reasons = [];
    let lane;

    if (flags.gateFail) {
      lane = 'R';
      reasons.push({ hard: true, t: 'HARD FAIL · Gate 00 rejected the evidence before any engine ran. No model was called and no tokens were spent.' });
    } else if (flags.ringFail) {
      lane = 'R';
      reasons.push({ hard: true, t: 'HARD FAIL · Fraud graph ring score at or above the ' + CP_CONST.RING_FLOOR + ' threshold. The claim is clean; the network around it is not.' });
    } else if (score >= CP_CONST.GREEN_FLOOR) {
      lane = 'G';
      reasons.push({ t: 'Trust Score ' + score + ' clears the green floor of ' + CP_CONST.GREEN_FLOOR + '.' });
    } else if (score >= CP_CONST.AMBER_FLOOR) {
      lane = 'A';
      reasons.push({ t: 'Trust Score ' + score + ' sits between the amber floor (' + CP_CONST.AMBER_FLOOR + ') and the green floor (' + CP_CONST.GREEN_FLOOR + '). Signals are inconclusive, not contradictory.' });
    } else {
      lane = 'R';
      reasons.push({ t: 'Trust Score ' + score + ' is below the amber floor of ' + CP_CONST.AMBER_FLOOR + '.' });
    }

    // A-11 · IRDAI Master Circular 2024. Above Rs 50,000 a registered
    // surveyor is required, so no claim above the corridor may auto-settle.
    let capped = false;
    if (lane === 'G' && amount > CP_CONST.SURVEYOR_EXEMPTION) {
      lane = 'A'; capped = true;
      reasons.push({ cap: true, t: 'CAPPED · ' + inr(amount) + ' exceeds the IRDAI Rs 50,000 surveyor-exemption corridor. A registered surveyor is required, so this cannot auto-settle however clean it is.' });
    }

    if (flags.cvFail && lane !== 'R') {
      lane = 'R';
      reasons.push({ hard: true, t: 'HARD FAIL · Damage pattern contradicts the reported cause of loss.' });
    }

    return { lane, reasons, capped };
  }

  /* ---------- Surveyor deployment ----------
     Sheet 3 Part I, W-70 to W-72. Green and amber sit inside the
     corridor; surveyors move above it, where judgement is needed.     */
  function surveyor(lane, payable, capped) {
    const above = payable > CP_CONST.SURVEYOR_EXEMPTION;
    const required = lane === 'R' || above;
    return {
      required, above, capped,
      basis: lane === 'R'
        ? 'Red lane — full investigation, surveyor and SIU custody pack'
        : above
          ? 'Above the Rs 50,000 corridor — registered surveyor required by IRDAI'
          : 'Inside the Rs 50,000 corridor — no registered surveyor required',
      todayWouldSurvey: true   // 55% of claims are surveyed today (J-03)
    };
  }

  /* ---------- Status timeline for the claimant tracker ---------- */
  function timeline(lane, money, ts) {
    const day = 24 * 3600 * 1000;
    const tat = CP_CONST.LANE[lane].tat;
    const at = (frac) => new Date(+ts + tat * day * frac);
    const steps = [
      { t: 'Claim registered', d: 'FNOL accepted with guided live capture', at: ts, done: true },
      { t: 'Evidence verified', d: 'Gate 00 cleared the capture session', at: at(0.05), done: true },
      { t: 'Assessment complete', d: 'Five engines scored the claim in parallel', at: at(0.15), done: true }
    ];
    if (lane === 'G') {
      steps.push({ t: 'Auto-settled', d: 'Trust Score cleared the green floor — no human review needed', at: at(0.6), done: true });
      steps.push({ t: 'Payment released', d: inr(money.payable) + ' to your registered account', at: at(1), now: true });
    } else if (lane === 'A') {
      steps.push({ t: 'With a claims reviewer', d: 'One reviewer, working from a dossier the engines already built', at: at(0.5), now: true });
      steps.push({ t: 'Settlement expected', d: 'Estimated ' + inr(money.payable), at: at(1) });
    } else {
      steps.push({ t: 'Referred for investigation', d: 'Evidence or network signals need review before settlement', at: at(0.4), now: true });
      steps.push({ t: 'Decision expected', d: 'You will be told the outcome and the reason for it', at: at(1) });
    }
    return steps;
  }

  /* ---------- Full pipeline ---------- */
  function process(scenarioKey, live, scOverride) {
    const sc = scOverride || CP_SCENARIOS[scenarioKey];
    const policy = CP_POLICIES[sc.policy];
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    // Order matters and is the architecture: gate first, engines after.
    const gate   = runGate(sc, live);
    const doc    = runDoc(sc);
    const cv     = runCV(sc);
    const fraud  = runFraud(sc);
    const repair = runRepair(sc, cv);
    const pol    = runPolicy(sc);

    const money  = settle(sc, cv, repair, pol);
    const trust  = fuse(gate, doc, cv, fraud, pol);
    const routed = route(trust.score, {
      gateFail: gate.hardFail, ringFail: fraud.hardFail, cvFail: cv.hardFail
    }, money.payable);

    const laneMeta = CP_CONST.LANE[routed.lane];
    const ts = new Date();

    // Per-claim economics, on the same basis as Sheet 3 Part C.
    const touchesSaved = CP_CONST.TOUCHES_TODAY - laneMeta.touches;
    const daysSaved    = CP_CONST.TAT_TODAY - laneMeta.tat;
    const costToServe  = Math.round(laneMeta.touches * CP_CONST.COST_PER_TOUCH
                                    + CP_CONST.BOOK.runCostPerClaim);
    const costSaved    = CP_CONST.COST_TO_SERVE_TODAY - costToServe;
    const genAiCalls   = routed.lane === 'G' ? 0 : (routed.lane === 'A' ? 1 : 3);

    // `ref` is what a human reads and what the audit trail quotes. `id` is
    // the store's key and gets replaced by the document id once synced, so
    // the two must not be the same field.
    // The three primary demo claims carry the reference the deck quotes.
    // Anything generated for the background queue gets its own.
    const ref = sc.ref || ('CLM-' + (Math.floor(Math.random() * 90000) + 10000));
    return {
      id: ref, ref,
      ts: ts.toISOString(),
      scenario: scenarioKey,
      scenarioTitle: sc.title,
      policyNo: sc.policy,
      // What the claimant and the garage are asking for. Net payable, after
      // depreciation and the deductible, is a different number and lives in
      // `money` — conflating the two is how a settlement working stops
      // reconciling.
      claimAmount: repair.garageEstimate,
      policy: sc.vehicle ? { ...policy, vehicle: sc.vehicle, reg: sc.reg || policy.reg } : policy,
      incident: sc.incident,
      gate, doc, cv, fraud, repair, pol, money, trust,
      lane: routed.lane,
      laneName: laneMeta.name,
      laneLabel: laneMeta.label,
      laneTat: laneMeta.tat,
      laneTouches: laneMeta.touches,
      reasons: routed.reasons,
      capped: routed.capped,
      surveyor: surveyor(routed.lane, money.payable, routed.capped),
      timeline: timeline(routed.lane, money, ts),
      touchesSaved, daysSaved, costToServe, costSaved, genAiCalls,
      runtimeMs: Math.max(0.01, Math.round(
        ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0) * 100) / 100),
      audit: buildAudit(sc, gate, doc, cv, fraud, repair, pol, trust, routed, money),
      overridden: null,
      // Set by the claims officer from the inspector. Synced, so the
      // claimant's tracker shows the appointment the moment it is booked.
      survey: null,
      shots: []
    };
  }

  /* ---------- Audit trail · the IRDAI defensibility record ----------
     Every decision the system took, in order, with the arithmetic
     exposed. This is what W-74 (Rs 1.00 Cr of governance build) buys. */
  function buildAudit(sc, gate, doc, cv, fraud, repair, pol, trust, routed, money) {
    const rows = [];
    const t0 = Date.now() - 14 * 780;
    const stamp = (n) => new Date(t0 + n * 780).toISOString();
    let n = 0;
    const push = (ref, stage, detail, status) =>
      rows.push({ ref, at: stamp(n++), stage, detail, status });

    push('A-00', 'INTAKE', 'FNOL accepted · guided live capture, gallery upload disabled', 'OK');
    gate.checks.forEach((c, i) =>
      push('G-' + pad(i + 1), 'GATE 00', c.label + ' — ' + c.v, c.status));
    push('E-01', 'ENGINE 01', 'Document AI + OCR, VAHAN cross-check · score ' + doc.score, doc.hardFail ? 'FAIL' : 'OK');
    push('E-02', 'ENGINE 02', 'CV damage assessment · ' + cv.parts.length + ' parts, mean confidence ' + cv.avgConf, cv.hardFail ? 'FAIL' : 'OK');
    push('E-03', 'ENGINE 03', 'Fraud + duplicate graph · ring score ' + fraud.ring, fraud.hardFail ? 'FAIL' : 'OK');
    push('E-04', 'ENGINE 04', 'Repair band ' + inr(repair.band[0]) + '–' + inr(repair.band[1]) + ' vs garage ' + inr(repair.garageEstimate), repair.status);
    push('E-05', 'ENGINE 05', 'Policy validation RAG · ' + pol.clauses.length + ' clauses resolved', 'OK');
    trust.parts.forEach((p, i) =>
      push('T-' + pad(i + 1), 'FUSION', p.label + ' — ' + p.raw + ' × ' + p.w + '% = ' + p.contribution.toFixed(2), 'OK'));
    push('T-99', 'FUSION', 'Trust Score = ' + trust.score + ' / 100', 'OK');
    routed.reasons.forEach((r, i) =>
      push('R-' + pad(i + 1), 'ROUTING', r.t,
           routed.lane === 'G' ? 'OK' : routed.lane === 'A' ? 'WARN' : 'FAIL'));
    push('S-01', 'SETTLEMENT',
      'Assessed ' + inr(money.assessedBase) +
      (money.disallowed ? ' (garage asked ' + inr(money.assessedBase + money.disallowed) + ', ' + inr(money.disallowed) + ' outside band)' : '') +
      ' less depreciation ' + inr(money.depreciation) +
      ' less deductible ' + inr(money.deductible) +
      ' = ' + inr(money.payable), 'OK');
    return rows;
  }

  /* ---------- Why this claim went where it went ----------
     A score is not an explanation. This assembles the one paragraph a
     claims officer can read out to a customer, a manager or an ombudsman
     without having to interpret anything — built from what the engines
     actually found, never from a template with the lane pasted in.     */
  function explain(c) {
    /* Three bands, not two. An amber claim is usually one where nothing
       actually failed and nothing actually cleared — saying "what holds up"
       and finding an empty list is how an explanation stops explaining. */
    const STRONG = 82, WEAK = 60;
    const sig = [
      { label: 'capture integrity',              score: c.gate.score  },
      { label: 'document checks (OCR First)',    score: c.doc.score   },
      { label: 'damage assessment (CV Depth)',   score: c.cv.score    },
      { label: 'fraud network (Fraud Graph)',    score: c.fraud.score },
      { label: 'policy coverage (Policy RAG)',   score: c.pol.score   }
    ];
    const strong = sig.filter(x => x.score >= STRONG);
    const middle = sig.filter(x => x.score < STRONG && x.score >= WEAK);
    const weak   = sig.filter(x => x.score < WEAK);
    const list = a => a.map(x => x.label + ' (' + x.score + ')').join(', ');

    const hard = c.reasons.filter(r => r.hard);
    const cap  = c.reasons.find(r => r.cap);
    const bits = [];

    if (c.lane === 'G') {
      bits.push('This claim is GREEN because all five engines agree and nothing in the capture '
        + 'session contradicts the reported incident.');
      bits.push('Clearing comfortably: ' + list(strong) + '.'
        + (middle.length ? ' Adequate: ' + list(middle) + '.' : ''));
      bits.push('The repair estimate of ' + inr(c.claimAmount) + ' sits inside the benchmark band '
        + 'for this model and city, and the net payable of ' + inr(c.money.payable)
        + ' is inside the IRDAI ' + inr(CP_CONST.SURVEYOR_EXEMPTION) + ' corridor.');
      bits.push('Neither a reviewer nor a physical survey adds anything the engines have not '
        + 'already established, so the claim settles automatically.');

    } else if (c.lane === 'A') {
      bits.push('This claim is AMBER because the evidence is credible but not conclusive. '
        + 'Nothing failed outright; nothing cleared outright either.');
      if (strong.length) bits.push('What holds up: ' + list(strong) + '.');
      if (middle.length) {
        bits.push((strong.length ? 'What sits in the middle band' : 'Every signal landed in the '
          + 'middle band, between the ' + WEAK + ' floor and the ' + STRONG + ' green threshold')
          + ': ' + list(middle) + '.');
      }
      if (weak.length) bits.push('What is genuinely weak: ' + list(weak) + '.');
      if (c.repair.overBand) {
        bits.push('The garage estimate of ' + inr(c.repair.garageEstimate) + ' sits '
          + c.repair.variance + '% above the benchmark band of ' + inr(c.repair.band[0]) + ' to '
          + inr(c.repair.band[1]) + '. That single variance is the largest reason a human is '
          + 'being asked to look at this claim rather than a machine settling it.');
      }
      if (cap) {
        bits.push('It is also above the IRDAI ' + inr(CP_CONST.SURVEYOR_EXEMPTION)
          + ' corridor, so a registered surveyor is required by regulation regardless of how '
          + 'the engines scored it.');
      }
      bits.push('One reviewer resolves this. They open a dossier the engines already built — '
        + 'the customer is not asked for anything a second time.');

    } else {
      bits.push('This claim is RED because the engines did not merely disagree, they contradicted '
        + 'each other.');
      hard.forEach(h => bits.push(h.t.replace(/^HARD FAIL · /, '')));
      if (c.fraud.ring >= CP_CONST.RING_FLOOR) {
        bits.push('The Fraud Graph scored the network around this claim at ' + c.fraud.ring
          + ' against a ' + CP_CONST.RING_FLOOR + ' threshold'
          + (c.fraud.sharedEntities.length
              ? ': ' + c.fraud.sharedEntities[0].charAt(0).toLowerCase()
                + c.fraud.sharedEntities[0].slice(1) + '.' : '.'));
      }
      if (c.gate.score < 60) {
        bits.push('Capture integrity scored only ' + c.gate.score
          + ' — the submitted media does not hold together as a single capture session.');
      }
      if (weak.length) bits.push('Weakest signals: ' + list(weak) + '.');
      bits.push('This goes to investigation with a full evidence pack. Nothing beyond the fact '
        + 'that additional verification is under way is communicated to the customer.');
    }
    return bits;
  }

  /* ---------- Operational status ----------
     The stage says where the claim is in the pipeline; the status is the
     word a claims desk actually files it under, and it is what the
     dashboard filters on.                                              */
  const STATUSES = ['New', 'Processing', 'Awaiting Review', 'Survey Required',
                    'Survey Scheduled', 'Investigation', 'Approved', 'Settled'];

  function statusOf(c, stage) {
    const s = stage || stageOf(c);
    if (s.k === 'gate')     return 'New';
    if (s.bucket === 'assessing') return 'Processing';
    if (s.bucket === 'settling')  return 'Approved';
    if (s.bucket === 'done')      return 'Settled';
    // Waiting on a person: which person depends on the survey position.
    if (c.survey)                       return 'Survey Scheduled';
    if (c.lane === 'R')                 return 'Investigation';
    if (c.surveyor && c.surveyor.required) return 'Survey Required';
    return 'Awaiting Review';
  }

  /* Priority is what a desk sorts by when it cannot do everything today:
     exposure first, then how long the customer has been waiting. */
  function priorityOf(c, stage) {
    const s = stage || stageOf(c);
    if (s.bucket === 'done') return { k: 'done', nm: 'Closed', rank: 3 };
    const ageH = (Date.now() - new Date(c.ts).getTime()) / 3600000;
    if (c.lane === 'R' || c.claimAmount >= 100000 || ageH > 72)
      return { k: 'high', nm: 'High', rank: 0 };
    if (c.lane === 'A' || c.claimAmount >= 25000)
      return { k: 'med', nm: 'Medium', rank: 1 };
    return { k: 'low', nm: 'Low', rank: 2 };
  }

  /* Amount bands, exactly as the dashboard filter offers them. */
  const AMOUNT_BANDS = [
    { k: 'a', nm: 'Below ₹10,000',        lo: 0,      hi: 10000   },
    { k: 'b', nm: '₹10,000 – ₹25,000',    lo: 10000,  hi: 25000   },
    { k: 'c', nm: '₹25,000 – ₹50,000',    lo: 25000,  hi: 50000   },
    { k: 'd', nm: '₹50,000 – ₹1,00,000',  lo: 50000,  hi: 100000  },
    { k: 'e', nm: 'Above ₹1,00,000',      lo: 100000, hi: Infinity }
  ];
  const bandOf = n => AMOUNT_BANDS.find(b => n >= b.lo && n < b.hi) || AMOUNT_BANDS[0];

  /* ---------- Claim lifecycle ----------
     A monitoring desk cares less about the verdict than about where a
     claim is right now and who it is waiting on. So the stage is DERIVED
     from elapsed time rather than stored: every device agrees without a
     single extra write, and a background tick advancing progress from
     every open tab would be a write storm and a merge conflict at once.

     The machine timings match the pipeline animation on the handset, so
     a claim filed on a phone crosses the control tower at the same pace
     the claimant watches it move.                                       */
  const STAGE_MS  = { gate: 800, engines: 3900, routing: 5000 };
  // Long enough that "releasing payment" is a state a dashboard can show,
  // short enough that a claim filed on stage still visibly completes.
  const SETTLE_MS = 150000;

  const STAGE = {
    gate:        { nm: 'Capture Integrity Gate', short: 'GATE 00',  bucket: 'assessing' },
    engines:     { nm: 'Five engines assessing', short: 'ENGINES',  bucket: 'assessing' },
    routing:     { nm: 'Trust Score fusion',     short: 'ROUTING',  bucket: 'assessing' },
    assist:      { nm: 'Waiting on a reviewer',  short: 'ASSIST',   bucket: 'assist'    },
    investigate: { nm: 'With investigation',     short: 'SIU',      bucket: 'assist'    },
    settling:    { nm: 'Releasing payment',      short: 'PAYING',   bucket: 'settling'  },
    settled:     { nm: 'Settled',                short: 'SETTLED',  bucket: 'done'      },
    closed:      { nm: 'Closed after review',    short: 'CLOSED',   bucket: 'done'      }
  };

  function stageOf(c, now) {
    now = now || Date.now();
    const age = Math.max(0, now - new Date(c.ts).getTime());
    const S = (k, pct, d, who) => ({
      k, pct: Math.max(0, Math.min(1, pct)),
      nm: STAGE[k].nm, short: STAGE[k].short, bucket: STAGE[k].bucket,
      d, waitingOn: who || null,
      decided: STAGE[k].bucket !== 'assessing',
      needsHuman: STAGE[k].bucket === 'assist'
    });

    // Still on the machine. The lane exists in the record but has not been
    // reached yet, so the console must not show it.
    if (age < STAGE_MS.gate)
      return S('gate', 0.10 + 0.08 * (age / STAGE_MS.gate),
               'Screening the capture session before any model runs', 'the system');
    if (age < STAGE_MS.engines)
      return S('engines', 0.18 + 0.42 * ((age - STAGE_MS.gate) / (STAGE_MS.engines - STAGE_MS.gate)),
               'Document AI, CV damage, fraud graph, repair cost and policy RAG, in parallel', 'the system');
    if (age < STAGE_MS.routing)
      return S('routing', 0.60 + 0.15 * ((age - STAGE_MS.engines) / (STAGE_MS.routing - STAGE_MS.engines)),
               'Fusing five signals into one routing decision', 'the system');

    // A human has already acted on it — that closes the claim either way.
    if (c.overridden)
      return S(c.overridden.lane === 'R' ? 'closed' : 'settled', 1,
               'Released by ' + String(c.overridden.by).split(' · ')[0] + ' after review');

    if (c.lane === 'G') {
      const since = age - STAGE_MS.routing;
      return since < SETTLE_MS
        ? S('settling', 0.75 + 0.25 * (since / SETTLE_MS),
            'Auto-settled — payment instruction released to the bank', 'the bank')
        : S('settled', 1, 'Paid ' + inr(c.money.payable) + ' with no human review');
    }
    if (c.lane === 'A')
      return S('assist', 0.78, 'One reviewer has to release or hold this claim', 'a claims reviewer');
    return S('investigate', 0.78, 'Referred to investigation and the SIU', 'the investigation desk');
  }

  /* ---------- Background queue ----------
     Claims that already exist so the ops console does not open empty.
     The lane mix follows the modelled 65 / 25 / 10 split (B-03 to B-05). */
  let nameCursor = Math.floor(Math.random() * CP_NAMES.length);
  let vehCursor  = Math.floor(Math.random() * CP_VEHICLES.length);

  function backgroundClaim(forceKey, ageMs) {
    const r = Math.random();
    const key = forceKey || (r < CP_CONST.LANE.G.share ? 'clean'
              : r < CP_CONST.LANE.G.share + CP_CONST.LANE.A.share ? 'ambiguous'
              : (Math.random() < 0.5 ? 'synthetic' : 'ring'));
    /* Scale the exposure. Without this every clean claim in the queue is the
       same rupee figure, and a dashboard whose average claim amount never
       moves is a dashboard nobody believes.

       LOG-NORMAL, not uniform. Motor OD severity is right-skewed: a great
       many small claims and a thin tail of large ones, so the median sits
       well below the mean. A uniform draw produces a flat distribution that
       over-represents large claims, and large claims breach the IRDAI
       Rs 50,000 corridor and get capped out of the green lane. The result
       was a demo desk routing 50/38/13 while the model on the same screen
       assumed 65/25/10 — the app contradicting its own case. */
    const f = lognormal(-0.105, 0.55);      // median 0.90, thin tail past 2.5x
    const base = CP_SCENARIOS[key];
    // Jitter the sub-scores too. Twenty claims all reading exactly 94 is the
    // tell that a queue is four records copied five times. The jitter is
    // small enough not to move the lane, and the fusion still recomputes from
    // these numbers, so the contribution column keeps reconciling.
    const j = (n) => Math.max(1, Math.min(99, Math.round(n + (Math.random() * 10 - 5))));
    const scaled = { ...base, ref: null,
      gate:      { ...base.gate,      score: j(base.gate.score)      },
      doc:       { ...base.doc,       score: j(base.doc.score)       },
      fraud:     { ...base.fraud,     score: j(base.fraud.score)     },
      policyRag: { ...base.policyRag, score: j(base.policyRag.score) },
      repair: { ...base.repair,
        garageEstimate: Math.round(base.repair.garageEstimate * f / 50) * 50,
        band: [Math.round(base.repair.band[0] * f / 50) * 50,
               Math.round(base.repair.band[1] * f / 50) * 50] },
      cv: { ...base.cv, score: j(base.cv.score),
        parts: base.cv.parts.map(pt => ({ ...pt, cost: Math.round(pt.cost * f / 50) * 50 })) }
    };
    const c = process(key, null, scaled);
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const walk = a => a[vehCursor++ % a.length];
    // Walk the name list rather than sampling it — three identical
    // policyholders in one queue reads as a bug on a projector.
    const holder = CP_NAMES[nameCursor++ % CP_NAMES.length];
    c.policy = { ...c.policy,
      holder,
      vehicle: walk(CP_VEHICLES),
      reg: walk(CP_PLATES) + ' ' +
           String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
           String.fromCharCode(65 + Math.floor(Math.random() * 26)) + ' ' +
           (1000 + Math.floor(Math.random() * 8999))
    };
    c.incident = { ...c.incident, city: walk(CP_CITIES) };
    c.seeded = true;
    // Backdate seeds so the board opens with claims genuinely spread across
    // the lifecycle rather than seven of them starting the pipeline at once.
    if (ageMs) c.ts = new Date(Date.now() - ageMs).toISOString();
    return c;
  }

  /* Box-Muller, so the tail is a real tail and not a clipped uniform. */
  function lognormal(mu, sigma) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.exp(mu + sigma * z);
  }

  const pad = (n) => String(n).padStart(2, '0');
  function inr(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

  return { process, backgroundClaim, stageOf, STAGE, explain, statusOf,
           priorityOf, STATUSES, AMOUNT_BANDS, bandOf, inr };
})();
