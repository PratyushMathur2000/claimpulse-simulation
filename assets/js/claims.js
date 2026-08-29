/* =====================================================================
   ClaimPulse · Claim store
   ---------------------------------------------------------------------
   Six hand-built claims that each demonstrate one routing behaviour, and
   a reproducible queue behind them so the command centre has real
   volume to sort and filter.

   NOTHING ABOUT THE BOOK IS TYPED HERE. Lane shares, lane TAT, lane
   touches and the surveyor corridor all come from CPModel, which reads
   the workbook. Change an input on Sheet 1 and this demo moves with it.

   The generator is seeded, so the same queue appears every time the page
   is opened. A demo that reshuffles itself between rehearsal and the
   room is a demo that will surprise you in the room.
   ===================================================================== */

const CPClaims = (() => {

  /* ---------- deterministic PRNG (mulberry32) ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const R = rng(20260828);
  const pick = a => a[Math.floor(R() * a.length)];
  const between = (lo, hi) => lo + R() * (hi - lo);
  const inti = (lo, hi) => Math.round(between(lo, hi));

  const NAMES = ['Rohan Deshmukh','Priya Iyer','Aftab Sheikh','Sneha Kulkarni','Vikram Malhotra',
    'Ananya Ghosh','Deepak Nair','Meera Joshi','Arjun Reddy','Kavya Menon','Rajesh Kumar',
    'Nisha Bhatt','Farhan Qureshi','Tanvi Desai','Manish Rawat','Divya Pillai','Sameer Khanna',
    'Ritu Agarwal','Karthik Rao','Simran Kaur'];
  const CARS = [['Maruti','Swift'],['Hyundai','Creta'],['Tata','Nexon'],['Mahindra','XUV700'],
    ['Honda','City'],['Kia','Seltos'],['Hyundai','i20'],['Maruti','Ertiga'],['Tata','Tiago'],
    ['Renault','Kwid'],['Toyota','Glanza'],['Maruti','Baleno'],['Skoda','Slavia']];
  const CITIES = ['Mumbai','Pune','Ahmedabad','Delhi','Noida','Bengaluru','Hyderabad',
    'Vadodara','Chennai','Lucknow','Jaipur','Kolkata','Surat','Nagpur'];
  const CAUSES = ['Rear-end collision','Side impact at a junction','Parked-vehicle damage',
    'Kerb strike','Hail and falling debris','Waterlogging ingress','Single-vehicle skid'];

  const GARAGES = {
    'G-1180': { code:'G-1180', name:'Sai Motors Authorised Service', city:'Andheri East, Mumbai', tier:'Preferred', rating:4.6 },
    'G-2207': { code:'G-2207', name:'Bodakdev Auto Works',           city:'Bodakdev, Ahmedabad',  tier:'Network',   rating:4.1 },
    'G-3391': { code:'G-3391', name:'Rohini Crash Repairs',          city:'Rohini, Delhi',        tier:'Network',   rating:3.4 },
    'G-4412': { code:'G-4412', name:'Sector 62 Motor Care',          city:'Sector 62, Noida',     tier:'Preferred', rating:4.4 },
    'G-5530': { code:'G-5530', name:'Kothrud Bodyshop',              city:'Kothrud, Pune',        tier:'Network',   rating:4.2 },
    'G-6621': { code:'G-6621', name:'Whitefield Auto Point',         city:'Whitefield, Bengaluru',tier:'Preferred', rating:4.5 }
  };

  const PANELS = ['Front bumper','Rear bumper','Bonnet','Left front door','Right front door',
    'Left fender','Right fender','Tailgate','Headlamp assembly','Windscreen','Radiator support',
    'Left quarter panel'];

  const CLAUSES_OK = [
    { ref:'Sec. I',      name:'Own Damage cover',            status:'APPLIES',  note:'In force on the date of loss.' },
    { ref:'Add-on ZD',   name:'Zero depreciation',           status:'APPLIES',  note:'Purchased at inception; parts settled at full value.' },
    { ref:'Dep. Sch.',   name:'Depreciation schedule',       status:'APPLIES',  note:'Waived while the zero-depreciation add-on is live.' },
    { ref:'Excl. 4(c)',  name:'Consequential loss',          status:'N/A',      note:'No consequential loss claimed.' }
  ];
  const CLAUSES_DEP = [
    { ref:'Sec. I',      name:'Own Damage cover',            status:'APPLIES',  note:'In force on the date of loss.' },
    { ref:'Dep. Sch.',   name:'Depreciation, 3–4 year band', status:'APPLIES',  note:'30% on plastic and rubber parts.' },
    { ref:'Excl. 4(c)',  name:'Consequential loss',          status:'N/A',      note:'No consequential loss claimed.' }
  ];
  const CLAUSES_EXCL = [
    { ref:'Sec. I',      name:'Own Damage cover',            status:'APPLIES',  note:'In force on the date of loss.' },
    { ref:'Excl. 2(a)',  name:'Wear, tear and mechanical breakdown', status:'EXCLUDED',
      note:'The wording excludes mechanical breakdown absent an external impact. The reported cause is a breakdown.' }
  ];

  const now = new Date('2026-08-28T09:12:00+05:30');
  const ago = h => new Date(+now - h * 3600e3);

  function panels(n, lo, hi, conf) {
    const used = [];
    for (let i = 0; i < n; i++) {
      let p; do { p = pick(PANELS); } while (used.some(u => u.name === p));
      used.push({ name: p, cost: Math.round(between(lo, hi) / 100) * 100,
                  conf: +(conf ? conf : between(0.86, 0.98)).toFixed(2) });
    }
    return used;
  }

  const cleanGate = () => ({ live:true, exif:true, time:true, gps:true, synth:true, recap:true });
  const cleanDoc  = (km) => ({ vahan:true, vin:true, odo:true, odoKm:km, fir:true, dl:true, confidence:0.97 });
  const cleanFraud= () => ({ ringScore:0.04, priorRing:false, sharedNodes:0, garageFlag:false,
                             garageClaims:3, dupHash:false, earlyClaim:false, daysSinceInception:406 });

  function policyFor(kind, idn) {
    if (kind === 'excl') return { no:'OG-27-1102-1801-00' + idn, clauses:CLAUSES_EXCL,
      zeroDep:false, depRate:0.30, deductible:1000 };
    if (kind === 'dep')  return { no:'OG-27-1102-1801-00' + idn, clauses:CLAUSES_DEP,
      zeroDep:false, depRate:0.30, deductible:1000 };
    return { no:'OG-27-1102-1801-00' + idn, clauses:CLAUSES_OK, zeroDep:true, depRate:0, deductible:1000 };
  }

  /* ---------------------------------------------------------------
     THE SIX STORY CLAIMS · one behaviour each
     --------------------------------------------------------------- */
  const STORY = [
    /* 1 · the green lane working exactly as designed */
    (() => {
      const p = panels(2, 7000, 12000, 0.96);
      const est = p.reduce((s, x) => s + x.cost, 0);
      return {
        id:'CLM-8841207', story:'Green lane · auto-settled',
        claimant:'Priya Iyer', city:'Pune', vehicle:{make:'Hyundai',model:'i20',reg:'MH12 QR 4471',year:2023},
        cause:'Parked-vehicle damage', reportedAt: ago(3.2), garage: GARAGES['G-5530'],
        policy: policyFor('ok','234567'),
        gate: cleanGate(), doc: cleanDoc(31480), cv:{ parts:p, consistent:true },
        fraud: cleanFraud(), repair:{ band:[Math.round(est*0.88), Math.round(est*1.12)], garageEstimate: est }
      };
    })(),

    /* 2 · clean, but over the IRDAI corridor — cannot auto-settle */
    (() => {
      const p = panels(4, 14000, 22000, 0.94);
      const est = p.reduce((s, x) => s + x.cost, 0);
      return {
        id:'CLM-8841233', story:'Capped by the ₹50,000 corridor',
        claimant:'Vikram Malhotra', city:'Delhi', vehicle:{make:'Mahindra',model:'XUV700',reg:'DL8C AN 9902',year:2024},
        cause:'Side impact at a junction', reportedAt: ago(6.8), garage: GARAGES['G-3391'],
        policy: policyFor('ok','891245'),
        gate: cleanGate(), doc: cleanDoc(18240), cv:{ parts:p, consistent:true },
        fraud: cleanFraud(), repair:{ band:[Math.round(est*0.9), Math.round(est*1.1)], garageEstimate: est }
      };
    })(),

    /* 3 · gallery upload — Gate 00 hard fail, zero model calls */
    (() => {
      const p = panels(3, 9000, 16000, 0.71);
      const est = p.reduce((s, x) => s + x.cost, 0);
      return {
        id:'CLM-8841260', story:'Gate 00 hard fail · no model called',
        claimant:'Farhan Qureshi', city:'Lucknow', vehicle:{make:'Honda',model:'City',reg:'UP32 DK 1188',year:2021},
        cause:'Rear-end collision', reportedAt: ago(11.4), garage: GARAGES['G-2207'],
        policy: policyFor('dep','445901'),
        gate:{ live:false, exif:false, time:true, gps:false, synth:true, recap:true },
        doc:{ vahan:true, vin:false, odo:false, odoKm:0, fir:true, dl:true, confidence:0.62 },
        cv:{ parts:p, consistent:true }, fraud: cleanFraud(),
        repair:{ band:[Math.round(est*0.85), Math.round(est*1.15)], garageEstimate: est }
      };
    })(),

    /* 4 · the claim is clean; the network around it is not */
    (() => {
      const p = panels(3, 11000, 17000, 0.93);
      const est = p.reduce((s, x) => s + x.cost, 0);
      return {
        id:'CLM-8841288', story:'Fraud-graph ring flag',
        claimant:'Manish Rawat', city:'Noida', vehicle:{make:'Maruti',model:'Baleno',reg:'UP16 BJ 7745',year:2022},
        cause:'Kerb strike', reportedAt: ago(19.1), garage: GARAGES['G-3391'],
        policy: policyFor('dep','773310'),
        gate: cleanGate(), doc: cleanDoc(64110), cv:{ parts:p, consistent:true },
        fraud:{ ringScore:0.52, priorRing:true, sharedNodes:4, garageFlag:true, garageClaims:19,
                dupHash:false, earlyClaim:true, daysSinceInception:23 },
        repair:{ band:[Math.round(est*0.88), Math.round(est*1.12)], garageEstimate: Math.round(est*1.34) }
      };
    })(),

    /* 5 · damage does not match the story */
    (() => {
      const p = panels(3, 12000, 19000, 0.9);
      const est = p.reduce((s, x) => s + x.cost, 0);
      return {
        id:'CLM-8841301', story:'Damage pattern contradicts the cause',
        claimant:'Sameer Khanna', city:'Jaipur', vehicle:{make:'Kia',model:'Seltos',reg:'RJ14 PT 3320',year:2023},
        cause:'Hail and falling debris', reportedAt: ago(26.5), garage: GARAGES['G-2207'],
        policy: policyFor('ok','118844'),
        gate: cleanGate(), doc: cleanDoc(27700), cv:{ parts:p, consistent:false },
        fraud:{ ringScore:0.18, priorRing:false, sharedNodes:0, garageFlag:false, garageClaims:6,
                dupHash:true, earlyClaim:false, daysSinceInception:512 },
        repair:{ band:[Math.round(est*0.86), Math.round(est*1.14)], garageEstimate: est }
      };
    })(),

    /* 6 · covered peril? the wording says no */
    (() => {
      const p = panels(2, 15000, 21000, 0.92);
      const est = p.reduce((s, x) => s + x.cost, 0);
      return {
        id:'CLM-8841319', story:'Policy exclusion found in the wording',
        claimant:'Ritu Agarwal', city:'Nagpur', vehicle:{make:'Tata',model:'Nexon',reg:'MH31 FF 6650',year:2020},
        cause:'Single-vehicle skid', reportedAt: ago(33.9), garage: GARAGES['G-6621'],
        policy: policyFor('excl','990177'),
        gate: cleanGate(), doc: cleanDoc(88950), cv:{ parts:p, consistent:true },
        fraud: cleanFraud(),
        repair:{ band:[Math.round(est*0.9), Math.round(est*1.1)], garageEstimate: est }
      };
    })()
  ];

  /* ---------------------------------------------------------------
     THE QUEUE · reproducible volume behind the six
     Lane shares are NOT forced here — claims are generated with
     realistic evidence quality and the engine routes them. The
     resulting mix lands close to B-03/B-04/B-05 because the evidence
     distribution was tuned to, not because the answer was written in.
     --------------------------------------------------------------- */
  /* Evidence profiles. These shape what arrives at the gate — they do
     NOT set the lane. Every claim below is still scored by the engine
     and routed on its own Trust Score, its own settlement amount and
     the IRDAI corridor. The mix that comes out lands near B-03/B-04/B-05
     because the input distribution was tuned to it, not because the
     answer was written in. */
  const PROFILES = [
    { p: 0.04, kind: 'gate'  },   // gallery upload, stripped EXIF
    { p: 0.03, kind: 'ring'  },   // clean claim, dirty network
    { p: 0.03, kind: 'cv'    },   // damage contradicts the story
    { p: 0.02, kind: 'excl'  },   // the wording excludes it
    { p: 0.08, kind: 'soft'  },   // two or three inconclusive signals
    { p: 0.15, kind: 'big'   },   // clean, but over the corridor
    { p: 1.00, kind: 'clean' }
  ];
  function profile() {
    const r = R(); let acc = 0;
    for (const x of PROFILES) { acc += x.p; if (r < acc) return x.kind; }
    return 'clean';
  }

  function generate(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const kind = profile();
      const car = pick(CARS), city = pick(CITIES);
      const gcode = pick(Object.keys(GARAGES));
      const big = kind === 'big';
      const p = panels(big ? inti(3, 5) : inti(1, 3),
                       big ? 17000 : 5200, big ? 27000 : 12000,
                       kind === 'soft' ? 0.90 : null);
      const est = p.reduce((s, x) => s + x.cost, 0);
      const soft = kind === 'soft';

      out.push({
        id: 'CLM-88' + (41340 + i * 7),
        claimant: pick(NAMES), city,
        vehicle: { make: car[0], model: car[1], year: inti(2018, 2025),
          reg: pick(['MH','DL','KA','GJ','UP','TN','RJ','WB']) + inti(10,49) + ' ' +
               String.fromCharCode(65+inti(0,25)) + String.fromCharCode(65+inti(0,25)) + ' ' + inti(1000,9999) },
        cause: pick(CAUSES),
        reportedAt: ago(between(0.4, 96)),
        garage: GARAGES[gcode],
        policy: policyFor(kind === 'excl' ? 'excl' : (big || R() < 0.5 ? 'ok' : 'dep'),
                          String(inti(100000, 999999))),
        gate: kind === 'gate'
          ? { live:false, exif:R()<0.5, time:true, gps:R()<0.5, synth:true, recap:true }
          : { live:true, exif:!soft, time:true, gps:!soft, synth:true, recap:true },
        doc: { vahan:true, vin:!soft, odo:!soft, odoKm:inti(8000, 120000),
               fir:true, dl:true, confidence:+between(soft ? 0.80 : 0.90, 0.99).toFixed(2) },
        cv: { parts:p, consistent: kind !== 'cv' },
        fraud: (kind === 'ring')
          ? { ringScore:+between(0.38,0.62).toFixed(2), priorRing:true, sharedNodes:inti(2,6),
              garageFlag:true, garageClaims:inti(12,22), dupHash:R()<0.4, earlyClaim:true,
              daysSinceInception:inti(9,40) }
          : { ringScore:+between(0.01, soft ? 0.28 : 0.14).toFixed(2), priorRing:false, sharedNodes:0,
              garageFlag:soft && R()<0.5, garageClaims:inti(2,7), dupHash:false,
              earlyClaim:false, daysSinceInception:inti(60, 700) },
        repair: { band:[Math.round(est*0.88), Math.round(est*1.12)],
                  garageEstimate: Math.round(est * (R() < 0.15 ? between(1.15,1.4) : between(0.94,1.08))) }
      });
    }
    return out;
  }

  const RAW = STORY.concat(generate(58));
  let PROCESSED = null;

  function all() {
    if (!PROCESSED) PROCESSED = RAW.map(c => CPEngine.process(c));
    return PROCESSED;
  }
  function byId(id) { return all().find(x => x.claim.id === id); }
  function stories() { return all().filter(x => x.claim.story); }

  /* Lane counts across the demo desk — used by the command centre and
     checked against the book shares on screen, honestly, including when
     they differ because 64 claims is a small sample. */
  function laneCounts() {
    const c = { G:0, A:0, R:0 };
    all().forEach(x => c[x.lane]++);
    return c;
  }

  return { all, byId, stories, laneCounts, GARAGES, RAW };
})();
