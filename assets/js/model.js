/* =====================================================================
   ClaimPulse · The Model  (R6)
   ---------------------------------------------------------------------
   A faithful re-implementation of ClaimPulse_Investor_Dashboard_R6.xlsx
   Sheet 1 (inputs), Sheet 3 (Workings) and Sheet 4 (Forecast).

   THE WORKBOOK IS THE SOURCE OF TRUTH. Every function carries the Excel
   ref (W-nn / FS-nn) it reproduces. CPModel.selfCheck() asserts the
   outputs against the workbook's own computed values — if this drifts
   from the Excel, the check fails loudly and the UI says so.

   WHAT CHANGED IN R6 — read this before touching any benefit line:
     · W-18 labour saving is ZERO and stays zero. Headcount is not cut,
       so no labour cost leaves the P&L.
     · W-22a books the released capacity as redeployed OUTPUT, at the
       B-29 realisation rate. It sits OUTSIDE both ratios.
     · W-23a is marketing INVESTMENT — a cost, not a benefit. It is the
       same rupees the Hunt & Farm plan proposes spending.
   Anything quoting Rs 43.31 Cr is pre-R6 and is wrong.

   INPUTS below is the only place a number is typed.
   ===================================================================== */

const CPModel = (() => {

  /* ---------------------------------------------------------------
     SHEET 1 · every input, with its ref, tier and source
     --------------------------------------------------------------- */
  const INPUTS = {
    /* Table A — filed and external */
    A01_gdpiMotorOD:      3317.3,      // Rs Cr   TIER 1 FILED
    A02_nepRatio:         0.4988,      // ratio   TIER 1 FILED
    A03_claimsRatio:      0.746,       // ratio   TIER 1 FILED
    A04_groupCombined:    1.023,       // ratio   TIER 1 FILED
    A05_gdpiTotal:        20461,       // Rs Cr   TIER 1 FILED
    A06_growth:           0.087,       // ratio   TIER 2
    A07_salaryInflation:  0.069,       // ratio   TIER 1
    A08_fx:               95.3,        // Rs/USD  Market
    A09_wacc:             0.12,        // ratio   Standard
    A10_indiaUplift:      1.314,       // x       TIER 2
    A11_surveyorLimit:    50000,       // Rs      TIER 1

    /* Table B — operating */
    B01_avgClaim:         45000,       // Rs        TIER 4
    B02_touchesToday:     7,           // touches   TIER 4
    B03_green:            0.65,        // ratio     TIER 2
    B04_amber:            0.25,        // ratio     TIER 4
    B05_red:              0.10,        // ratio     TIER 4
    B06_touchGreen:       0.2,         // touches   TIER 4
    B07_touchAmber:       2,           // touches   TIER 4
    B08_touchRed:         6,           // touches   TIER 4
    B09_tatToday:         9.8,         // days      TIER 2
    B10_tatGreen:         1.5,         // days      TIER 4
    B11_tatAmber:         3.5,         // days      TIER 4
    B12_tatRed:           7,           // days      TIER 4
    B13_detToday:         0.62,        // ratio     TIER 4
    B14_detTarget:        0.90,        // ratio     TARGET
    B15_gateShare:        0.10,        // pp        TIER 4
    B16_graphShare:       0.18,        // pp        TIER 4
    B17_leakage:          0.0315,      // ratio     TIER 2 PROXY
    B18_synthIncidence:   0.01,        // ratio     TIER 4
    B19_gateDetection:    0.85,        // ratio     TIER 4
    B20_friction:         0.08,        // ratio     TIER 4
    B22_renewalUplift:    0.05,        // pp        TIER 4
    B23_retainedValue:    0.10,        // ratio     TIER 4
    B24_realisationY1:    0.45,        // ratio     Plan
    B25_realisationY2:    0.92,        // ratio     Plan
    B26_realisationY3:    1.00,        // ratio     Plan
    B27_buildMonths:      10,          // months    Plan
    B28_riskHaircut:      0.2375,      // ratio     TIER 4
    B28_baselineTouchCost:250,         // Rs        TIER 4

    /* Table Z — the R6 additions */
    B29_redeployRealisation: 0.70,     // ratio     TIER 4  ← largest Tier 4 input in the model
    B30_includeCommission:   'NO',     // YES / NO  Decision
    B31_premiumBasis:        'TEAM',   // TEAM / GICOUNCIL
    B31a_premiumGICouncil:   3410,     // Rs        TIER 2
    B31b_premiumTeam:        7000,     // Rs        TIER 4
    B32_commissionPolicies:  129934,   // policies  TIER 4

    /* Table C — the three plans */
    C01_rollout:   { conservative: 0.2, base: 0.6, aggressive: 1.0 },
    C02_touchCost: { conservative: 300, base: 250, aggressive: 200 },

    /* Table D — build, USD benchmarks (x A-10 uplift x A-08 FX) */
    D_usd: [
      { ref:'D-01', name:'Document AI, OCR and field extraction',        usd: 35000,  phase:'P1' },
      { ref:'D-02', name:'Policy validation, RAG on actual wording',     usd: 25000,  phase:'P1' },
      { ref:'D-03', name:'EXIF and metadata forensics engine',           usd: 25000,  phase:'P1', gate:true },
      { ref:'D-04', name:'Synthetic and tampered image screening',       usd: 50000,  phase:'P2', gate:true },
      { ref:'D-05', name:'Guided live-capture SDK, gallery disabled',    usd: 30000,  phase:'P1', gate:true },
      { ref:'D-06', name:'CV damage assessment, 360 video and depth',    usd: 80000,  phase:'P2' },
      { ref:'D-07', name:'Repair cost estimation engine',                usd: 40000,  phase:'P2' },
      { ref:'D-08', name:'Fraud and duplicate graph engine',             usd: 80000,  phase:'P3' },
      { ref:'D-09', name:'Trust Score orchestration core',               usd: 150000, phase:'P4' },
      { ref:'D-10', name:'Production hardening',                         usd: 60000,  phase:'P4', gov:true },
      { ref:'D-11', name:'Claimant, surveyor and garage consoles',       usd: 35000,  phase:'P4' },
      { ref:'D-12', name:'Systems integration',                          usd: 80000,  phase:'Cross' }
    ],
    /* Table D — build, direct rupee lines */
    D_inr: [
      { ref:'D-13', name:'Training data: labelled damage and synthetic set', inr: 6000000, phase:'P2', gate:true },
      { ref:'D-14', name:'Model QC and UAT window',                          inr: 4000000, phase:'Cross' },
      { ref:'D-15', name:'Security, DPDP and SOC2 setup',                    inr: 2500000, phase:'Cross', gov:true }
    ],

    /* Table E — run cost */
    E01_gpuHoursPerClaim: 0.133333,
    E02_gpuPeak:          2.5,
    E03_gpuSafety:        1.2,
    E04_gpuRateUSD:       3,
    E05_storageUSD:       0.05,
    E06_storageReplication: 2.6,
    E07_mlopsUSDMonth:    7000,
    E08_opsINRMonth:      536667,
    E09_secINRMonth:      208333,
    E10_legalINRMonth:    100000,

    /* Table F — downside */
    F01_inHouseTouchCost: 83,
    F02_detDownside:      0.82,

    /* Table J — stakeholder */
    J01_minutesPerTouch:  20,
    J02_hoursPerFTE:      1800,
    J03_surveyToday:      0.55,
    J04_surveyAfter:      0.10,
    J06_garageToday:      4,
    J07_garageAfter:      1,

    /* MARKETTING sheet — the Hunt & Farm plan, built up */
    MKT: {
      dealerOutlets: 9300, garageOutlets: 6500,
      coverShowroom: 0.50, coverUsedCar: 0.30, coverGarage: 0.20,
      kitShowroom: 5200, kitUsedCar: 12000, kitGarage: 2000,
      digital: [
        { name:'Policybazaar sponsored placement', qty: 20,      rate: 50000   },
        { name:'LinkedIn employee advocacy',       qty: 150,     rate: 8445.25 },
        { name:'Google Search, cost per click',    qty: 400000,  rate: 40      },
        { name:'Google Search, SEN agents',        qty: 50,      rate: 38000   },
        { name:'Renewal campaign, WhatsApp',       qty: 700000,  rate: 0.35    },
        { name:'Renewal campaign, SMS',            qty: 200000,  rate: 0.1     },
        { name:'Renewal campaign, DLT header',     qty: 11,      rate: 590     },
        { name:'WhatsApp policy assistant',        qty: 5000000, rate: 0.35    },
        { name:'WhatsApp assistant, DLT infra',    qty: 1000,    rate: 590     },
        { name:'Refer & Earn fuel voucher',        qty: 3000,    rate: 400     },
        { name:'Family garage protection',         qty: 4000,    rate: 0.1     },
        { name:'No Claim Jackpot prize pool',      qty: 4,       rate: 200000  },
        { name:'Loyalty ladder, Gold RSA',         qty: 5000,    rate: 300     },
        { name:'Car expo, shell-scheme stall',     qty: 4,       rate: 90000   },
        { name:'Car expo, touchscreen kiosk',      qty: 12,      rate: 20000   },
        { name:'Car expo, 55" LED display',        qty: 12,      rate: 11500   }
      ],
      commissionRate: 0.22
    },

    /* Scales the whole Hunt & Farm plan up or down as one lever, so the
       stress test can ask "what if we spend half of it" without the
       channel-by-channel table. 1.0 = the plan exactly as costed. */
    MKT_SCALE: 1
  };

  /* B-21 · average premium resolves off the B-31 basis switch */
  function premium(I) {
    return I.B31_premiumBasis === 'GICOUNCIL' ? I.B31a_premiumGICouncil : I.B31b_premiumTeam;
  }

  /* ---------------------------------------------------------------
     MARKETTING · the plan total, in rupees.  Sheet MARKETTING E51.
     Commission is gated by B-30 and excluded by default: Hunt & Farm
     s.2 treats panel commission as a pre-existing network cost, not
     incremental marketing spend.
     --------------------------------------------------------------- */
  function marketing(I) {
    const M = I.MKT;
    const kit =
      M.coverShowroom * M.dealerOutlets * M.kitShowroom +
      M.coverUsedCar  * M.dealerOutlets * M.kitUsedCar  +
      M.coverGarage   * M.garageOutlets * M.kitGarage;
    const digital = M.digital.reduce((s, d) => s + d.qty * d.rate, 0);
    const commission = I.B30_includeCommission === 'YES'
      ? premium(I) * M.commissionRate * I.B32_commissionPolicies
      : 0;
    const scale = (I.MKT_SCALE === undefined ? 1 : I.MKT_SCALE);
    const totalRs = (kit + digital + commission) * scale;
    return { kit: kit * scale, digital: digital * scale, commission: commission * scale,
             scale, totalRs, totalCr: totalRs / 1e7 };
  }

  /* ---------------------------------------------------------------
     BUILD COST · Sheet 3 Part D.  Identical in all three plans.
     --------------------------------------------------------------- */
  function build(I) {
    const lines = I.D_usd.map(d => ({
      ...d, cr: d.usd * I.A10_indiaUplift * I.A08_fx / 1e7
    })).concat(I.D_inr.map(d => ({ ...d, cr: d.inr / 1e7 })));
    const total = lines.reduce((s, l) => s + l.cr, 0);
    const gate  = lines.filter(l => l.gate).reduce((s, l) => s + l.cr, 0);
    const gov   = lines.filter(l => l.gov ).reduce((s, l) => s + l.cr, 0);
    return { lines, total, gate, gov, defensibilityShare: (gate + gov) / total };
  }

  /* ---------------------------------------------------------------
     THE ENGINE · one plan, start to finish
     --------------------------------------------------------------- */
  function run(plan = 'base', overrides = {}) {
    const I = Object.assign({}, INPUTS, overrides);
    const rollout   = (overrides.rollout   !== undefined) ? overrides.rollout   : I.C01_rollout[plan];
    const touchCost = (overrides.touchCost !== undefined) ? overrides.touchCost : I.C02_touchCost[plan];
    const prem = premium(I);

    /* ---- PART A · filed premium to claims in scope ---- */
    const nep        = I.A01_gdpiMotorOD * I.A02_nepRatio;              // W-02
    const pool       = nep * I.A03_claimsRatio;                          // W-03
    const residual   = pool * (1 - I.A03_claimsRatio);                   // W-03a  NOT underwriting profit
    const claimsFull = pool * 1e7 / I.B01_avgClaim;                      // W-05
    const claims     = claimsFull * rollout;                             // W-07
    const claimsValue= pool * rollout;                                   // W-09

    /* ---- PART B · lanes, touches, TAT ---- */
    const green = I.B03_green, amber = I.B04_amber, red = I.B05_red;
    const touchesAfter = green*I.B06_touchGreen + amber*I.B07_touchAmber + red*I.B08_touchRed;  // W-10
    const touchesSaved = I.B02_touchesToday - touchesAfter;                                      // W-11
    const tatPlatform  = green*I.B10_tatGreen + amber*I.B11_tatAmber + red*I.B12_tatRed;         // W-12
    const tatFriction  = (green - I.B20_friction)*I.B10_tatGreen
                       + (amber + I.B20_friction)*I.B11_tatAmber
                       + red*I.B12_tatRed;                                                       // W-14
    const tatBlended   = rollout*tatFriction + (1-rollout)*I.B09_tatToday;                        // W-15
    const tatCut       = I.B09_tatToday - tatBlended;                                             // W-16
    const tatCutPct    = tatCut / I.B09_tatToday;                                                 // W-17

    /* ---- PART C · the benefit lines ---- */
    // Detection lift applies to the UNDETECTED share: 62% -> 90% cuts
    // undetected from 38% to 10%, a 73.7% reduction in residual leakage.
    const lift = 1 - (1 - I.B14_detTarget) / (1 - I.B13_detToday);
    const fraudPool  = claimsValue * I.B17_leakage * lift;
    const shareSum   = I.B15_gateShare + I.B16_graphShare;

    const labour     = 0;                                                                  // W-18 NOT CLAIMED
    const fraudGraph = fraudPool * (I.B16_graphShare / shareSum);                          // W-19
    const fraudGate  = fraudPool * (I.B15_gateShare / shareSum);                           // W-20
    const synthetic  = claimsValue * I.B18_synthIncidence * I.B19_gateDetection;           // W-21
    const renewal    = claims * prem * I.B22_renewalUplift * I.B23_retainedValue / 1e7;    // W-22
    const frictionCost = -claims * I.B20_friction * (I.B07_touchAmber - I.B06_touchGreen)
                         * touchCost / 1e7;                                                // W-23

    const touchesAvoided = claims * touchesSaved;                                          // W-66
    const capacity   = touchesAvoided * touchCost * I.B29_redeployRealisation / 1e7;        // W-22a
    const mkt        = marketing(I);
    const marketingCost = -mkt.totalCr * rollout;                                           // W-23a

    const gross = labour + fraudGraph + fraudGate + synthetic + renewal
                + frictionCost + capacity + marketingCost;                                  // W-24

    /* ---- PART D + E · build and run cost ---- */
    const b = build(I);
    const gpu     = claims * I.E01_gpuHoursPerClaim * I.E02_gpuPeak * I.E03_gpuSafety
                  * I.E04_gpuRateUSD * I.A08_fx / 1e7;                                      // W-26
    const storage = claims * I.E05_storageUSD * I.A08_fx * I.E06_storageReplication / 1e7;  // W-27
    const mlops   = I.E07_mlopsUSDMonth * I.A08_fx * 12 / 1e7;                              // W-28
    const opsTeam = I.E08_opsINRMonth * 12 / 1e7;                                           // W-29
    const security= I.E09_secINRMonth * 12 / 1e7;                                           // W-30
    const legal   = I.E10_legalINRMonth * 12 / 1e7;                                         // W-31
    const runCost = gpu + storage + mlops + opsTeam + security + legal;                     // W-32
    const runVariable = gpu + storage, runFixed = mlops + opsTeam + security + legal;

    /* ---- PART F · net ---- */
    const net        = gross - runCost;                                                     // W-35
    const netMonthly = net / 12;                                                            // W-36
    const payback    = netMonthly > 0 ? b.total / netMonthly : null;                         // W-38

    /* ---- PART G · the P&L bridge ---- */
    const perPP        = nep * 0.01;                                                        // W-40
    const lossRatioPP  = (fraudGraph + fraudGate + synthetic) / perPP;                       // W-41
    // W-42 EXCLUDES capacity deliberately: headcount is not reduced, so
    // claims-handling OPEX does not fall. Crediting it adds ~1.0 pp.
    const expenseRatioPP = (labour + frictionCost - runCost) / perPP;                         // W-42
    const combinedPP   = lossRatioPP + expenseRatioPP;                                        // W-43
    const groupNEP     = I.A05_gdpiTotal * I.A02_nepRatio;                                    // W-44
    const groupPerPP   = groupNEP * 0.01;                                                     // W-45
    const groupCombinedPP = (fraudGraph + fraudGate + synthetic + labour + frictionCost - runCost) / groupPerPP; // W-46

    /* ---- PART I · who books what ---- */
    const stakeClaimsOps    = labour + frictionCost + capacity;                               // W-56
    const stakeUnderwriting = fraudGraph + fraudGate + synthetic;                             // W-57
    const stakeBFDL         = renewal + marketingCost;                                        // W-58
    const stakeRunCost      = -runCost;                                                       // W-59
    const splitCheck        = stakeClaimsOps + stakeUnderwriting + stakeBFDL + stakeRunCost - net; // W-60

    const tatSavedPerClaim = I.B09_tatToday - tatFriction;                                    // W-61
    const claimantDays     = claims * tatSavedPerClaim;                                        // W-62
    const autoSettled      = claims * green;                                                   // W-63
    const humanReviewed    = claims - autoSettled;                                             // W-64
    const hoursReleased    = touchesAvoided * I.J01_minutesPerTouch / 60;                      // W-67
    const fteReleased      = hoursReleased / I.J02_hoursPerFTE;                                // W-68
    const throughput       = I.B02_touchesToday / touchesAfter;                                // W-69
    const surveyToday      = claims * I.J03_surveyToday;                                       // W-70
    const surveyAfter      = claims * I.J04_surveyAfter;                                       // W-71
    const visitsAvoided    = surveyToday - surveyAfter;                                        // W-72
    const garageDaysSaved  = I.J06_garageToday - I.J07_garageAfter;                            // W-73

    /* ---- SHEET 4 · forecast ---- */
    const cf1 = gross * I.B24_realisationY1 - runCost;
    const cf2 = (gross * I.B25_realisationY2 - runCost) * (1 + I.A06_growth);
    const cf3 = (gross * I.B26_realisationY3 - runCost) * Math.pow(1 + I.A06_growth, 2);
    const threeYear = cf1 + cf2 + cf3;                                                         // FS-02
    const threeYearRiskAdj = [cf1, cf2, cf3]
      .reduce((s, c) => s + (c > 0 ? c * (1 - I.B28_riskHaircut) : c), 0);                     // FS-03
    const d = 1 + I.A09_wacc;
    const npv3 = -b.total + cf1/d + cf2/(d*d) + cf3/(d*d*d);                                    // FS-04

    /* FS-05 · payback from kickoff, including the build window */
    let paybackKickoff = null;
    if (cf1 >= b.total)                     paybackKickoff = I.B27_buildMonths + b.total / (cf1/12);
    else if (cf1 + cf2 >= b.total)          paybackKickoff = I.B27_buildMonths + 12 + (b.total - cf1) / (cf2/12);
    else if (cf1 + cf2 + cf3 >= b.total)    paybackKickoff = I.B27_buildMonths + 24 + (b.total - cf1 - cf2) / (cf3/12);

    return {
      plan, rollout, touchCost, premium: prem,
      /* Part A/B */
      nep, pool, residual, claimsFull, claims, claimsValue,
      claimsMonthly: claims/12,
      touchesAfter, touchesSaved, tatPlatform, tatFriction, tatBlended, tatCut, tatCutPct,
      tatToday: I.B09_tatToday,
      /* Part C */
      lines: {
        labour, fraudGraph, fraudGate, synthetic, renewal,
        frictionCost, capacity, marketingCost
      },
      gross, detectionLift: lift,
      /* Part D/E/F */
      build: b, buildTotal: b.total,
      gpu, storage, mlops, opsTeam, security, legal,
      runCost, runVariable, runFixed,
      net, netMonthly, payback,
      /* Part G */
      perPP, lossRatioPP, expenseRatioPP, combinedPP,
      groupNEP, groupCombinedPP,
      /* Part I */
      stake: { claimsOps: stakeClaimsOps, underwriting: stakeUnderwriting,
               bfdl: stakeBFDL, runCost: stakeRunCost, check: splitCheck },
      tatSavedPerClaim, claimantDays, autoSettled, humanReviewed,
      touchesAvoided, hoursReleased, fteReleased, throughput,
      surveyToday, surveyAfter, visitsAvoided, garageDaysSaved,
      /* Sheet 4 */
      cf1, cf2, cf3, threeYear, threeYearRiskAdj, npv3, paybackKickoff,
      /* marketing detail */
      marketing: mkt
    };
  }

  /* ---------------------------------------------------------------
     PART K / K2 · claim frequency reconciliation, both premium bases
     --------------------------------------------------------------- */
  function frequency(basisPremium) {
    const I = INPUTS;
    const policies = I.A01_gdpiMotorOD * 1e7 / basisPremium;
    const claims   = (I.A01_gdpiMotorOD * I.A02_nepRatio * I.A03_claimsRatio) * 1e7 / I.B01_avgClaim;
    const freq     = claims / policies;
    return { premium: basisPremium, policies, claims, freq,
             inBand: freq >= 0.05 && freq <= 0.15 };
  }

  /* ---------------------------------------------------------------
     SELF-CHECK · against the workbook's own computed values.
     Every figure below was read out of R6 after Excel recalculated it.
     --------------------------------------------------------------- */
  const GOLDEN = {
    conservative: { gross: 12.685633842675127, run: 2.5098821779084224, net: 10.175751664766704,
                    payback: 11.663574496510778, combinedPP: 0.30711302540239693,
                    npv3: 9.461831789726391, paybackKickoff: 30.064130620070635,
                    capacity: 6.647565278704751, marketing: -1.74553355, fte: 58.62050510321647 },
    base:         { gross: 34.851619680964845, run: 3.9006065337252656, net: 30.95101314723958,
                    payback: 3.8346285155639634, combinedPP: 1.1478218500267996,
                    npv3: 51.064611223227246, paybackKickoff: 20.072939142864193,
                    capacity: 16.618913196761863, marketing: -5.23660065, fte: 175.86151530964938 },
    aggressive:   { gross: 52.74389638984052, run: 5.29133088954211, net: 47.45256550029841,
                    payback: 2.5011426958412533, combinedPP: 1.9980794746512016,
                    npv3: 83.94890028653336, paybackKickoff: 16.43512003755401,
                    capacity: 22.158550929015835, marketing: -8.72766775, fte: 293.1025255160823 },
    buildTotal: 9.890469800000002,
    marketingTotalCr: 8.72766775
  };

  function selfCheck() {
    const out = [];
    const eq = (name, got, want, tol = 1e-6) => {
      const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
      out.push({ name, got, want, ok });
    };
    ['conservative', 'base', 'aggressive'].forEach(p => {
      const r = run(p), g = GOLDEN[p];
      eq(`${p} · gross annual benefit (W-24)`,   r.gross,           g.gross);
      eq(`${p} · annual run cost (W-32)`,        r.runCost,         g.run);
      eq(`${p} · net annual benefit (W-35)`,     r.net,             g.net);
      eq(`${p} · payback, steady state (W-38)`,  r.payback,         g.payback);
      eq(`${p} · combined ratio, Motor OD (W-43)`, r.combinedPP,    g.combinedPP);
      eq(`${p} · capacity redeployed (W-22a)`,   r.lines.capacity,  g.capacity);
      eq(`${p} · marketing investment (W-23a)`,  r.lines.marketingCost, g.marketing);
      eq(`${p} · FTE capacity released (W-68)`,  r.fteReleased,     g.fte);
      eq(`${p} · 3-year NPV at 12% (FS-04)`,     r.npv3,            g.npv3);
      eq(`${p} · payback from kickoff (FS-05)`,  r.paybackKickoff,  g.paybackKickoff);
      eq(`${p} · stakeholder split check (W-60)`, r.stake.check,    0, 1e-9);
    });
    eq('build cost, one-off (W-25)',    build(INPUTS).total,       GOLDEN.buildTotal);
    eq('marketing plan total (E51)',    marketing(INPUTS).totalCr, GOLDEN.marketingTotalCr);
    return { checks: out, passed: out.filter(c => c.ok).length, total: out.length,
             allPass: out.every(c => c.ok) };
  }

  return { INPUTS, GOLDEN, run, build, marketing, premium, frequency, selfCheck };
})();

if (typeof module !== 'undefined') module.exports = CPModel;
