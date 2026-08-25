/* =====================================================================
   ClaimPulse · The Model
   ---------------------------------------------------------------------
   A faithful re-implementation of SaiMahimaK_Finsighters_NMIMS_PS6_BFDL_
   InvestorDashboard.xlsx — Sheet 1 (inputs) and Sheet 3 (Workings).

   THE WORKBOOK IS THE SOURCE OF TRUTH. Every function below carries the
   Excel ref (W-nn) it reproduces. CPModel.selfCheck() asserts the
   outputs against the workbook's own computed values — if a formula here
   ever drifts from the Excel, the check fails loudly.

   Sheet 1 contains every input. Sheets 2-6 contain no typed numbers.
   Same discipline holds here: INPUTS below is the only place a number
   is typed.
   ===================================================================== */

const CPModel = (() => {

  /* ================= SHEET 1 · ASSUMPTIONS AND SOURCES ================= */
  const INPUTS = {
    /* --- Table A · filed and external data --- */
    A01_gdpiMotorOD:      3317.3,     // Rs Cr, GI Council filings FY2025-26   TIER 1 FILED
    A02_nepRatio:         0.4988,     // NEP / GDPI, Bajaj General FY2026      TIER 1 FILED
    A03_netIncClaims:     0.746,      // net incurred claims ratio, IRDAI      TIER 1 FILED
    A05_gdpiTotal:        20461,      // Rs Cr, Bajaj total GDPI               TIER 1 FILED
    A06_growth:           0.087,      // Motor OD market growth p.a.           TIER 2
    A08_fx:               95.3,       // Rs / USD spot, Aug 2026
    A09_wacc:             0.12,       // discount rate
    A11_surveyorExempt:   50000,      // Rs, IRDAI Master Circular 2024        TIER 1

    /* --- Table B · operating assumptions --- */
    B01_avgClaim:         45000,      // Rs                                    TIER 4
    B02_touchesToday:     7,          // touches per claim                     TIER 4
    B03_greenShare:       0.65,       // ratio                                 TIER 2
    B04_amberShare:       0.25,       // ratio                                 TIER 4
    B05_redShare:         0.10,       // ratio                                 TIER 4
    B06_touchesGreen:     0.2,
    B07_touchesAmber:     2,
    B08_touchesRed:       6,
    B09_tatToday:         9.8,        // days                                  TIER 2
    B10_tatGreen:         1.5,
    B11_tatAmber:         3.5,
    B12_tatRed:           7,
    B13_fraudToday:       0.62,       // detection recall today                TIER 4
    B14_fraudTarget:      0.90,       // TARGET, not a capability
    B15_upliftGate:       0.10,       // pp of the 28pp uplift
    B16_upliftGraph:      0.18,       // pp of the 28pp uplift
    B17_leakage:          0.0315,     // share of claims value           TIER 2 PROXY
    B18_synthetic:        0.01,       // share of claims value                 TIER 4
    B19_gateDetection:    0.85,       // gate recall on synthetic media        TIER 4
    B20_friction:         0.08,       // green claims downgraded to amber      TIER 4
    B21_avgPremium:       7000,       // Rs per policy                         TIER 4
    B22_renewalUplift:    0.05,
    B23_retainedValue:    0.10,
    B24_realisationY1:    0.45,
    B25_realisationY2:    0.92,
    B26_realisationY3:    1.00,
    B27_buildMonths:      10,
    B28_baselineTouchCost: 250,       // Rs per touch TODAY. Fixed across plans.

    /* --- Table E · run cost inputs --- */
    E01_gpuHours:         0.133333,   // per claim
    E02_gpuPeak:          2.5,
    E03_gpuMargin:        1.2,
    E04_gpuRate:          3,          // USD / hour
    E05_storage:          0.05,       // USD per claim
    E06_replication:      2.6,
    E07_mlops:            7000,       // USD / month
    E08_opsTeam:          536667,     // Rs / month
    E09_security:         208333,     // Rs / month
    E10_legal:            100000,     // Rs / month

    /* --- Table I --- */
    I02_contingency:      0.15,

    /* --- Table J · stakeholder inputs --- */
    J01_minsPerTouch:     20,
    J02_hoursPerFTE:      1800,
    J03_surveyToday:      0.55,
    J04_surveyAfter:      0.10,
    J06_garageToday:      4,          // days estimate-to-approval
    J07_garageAfter:      1,

    /* --- Sheet 3 Part D · build cost, one-off, identical across plans ---
       Only the components the surfaces quote separately are broken out;
       the rest roll into the total. Part I derives W-74 to W-77 from
       these rather than restating them. */
    D03_exifForensics:    0.3130605,   // Capture Integrity Gate
    D04_syntheticScreen:  0.626121,    // Capture Integrity Gate — the moat
    D05_liveCaptureSDK:   0.3756726,   // Capture Integrity Gate
    D10_hardening:        0.7513452,   // audit trail, override, rollback, explainability
    D13_trainingData:     0.6,         // Capture Integrity Gate
    D15_securityDpdp:     0.25,        // DPDP and SOC2 setup
    W25_build:            9.890469800000002   // Rs Cr, fifteen costed components
  };

  /* --- Table C · the three plans. Only two levers differ. --- */
  const PLANS = {
    conservative: { label: 'Conservative', rollout: 0.20, costPerTouch: 300 },
    base:         { label: 'Base',         rollout: 0.60, costPerTouch: 250 },
    aggressive:   { label: 'Aggressive',   rollout: 1.00, costPerTouch: 200 }
  };

  const CR = 1e7;   // rupees in one crore

  /* =====================================================================
     THE ENGINE · Sheet 3 Workings, Parts A to G
     `o` is an override bag — anything in INPUTS or PLANS can be replaced,
     which is what the live challenge levers and the stress cases do.
     ===================================================================== */
  function run(planKey, o) {
    const i = Object.assign({}, INPUTS, o || {});
    const plan = Object.assign({}, PLANS[planKey] || PLANS.base, o || {});
    const rollout = plan.rollout;
    const cpt = plan.costPerTouch;

    /* ---- PART A · filed premium to claims in scope ---- */
    const W02_nep       = i.A01_gdpiMotorOD * i.A02_nepRatio;
    const W03_pool      = W02_nep * i.A03_netIncClaims;
    const W05_claimsAll = (W03_pool * CR) / i.B01_avgClaim;
    const W07_claims    = W05_claimsAll * rollout;
    const W09_value     = W03_pool * rollout;              // Rs Cr on platform

    /* ---- PART B · lane mix, touches, TAT ---- */
    const W10_touches = i.B03_greenShare * i.B06_touchesGreen
                      + i.B04_amberShare * i.B07_touchesAmber
                      + i.B05_redShare   * i.B08_touchesRed;
    const W11_removed = i.B02_touchesToday - W10_touches;
    const W12_tat     = i.B03_greenShare * i.B10_tatGreen
                      + i.B04_amberShare * i.B11_tatAmber
                      + i.B05_redShare   * i.B12_tatRed;
    // 8% of green claims fall to amber because live capture was not possible.
    const W14_tat     = W12_tat + i.B20_friction * (i.B11_tatAmber - i.B10_tatGreen);
    const W15_tatBook = rollout * W14_tat + (1 - rollout) * i.B09_tatToday;
    const W16_tatSaved = i.B09_tatToday - W15_tatBook;

    /* ---- PART C · the six annual benefit lines (Rs Cr) ---- */
    // W-18 Labour. Baseline runs at B-28; residual touches run at the plan rate.
    const W18_labour = W07_claims * (i.B02_touchesToday * i.B28_baselineTouchCost
                                     - W10_touches * cpt) / CR;

    // Fraud: leakage x reduction in the UNDETECTED share, split 18/28 : 10/28.
    const undetectedBefore = 1 - i.B13_fraudToday;
    const undetectedAfter  = 1 - i.B14_fraudTarget;
    const reduction  = (undetectedBefore - undetectedAfter) / undetectedBefore;
    const upliftTotal = i.B15_upliftGate + i.B16_upliftGraph;
    const fraudPool  = W09_value * i.B17_leakage * reduction;
    const W19_graph  = fraudPool * (i.B16_upliftGraph / upliftTotal);
    const W20_gate   = fraudPool * (i.B15_upliftGate  / upliftTotal);

    // W-21 Synthetic media. A NEW vector, additive to W-19 and W-20.
    const W21_synth  = W09_value * i.B18_synthetic * i.B19_gateDetection;

    // W-22 Renewal. Distribution income — sits OUTSIDE the combined ratio.
    const W22_renewal = W07_claims * i.B21_avgPremium * i.B22_renewalUplift
                        * i.B23_retainedValue / CR;

    // W-23 The cost of our own hard live-capture rule.
    const W23_friction = -(W07_claims * i.B20_friction
                          * (i.B07_touchesAmber - i.B06_touchesGreen) * cpt) / CR;

    const W24_gross = W18_labour + W19_graph + W20_gate + W21_synth
                      + W22_renewal + W23_friction;

    /* ---- PART E · annual run cost (Rs Cr) ---- */
    const W26_gpu     = W07_claims * i.E01_gpuHours * i.E02_gpuPeak * i.E03_gpuMargin
                        * i.E04_gpuRate * i.A08_fx / CR;
    const W27_storage = W07_claims * i.E05_storage * i.E06_replication * i.A08_fx / CR;
    const W28_mlops   = i.E07_mlops * i.A08_fx * 12 / CR;
    const W29_ops     = i.E08_opsTeam * 12 / CR;
    const W30_sec     = i.E09_security * 12 / CR;
    const W31_legal   = i.E10_legal * 12 / CR;
    const W32_run     = W26_gpu + W27_storage + W28_mlops + W29_ops + W30_sec + W31_legal;

    /* ---- PART F · net result ---- */
    const W35_net   = W24_gross - W32_run;
    const W37_build = i.W25_build;
    const W38_payback = W37_build / (W35_net / 12);   // steady-state basis

    /* ---- PART G · insurance P&L bridge ---- */
    const W40_perPP    = W02_nep / 100;
    const W41_loss     = (W19_graph + W20_gate + W21_synth) / W40_perPP;
    const W42_expense  = (W18_labour + W23_friction - W32_run) / W40_perPP;
    const W43_combined = W41_loss + W42_expense;
    const W44_nepGroup = i.A05_gdpiTotal * i.A02_nepRatio;
    const W46_group    = (W19_graph + W20_gate + W21_synth + W18_labour + W23_friction - W32_run)
                         / (W44_nepGroup / 100);

    /* ---- PART I · stakeholder value split ---- */
    const W61_daysSaved  = i.B09_tatToday - W14_tat;
    const W62_claimantDays = W07_claims * W61_daysSaved;
    const W63_zeroTouch  = W07_claims * i.B03_greenShare;
    const W66_touchesAvoided = W07_claims * W11_removed;
    const W67_hoursReleased  = W66_touchesAvoided * i.J01_minsPerTouch / 60;
    const W68_fte        = W67_hoursReleased / i.J02_hoursPerFTE;
    const W69_throughput = i.B02_touchesToday / W10_touches;
    const W70_surveyToday = W07_claims * i.J03_surveyToday;
    const W71_surveyAfter = W07_claims * i.J04_surveyAfter;
    const W72_surveyAvoided = W70_surveyToday - W71_surveyAfter;
    const W73_garageDays  = i.J06_garageToday - i.J07_garageAfter;
    const W78_downgraded  = W07_claims * i.B20_friction;
    const W56_opsValue    = W18_labour + W23_friction;
    const W57_uwValue     = W19_graph + W20_gate + W21_synth;

    // W-74 to W-77 · what defensibility costs. Roughly a third of the
    // build buys auditability rather than capability, and it is carried
    // as costed lines rather than asserted on a slide.
    const W74_governance = i.D10_hardening + i.D15_securityDpdp;
    const W75_gateBuild  = i.D03_exifForensics + i.D04_syntheticScreen
                         + i.D05_liveCaptureSDK + i.D13_trainingData;
    const W76_annualCompliance = W30_sec + W31_legal;
    const W77_governanceShare  = (W74_governance + W75_gateBuild) / i.W25_build;

    /* ---- PART J · break-even, labour only, ZERO fraud benefit ---- */
    // Baseline touches at which the labour line alone covers the full run cost.
    const W90_beTouches = (W32_run * CR / W07_claims + W10_touches * cpt) / i.B28_baselineTouchCost;
    const W92_beCost    = (W32_run * CR / W07_claims + W10_touches * cpt) / i.B02_touchesToday;
    // Rollout at which labour alone clears build plus one full year of run cost.
    const W94_beRollout = solveBreakEvenRollout(i, cpt);

    /* ---- Unit economics ---- */
    const costToServeToday = i.B02_touchesToday * i.B28_baselineTouchCost;
    const costToServeAfter = W10_touches * cpt;
    const runCostPerClaim  = W32_run * CR / W07_claims;
    const netPerClaim      = W35_net * CR / W07_claims;

    /* ---- Sheet 4 · forecast, NPV and payback from kickoff ---- */
    const realisation = [i.B24_realisationY1, i.B25_realisationY2, i.B26_realisationY3, 1, 1];
    const cashflows = realisation.map((r, n) =>
      (W24_gross * r - W32_run) * Math.pow(1 + i.A06_growth, n));
    const npv = (years) => cashflows.slice(0, years)
      .reduce((s, cf, n) => s + cf / Math.pow(1 + i.A09_wacc, n + 1), 0) - W37_build;
    const npv5 = npv(5), npv3 = npv(3);
    const paybackKickoff = paybackFromKickoff(W37_build, cashflows, i.B27_buildMonths);

    return {
      plan: plan.label, planKey, rollout, costPerTouch: cpt, inputs: i,

      // Part A
      nep: W02_nep, pool: W03_pool, claimsAll: W05_claimsAll,
      claims: W07_claims, claimsValue: W09_value,

      // Part B
      touches: W10_touches, touchesRemoved: W11_removed,
      tatPlatformRaw: W12_tat, tatPlatform: W14_tat, tatBook: W15_tatBook,
      tatSaved: W16_tatSaved, tatSavedPct: W16_tatSaved / i.B09_tatToday,

      // Part C
      benefits: {
        labour: W18_labour, fraudGraph: W19_graph, fraudGate: W20_gate,
        synthetic: W21_synth, renewal: W22_renewal, friction: W23_friction
      },
      gross: W24_gross,

      // Part E
      runLines: { gpu: W26_gpu, storage: W27_storage, mlops: W28_mlops,
                  ops: W29_ops, security: W30_sec, legal: W31_legal },
      run: W32_run,

      // Part F
      net: W35_net, netMonthly: W35_net / 12, build: W37_build,
      buildLoaded: W37_build * (1 + i.I02_contingency),
      paybackSteady: W38_payback, paybackKickoff,
      tco3: W37_build + W32_run * 3,

      // Part G
      lossPP: W41_loss, expensePP: W42_expense, combinedPP: W43_combined,
      combinedGroupPP: W46_group, perPP: W40_perPP,

      // Part I
      claimantDays: W62_claimantDays, zeroTouch: W63_zeroTouch,
      touchesAvoided: W66_touchesAvoided, hoursReleased: W67_hoursReleased,
      fte: W68_fte, throughput: W69_throughput,
      surveyToday: W70_surveyToday, surveyAfter: W71_surveyAfter,
      surveyAvoided: W72_surveyAvoided, garageDaysSaved: W73_garageDays,
      downgraded: W78_downgraded,
      governance: { hardening: i.D10_hardening, security: i.D15_securityDpdp,
                    build: W74_governance, gateBuild: W75_gateBuild,
                    annual: W76_annualCompliance, share: W77_governanceShare },
      split: { ops: W56_opsValue, underwriting: W57_uwValue,
               distribution: W22_renewal, runCost: -W32_run },

      // Part J
      beTouches: W90_beTouches, beCostPerTouch: W92_beCost, beRollout: W94_beRollout,
      cushionTouches: 1 - W90_beTouches / i.B02_touchesToday,
      cushionCost: 1 - W92_beCost / i.B28_baselineTouchCost,

      // Unit economics
      costToServeToday, costToServeAfter, runCostPerClaim, netPerClaim,
      costToServeCut: 1 - costToServeAfter / costToServeToday,

      // Sheet 4/5
      cashflows, npv5, npv3
    };
  }

  /* ---------------------------------------------------------------------
     W-94 · break-even rollout, labour only with zero fraud benefit.
     Labour and the volume-scaled run lines both move with rollout, so this
     is solved rather than divided. Bisection: monotonic in rollout, and a
     closed form would need the run-cost split inlined here.
     ponytail: bisection, 60 iterations — exact enough for a displayed ratio.
     --------------------------------------------------------------------- */
  function solveBreakEvenRollout(i, cpt) {
    const claimsAll = (i.A01_gdpiMotorOD * i.A02_nepRatio * i.A03_netIncClaims * CR) / i.B01_avgClaim;
    const touches = i.B03_greenShare * i.B06_touchesGreen
                  + i.B04_amberShare * i.B07_touchesAmber
                  + i.B05_redShare   * i.B08_touchesRed;
    const fixedRun = (i.E07_mlops * i.A08_fx * 12 + i.E08_opsTeam * 12
                     + i.E09_security * 12 + i.E10_legal * 12) / CR;
    const varRunPerClaim = (i.E01_gpuHours * i.E02_gpuPeak * i.E03_gpuMargin * i.E04_gpuRate * i.A08_fx
                           + i.E05_storage * i.E06_replication * i.A08_fx) / CR;
    const labourPerClaim = (i.B02_touchesToday * i.B28_baselineTouchCost - touches * cpt) / CR;

    // f(r) = labour(r) - run(r) - build  ... zero at break-even.
    // "Labour savings alone" is literal on the workbook: the friction line is a
    // fraud/adoption cost, not a labour one, so W-94 does not carry it.
    const f = (r) => {
      const c = claimsAll * r;
      return c * (labourPerClaim - varRunPerClaim) - fixedRun - i.W25_build;
    };
    let lo = 0, hi = 5;
    if (f(hi) < 0) return NaN;                       // never breaks even
    for (let n = 0; n < 60; n++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ---------------------------------------------------------------------
     Sheet 4 FS-05 · payback from PROJECT KICKOFF.
     Not build / monthly benefit. It carries the ten-month build window in
     which no benefit accrues, then draws down against the ramped cash
     flows. This is the figure the deck quotes.
     --------------------------------------------------------------------- */
  function paybackFromKickoff(build, cashflows, buildMonths) {
    let remaining = build, months = buildMonths;
    for (const cf of cashflows) {
      if (cf <= 0) { months += 12; continue; }
      const monthly = cf / 12;
      if (remaining <= cf) return months + remaining / monthly;
      remaining -= cf; months += 12;
    }
    return NaN;   // does not repay inside the forecast window
  }

  /* =====================================================================
     Sheet 3 Part L · the correlated stress cases.
     Each is a coherent way the plan could disappoint. D applies all three.
     ===================================================================== */
  const STRESS = {
    modelled: { label: 'As modelled', note: 'Base plan on published assumptions.', o: {} },
    A: {
      label: 'A · Operating reality misses',
      note: 'In-house handling at Rs 83 a touch and five baseline touches.',
      o: { B28_baselineTouchCost: 83, costPerTouch: 83, B02_touchesToday: 5 }
    },
    B: {
      label: 'B · Fraud disappoints',
      note: 'Detection lands at 82%, leakage halves, synthetic incidence quarters.',
      o: { B14_fraudTarget: 0.82, B17_leakage: 0.015, B18_synthetic: 0.0025 }
    },
    C: {
      label: 'C · Adoption drags',
      note: 'Rollout 35%, green lane 50%, live-capture friction doubled.',
      o: { rollout: 0.35, B03_greenShare: 0.50, B04_amberShare: 0.40, B20_friction: 0.15 }
    },
    D: {
      label: 'D · ALL THREE AT ONCE',
      note: 'Every one of the above, applied together.',
      o: { B28_baselineTouchCost: 83, costPerTouch: 83, B02_touchesToday: 5,
           B14_fraudTarget: 0.82, B17_leakage: 0.015, B18_synthetic: 0.0025,
           rollout: 0.35, B03_greenShare: 0.50, B04_amberShare: 0.40, B20_friction: 0.15 }
    },
    floor: {
      label: 'Floor · labour only, zero fraud',
      note: 'No fraud, gate, synthetic or renewal value at all.',
      o: { B28_baselineTouchCost: 83, costPerTouch: 83,
           B17_leakage: 0, B18_synthetic: 0, B22_renewalUplift: 0 }
    }
  };

  const stress = (key) => run('base', STRESS[key].o);

  /* =====================================================================
     SELF-CHECK · every headline asserted against the workbook's own
     computed values. Run it in the console, or CPModel.selfCheck() from
     anywhere. If a formula here drifts from the Excel, this fails.
     ===================================================================== */
  function selfCheck(verbose) {
    const fails = [];
    let ran = 0;
    const near = (label, got, want, tol) => {
      ran++;
      const ok = Math.abs(got - want) <= (tol === undefined ? Math.abs(want) * 1e-6 + 1e-9 : tol);
      if (!ok) fails.push(`${label}: got ${got}, workbook says ${want}`);
      else if (verbose) console.log(`  PASS  ${label}  ${got}`);
      return ok;
    };

    const c = run('conservative'), b = run('base'), a = run('aggressive');

    // Part A
    near('W-02 Motor OD NEP',            b.nep,        1654.6692400000002);
    near('W-03 claims pool',             b.pool,       1234.3832530400002);
    near('W-05 claim count, full book',  b.claimsAll,  274307.3895644445, 1e-6);
    near('W-07 claims on platform',      b.claims,     164584.43373866667, 1e-6);
    near('W-09 claims value on platform',b.claimsValue,740.6299518240002);

    // Part B
    near('W-10 blended touches',         b.touches,      1.23, 1e-12);
    near('W-14 platform TAT',            b.tatPlatform,  2.7100000000000004, 1e-12);
    near('W-15 whole-book TAT (Base)',   b.tatBook,      5.546, 1e-12);
    near('W-15 whole-book TAT (Cons)',   c.tatBook,      8.382000000000001, 1e-12);

    // Part C · the six benefit lines at Base
    near('W-18 labour',                  b.benefits.labour,     23.74130456680267);
    near('W-19 fraud graph',             b.benefits.fraudGraph, 11.050978491689687);
    near('W-20 capture integrity gate',  b.benefits.fraudGate,  6.1394324953831605);
    near('W-21 synthetic media',         b.benefits.synthetic,  6.295354590504001);
    near('W-22 renewal',                 b.benefits.renewal,    0.5760455180853334);
    near('W-23 friction',                b.benefits.friction,  -0.5925039614592);
    near('W-24 GROSS BENEFIT',           b.gross,               47.21061170100566);

    // Part E
    near('W-26 GPU compute',             b.runLines.gpu,   1.8821828787664312, 1e-7);
    near('W-27 storage',                 b.runLines.storage, 0.20390365495883414);
    near('W-32 TOTAL RUN COST',          b.run,            3.9006065337252656, 1e-7);

    // Part F · all three plans
    near('W-35 NET (Conservative)',      c.net,  12.850090035831915, 1e-7);
    near('W-35 NET (Base)',              b.net,  43.310005167280394, 1e-7);
    near('W-35 NET (Aggressive)',        a.net,  75.27751371177504,  1e-7);
    near('W-38 payback, steady state',   b.paybackSteady, 2.740374588772019, 1e-7);

    // Part G
    near('W-41 loss ratio pp',           b.lossPP,     1.4193631578947372, 1e-7);
    near('W-42 expense ratio pp',        b.expensePP,  1.1632653587987287, 1e-7);
    near('W-43 combined ratio, Motor OD',b.combinedPP, 2.582628516693466,  1e-7);
    near('W-46 combined ratio, group',   b.combinedGroupPP, 0.4187162689226937, 1e-7);

    // Part I
    near('W-62 claimant-days returned',  b.claimantDays,   1166903.6352071466, 1e-4);
    near('W-63 zero-touch claims',       b.zeroTouch,      106979.88193013334, 1e-6);
    near('W-66 touches avoided',         b.touchesAvoided, 949652.1826721067,  1e-5);
    near('W-67 hours released',          b.hoursReleased,  316550.72755736887, 1e-5);
    near('W-68 FTE released',            b.fte,            175.86151530964938, 1e-8);
    near('W-72 surveyor visits avoided', b.surveyAvoided,  74062.9951824,      1e-6);
    near('W-78 honest claimants downgraded', b.downgraded, 13166.754699093333, 1e-7);
    near('W-74 governance build',        b.governance.build,     1.0013452,           1e-9);
    near('W-75 capture integrity build', b.governance.gateBuild, 1.9148541000000003,  1e-9);
    near('W-76 annual compliance run',   b.governance.annual,    0.3699996,           1e-9);
    near('W-77 governance share',        b.governance.share,     0.29484942161190364, 1e-12);

    // W-60 · the workbook's own integrity check. The split must tie to the P&L.
    const splitSum = b.split.ops + b.split.underwriting + b.split.distribution + b.split.runCost;
    near('W-60 CHECK · split ties to W-35', splitSum - b.net, 0, 1e-9);

    // Part J
    near('W-90 break-even touches',      b.beTouches,      2.177989173731653,  1e-7);
    near('W-92 break-even cost/touch',   b.beCostPerTouch, 77.78532763327333,  1e-6);
    near('W-94 break-even rollout',      b.beRollout,      0.32430954374473087,1e-7);

    // Unit economics
    near('cost to serve, today',         b.costToServeToday, 1750, 1e-9);
    near('cost to serve, after',         b.costToServeAfter, 307.5, 1e-9);

    // Sheet 4/5 · forecast, NPV, payback from kickoff
    near('Y1 net cash flow',             b.cashflows[0], 17.344168731727283, 1e-7);
    near('Y2 net cash flow',             b.cashflows[1], 42.97254082331434,  1e-7);
    near('Y5 net cash flow',             b.cashflows[4], 60.46532783333645,  1e-6);
    near('5-year NPV at 12%',            b.npv5, 145.93821384228556, 1e-6);
    near('3-year NPV at 12%',            b.npv3, 76.28, 5e-3);
    near('payback from kickoff (Base)',  b.paybackKickoff, 16.84297065116134, 1e-7);
    near('payback from kickoff (Cons)',  c.paybackKickoff, 27.21363020260552, 1e-7);
    near('payback from kickoff (Aggr)',  a.paybackKickoff, 13.832939843950562,1e-7);

    // Sheet 3 Part L · the correlated stress cases
    near('L-21 stress A net',   stress('A').net, 25.11450476284908,  1e-6);
    near('L-21 stress B net',   stress('B').net, 27.245156804361113, 1e-6);
    near('L-21 stress C net',   stress('C').net, 23.557644576072757, 1e-6);
    near('L-21 stress D net',   stress('D').net, 4.207358498485244,  1e-6);
    near('L-28 stress D 5y NPV',stress('D').npv5, 3.761099759560103, 1e-5);
    near('W-52 floor net',      stress('floor').net, 3.784795267248766, 1e-6);

    const result = { pass: fails.length === 0, failures: fails, checks: ran };
    if (fails.length) console.error('CPModel self-check FAILED:\n' + fails.join('\n'));
    else console.log('CPModel: all checks tie to the workbook.');
    return result;
  }

  return { INPUTS, PLANS, STRESS, run, stress, selfCheck, CR };
})();

/* Node entry point so the check can run headless: `node model.js` */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CPModel;
  if (require.main === module) {
    const r = CPModel.selfCheck(process.argv.includes('-v'));
    process.exit(r.pass ? 0 : 1);
  }
}
