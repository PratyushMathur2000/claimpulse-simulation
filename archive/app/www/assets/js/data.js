/* =====================================================================
   ClaimPulse · Seed Data
   Team Finsighters · NMIMS Mumbai · ATOM Season 9 · PS_BFDL
   ---------------------------------------------------------------------
   The four demo claims, the policy master and the queue seed.

   NOTE ON NUMBERS. Nothing about the book is typed here. CP_CONST reads
   Sheet 1 of the investor workbook through CPModel, so lane shares, lane
   touches, lane TAT, the surveyor corridor and every book-level figure
   come from the same place the deck's numbers come from. Change the
   workbook input in model.js and the demo moves with it.
   ===================================================================== */

const CP_CONST = (() => {
  const I = CPModel.INPUTS;
  const base = CPModel.run('base');

  return {
    // Baseline today — Sheet 1 Table B
    TAT_TODAY:           I.B09_tatToday,             // B-09  9.8 days
    TOUCHES_TODAY:       I.B02_touchesToday,         // B-02  7 touches
    COST_PER_TOUCH:      I.B28_baselineTouchCost,    // B-28  Rs 250
    COST_TO_SERVE_TODAY: base.costToServeToday,      // 7 x 250 = Rs 1,750

    // On-platform lane performance — B-03 to B-12
    LANE: {
      G: { tat: I.B10_tatGreen, touches: I.B06_touchesGreen, share: I.B03_greenShare,
           label: 'GREEN', name: 'Auto-Settle'     },
      A: { tat: I.B11_tatAmber, touches: I.B07_touchesAmber, share: I.B04_amberShare,
           label: 'AMBER', name: 'Assisted Review' },
      R: { tat: I.B12_tatRed,   touches: I.B08_touchesRed,   share: I.B05_redShare,
           label: 'RED',   name: 'Investigate'     }
    },

    // Trust Score routing thresholds (0-100). These are the demo's own
    // calibration of the lane shares above, not a workbook input.
    GREEN_FLOOR: 82,
    AMBER_FLOOR: 55,
    RING_FLOOR:  0.35,        // fraud graph ring score that forces RED

    // A-11 · IRDAI Master Circular on Protection of Policyholders'
    // Interests, 2024 — motor losses below this need no registered surveyor.
    SURVEYOR_EXEMPTION: I.A11_surveyorExempt,

    // Trust Score fusion weights (must sum to 100)
    WEIGHTS: {
      gate:   30,   // Gate 00 · Capture Integrity
      doc:    20,   // Engine 01 · Document AI + OCR / VAHAN
      cv:     15,   // Engine 02 · CV Damage Assessment
      fraud:  25,   // Engine 03 · Fraud + Duplicate Graph
      policy: 10    // Engine 05 · Policy Validation RAG
    },

    // Book-level economics, Base plan at 60% rollout — all computed
    BOOK: base
  };
})();

/* ------------------------------------------------------------------
   Network partners. The garage console reads these; the fraud graph
   uses the codes as node labels.
   ------------------------------------------------------------------ */
const CP_GARAGES = {
  'G-1180': { name: 'Sai Motors Authorised Service', city: 'Andheri East, Mumbai',
              tier: 'Preferred', rating: 4.6, openJobs: 12, network: true },
  'G-2207': { name: 'Bodakdev Auto Works',           city: 'Bodakdev, Ahmedabad',
              tier: 'Network', rating: 4.1, openJobs: 9,  network: true },
  'G-3391': { name: 'Rohini Crash Repairs',          city: 'Rohini, Delhi',
              tier: 'Non-network', rating: 3.4, openJobs: 21, network: false },
  'G-4412': { name: 'Sector 62 Motor Care',          city: 'Sector 62, Noida',
              tier: 'Network', rating: 4.3, openJobs: 31, network: true }
};

/* ------------------------------------------------------------------
   Engine identity — one place, because these names appear on the
   claimant's phone, the inspector, the audit trail and the deck, and
   they have to be the same words in all four.
   ------------------------------------------------------------------ */
const CP_ENGINES = [
  { key: 'doc',    no: '01', name: 'OCR First',   what: 'Document extraction and VAHAN cross-check',
    layer: 1, blurb: 'Reads the RC, chassis plate, licence and odometer, then checks them against the policy record and the VAHAN registry.' },
  { key: 'cv',     no: '02', name: 'CV Depth',    what: 'Damage assessment and severity',
    layer: 2, blurb: 'Segments the damaged panels, grades severity, and prices the parts against the catalogue for this model and city.' },
  { key: 'fraud',  no: '03', name: 'Fraud Graph', what: 'Rings, duplicates and shared entities',
    layer: 2, blurb: 'Scores the network around the claim — shared garages, payout accounts, vehicles and people — rather than the claim on its own.' },
  { key: 'repair', no: '04', name: 'Parts Bench', what: 'Repair estimate benchmarking',
    layer: 1, blurb: 'Benchmarks the garage estimate against settled claims for the same model, damage pattern and city.' },
  { key: 'policy', no: '05', name: 'Policy RAG',  what: 'Coverage, clauses and exclusions',
    layer: 3, blurb: 'Retrieves the governing clauses from the policy wording and reasons about coverage, deductibles and exclusions.' }
];
const CP_ENGINE_BY_KEY = CP_ENGINES.reduce(function (m, e) { m[e.key] = e; return m; }, {});
const engineName = function (k) {
  const e = CP_ENGINE_BY_KEY[k];
  return e ? 'Engine ' + e.no + ' · ' + e.name : k;
};

