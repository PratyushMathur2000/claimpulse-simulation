/* =====================================================================
   ClaimPulse · Decision Engine
   Gate 00 → Engines 01-05 → Trust Score fusion → Lane routing → Settle
   ---------------------------------------------------------------------
   Three rules hold throughout, and the code is arranged to make them
   impossible to fake:

   1  GATE 00 RUNS BEFORE ANY ENGINE. A hard fail there routes RED
      without a single model call. That ordering is the architectural
      claim, so the function order below is the claim, not a diagram.

   2  The Trust Score is a weighted sum of the five sub-scores, so the
      contribution column on screen always adds to the headline figure.
      Nothing is displayed that was not computed.

   3  Nothing above the IRDAI Rs 50,000 corridor may auto-settle,
      however clean it is. A-11, Master Circular 2024.
   ===================================================================== */

const CPEngine = (() => {

  const I = CPModel.INPUTS;

  /* Fusion weights — must sum to 100 */
  const WEIGHTS = { gate: 30, doc: 20, cv: 15, fraud: 25, policy: 10 };

  /* Routing thresholds on the 0-100 Trust Score. These are the demo's
     own calibration of the lane shares at B-03 to B-05, not a workbook
     input — the workbook sets how many claims land in each lane, this
     sets which ones. */
  const GREEN_FLOOR = 82;
  const AMBER_FLOOR = 55;
  const RING_FLOOR  = 0.35;   // fraud-graph ring score that forces RED
  const SURVEYOR_EXEMPTION = I.A11_surveyorLimit;

  const ENGINE_NAMES = {
    gate:   'Gate 00 · Capture integrity',
    doc:    'Engine 01 · Document AI, OCR and VAHAN',
    cv:     'Engine 02 · CV damage assessment',
    fraud:  'Engine 03 · Fraud and duplicate graph',
    repair: 'Engine 04 · Repair cost estimation',
    policy: 'Engine 05 · Policy validation, RAG'
  };

  const pct = v => Math.round(v * 1000) / 10;

  /* ---------- Gate 00 · Capture Integrity ----------
     Runs first, on the raw media, before anything expensive happens. */
  function runGate(c) {
    const g = c.gate;
    const checks = [
      { key: 'live',   label: 'Direct-from-camera capture',   ok: g.live,
        detail: g.live ? 'All frames carry a live-capture attestation from the SDK.'
                       : 'Gallery upload detected. The metadata forensics this gate depends on cannot be trusted.' },
      { key: 'exif',   label: 'EXIF intact and self-consistent', ok: g.exif,
        detail: g.exif ? 'Make, model, orientation and capture time agree across all frames.'
                       : 'EXIF block stripped or internally contradictory.' },
      { key: 'time',   label: 'Timestamp within the loss window', ok: g.time,
        detail: g.time ? 'Capture time falls after the reported time of loss and before FNOL.'
                       : 'Capture time falls outside the reported loss window.' },
      { key: 'gps',    label: 'GPS within tolerance of the loss location', ok: g.gps,
        detail: g.gps ? 'Capture coordinates fall inside the tolerance radius of the reported site.'
                      : 'Capture coordinates sit outside the tolerance radius of the reported site.' },
      { key: 'synth',  label: 'No diffusion or GAN artefact', ok: g.synth,
        detail: g.synth ? 'Frequency-domain screening found no generative artefact.'
                        : 'Generative artefact signature detected in at least one frame.' },
      { key: 'recap',  label: 'Not a re-capture of a screen', ok: g.recap,
        detail: g.recap ? 'No moire, no screen-edge geometry, no display refresh banding.'
                        : 'Screen re-capture signature present.' }
    ];
    const passed = checks.filter(x => x.ok).length;
    const score = (passed / checks.length) * 100;
    /* Live capture and synthetic screening are the two the whole design
       rests on — failing either is a hard fail, not a deduction. */
    const hardFail = !g.live || !g.synth || !g.recap;
    return { key: 'gate', name: ENGINE_NAMES.gate, checks, score, passed,
             total: checks.length, hardFail,
             headline: hardFail ? 'HARD FAIL' : passed === checks.length ? 'CLEAN' : 'FLAGGED' };
  }

  /* ---------- Engine 01 · Document AI + OCR / VAHAN ---------- */
  function runDoc(c) {
    const d = c.doc;
    const checks = [
      { label: 'Registration matches VAHAN',    ok: d.vahan,   detail: d.vahan ? `Plate ${c.vehicle.reg} resolves to the insured vehicle on VAHAN.` : `Plate ${c.vehicle.reg} does not resolve cleanly on VAHAN.` },
      { label: 'Chassis / VIN legible and matched', ok: d.vin,  detail: d.vin ? 'VIN read from the chassis plate matches the policy record.' : 'VIN could not be read at sufficient confidence.' },
      { label: 'Odometer captured',             ok: d.odo,     detail: d.odo ? `Odometer read at ${CP.fmt.n(d.odoKm)} km.` : 'Odometer frame missing or unreadable.' },
      { label: 'FIR / police record where required', ok: d.fir, detail: d.fir ? 'Not required for this cause of loss, or supplied and parsed.' : 'Required for this cause of loss and not yet supplied.' },
      { label: 'Driving licence valid at loss', ok: d.dl,      detail: d.dl ? 'Licence class covers the vehicle and was valid on the date of loss.' : 'Licence class or validity could not be confirmed.' }
    ];
    const passed = checks.filter(x => x.ok).length;
    return { key: 'doc', name: ENGINE_NAMES.doc, checks, passed, total: checks.length,
             score: (passed / checks.length) * 100, ocrConfidence: d.confidence,
             headline: passed === checks.length ? 'CLEAN' : `${checks.length - passed} OPEN` };
  }

  /* ---------- Engine 02 · CV damage assessment ---------- */
  function runCV(c) {
    const parts = c.cv.parts;
    const partsTotal = parts.reduce((s, p) => s + p.cost, 0);
    const avgConf = parts.reduce((s, p) => s + p.conf, 0) / parts.length;
    /* The consistency test is the one that matters: does the damage
       pattern match the cause of loss the claimant reported? */
    const consistent = c.cv.consistent;
    const score = consistent ? avgConf * 100 : Math.min(avgConf * 100, 40);
    return { key: 'cv', name: ENGINE_NAMES.cv, parts, partsTotal, avgConf, consistent,
             score, fail: !consistent,
             headline: consistent ? `${parts.length} PANELS` : 'PATTERN MISMATCH',
             detail: consistent
               ? `Damage across ${parts.length} panels is consistent with a ${c.cause.toLowerCase()}.`
               : `Damage pattern is not consistent with the reported cause of loss (${c.cause.toLowerCase()}).` };
  }

  /* ---------- Engine 03 · Fraud + duplicate graph ---------- */
  function runFraud(c) {
    const f = c.fraud;
    const ring = f.ringScore;
    const signals = [
      { label: 'Claimant seen in a prior claim ring', ok: !f.priorRing,
        detail: f.priorRing ? `Claimant shares ${f.sharedNodes} nodes with a known ring.` : 'No overlap with any flagged network.' },
      { label: 'Garage not over-represented',         ok: !f.garageFlag,
        detail: f.garageFlag ? `Garage ${c.garage.code} appears in ${f.garageClaims} claims in 30 days, against a network median of 4.` : `Garage ${c.garage.code} sits inside normal volume.` },
      { label: 'No duplicate media hash',             ok: !f.dupHash,
        detail: f.dupHash ? 'A perceptual hash of the damage frame matches media on an earlier claim.' : 'No perceptual-hash collision against the media store.' },
      { label: 'Loss date not clustered with policy inception', ok: !f.earlyClaim,
        detail: f.earlyClaim ? `Loss reported ${f.daysSinceInception} days after inception.` : 'Loss falls well clear of policy inception.' }
    ];
    const clean = signals.filter(x => x.ok).length;
    const score = (clean / signals.length) * 100 * (1 - Math.min(ring, 1) * 0.5);
    return { key: 'fraud', name: ENGINE_NAMES.fraud, signals, ring, clean,
             total: signals.length, score, ringFail: ring >= RING_FLOOR,
             headline: ring >= RING_FLOOR ? 'RING FLAG' : clean === signals.length ? 'CLEAN' : `${signals.length - clean} SIGNAL` };
  }

  /* ---------- Engine 04 · Repair cost estimation ----------
     Returns an indicative band at first notification instead of after a
     physical inspection. That is the mechanism behind W-73: garage
     estimate-to-approval falls from four days to one. */
  function runRepair(c, cv) {
    const r = c.repair;
    const band = r.band;
    const over = r.garageEstimate > band[1];
    const variance = ((r.garageEstimate - band[1]) / band[1]) * 100;
    return { key: 'repair', name: ENGINE_NAMES.repair, band,
             garageEstimate: r.garageEstimate, cvTotal: cv.partsTotal, over, variance,
             headline: over ? 'ABOVE BAND' : 'IN BAND',
             detail: over
               ? `Garage estimate is ${CP.fmt.n(Math.abs(Math.round(variance)))}% above the top of the indicative band. The excess is disallowed, not the claim.`
               : 'Garage estimate falls inside the indicative band returned at first notification.' };
  }

  /* ---------- Engine 05 · Policy validation, RAG ---------- */
  function runPolicy(c) {
    const clauses = c.policy.clauses;
    const bad = clauses.filter(x => x.status === 'EXCLUDED').length;
    const score = bad ? 20 : 100;
    return { key: 'policy', name: ENGINE_NAMES.policy, clauses, bad,
             score, fail: bad > 0,
             headline: bad ? 'EXCLUSION' : 'COVERED',
             detail: bad ? 'At least one clause excludes this loss.'
                         : 'Cover, add-ons and the depreciation schedule all resolve against the actual wording.' };
  }

  /* ---------- Settlement arithmetic ---------- */
  function settle(c, cv, repair, pol) {
    const zeroDep = c.policy.zeroDep;
    const depRate = zeroDep ? 0 : c.policy.depRate;
    const assessedBase = Math.min(repair.garageEstimate, repair.band[1]);
    const disallowed   = Math.max(0, repair.garageEstimate - assessedBase);
    const labour       = Math.round(assessedBase * 0.18);
    const parts        = assessedBase - labour;
    const depreciation = Math.round(parts * depRate);
    const deductible   = c.policy.deductible;
    const payable      = Math.max(0, assessedBase - depreciation - deductible);
    return { assessedBase, disallowed, labour, parts, depreciation, deductible,
             payable, zeroDep, depRate };
  }

  /* ---------- Trust Score fusion ---------- */
  function fuse(gate, doc, cv, fraud, pol) {
    const parts = [
      { key: 'gate',   label: ENGINE_NAMES.gate,   raw: gate.score,  w: WEIGHTS.gate },
      { key: 'doc',    label: ENGINE_NAMES.doc,    raw: doc.score,   w: WEIGHTS.doc },
      { key: 'cv',     label: ENGINE_NAMES.cv,     raw: cv.score,    w: WEIGHTS.cv },
      { key: 'fraud',  label: ENGINE_NAMES.fraud,  raw: fraud.score, w: WEIGHTS.fraud },
      { key: 'policy', label: ENGINE_NAMES.policy, raw: pol.score,   w: WEIGHTS.policy }
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
      reasons.push({ hard: true, t: `HARD FAIL · Fraud-graph ring score is at or above the ${RING_FLOOR} threshold. The claim is clean; the network around it is not.` });
    } else if (score >= GREEN_FLOOR) {
      lane = 'G';
      reasons.push({ t: `Trust Score ${score} clears the green floor of ${GREEN_FLOOR}.` });
    } else if (score >= AMBER_FLOOR) {
      lane = 'A';
      reasons.push({ t: `Trust Score ${score} sits between the amber floor (${AMBER_FLOOR}) and the green floor (${GREEN_FLOOR}). Signals are inconclusive, not contradictory.` });
    } else {
      lane = 'R';
      reasons.push({ t: `Trust Score ${score} is below the amber floor of ${AMBER_FLOOR}.` });
    }

    let capped = false;
    if (lane === 'G' && amount > SURVEYOR_EXEMPTION) {
      lane = 'A'; capped = true;
      reasons.push({ cap: true, t: `CAPPED · ₹${CP.fmt.n(amount)} exceeds the IRDAI ₹${CP.fmt.n(SURVEYOR_EXEMPTION)} surveyor-exemption corridor. A registered surveyor is required, so this cannot auto-settle however clean it is.` });
    }
    if (flags.cvFail && lane !== 'R') {
      lane = 'R';
      reasons.push({ hard: true, t: 'HARD FAIL · Damage pattern contradicts the reported cause of loss.' });
    }
    /* A repudiation is a decision with regulatory and customer
       consequences. The engine may find the exclusion; it may not issue
       the refusal. That is a person's signature, so the claim leaves the
       green lane whatever its score. */
    if (flags.policyFail && lane === 'G') {
      lane = 'A';
      reasons.push({ cap: true, t: 'ESCALATED · The wording excludes this loss. ClaimPulse does not auto-decline — a repudiation must be issued by a person, so this routes to assisted review.' });
    }
    return { lane, reasons, capped };
  }

  /* ---------- Surveyor deployment · W-70 to W-72 ---------- */
  function surveyor(lane, payable, capped) {
    const above = payable > SURVEYOR_EXEMPTION;
    const required = lane === 'R' || above;
    return { required, above, capped,
      basis: lane === 'R' ? 'Red lane — full investigation, surveyor and SIU custody pack'
           : above ? `Above the ₹${CP.fmt.n(SURVEYOR_EXEMPTION)} corridor — registered surveyor required by IRDAI`
                   : `Inside the ₹${CP.fmt.n(SURVEYOR_EXEMPTION)} corridor — no registered surveyor required` };
  }

  /* ---------- Claimant-facing timeline ---------- */
  const LANE_TAT = { G: I.B10_tatGreen, A: I.B11_tatAmber, R: I.B12_tatRed };
  const LANE_TOUCH = { G: I.B06_touchGreen, A: I.B07_touchAmber, R: I.B08_touchRed };
  const LANE_META = {
    G: { label: 'GREEN', name: 'Auto-settle',     cls: 'green' },
    A: { label: 'AMBER', name: 'Assisted review', cls: 'amber' },
    R: { label: 'RED',   name: 'Investigate',     cls: 'red'   }
  };

  function timeline(lane, ts) {
    const day = 864e5, tat = LANE_TAT[lane];
    const at = f => new Date(+ts + tat * day * f);
    const base = [
      { t: 'Claim registered',        at: new Date(+ts),   done: true },
      { t: 'Evidence verified at Gate 00', at: at(0.05),   done: true },
      { t: 'Engines scored, lane assigned', at: at(0.12),  done: true }
    ];
    if (lane === 'G') return base.concat([
      { t: 'Settlement computed',     at: at(0.5) },
      { t: 'Payment released',        at: at(1)   }
    ]);
    if (lane === 'A') return base.concat([
      { t: 'Assigned to a reviewer',  at: at(0.3) },
      { t: 'Surveyor report received', at: at(0.7) },
      { t: 'Settlement approved',     at: at(0.9) },
      { t: 'Payment released',        at: at(1)   }
    ]);
    return base.concat([
      { t: 'Referred to investigation', at: at(0.25) },
      { t: 'Surveyor and SIU review',   at: at(0.6)  },
      { t: 'Decision issued',           at: at(1)    }
    ]);
  }

  /* ---------- Full pipeline ---------- */
  function process(c) {
    const gate = runGate(c);                       // 1 · always first

    /* THE ORDERING IS THE CLAIM. A gate hard fail returns here, so
       nothing downstream is scored, nothing is inferred and no token is
       spent. The inspector shows the engines as NOT RUN rather than
       showing scores we would have had to compute to display. */
    if (gate.hardFail) {
      return {
        claim: c, gate, skipped: true,
        doc: null, cv: null, fraud: null, policy: null, repair: null,
        money: { payable: null, claimed: c.repair.garageEstimate },
        trust: { score: null, parts: [] },
        lane: 'R', laneMeta: LANE_META.R,
        reasons: [{ hard: true, t: 'HARD FAIL · Gate 00 rejected the evidence before any engine ran. No model was called and no tokens were spent.' }],
        capped: false,
        surveyor: surveyor('R', 0, false),
        tat: LANE_TAT.R, touches: LANE_TOUCH.R,
        touchesSaved: I.B02_touchesToday - LANE_TOUCH.R,
        daysSaved: I.B09_tatToday - LANE_TAT.R,
        modelCalls: 0,
        timeline: timeline('R', c.reportedAt)
      };
    }

    const doc  = runDoc(c);
    const cv   = runCV(c);
    const fr   = runFraud(c);
    const pol  = runPolicy(c);
    const rep  = runRepair(c, cv);
    const money = settle(c, cv, rep, pol);
    const trust = fuse(gate, doc, cv, fr, pol);
    const r = route(trust.score, {
      gateFail: false, ringFail: fr.ringFail, cvFail: cv.fail, policyFail: pol.fail
    }, money.payable);
    const sv = surveyor(r.lane, money.payable, r.capped);

    /* The green lane clears on deterministic checks and specialised ML.
       GenAI is called only where the claim did not resolve — which is
       the whole cost argument. */
    const modelCalls = r.lane === 'G' ? 0 : 1;

    return {
      claim: c, gate, doc, cv, fraud: fr, policy: pol, repair: rep, skipped: false,
      money, trust, lane: r.lane, laneMeta: LANE_META[r.lane],
      reasons: r.reasons, capped: r.capped, surveyor: sv,
      tat: LANE_TAT[r.lane], touches: LANE_TOUCH[r.lane],
      touchesSaved: I.B02_touchesToday - LANE_TOUCH[r.lane],
      daysSaved: I.B09_tatToday - LANE_TAT[r.lane],
      modelCalls,
      timeline: timeline(r.lane, c.reportedAt)
    };
  }

  return { WEIGHTS, GREEN_FLOOR, AMBER_FLOOR, RING_FLOOR, SURVEYOR_EXEMPTION,
           ENGINE_NAMES, LANE_META, LANE_TAT, LANE_TOUCH, process, pct };
})();
