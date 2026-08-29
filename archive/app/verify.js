/* =====================================================================
   ClaimPulse · headless verification
   ---------------------------------------------------------------------
   Drives the real app in a browser and asserts the things that would
   embarrass us on stage:

     · the model still ties to the workbook
     · every surface renders with no console error
     · all four demo claims land in their expected lane
     · the Trust Score contributions sum to the displayed score
     · a filed claim reaches the ops queue
     · the ops override reaches the claimant's tracker
     · the simulator moves when a lever moves

   Run:  node verify.js          (add --headed to watch it)
   ===================================================================== */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'www');
const PORT = 5599;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

let failures = 0, checks = 0;
function ok(label, cond, detail) {
  checks++;
  if (cond) { console.log('  PASS  ' + label + (detail ? '  ' + detail : '')); }
  else { failures++; console.log('  FAIL  ' + label + (detail ? '  ' + detail : '')); }
}

function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      let f = path.join(ROOT, u === '/' ? 'index.html' : u);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, 'index.html');
      rq.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rq);
    });
    s.listen(PORT, () => res(s));
  });
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    permissions: [],
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  // A fresh room per run so a previous run's claims never leak in.
  const room = 'verify' + Date.now();
  await page.goto(`http://localhost:${PORT}/?room=${room}`);
  // Top-level `const` in a classic script is script-scoped, not a window
  // property, so these are probed as bare identifiers.
  await page.waitForFunction(
    () => typeof CPApp !== 'undefined' && typeof CPSync !== 'undefined' && CPSync.mode !== 'connecting',
    null, { timeout: 25000 });

  console.log('\n── model ─────────────────────────────────────────────');
  const sc = await page.evaluate(() => CPModel.selfCheck());
  ok('model ties to the workbook', sc.pass, sc.pass ? sc.checks + ' checks' : sc.failures.join(' | '));

  console.log('\n── sync ──────────────────────────────────────────────');
  const mode = await page.evaluate(() => CPSync.mode);
  ok('sync came up', mode === 'live' || mode === 'local', 'mode=' + mode);

  console.log('\n── surfaces render ───────────────────────────────────');
  for (const s of ['ops', 'inspector', 'garages', 'surveyors', 'claimant', 'decision']) {
    const before = errors.length;
    await page.evaluate(k => CPApp.go(k), s);
    await page.waitForTimeout(450);
    const html = await page.$eval('#v-' + s, e => e.innerHTML.length);
    ok('surface ' + s.padEnd(9) + ' renders', html > 150 && errors.length === before,
      html + ' chars' + (errors.length > before ? ' · ' + errors.slice(before).join(' | ') : ''));
  }

  console.log('\n── the four demo claims ──────────────────────────────');
  const EXPECT = { clean: 'G', ambiguous: 'A', synthetic: 'R', ring: 'R' };
  for (const [key, lane] of Object.entries(EXPECT)) {
    const r = await page.evaluate(k => {
      const c = CPEngine.process(k, null);
      const sum = Math.round(c.trust.parts.reduce((s, p) => s + p.contribution, 0) * 10) / 10;
      return { lane: c.lane, score: c.trust.score, sum, payable: c.money.payable,
               gateFail: c.gate.hardFail, ring: c.fraud.ring };
    }, key);
    ok(key.padEnd(10) + ' → ' + lane + ' lane', r.lane === lane,
       'got ' + r.lane + ' · score ' + r.score);
    ok(key.padEnd(10) + ' contributions sum to the score', Math.abs(r.sum - r.score) < 0.051,
       r.sum + ' vs ' + r.score);
  }

  // The corridor cap is the rule most likely to be quietly broken by a change.
  const cap = await page.evaluate(() => {
    const c = CPEngine.process('clean', null);
    return { lane: c.lane, payable: c.money.payable, limit: CP_CONST.SURVEYOR_EXEMPTION };
  });
  ok('a green claim stays inside the IRDAI corridor',
     cap.lane !== 'G' || cap.payable <= cap.limit,
     '₹' + cap.payable + ' vs ₹' + cap.limit);

  console.log('\n── the three primary demo claims ─────────────────');
  const SPEC = {
    clean:     { ref: 'CLM-20481', veh: 'Honda City',      amt: 18500, trust: 94, lane: 'G' },
    ambiguous: { ref: 'CLM-20482', veh: 'Hyundai Creta',   amt: 32400, trust: 72, lane: 'A' },
    ring:      { ref: 'CLM-20483', veh: 'Mahindra XUV700', amt: 47800, trust: 38, lane: 'R' }
  };
  for (const [key, want] of Object.entries(SPEC)) {
    const got = await page.evaluate(k => {
      const c = CPEngine.process(k, null);
      return { ref: c.ref, veh: c.policy.vehicle, amt: c.claimAmount,
               trust: c.trust.score, lane: c.lane,
               sum: Math.round(c.trust.parts.reduce((s, p) => s + p.contribution, 0) * 10) / 10,
               why: CPEngine.explain(c) };
    }, key);
    ok(want.ref + ' is ' + want.veh, got.ref === want.ref && got.veh.indexOf(want.veh) === 0,
       got.ref + ' / ' + got.veh);
    ok(want.ref + ' claims ' + want.amt, got.amt === want.amt, 'got ' + got.amt);
    ok(want.ref + ' scores ' + want.trust + ' into ' + want.lane,
       Math.round(got.trust) === want.trust && got.lane === want.lane,
       got.trust + ' / ' + got.lane);
    ok(want.ref + ' contributions sum to the score', Math.abs(got.sum - got.trust) < 0.051,
       got.sum + ' vs ' + got.trust);
    ok(want.ref + ' explains itself in words',
       got.why.length >= 3 && got.why[0].indexOf(
         want.lane === 'G' ? 'GREEN' : want.lane === 'A' ? 'AMBER' : 'RED') > 0,
       got.why.length + ' sentences');
  }

  console.log('\n── claim lifecycle ───────────────────────────────');
  const life = await page.evaluate(() => {
    const fresh = CPEngine.process('clean', null);
    const now = Date.now(), t = new Date(fresh.ts).getTime();
    const at = ms => CPEngine.stageOf(
      Object.assign({}, fresh, { ts: new Date(t - ms).toISOString() }), now);
    const amber = CPEngine.process('ambiguous', null);
    const red = CPEngine.process('ring', null);
    const aged = c => Object.assign({}, c, { ts: new Date(t - 60000).toISOString() });
    return {
      gate: at(100).k, engines: at(2000).k, routing: at(4500).k,
      paying: at(9000).k, settled: at(200000).k,
      undecided: at(100).decided,
      assist: CPEngine.stageOf(aged(amber), now),
      siu: CPEngine.stageOf(aged(red), now),
      statusNew: CPEngine.statusOf(fresh),
      statusAmber: CPEngine.statusOf(aged(amber)),
      statusRed: CPEngine.statusOf(aged(red)),
      prioRed: CPEngine.priorityOf(aged(red)).k
    };
  });
  ok('a new claim starts at Gate 00', life.gate === 'gate', life.gate);
  ok('it moves onto the engines', life.engines === 'engines', life.engines);
  ok('then to routing', life.routing === 'routing', life.routing);
  ok('a green claim pays out, then settles',
     life.paying === 'settling' && life.settled === 'settled', life.paying + ' then ' + life.settled);
  ok('no lane is shown before routing reaches it', life.undecided === false);
  ok('an amber claim waits on a reviewer',
     life.assist.k === 'assist' && life.assist.needsHuman === true, life.assist.waitingOn);
  ok('a red claim waits on investigation',
     life.siu.k === 'investigate' && life.siu.needsHuman === true, life.siu.waitingOn);
  ok('the desk status vocabulary maps correctly',
     life.statusNew === 'New' && life.statusAmber === 'Awaiting Review'
     && life.statusRed === 'Investigation',
     [life.statusNew, life.statusAmber, life.statusRed].join(' / '));
  ok('a red claim is high priority', life.prioRed === 'high', life.prioRed);

  console.log('\n── the command centre ────────────────────────────');
  await page.evaluate(() => CPApp.go('inspector'));
  // Seeding 21 claims is 21 round trips. Wait for the desk to actually fill
  // rather than asserting against a queue that is still arriving.
  await page.waitForFunction(() => CPSync.all().length >= 20, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  const board = await page.evaluate(() => {
    const b = { assessing: 0, assist: 0, settling: 0, done: 0 };
    CPSync.all().forEach(c => b[CPEngine.stageOf(c).bucket]++);
    return {
      b, buckets: Object.values(b).filter(n => n > 0).length,
      total: CPSync.all().length,
      tiles: document.querySelectorAll('#execBand .stat').length,
      leads: document.querySelectorAll('#execLead .lead').length,
      segs: document.querySelectorAll('#lanePanel .dseg').length,
      layers: document.querySelectorAll('#autoPanel .ly').length,
      selects: document.querySelectorAll('#filterRail select').length,
      rows: document.querySelectorAll('#queueTable .crow').length,
      cols: document.querySelectorAll('#queueTable thead th').length,
      primary: CPSync.all().filter(c => c.primary).length
    };
  });
  ok('the desk is seeded with a real workload', board.total >= 20, board.total + ' claims');
  ok('the three primary claims are on the board', board.primary === 3, board.primary + ' found');
  ok('work is spread across the lifecycle', board.buckets >= 2, JSON.stringify(board.b));
  ok('three lead figures sit above the band', board.leads === 3, board.leads + ' leads');
  ok('eight supporting metrics below them', board.tiles === 8, board.tiles + ' tiles');
  ok('the lane distribution renders three segments', board.segs === 3, board.segs);
  ok('the three automation layers render', board.layers === 3, board.layers);
  ok('the filter rail offers the primary filters', board.selects >= 6, board.selects + ' selects');
  ok('the queue table carries the columns a picker needs', board.cols === 10, board.cols + ' columns');
  ok('every claim has a row', board.rows === board.total, board.rows + ' / ' + board.total);

  // Filters have to actually filter, and the counts have to agree with the
  // predicate rather than with a number somebody cached.
  const filt = await page.evaluate(() => {
    const out = {};
    CPOps.setF('lane', 'R');
    out.red = { shown: document.querySelectorAll('#queueTable .crow').length,
                want: CPSync.all().filter(c => CPEngine.stageOf(c).decided && c.lane === 'R').length };
    CPOps.setF('lane', 'all');
    CPOps.setF('amount', 'c');
    out.band = { shown: document.querySelectorAll('#queueTable .crow').length,
                 want: CPSync.all().filter(c => CPEngine.bandOf(c.claimAmount).k === 'c').length };
    CPOps.setF('amount', 'all');
    CPOps.setF('survey', 'yes');
    out.survey = { shown: document.querySelectorAll('#queueTable .crow').length,
                   want: CPSync.all().filter(c => c.surveyor && c.surveyor.required).length };
    CPOps.clearFilters();
    out.cleared = document.querySelectorAll('#queueTable .crow').length;
    out.all = CPSync.all().length;
    return out;
  });
  ok('the risk-lane filter is exact', filt.red.shown === filt.red.want && filt.red.want > 0,
     filt.red.shown + ' of ' + filt.red.want);
  ok('the amount-band filter is exact', filt.band.shown === filt.band.want && filt.band.want > 0,
     filt.band.shown + ' of ' + filt.band.want);
  ok('the survey-required filter is exact', filt.survey.shown === filt.survey.want,
     filt.survey.shown + ' of ' + filt.survey.want);
  ok('clearing filters restores every claim', filt.cleared === filt.all,
     filt.cleared + ' / ' + filt.all);

  // Free-text search across the fields a desk actually types into.
  const search = await page.evaluate(() => {
    CPOps.setQ('CLM-20483');
    const n = document.querySelectorAll('#queueTable .crow').length;
    CPOps.clearFilters();
    return n;
  });
  ok('searching a claim reference finds exactly it', search === 1, search + ' rows');

  console.log('\n── the claim inspector ───────────────────────────');
  const insp = await page.evaluate(() => {
    CPApp.go('inspector');
    const c = CPSync.all().find(x => x.ref === 'CLM-20482');
    CPOps.open(c.id);
    return c.id;
  });
  await page.waitForTimeout(700);
  const ins = await page.evaluate(() => ({
    surface: CPApp.surface,
    journey: document.querySelectorAll('#inspBody .jst').length,
    why: (document.querySelector('#inspBody .why') || {}).textContent || '',
    engines: document.querySelectorAll('#inspBody .card.engine').length,
    facts: document.querySelectorAll('#inspBody .fct').length,
    fuse: document.querySelectorAll('#inspBody .fuse .f').length
  }));
  ok('clicking a claim opens the inspector', ins.surface === 'inspector', ins.surface);
  ok('the journey shows all eight stages', ins.journey === 8, ins.journey + ' steps');
  ok('the inspector explains the lane in words',
     /Why this claim is AMBER/.test(ins.why) && ins.why.length > 400, ins.why.length + ' chars');
  ok('all five engines are on screen', ins.engines === 5, ins.engines + ' engine cards');
  ok('the overview strip carries the claim facts', ins.facts === 6, ins.facts);
  ok('the fusion table shows five signals', ins.fuse === 5, ins.fuse);

  // An engine card has to open and show its working.
  const expand = await page.evaluate(() => {
    CPInspector.toggle('fraud');
    return { body: document.querySelectorAll('#inspBody .ebody').length,
             graph: document.querySelectorAll('#inspBody .graph .gnode').length };
  });
  ok('an engine card expands to its evidence', expand.body >= 2 && expand.graph > 0,
     expand.body + ' open · ' + expand.graph + ' graph nodes');

  console.log('\n── surveyor dispatch ─────────────────────────────');
  const red = await page.evaluate(() => {
    CPApp.go('inspector');
    const c = CPSync.all().find(x => x.ref === 'CLM-20483');
    CPOps.open(c.id);
    return c.id;
  });
  await page.waitForTimeout(700);
  const roster = await page.evaluate(() => ({
    listed: document.querySelectorAll('#inspBody .sv').length,
    hasDistance: /km away/.test(document.querySelector('#inspBody .sv-meta').textContent),
    status: CPEngine.statusOf(CPSync.all().find(x => x.ref === 'CLM-20483'))
  }));
  ok('a red claim offers a surveyor roster', roster.listed > 0, roster.listed + ' surveyors');
  ok('each surveyor shows a computed distance', roster.hasDistance);
  ok('an unassigned red claim reads Investigation', roster.status === 'Investigation', roster.status);

  await page.evaluate(() => {
    const first = document.querySelector('#inspBody .sv:not(.full)');
    first.click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => CPInspector.assign());
  await page.waitForTimeout(1600);
  const booked = await page.evaluate(() => {
    const c = CPSync.all().find(x => x.ref === 'CLM-20483');
    return { survey: c.survey, status: CPEngine.statusOf(c),
             shown: /Survey appointment|Scheduled/.test(document.querySelector('#inspBody').textContent) };
  });
  ok('assigning a surveyor writes to the claim',
     !!(booked.survey && booked.survey.name && booked.survey.date), JSON.stringify(booked.survey || {}));
  ok('the claim status becomes Survey Scheduled', booked.status === 'Survey Scheduled', booked.status);
  ok('the inspector shows the booking', booked.shown);

  // The point of one shared store: the customer's phone learns about it too.
  const onPhone = await page.evaluate(() => {
    const c = CPSync.all().find(x => x.ref === 'CLM-20483');
    return !!(c.survey && c.survey.slot && c.survey.surveyorId);
  });
  ok('the appointment is on the shared claim the customer app reads', onPhone);

  console.log('\n── file a claim end to end ───────────────────────────');
  await page.evaluate(() => { CPApp.setScenario('clean'); CPApp.go('claimant'); });
  await page.waitForTimeout(300);
  const startStep = await page.evaluate(() => CPClaimant.step);
  ok('the demo switcher lands on the matching vehicle', startStep === 1, 'step ' + startStep);
  // vehicle → what happened → where and when → capture
  for (let i = 0; i < 3; i++) { await page.click('#phFoot .btn'); await page.waitForTimeout(420); }
  const atCapture = await page.evaluate(() => CPClaimant.step);
  ok('the guided flow reaches live capture', atCapture === 4, 'step ' + atCapture);
  await page.waitForTimeout(500);
  for (let i = 0; i < 4; i++) { await page.click('#phFoot .btn'); await page.waitForTimeout(340); }
  const shots = await page.$$eval('#shotStrip .shot.done', e => e.length);
  ok('four frames captured', shots === 4, shots + ' / 4');

  await page.click('#phFoot .btn');                       // submit
  // The point of filing before the pipeline animates: the claim is on the
  // board, mid-assessment, while the claimant is still watching it run.
  await page.waitForTimeout(1200);
  const midflight = await page.evaluate(() => {
    const c = CPSync.all().find(x => !x.seeded);
    return c ? CPEngine.stageOf(c).bucket : 'absent';
  });
  ok('a filed claim reaches the board mid-assessment', midflight === 'assessing', midflight);
  await page.waitForTimeout(7000);
  const step = await page.$eval('#phTitle', e => e.textContent);
  ok('pipeline reached the customer outcome', /verified|review|verification/i.test(step),
     'title=' + step);
  const cust = await page.$eval('#phBody', e => e.textContent);
  ok('the green customer is told it is verified, with no score',
     /verified/i.test(cust) && !/Trust Score/i.test(cust),
     'score leaked to the customer: ' + /Trust Score/i.test(cust));

  const q = await page.evaluate(() => ({
    filed: CPSync.all().filter(c => !c.seeded).length,
    seeded: CPSync.all().filter(c => c.seeded).length,
    mode: CPSync.mode
  }));
  ok('claim reached the shared queue', q.filed >= 1, q.filed + ' filed');
  // The seeds are written after sync comes up; if they vanish, the console
  // opens bare on stage.
  ok('the ops queue was seeded', q.seeded >= 20, q.seeded + ' seeded claims');
  // A write that Firestore rejects silently drops the whole demo to local.
  // The nested-array edge list did exactly that, so this is now asserted.
  ok('sync survived the writes', q.mode === 'live' || mode === 'local',
     'mode=' + q.mode + ' (started ' + mode + ')');

  // Round-tripping through the store must not lose the fraud graph.
  const graph = await page.evaluate(() => {
    const c = CPSync.all().find(x => x.fraud && x.fraud.graph);
    return c ? { nodes: c.fraud.graph.nodes.length, edges: c.fraud.graph.edges.length } : null;
  });
  ok('the fraud graph survives the round trip',
     graph && graph.nodes > 0 && graph.edges > 0, JSON.stringify(graph));

  console.log('\n── ops override reaches the claimant ─────────────────');
  await page.evaluate(() => CPApp.go('claimant'));
  await page.click('#phFoot .btn');                       // → tracker
  await page.waitForTimeout(400);
  const id = await page.evaluate(() => CPSync.all().find(c => !c.seeded).id);
  await page.evaluate(i => CPOps.override(i, 'R'), id);
  await page.waitForTimeout(1800);
  const tracker = await page.$eval('#phBody', e => e.textContent);
  ok('override pushed to the tracker', /reviewer|Updated by/i.test(tracker));

  console.log('\n── simulator ─────────────────────────────────────────');
  await page.evaluate(() => { CPApp.go('decision'); CPDecision.show('sim'); });
  await page.waitForTimeout(400);
  const sim = await page.evaluate(() => {
    const before = CPModel.run('base').net;
    CPSim.set('B02_touchesToday', 3);
    const after = document.querySelector('#simBody').textContent;
    CPSim.reset();
    return { before, moved: after.length > 0 };
  });
  ok('a lever move recomputes the case', sim.moved);

  const stress = await page.evaluate(() => ({
    D: CPModel.stress('D').net, npv: CPModel.stress('D').npv5
  }));
  ok('correlated stress case D still positive', stress.D > 0 && stress.npv > 0,
     '₹' + stress.D.toFixed(2) + ' Cr · NPV ₹' + stress.npv.toFixed(2) + ' Cr');

  /* The stage moment: a judge files on their handset, it lands on the
     projected console. Two independent browser contexts — separate
     storage, separate everything — so this can only pass over the wire. */
  console.log('\n── cross-device sync ─────────────────────────────────');
  if (mode === 'live') {
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const projector = await ctx2.newPage();
    await projector.goto(`http://localhost:${PORT}/?room=${room}`);
    await projector.waitForFunction(
      () => typeof CPSync !== 'undefined' && CPSync.mode !== 'connecting', null, { timeout: 25000 });

    const before = await projector.evaluate(() => CPSync.all().length);
    const marker = 'CROSSDEV-' + Date.now();
    await page.evaluate(async m => {
      const c = CPEngine.process('ring', null);
      c.policy = Object.assign({}, c.policy, { holder: m });
      await CPSync.add(c);
    }, marker);

    let landed = false;
    for (let i = 0; i < 30 && !landed; i++) {
      await projector.waitForTimeout(500);
      landed = await projector.evaluate(m => CPSync.all().some(c => c.policy.holder === m), marker);
    }
    ok('a claim filed on device A reaches device B', landed,
       landed ? 'arrived on the second device' : 'never arrived');

    const after = await projector.evaluate(() => CPSync.all().length);
    ok('the second device saw the queue grow', after > before, before + ' → ' + after);
    await ctx2.close();
  } else {
    console.log('  SKIP  live sync unavailable in this environment');
  }

  console.log('\n── controlled pilot ──────────────────────────────');
  await page.evaluate(() => { CPApp.go('decision'); CPDecision.show('pilot'); CPPilot.resetCohort(); });
  await page.waitForTimeout(600);
  const p0 = await page.evaluate(() => ({
    phases: document.querySelectorAll('#pilotBody .phase').length,
    sources: document.querySelectorAll('#pilotBody .src').length,
    gates: document.querySelectorAll('#pilotBody .gatetbl tbody tr').length,
    kgroups: document.querySelectorAll('#pilotBody .kgrp').length,
    active: CPPilot.active,
    bar: !!document.querySelector('.pilotbar')
  }));
  ok('the pilot workspace renders three phases', p0.phases === 3, p0.phases + ' phases');
  ok('all four data sources are declared', p0.sources === 4, p0.sources + ' sources');
  ok('the success criteria table is populated', p0.gates === 5, p0.gates + ' criteria');
  ok('the KPI dashboard has operational, accuracy and capacity groups',
     p0.kgroups === 3, p0.kgroups + ' groups');
  ok('no pilot is running until one is started', p0.active === false && p0.bar === false);

  // Nothing in the criteria table may ever read as an achieved result.
  const gateWords = await page.evaluate(() =>
    document.querySelector('#pilotBody .gatetbl').textContent);
  ok('no success criterion claims to have passed',
     !/\bPASSED\b|\bACHIEVED\b|\bMET\b/i.test(gateWords));

  await page.evaluate(() => { CPPilot.start(); CPPilot.setDay(9); });
  await page.waitForTimeout(600);
  const p1 = await page.evaluate(() => ({
    active: CPPilot.active, phase: CPPilot.phase().no,
    bar: !!document.querySelector('.pilotbar'),
    barText: (document.querySelector('.pilotbar') || {}).textContent || ''
  }));
  ok('starting the pilot puts it in shadow mode', p1.active === true);
  ok('day 9 lands in phase 2, shadow testing', p1.phase === 2, 'phase ' + p1.phase);
  ok('the shadow strip is visible outside the pilot tab', p1.bar === true);
  ok('the strip says ClaimPulse does not decide',
     /recommends/i.test(p1.barText) && /decides/i.test(p1.barText));

  // A cohort is defined by what it excludes.
  const coh = await page.evaluate(() => {
    CPPilot.setCohort('amount', 'c');
    const inC = CPPilot.cohort().length;
    const want = CPSync.all().filter(c => CPEngine.bandOf(c.claimAmount).k === 'c').length;
    return { inC, want, all: CPSync.all().length, label: CPPilot.cohortLabel() };
  });
  ok('the cohort filter narrows the pilot exactly',
     coh.inC === coh.want && coh.inC < coh.all, coh.inC + ' of ' + coh.all);
  ok('the cohort describes itself in words', /50,000/.test(coh.label), coh.label);

  /* THE invariant. In shadow mode ClaimPulse recommends and the existing
     process decides, so recording a decision must not touch the lane. If
     this ever fails the pilot is measuring ClaimPulse against itself. */
  await page.evaluate(() => CPPilot.resetCohort());
  await page.waitForTimeout(300);
  const inv = await page.evaluate(async () => {
    const c = CPSync.all().find(x => x.ref === 'CLM-20482');
    const before = { lane: c.lane, tat: c.laneTat, touches: c.laneTouches, score: c.trust.score };
    await CPPilot.decide(c.id, 'G', 'Additional policy information verified manually.');
    await new Promise(r => setTimeout(r, 1200));
    const a = CPSync.all().find(x => x.ref === 'CLM-20482');
    return { before, after: { lane: a.lane, tat: a.laneTat, touches: a.laneTouches, score: a.trust.score },
             d: a.pilotDecision };
  });
  ok('recording a human decision does NOT move the recommendation',
     inv.after.lane === inv.before.lane && inv.after.tat === inv.before.tat
     && inv.after.touches === inv.before.touches && inv.after.score === inv.before.score,
     'lane ' + inv.before.lane + ' -> ' + inv.after.lane);
  ok('the decision is stored beside the recommendation',
     inv.d && inv.d.recommendation === 'A' && inv.d.lane === 'G' && inv.d.action === 'modified',
     JSON.stringify(inv.d && { rec: inv.d.recommendation, lane: inv.d.lane, act: inv.d.action }));
  ok('the override reason is captured', !!(inv.d && inv.d.reason.length > 10), inv.d && inv.d.reason);

  const m = await page.evaluate(() => CPPilot.metrics());
  ok('the pilot counts the override, not an agreement',
     m.judged === 1 && m.agreed === 0 && m.modified === 1, JSON.stringify(
       { judged: m.judged, agreed: m.agreed, modified: m.modified }));
  ok('an amber recommendation the officer greenlit counts as over-flagged',
     m.falsePos === 1 && m.falseNeg === 0, 'fp=' + m.falsePos + ' fn=' + m.falseNeg);
  ok('unjudged claims are excluded rather than counted as agreement',
     m.pending === m.scored - m.judged && m.pending > 0, m.pending + ' pending');

  // Agreeing with the recommendation is the other half.
  const agree = await page.evaluate(async () => {
    const c = CPSync.all().find(x => x.ref === 'CLM-20481');
    await CPPilot.decide(c.id, c.lane, '');
    await new Promise(r => setTimeout(r, 1200));
    return CPPilot.metrics();
  });
  ok('agreeing with a recommendation is recorded as agreement',
     agree.agreed === 1 && agree.judged === 2, 'agreed=' + agree.agreed);
  ok('the agreement rate is over judged claims only',
     Math.abs(agree.agreement - 0.5) < 0.001, agree.agreement);

  // An override with no reason is refused, because evaluation cannot use it.
  await page.evaluate(() => {
    CPApp.go('inspector');
    const c = CPSync.all().find(x => x.ref === 'CLM-20483');
    CPOps.open(c.id);
  });
  await page.waitForTimeout(700);
  const refuse = await page.evaluate(async () => {
    CPInspector.pickShadow('G');
    await new Promise(r => setTimeout(r, 300));
    const c = CPSync.all().find(x => x.ref === 'CLM-20483');
    await CPInspector.recordShadow(c.id);
    await new Promise(r => setTimeout(r, 800));
    return !!CPSync.all().find(x => x.ref === 'CLM-20483').pilotDecision;
  });
  ok('an override with no reason is refused', refuse === false);

  // The shadow panel must appear in the inspector, and say what it does not do.
  const panel = await page.evaluate(() => {
    const el = document.querySelector('#inspBody .card.shadow');
    return el ? el.textContent : '';
  });
  ok('the inspector shows the shadow-mode panel', panel.length > 200, panel.length + ' chars');
  ok('the panel states ClaimPulse does not settle',
     /does not settle|never touches the production path/i.test(panel));

  // Out-of-cohort claims are visibly excluded rather than silently scored.
  const outside = await page.evaluate(async () => {
    CPPilot.setCohort('city', 'Mumbai');
    CPApp.go('inspector');
    const c = CPSync.all().find(x => x.ref === 'CLM-20483');   // Noida
    CPOps.open(c.id);
    await new Promise(r => setTimeout(r, 600));
    const el = document.querySelector('#inspBody .card.shadow.out');
    CPPilot.resetCohort();
    return el ? el.textContent : '';
  });
  ok('a claim outside the cohort says so', /Not part of this pilot/i.test(outside));

  const cta = await page.evaluate(async () => {
    CPApp.go('decision'); CPDecision.show('impact');
    await new Promise(r => setTimeout(r, 600));
    return (document.querySelector('#impactBody') || {}).textContent || '';
  });
  ok('the business case offers a controlled pilot as the next step',
     /controlled pilot/i.test(cta));

  await page.evaluate(() => { CPPilot.stop(); CPApp.go('ops'); });
  await page.waitForTimeout(400);
  const stopped = await page.evaluate(() => !document.querySelector('.pilotbar'));
  ok('ending the pilot clears the shadow strip', stopped);

  console.log('\n── console ───────────────────────────────────────────');
  ok('no console errors', errors.length === 0, errors.slice(0, 4).join(' | '));

  console.log('\n' + '─'.repeat(54));
  console.log(failures ? `  ${failures} of ${checks} checks FAILED` : `  all ${checks} checks passed`);
  console.log('─'.repeat(54) + '\n');

  await browser.close();
  server.close();
  process.exit(failures ? 1 : 0);
})();