/* ------------------------------------------------------------------
   City coordinates — only so surveyor distance is a real calculation
   rather than a number somebody typed. Approximate city centroids.
   ------------------------------------------------------------------ */
const CP_CITY_LL = {
  'Mumbai':[19.076,72.877], 'Ahmedabad':[23.023,72.571], 'Delhi':[28.704,77.102],
  'Noida':[28.535,77.391],  'Pune':[18.520,73.857],      'Bengaluru':[12.972,77.594],
  'Hyderabad':[17.385,78.487],'Vadodara':[22.307,73.181],'Chennai':[13.083,80.270],
  'Lucknow':[26.847,80.947],'Jaipur':[26.912,75.787],    'Kolkata':[22.573,88.364],
  'Ludhiana':[30.901,75.857],'Surat':[21.170,72.831],    'Nagpur':[21.146,79.089]
};

/* ------------------------------------------------------------------
   Surveyor roster — the people a claims officer actually dispatches.
   Licence numbers follow the IRDAI surveyor format, because a demo that
   gets the paperwork shape wrong is the one an insurer notices.
   ------------------------------------------------------------------ */
const CP_SURVEYORS = [
  { id: 'SV-4417', name: 'Ravi Sharma',    city: 'Mumbai',    licence: 'IRDAI/SLA/MU-4417',
    speciality: 'Motor OD · collision',     available: 'today',    workload: 2, capacity: 6,
    avgHours: 4.5, rating: 4.8, jobs: 1284, langs: 'Hindi, Marathi, English' },
  { id: 'SV-2290', name: 'Priya Nair',     city: 'Mumbai',    licence: 'IRDAI/SLA/MU-2290',
    speciality: 'Motor OD · total loss',    available: 'today',    workload: 4, capacity: 6,
    avgHours: 5.2, rating: 4.6, jobs: 907,  langs: 'Malayalam, Hindi, English' },
  { id: 'SV-8814', name: 'Imran Shaikh',   city: 'Mumbai',    licence: 'IRDAI/SLA/MU-8814',
    speciality: 'Motor OD · fraud support', available: 'tomorrow', workload: 6, capacity: 6,
    avgHours: 6.8, rating: 4.9, jobs: 1602, langs: 'Hindi, Urdu, English' },
  { id: 'SV-3120', name: 'Kiran Patel',    city: 'Ahmedabad', licence: 'IRDAI/SLA/AH-3120',
    speciality: 'Motor OD · collision',     available: 'today',    workload: 1, capacity: 5,
    avgHours: 3.9, rating: 4.7, jobs: 763,  langs: 'Gujarati, Hindi, English' },
  { id: 'SV-3844', name: 'Anjali Desai',   city: 'Ahmedabad', licence: 'IRDAI/SLA/AH-3844',
    speciality: 'Motor OD · glass & body',  available: 'today',    workload: 3, capacity: 5,
    avgHours: 4.1, rating: 4.4, jobs: 512,  langs: 'Gujarati, English' },
  { id: 'SV-6675', name: 'Harpreet Singh', city: 'Delhi',     licence: 'IRDAI/SLA/DL-6675',
    speciality: 'Motor OD · fraud support', available: 'today',    workload: 2, capacity: 6,
    avgHours: 7.4, rating: 4.9, jobs: 1911, langs: 'Punjabi, Hindi, English' },
  { id: 'SV-7031', name: 'Neha Chauhan',   city: 'Noida',     licence: 'IRDAI/SLA/UP-7031',
    speciality: 'Motor OD · collision',     available: 'today',    workload: 5, capacity: 6,
    avgHours: 4.8, rating: 4.5, jobs: 688,  langs: 'Hindi, English' },
  { id: 'SV-5502', name: 'Arun Krishnan',  city: 'Bengaluru', licence: 'IRDAI/SLA/KA-5502',
    speciality: 'Motor OD · EV & hybrid',   available: 'today',    workload: 0, capacity: 5,
    avgHours: 5.6, rating: 4.8, jobs: 441,  langs: 'Kannada, Tamil, English' },
  { id: 'SV-9163', name: 'Sunita Rao',     city: 'Hyderabad', licence: 'IRDAI/SLA/TS-9163',
    speciality: 'Motor OD · collision',     available: 'tomorrow', workload: 4, capacity: 5,
    avgHours: 4.3, rating: 4.6, jobs: 855,  langs: 'Telugu, Hindi, English' },
  { id: 'SV-1188', name: 'Rohit Bansal',   city: 'Pune',      licence: 'IRDAI/SLA/MH-1188',
    speciality: 'Motor OD · total loss',    available: 'today',    workload: 3, capacity: 6,
    avgHours: 5.0, rating: 4.3, jobs: 620,  langs: 'Hindi, Marathi, English' }
];

const CP_SLOTS = ['09:00 - 11:00', '11:00 - 13:00', '14:00 - 16:00', '16:00 - 18:00'];

/* Great-circle distance. Two surveyors in the claim's own city would both
   read 0.0 km, which is not what a dispatcher sees, so same-city distance
   is spread deterministically off the claim reference — same claim, same
   surveyor, same number every time it is drawn. */
function cpDistanceKm(surveyor, city, seed) {
  const A = CP_CITY_LL[surveyor.city], B = CP_CITY_LL[city];
  if (!A || !B) return null;
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(B[0] - A[0]), dLon = rad(B[1] - A[1]);
  const h = Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(rad(A[0])) * Math.cos(rad(B[0])) * Math.pow(Math.sin(dLon / 2), 2);
  const km = 2 * R * Math.asin(Math.sqrt(h));
  if (km > 12) return Math.round(km * 10) / 10;
  let n = 0;
  String(seed || '').split('').forEach(ch => { n = (n * 31 + ch.charCodeAt(0)) % 9973; });
  return Math.round((1.2 + (n % 86) / 10) * 10) / 10;      // 1.2 - 9.8 km
}

/* ------------------------------------------------------------------
   The policyholder's own garage — what the mobile app shows on login.
   One account, three insured vehicles, each wired to a demo scenario.
   ------------------------------------------------------------------ */
const CP_CUSTOMER = {
  name: 'Rohan Sharma', mobile: '+91 98•••• 4471',
  email: 'r.sharma@•••.com', customerId: 'BFDL-77401882', since: '2019'
};

const CP_MY_VEHICLES = [
  { id: 'V1', scenario: 'clean', make: 'Honda City VX CVT', reg: 'MH 01 AB 1234',
    policy: 'OG-27-1102-1801-00234567', product: 'Motor Package Policy',
    idv: 612000, expires: '14 Mar 2027', status: 'Active',
    addOns: ['Zero Depreciation', 'Roadside Assistance'], colour: '#0071BB', year: 2022 },
  { id: 'V2', scenario: 'ambiguous', make: 'Hyundai Creta SX', reg: 'GJ 01 KL 2290',
    policy: 'OG-27-1102-1801-00891245', product: 'Motor Package Policy',
    idv: 1284000, expires: '02 Sep 2026', status: 'Active',
    addOns: ['Engine Protect'], colour: '#003A63', year: 2021 },
  { id: 'V3', scenario: 'ring', make: 'Mahindra XUV700 AX7', reg: 'UP 16 BR 5521',
    policy: 'OG-27-1102-1801-00773310', product: 'Motor Package Policy',
    idv: 1845000, expires: '28 Nov 2026', status: 'Active',
    addOns: ['Zero Depreciation'], colour: '#4EA8DE', year: 2023 }
];

/* What happened — the four taps that replace a two-page FNOL form. */
const CP_INCIDENT_TYPES = [
  { key: 'accident', ico: '💥', nm: 'Accident',
    d: 'Collision involving another vehicle' },
  { key: 'damage',   ico: '🚗', nm: 'Vehicle damage',
    d: 'Damage with no other vehicle involved' },
  { key: 'weather',  ico: '🌧', nm: 'Weather or falling object',
    d: 'Hail, storm, flood or debris' },
  { key: 'theft',    ico: '🔒', nm: 'Theft or break-in',
    d: 'Vehicle or parts stolen' }
];

/* ------------------------------------------------------------------
   CONTROLLED PILOT
   ---------------------------------------------------------------------
   What a 15-20 day validation actually needs, declared as data so the
   Pilot Workspace renders it rather than hard-coding a timeline.

   The framing matters as much as the content: ClaimPulse runs BESIDE the
   existing claims process during the pilot and recommends. It does not
   settle. Every number the pilot produces is a measurement, never a
   result already achieved.
   ------------------------------------------------------------------ */

/* Where claims come from. Only the first is built; the rest declare the
   contract each would have to satisfy, which is the honest way to show a
   swap that has not been built yet. */
const CP_SOURCES = [
  { key: 'demo', nm: 'Demo data', ico: '🎬', state: 'live',
    d: 'Four scripted claim profiles plus a generated background queue.',
    needs: 'Nothing. This is what the prototype ships with.' },
  { key: 'csv', nm: 'CSV upload', ico: '📄', state: 'ready',
    d: 'A claims extract exported from the existing system and dropped in.',
    needs: 'A column mapping: claim ref, policy no, vehicle, city, garage, estimate, FNOL date, and a path to the capture media.' },
  { key: 'feed', nm: 'Pilot data feed', ico: '🔁', state: 'integration',
    d: 'A scheduled one-way extract of the pilot cohort only, landing in a segregated pilot store.',
    needs: 'A nightly or hourly export from the claims system into a Bajaj-controlled bucket, plus a media path or pre-signed URLs. No write-back.' },
  { key: 'api', nm: 'API integration', ico: '🔌', state: 'integration',
    d: 'ClaimPulse called at FNOL and returning a recommendation synchronously.',
    needs: 'An authenticated claims API, VAHAN access, the parts catalogue, and a policy-wording corpus. This is the post-pilot shape, not the pilot shape.' }
];

/* The pilot itself. Three phases across 20 days. */
const CP_PILOT_PHASES = [
  { no: 1, nm: 'Setup', from: 1, to: 3, ico: '⚙',
    what: 'Nothing is scored yet. The cohort is agreed and the plumbing is proved.',
    tasks: [
      'Agree the claim cohort and freeze the filters',
      'Stand up the segregated pilot data store and load the cohort',
      'Configure lane thresholds, the corridor cap and the parts catalogue for the chosen geography',
      'Create the pilot users — claims officers, a supervisor, a read-only observer',
      'Dry-run 20 historical claims to confirm the engines return sane output'
    ] },
  { no: 2, nm: 'Shadow testing', from: 4, to: 15, ico: '👥',
    what: 'ClaimPulse scores every cohort claim while the existing process runs untouched. Recommendations are recorded, never applied.',
    tasks: [
      'Existing claims operations continue exactly as today',
      'ClaimPulse produces a Trust Score, lane, survey view and fraud signals per claim',
      'The claims officer records their own decision against each recommendation',
      'Agreement, overrides and override reasons accumulate',
      'TAT and survey requirements are tracked against the pre-pilot baseline'
    ] },
  { no: 3, nm: 'Evaluation', from: 16, to: 20, ico: '📊',
    what: 'The measurement is read, the failure modes are named, and a scale / modify / retest call is made.',
    tasks: [
      'Read agreement rate by lane, not just in aggregate',
      'Review every override reason for a pattern the engines should have caught',
      'Compare TAT and survey volume against the baseline cohort',
      'Identify failure modes and the engine responsible for each',
      'Recommend: scale, modify and retest, or stop'
    ] }
];

/* Success criteria. These are the QUESTIONS the pilot answers. They are
   deliberately phrased as measurements with a target to compare against,
   never as outcomes already delivered. */
const CP_PILOT_GATES = [
  { key: 'agreement', nm: 'Green-lane agreement',
    q: 'When ClaimPulse says a claim can auto-settle, does the claims officer agree?',
    target: 0.85, fmt: 'pct', dir: 'up',
    note: 'Measured against the officer’s own decision on the same claim, not against a label we chose.' },
  { key: 'tat', nm: 'Claim turnaround',
    q: 'Does a ClaimPulse-assisted claim close faster than the baseline cohort?',
    target: 3.5, fmt: 'days', dir: 'down',
    note: 'Compared against the same cohort’s pre-pilot TAT, not against the book average.' },
  { key: 'survey', nm: 'Avoidable surveys',
    q: 'How many physical inspections would not have been needed?',
    target: 0.40, fmt: 'pct', dir: 'up',
    note: 'Counted only where the officer agreed no survey was required. A recommendation the officer overrode does not count.' },
  { key: 'override', nm: 'Human override rate',
    q: 'How often, and where, do the recommendations need correcting?',
    target: 0.15, fmt: 'pct', dir: 'down',
    note: 'A high override rate is not a failure. It is the map of what to fix before scaling.' },
  { key: 'exception', nm: 'Exception queue',
    q: 'Do amber and red stay small enough for the team that has to work them?',
    target: 0.35, fmt: 'pct', dir: 'down',
    note: 'If the exception queue grows faster than the team, automation upstream is worth nothing.' }
];

/* Pilot roles. A controlled pilot has fewer users than production, on
   purpose — it is one of the things that makes it controlled. */
const CP_PILOT_ROLES = [
  { nm: 'Claims officer', n: 4, can: 'Reads recommendations, records the real decision, gives an override reason.' },
  { nm: 'Claims supervisor', n: 1, can: 'Everything an officer can, plus cohort configuration and the KPI read-out.' },
  { nm: 'SIU observer', n: 1, can: 'Read-only on red-lane claims and the fraud graph.' },
  { nm: 'Bajaj programme owner', n: 1, can: 'Read-only on the KPI dashboard and the evaluation pack.' }
];

/* ------------------------------------------------------------------
   Policy master — what a policy-number lookup returns.
   ------------------------------------------------------------------ */
const CP_POLICIES = {
  'OG-27-1102-1801-00234567': {
    holder: 'Rohan Sharma',
    mobile: '+91 98•••••234',
    vehicle: 'Maruti Suzuki Swift VXi',
    reg: 'MH 02 DF 4471',
    year: 2022,
    idv: 612000,
    product: 'Bajaj General Motor Package Policy',
    addOns: ['Zero Depreciation', 'Roadside Assistance'],
    deductible: 1000,
    ncb: '25%',
    status: 'ACTIVE',
    validTill: '14 Mar 2027',
    priorClaims: 0
  },
  'OG-27-1102-1801-00891245': {
    holder: 'Priya Patel',
    mobile: '+91 99•••••881',
    vehicle: 'Hyundai Creta SX',
    reg: 'GJ 01 KL 2290',
    year: 2021,
    idv: 1284000,
    product: 'Bajaj General Motor Package Policy',
    addOns: ['Engine Protect'],
    deductible: 1000,
    ncb: '0%',
    status: 'ACTIVE',
    validTill: '02 Sep 2026',
    priorClaims: 1
  },
  'OG-27-1102-1801-00445901': {
    holder: 'D. Kapoor',
    mobile: '+91 97•••••016',
    vehicle: 'Honda City ZX',
    reg: 'DL 01 CX 8842',
    year: 2019,
    idv: 894000,
    product: 'Bajaj General Motor Package Policy',
    addOns: [],
    deductible: 1000,
    ncb: '0%',
    status: 'ACTIVE',
    validTill: '21 Nov 2026',
    priorClaims: 3
  },
  'OG-27-1102-1801-00773310': {
    holder: 'S. Ahluwalia',
    mobile: '+91 96•••••447',
    vehicle: 'Tata Nexon XZ+',
    reg: 'UP 16 BR 5521',
    year: 2023,
    idv: 1015000,
    product: 'Bajaj General Motor Package Policy',
    addOns: ['Zero Depreciation'],
    deductible: 1000,
    ncb: '20%',
    status: 'ACTIVE',
    validTill: '30 Jan 2027',
    priorClaims: 2
  }
};

/* ------------------------------------------------------------------
   The four demo scenarios.
   Each one drives Gate 00 + the five engines. The Trust Score is NOT
   stored here — it is computed in engine.js from these sub-signals,
   so the arithmetic on screen always reconciles.
   ------------------------------------------------------------------ */
const CP_SCENARIOS = {

  /* ============ 1 · CLEAN CLAIM → GREEN LANE ============ */
  clean: {
    key: 'clean',
    garageCode: 'G-1180',
    ref: 'CLM-20481',
    vehicle: 'Honda City VX CVT',
    reg: 'MH 01 AB 1234',
    title: 'Clean claim',
    blurb: 'Minor front-end damage, live capture, everything agrees',
    chip: 'GREEN',
    policy: 'OG-27-1102-1801-00234567',
    incident: {
      cause: 'Rear-ended a stationary vehicle in slow traffic',
      city: 'Mumbai',
      locality: 'Andheri East, Mumbai',
      coords: '19.1136° N, 72.8697° E',
      hoursAgo: 3,
      thirdParty: false,
      fir: false
    },
    gate: {
      exif:      { status: 'PASS', v: 'Present · unmodified',        d: 'Camera metadata block intact on all 4 frames' },
      gps:       { status: 'PASS', v: '0.4 km from FNOL location',   d: 'Capture GPS within the 5 km incident radius' },
      recency:   { status: 'PASS', v: 'Captured 41 s ago',           d: 'Live-capture session, gallery upload disabled' },
      device:    { status: 'PASS', v: 'Consistent across frames',    d: 'Same sensor, lens and ISO signature on all frames' },
      diffusion: { status: 'PASS', v: 'Risk 0.02',                   d: 'No diffusion / GAN artefacts in spatial-frequency screen' },
      score: 96
    },
    doc: {
      score: 92,
      rc:      { status: 'PASS', v: 'MH 02 DF 4471',        d: 'RC extracted and matched against VAHAN' },
      chassis: { status: 'PASS', v: 'MA3•••••••••4471',     d: 'Chassis plate OCR matches RC record' },
      dl:      { status: 'PASS', v: 'Valid till Jun 2031',  d: 'Driving licence live and not suspended' },
      policy:  { status: 'PASS', v: 'ACTIVE · in force',    d: 'Premium paid, no lapse on incident date' },
      odo:     { status: 'PASS', v: '41,208 km',            d: 'Odometer consistent with last service record' }
    },
    cv: {
      score: 89,
      cause: { status: 'PASS', v: 'Consistent', d: 'Impact geometry matches reported rear-end collision' },
      parts: [
        { part: 'Front bumper assembly', action: 'REPLACE', severity: 'Moderate', conf: 0.94, cost: 9200 },
        { part: 'Front grille',          action: 'REPLACE', severity: 'Moderate', conf: 0.91, cost: 3400 },
        { part: 'Bonnet',                action: 'REPAIR',  severity: 'Minor',    conf: 0.88, cost: 4100 },
        { part: 'Left headlamp',         action: 'REPLACE', severity: 'Minor',    conf: 0.86, cost: 1800 }
      ],
      structural: false
    },
    fraud: {
      score: 96,
      ring: 0.04,
      duplicateMedia: 0,
      priorClaims90d: 0,
      sharedEntities: [],
      verdict: { status: 'PASS', v: 'Low risk · 0.04', d: 'No ring signature. No entity shared with any open claim.' },
      graph: {
        nodes: [
          { id: 'C1', label: 'This claim',  type: 'claim',    x: 50, y: 50, risk: 'low' },
          { id: 'P1', label: 'R. Sharma',   type: 'person',   x: 20, y: 20, risk: 'low' },
          { id: 'V1', label: 'MH 02 DF 4471', type: 'vehicle', x: 80, y: 20, risk: 'low' },
          { id: 'G1', label: 'Garage G-1180', type: 'garage', x: 20, y: 82, risk: 'low' },
          { id: 'B1', label: 'A/c ••••4412', type: 'bank',    x: 80, y: 82, risk: 'low' }
        ],
        edges: [['C1','P1'],['C1','V1'],['C1','G1'],['C1','B1']]
      }
    },
    repair: {
      garageEstimate: 18500,
      band: [16200, 19400],
      status: 'PASS',
      note: 'Garage estimate sits inside the parts-catalogue band for this model and city'
    },
    policyRag: {
      score: 94,
      clauses: [
        { ref: 'Sec II(1)(a)', v: 'COVERED',  d: 'Accidental external means — own damage covered' },
        { ref: 'Add-on ZD',    v: 'APPLIES',  d: 'Zero-depreciation add-on active — nil depreciation on plastic/rubber' },
        { ref: 'Sec IV(3)',    v: 'DEDUCT',   d: 'Compulsory deductible ₹1,000 applied' },
        { ref: 'Excl. 4(b)',   v: 'N/A',      d: 'No intoxication / no-licence exclusion triggered' }
      ]
    }
  },

  /* ============ 2 · AMBIGUOUS CLAIM → AMBER LANE ============ */
  ambiguous: {
    key: 'ambiguous',
    garageCode: 'G-2207',
    ref: 'CLM-20482',
    vehicle: 'Hyundai Creta SX',
    reg: 'GJ 01 KL 2290',
    title: 'Ambiguous claim',
    blurb: 'Signals inconclusive, not contradictory — needs one human',
    chip: 'AMBER',
    policy: 'OG-27-1102-1801-00891245',
    incident: {
      cause: 'Side impact at an unmarked junction, other driver left',
      city: 'Ahmedabad',
      locality: 'Bodakdev, Ahmedabad',
      coords: '23.0396° N, 72.5069° E',
      hoursAgo: 26,
      thirdParty: true,
      fir: false
    },
    gate: {
      exif:      { status: 'PASS',  v: 'Present · unmodified',       d: 'Camera metadata block intact on all 4 frames' },
      gps:       { status: 'WARN',  v: '11.2 km from FNOL location', d: 'Vehicle moved to garage before capture — plausible but unverified' },
      recency:   { status: 'WARN',  v: 'Captured 26 h after incident', d: 'Outside the 12 h live-capture window' },
      device:    { status: 'PASS',  v: 'Consistent across frames',   d: 'Same sensor, lens and ISO signature on all frames' },
      diffusion: { status: 'PASS',  v: 'Risk 0.06',                  d: 'No diffusion / GAN artefacts detected' },
      score: 69
    },
    doc: {
      score: 73,
      rc:      { status: 'PASS', v: 'GJ 01 KL 2290',       d: 'RC extracted and matched against VAHAN' },
      chassis: { status: 'WARN', v: 'Partial extract',     d: 'Chassis plate obscured by dirt — 6 of 17 characters unread' },
      dl:      { status: 'PASS', v: 'Valid till Mar 2029', d: 'Driving licence live and not suspended' },
      policy:  { status: 'PASS', v: 'ACTIVE · in force',   d: 'Premium paid, no lapse on incident date' },
      odo:     { status: 'WARN', v: 'Not legible',         d: 'Odometer frame underexposed — cannot corroborate usage' }
    },
    cv: {
      score: 66,
      cause: { status: 'WARN', v: 'Partially consistent', d: 'Scrape direction fits a side impact; door dent depth suggests a second, older event' },
      parts: [
        { part: 'Front left door skin', action: 'REPLACE', severity: 'Moderate', conf: 0.86, cost: 12800 },
        { part: 'Left fender',          action: 'REPAIR',  severity: 'Moderate', conf: 0.79, cost: 5900  },
        { part: 'Left ORVM',            action: 'REPLACE', severity: 'Major',    conf: 0.92, cost: 6100  },
        { part: 'Rear left door',       action: 'REVIEW',  severity: 'Unclear',  conf: 0.41, cost: 7600  }
      ],
      structural: false
    },
    fraud: {
      score: 76,
      ring: 0.18,
      duplicateMedia: 0,
      priorClaims90d: 1,
      sharedEntities: ['Garage G-2207 also appears on 1 open claim'],
      verdict: { status: 'WARN', v: 'Medium · 0.18', d: 'One shared garage node. Below the 0.35 ring threshold — not a ring, but not clean.' },
      graph: {
        nodes: [
          { id: 'C1', label: 'This claim',   type: 'claim',   x: 50, y: 50, risk: 'med'  },
          { id: 'P1', label: 'P. Patel',     type: 'person',  x: 18, y: 22, risk: 'low'  },
          { id: 'V1', label: 'GJ 01 KL 2290',type: 'vehicle', x: 82, y: 22, risk: 'low'  },
          { id: 'G1', label: 'Garage G-2207',type: 'garage',  x: 50, y: 88, risk: 'med'  },
          { id: 'C2', label: 'Claim 88112',  type: 'claim',   x: 15, y: 68, risk: 'low'  },
          { id: 'B1', label: 'A/c ••••7781', type: 'bank',    x: 85, y: 68, risk: 'low'  }
        ],
        edges: [['C1','P1'],['C1','V1'],['C1','G1'],['C1','B1'],['C2','G1']]
      }
    },
    repair: {
      garageEstimate: 32400,
      band: [24200, 27460],
      status: 'WARN',
      note: 'Garage estimate is 18% above the top of the catalogue band for this model and city'
    },
    policyRag: {
      score: 78,
      clauses: [
        { ref: 'Sec II(1)(a)', v: 'COVERED',  d: 'Accidental external means — own damage covered' },
        { ref: 'Sec II(1)(c)', v: 'REVIEW',   d: 'Third party left the scene and no FIR filed — recovery position unclear' },
        { ref: 'Sec IV(3)',    v: 'DEDUCT',   d: 'Compulsory deductible ₹1,000 applied' },
        { ref: 'Dep. Sch.',    v: 'APPLIES',  d: 'No zero-dep add-on — 30% depreciation on plastic parts (vehicle age 4y)' }
      ]
    }
  },

  /* ============ 3 · SYNTHETIC MEDIA → RED, CAUGHT AT THE GATE ============ */
  synthetic: {
    key: 'synthetic',
    garageCode: 'G-3391',
    ref: 'CLM-20484',
    vehicle: 'Skoda Slavia Style',
    reg: 'DL 01 CX 8842',
    title: 'Synthetic evidence',
    blurb: 'Fabricated damage photos — the vector nobody has measured',
    chip: 'RED',
    policy: 'OG-27-1102-1801-00445901',
    incident: {
      cause: 'Front-end collision with a divider, no witnesses',
      city: 'Delhi',
      locality: 'Rohini Sector 7, Delhi',
      coords: '28.7041° N, 77.1025° E',
      hoursAgo: 61,
      thirdParty: false,
      fir: false
    },
    gate: {
      exif:      { status: 'FAIL', v: 'Stripped',                  d: 'No camera metadata block. Signature matches an image re-encoded by a generation pipeline.' },
      gps:       { status: 'FAIL', v: 'Absent',                    d: 'No location tag on any frame — cannot place the vehicle at the incident' },
      recency:   { status: 'FAIL', v: 'Timestamp precedes FNOL',   d: 'File creation time is 4 days before the reported incident' },
      device:    { status: 'FAIL', v: 'Inconsistent',              d: 'Three different sensor noise profiles across four frames of the same "session"' },
      diffusion: { status: 'FAIL', v: 'Risk 0.91',                 d: 'Spatial-frequency screen flags diffusion artefacts: periodic residual in the 0.28–0.34 band, absent in camera-native images' },
      score: 6
    },
    doc: {
      score: 38,
      rc:      { status: 'PASS', v: 'DL 01 CX 8842',      d: 'RC extracted and matched against VAHAN' },
      chassis: { status: 'FAIL', v: 'Not present',        d: 'No chassis-plate frame submitted in the capture session' },
      dl:      { status: 'PASS', v: 'Valid till Aug 2027',d: 'Driving licence live and not suspended' },
      policy:  { status: 'WARN', v: 'ACTIVE · 3 priors',  d: 'Policy in force but carries 3 prior claims in 18 months' },
      odo:     { status: 'FAIL', v: 'Rendered, not photographed', d: 'Odometer digits show no lens distortion or reflection — inconsistent with a real dash photo' }
    },
    cv: {
      score: 22,
      cause: { status: 'FAIL', v: 'Inconsistent', d: 'Crumple pattern does not propagate to the chassis rail — damage is surface-only in a claimed high-energy impact' },
      parts: [
        { part: 'Front bumper assembly', action: 'REVIEW', severity: 'Claimed severe', conf: 0.34, cost: 11200 },
        { part: 'Both headlamps',        action: 'REVIEW', severity: 'Claimed replace', conf: 0.29, cost: 24800 },
        { part: 'Bonnet',                action: 'REVIEW', severity: 'Claimed severe', conf: 0.31, cost: 9400  },
        { part: 'Radiator + support',    action: 'REVIEW', severity: 'Claimed replace', conf: 0.27, cost: 15600 }
      ],
      structural: false
    },
    fraud: {
      score: 31,
      ring: 0.52,
      duplicateMedia: 1,
      priorClaims90d: 2,
      sharedEntities: ['Bank A/c ••••9034 shared with 2 settled claims', 'Perceptual hash of frame 2 matches media on claim 71204'],
      verdict: { status: 'FAIL', v: 'High · 0.52', d: 'Perceptual hash collision with an already-settled claim, plus a shared payout account.' },
      graph: {
        nodes: [
          { id: 'C1', label: 'This claim',   type: 'claim',   x: 50, y: 48, risk: 'high' },
          { id: 'P1', label: 'D. Kapoor',    type: 'person',  x: 16, y: 20, risk: 'med'  },
          { id: 'V1', label: 'DL 01 CX 8842',type: 'vehicle', x: 84, y: 20, risk: 'low'  },
          { id: 'B1', label: 'A/c ••••9034', type: 'bank',    x: 50, y: 88, risk: 'high' },
          { id: 'C2', label: 'Claim 71204',  type: 'claim',   x: 14, y: 70, risk: 'high' },
          { id: 'C3', label: 'Claim 69880',  type: 'claim',   x: 86, y: 70, risk: 'med'  }
        ],
        edges: [['C1','P1'],['C1','V1'],['C1','B1'],['C2','B1'],['C3','B1'],['C1','C2']]
      }
    },
    repair: {
      garageEstimate: 61000,
      band: [22400, 31800],
      status: 'FAIL',
      note: 'Garage estimate is 91.8% above the top of the catalogue band — outside every comparable settled claim for this model'
    },
    policyRag: {
      score: 44,
      clauses: [
        { ref: 'Sec II(1)(a)', v: 'COVERED',  d: 'Accidental external means — own damage covered in principle' },
        { ref: 'Cond. 8',      v: 'REVIEW',   d: 'Claimant must furnish true particulars — evidence integrity in question' },
        { ref: 'Sec IV(3)',    v: 'DEDUCT',   d: 'Compulsory deductible ₹1,000 applied' },
        { ref: 'Dep. Sch.',    v: 'APPLIES',  d: 'No zero-dep add-on — 40% depreciation on plastic parts (vehicle age 6y)' }
      ]
    }
  },

  /* ============ 4 · FRAUD RING → RED, CAUGHT BY THE GRAPH ============ */
  ring: {
    key: 'ring',
    garageCode: 'G-4412',
    ref: 'CLM-20483',
    vehicle: 'Mahindra XUV700 AX7',
    reg: 'UP 16 BR 5521',
    title: 'Suspicious claim',
    blurb: 'Metadata inconsistency plus a duplicate network connection',
    chip: 'RED',
    policy: 'OG-27-1102-1801-00773310',
    incident: {
      cause: 'Hail and falling-debris damage in an overnight storm',
      city: 'Noida',
      locality: 'Sector 62, Noida',
      coords: '28.6272° N, 77.3720° E',
      hoursAgo: 9,
      thirdParty: false,
      fir: false
    },
    gate: {
      exif:      { status: 'WARN', v: 'Edited · re-encoded',       d: 'Metadata block present but rewritten by an editing app after capture. Original camera tags are gone from frames 2 and 3.' },
      gps:       { status: 'WARN', v: '14.6 km from FNOL location',d: 'Capture GPS sits well outside the 5 km incident radius and does not match the garage either' },
      recency:   { status: 'PASS', v: 'Captured 2 min ago',        d: 'Live-capture session, gallery upload disabled' },
      device:    { status: 'WARN', v: 'Two sensor profiles',       d: 'Frames 1 and 4 carry a different sensor noise signature to frames 2 and 3 — not one capture session' },
      diffusion: { status: 'PASS', v: 'Risk 0.03',                 d: 'No diffusion / GAN artefacts — the photographs themselves are real, they were simply not all taken here' },
      score: 31
    },
    doc: {
      score: 59,
      rc:      { status: 'PASS', v: 'UP 16 BR 5521',        d: 'RC extracted and matched against VAHAN' },
      chassis: { status: 'WARN', v: 'MAT•••••••••5521',     d: 'Chassis OCR matches the RC, but the plate frame was captured at a different location to the damage frames' },
      dl:      { status: 'PASS', v: 'Valid till Dec 2032',  d: 'Driving licence live and not suspended' },
      policy:  { status: 'WARN', v: 'ACTIVE · 2 priors',    d: 'Second claim on this policy in 90 days' },
      odo:     { status: 'WARN', v: '19,442 km',            d: 'Odometer reading is 2,100 km below the last recorded service entry' }
    },
    cv: {
      score: 55,
      cause: { status: 'WARN', v: 'Consistent but atypical', d: 'Dent distribution matches hail; dent diameter is uniform across panels, which hail rarely is' },
      parts: [
        { part: 'Roof panel',       action: 'REPAIR',  severity: 'Moderate', conf: 0.89, cost: 14600 },
        { part: 'Bonnet',           action: 'REPAIR',  severity: 'Moderate', conf: 0.87, cost: 8800  },
        { part: 'Windscreen',       action: 'REPLACE', severity: 'Major',    conf: 0.93, cost: 20200 },
        { part: 'Both ORVM covers', action: 'REVIEW',  severity: 'Unclear',  conf: 0.44, cost: 4200  }
      ],
      structural: false
    },
    fraud: {
      score: 6,
      ring: 0.81,
      duplicateMedia: 0,
      priorClaims90d: 2,
      sharedEntities: [
        'Garage G-4412 appears on 5 claims filed in a 9-day window',
        'Payout account ••••2260 shared across 4 of those 5 claims',
        'All 5 vehicles serviced at G-4412 within 30 days before their incidents'
      ],
      verdict: { status: 'FAIL', v: 'High · 0.81', d: 'Dense ring: one garage and one payout account tie five claims together inside nine days. No single claim looks wrong. The network does.' },
      graph: {
        nodes: [
          { id: 'C1', label: 'This claim',    type: 'claim',   x: 50, y: 30, risk: 'high' },
          { id: 'G1', label: 'Garage G-4412', type: 'garage',  x: 50, y: 58, risk: 'high' },
          { id: 'B1', label: 'A/c ••••2260',  type: 'bank',    x: 50, y: 88, risk: 'high' },
          { id: 'C2', label: 'Claim 90114',   type: 'claim',   x: 12, y: 42, risk: 'high' },
          { id: 'C3', label: 'Claim 90206',   type: 'claim',   x: 88, y: 42, risk: 'high' },
          { id: 'C4', label: 'Claim 90311',   type: 'claim',   x: 16, y: 76, risk: 'med'  },
          { id: 'C5', label: 'Claim 90402',   type: 'claim',   x: 84, y: 76, risk: 'high' },
          { id: 'P1', label: 'S. Ahluwalia',  type: 'person',  x: 50, y: 8,  risk: 'med'  }
        ],
        edges: [
          ['C1','P1'],['C1','G1'],['C2','G1'],['C3','G1'],['C4','G1'],['C5','G1'],
          ['C1','B1'],['C2','B1'],['C3','B1'],['C5','B1']
        ]
      }
    },
    repair: {
      garageEstimate: 47800,
      band: [38200, 44100],
      status: 'WARN',
      note: 'Estimate is 8.4% above the top of the catalogue band — close enough to look ordinary, which is the point'
    },
    policyRag: {
      score: 71,
      clauses: [
        { ref: 'Sec II(1)(d)', v: 'COVERED',  d: 'Storm, tempest, flood and falling objects — covered peril' },
        { ref: 'Add-on ZD',    v: 'APPLIES',  d: 'Zero-depreciation add-on active — nil depreciation on plastic/rubber' },
        { ref: 'Sec IV(3)',    v: 'DEDUCT',   d: 'Compulsory deductible ₹1,000 applied' },
        { ref: 'Cond. 8',      v: 'REVIEW',   d: 'Claim frequency on this policy warrants particulars verification' },
        { ref: 'Cond. 1',      v: 'REVIEW',   d: 'Notice of loss particulars must be true — capture location conflicts with the reported incident location' }
      ]
    }
  }
};

/* ------------------------------------------------------------------
   Background queue — claims that already exist in the ops console so
   it does not open empty. Lane mix follows the 65 / 25 / 10 split.
   ------------------------------------------------------------------ */
const CP_NAMES = ['Amit Verma','Sneha Gupta','Vikram Singh','Ananya Iyer','Karan Mehta',
  'Deepak Nair','Meera Joshi','Arjun Reddy','Kavya Menon','Rajesh Kumar','Nisha Bhatt',
  'Farhan Qureshi','Tanvi Desai','Manish Rawat','Divya Pillai','Sameer Khanna'];
const CP_VEHICLES = ['Maruti Baleno','Tata Punch','Kia Seltos','Honda Amaze','Mahindra XUV700',
  'Hyundai i20','Maruti Ertiga','Tata Tiago','Renault Kwid','Toyota Glanza'];
const CP_PLATES = ['MH 12','DL 08','KA 03','TS 09','GJ 05','TN 10','UP 32','RJ 14','WB 02','PB 10'];
const CP_CITIES = ['Pune','Delhi','Bengaluru','Hyderabad','Vadodara','Chennai','Lucknow','Jaipur','Kolkata','Ludhiana'];

const CP_GATE_LABELS = {
  exif:      'EXIF & camera metadata',
  gps:       'GPS vs incident location',
  recency:   'Capture recency',
  device:    'Sensor consistency',
  diffusion: 'Diffusion / GAN screen'
};

const CP_DOC_LABELS = {
  rc: 'RC vs VAHAN', chassis: 'Chassis plate OCR', dl: 'Driving licence',
  policy: 'Policy status', odo: 'Odometer reading'
};
