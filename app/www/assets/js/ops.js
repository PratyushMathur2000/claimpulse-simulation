/* =====================================================================
   ClaimPulse · Claims Command Center
   ---------------------------------------------------------------------
   The screen a claims manager opens at 09:00. It answers, in this order:

     how much work is on the desk       — the executive band
     how is it distributed              — lanes and automation
     which of it needs me               — the filter rail
     which claim, exactly               — the queue table

   Clicking any row hands off to the Claim Inspector, which is where the
   "why" lives. Nothing here is stored: every counter is derived from the
   shared claim store, so a claim filed on a handset moves these numbers
   without a refresh and without anything being computed twice.
   ===================================================================== */

const CPOps = (() => {

  let claims = [];
  let selected = null;
  let streaming = false;
  let streamTimer = null;
  let tick = null;
  let lastSig = '';
  let moreFilters = false;

  const $ = UI.$;
  const st = (c) => CPEngine.stageOf(c);

  /* Every filter is one entry. Adding a filter is adding a row here, not a
     new branch in the render path. */
  const F = {
    q: '', status: 'all', lane: 'all', amount: 'all', age: 'all', city: 'all',
    vehicle: 'all', survey: 'all', surveyor: 'all', fraud: 'all',
    policy: 'all', garage: 'all'
  };

  const AGE_BANDS = [
    { k: 'h1',  nm: 'Under 1 hour', test: h => h < 1 },
    { k: 'h24', nm: '1 - 24 hours', test: h => h >= 1 && h < 24 },
    { k: 'd3',  nm: '1 - 3 days',   test: h => h >= 24 && h < 72 },
    { k: 'd3p', nm: 'Over 3 days',  test: h => h >= 72 }
  ];

  const ageHours = c => (Date.now() - new Date(c.ts).getTime()) / 3600000;

  const vehicleClass = (c) => {
    const v = (c.policy.vehicle || '').toLowerCase();
    if (/xuv|creta|seltos|scorpio|safari|harrier|fortuner/.test(v)) return 'SUV';
    if (/ertiga|innova|carens|triber/.test(v))                      return 'MPV';
    if (/punch|kwid|tiago|nexon|venue|sonet/.test(v))               return 'Compact / Hatch';
    return 'Sedan';
  };
  const fraudBand = (c) => c.fraud.ring >= CP_CONST.RING_FLOOR ? 'High'
                         : c.fraud.ring >= 0.15 ? 'Medium' : 'Low';
  const policyType = (c) => (c.policy.addOns || []).indexOf('Zero Depreciation') >= 0
    ? 'Package + Zero Dep' : 'Motor Package';

  /* ---------------- lifecycle ---------------- */
  function init() { }

  /* Seed a desk's worth of work. The three claims the deck quotes are
     always present; the rest is a 65/25/10 mix backdated across three days
     so the filters, the age bands and the distribution all have something
     real to bite on. Seeding runs only into an empty room, and only after
     sync is up — seeding before that races the first snapshot and the
     console opens bare. */
  async function seedIfEmpty() {
    if (CPSync.all().length) return;
    const M = 60000, H = 60 * M;

    // The three primary demo claims, staged so the desk tells the story:
    // one settled, one waiting on a human, one under investigation.
    for (const [k, age] of [['clean', 2 * H], ['ambiguous', 5 * H], ['ring', 26 * H]]) {
      const c = CPEngine.process(k, null);
      c.ts = new Date(Date.now() - age).toISOString();
      c.seeded = true; c.primary = true;
      await CPSync.add(c);
    }

    // Three claims seeded straight into the live windows: one still at the
    // gate, one on the engines, one paying out. The board opens moving,
    // which is the difference between a dashboard and a screenshot.
    const mix = [
      ['clean', 1200], ['clean', 2600], ['clean', 40000],
      ['clean', 3 * M], ['clean', 14 * M], ['ambiguous', 38 * M], ['clean', 52 * M],
      ['clean', 1.5 * H], ['ring', 3 * H], ['clean', 4 * H], ['ambiguous', 6 * H],
      ['clean', 8 * H], ['clean', 11 * H], ['ambiguous', 15 * H], ['clean', 19 * H],
      ['synthetic', 22 * H], ['clean', 28 * H], ['ambiguous', 34 * H], ['clean', 44 * H],
      ['clean', 61 * H], ['ambiguous', 79 * H]
    ];
    for (const [k, age] of mix) await CPSync.add(CPEngine.backgroundClaim(k, age));
  }

  function onData(all) {
    claims = all;
    if (selected && !claims.some(c => c.id === selected)) selected = null;
    if (CPApp.surface === 'ops' || CPApp.surface === 'inspector') render();
  }

  /* A claim mid-pipeline moves on its own, so the board repaints without
     anything arriving. Full re-render only when the set of stages actually
     changes — rebuilding the table every second would throw away the
     reader's scroll position while they are trying to read it. */
  function startTick() {
    if (tick) return;
    tick = setInterval(() => {
      if (CPApp.surface !== 'ops' && CPApp.surface !== 'inspector') return;
      const sig = signature();
      if (sig !== lastSig) { render(); return; }
      paintExec();
      claims.forEach(c => {
        const b = $('pb-' + c.id);
        if (b) b.style.width = (st(c).pct * 100).toFixed(1) + '%';
      });
    }, 900);
  }

  const signature = () =>
    claims.map(c => st(c).k + (c.survey ? 'S' : '') + (c.overridden ? 'O' : '')).join('')
    + '|' + claims.length + '|' + JSON.stringify(F) + '|' + moreFilters;

  function render() {
    if (!claims.length) claims = CPSync.all();
    lastSig = signature();
    startTick();
    paintExec();
    paintPanels();
    // The filter rail and the queue table render on the CLAIM INSPECTOR now.
    // They are still driven from here because the filter state and the claim
    // list are one thing, and splitting them across two modules would mean
    // two sources of truth for "which claims are we looking at".
    if (CPApp.surface === 'inspector') { paintFilters(); paintTable(); }
  }

  /* ---------------- filtering ---------------- */
  function visible() {
    const q = F.q.trim().toLowerCase();
    return claims.filter(c => {
      const s = st(c);
      if (F.status !== 'all' && CPEngine.statusOf(c, s) !== F.status) return false;
      if (F.lane !== 'all') {
        if (!s.decided || c.lane !== F.lane) return false;   // no lane assigned yet
      }
      if (F.amount !== 'all' && CPEngine.bandOf(c.claimAmount).k !== F.amount) return false;
      if (F.age !== 'all') {
        const b = AGE_BANDS.find(x => x.k === F.age);
        if (b && !b.test(ageHours(c))) return false;
      }
      if (F.city !== 'all' && c.incident.city !== F.city) return false;
      if (F.vehicle !== 'all' && vehicleClass(c) !== F.vehicle) return false;
      if (F.survey === 'yes' && !(c.surveyor && c.surveyor.required)) return false;
      if (F.survey === 'no'  &&  (c.surveyor && c.surveyor.required)) return false;
      if (F.surveyor === 'assigned'   && !c.survey) return false;
      if (F.surveyor === 'unassigned' &&  c.survey) return false;
      if (F.fraud !== 'all' && fraudBand(c) !== F.fraud) return false;
      if (F.policy !== 'all' && policyType(c) !== F.policy) return false;
      if (F.garage !== 'all' && (c.repair.code || '') !== F.garage) return false;
      if (q) {
        const hay = [c.ref, c.policy.holder, c.policy.vehicle, c.policy.reg,
                     c.incident.city, c.policyNo].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort((a, b) => {
      const pa = CPEngine.priorityOf(a).rank, pb = CPEngine.priorityOf(b).rank;
      if (pa !== pb) return pa - pb;
      return new Date(b.ts) - new Date(a.ts);
    });
  }

  function setF(k, v) { F[k] = v; render(); }
  function clearFilters() { wipe(); render(); }
  function wipe() { Object.keys(F).forEach(k => { F[k] = k === 'q' ? '' : 'all'; }); }
  const activeCount = () => Object.keys(F)
    .filter(k => F[k] && F[k] !== 'all' && F[k] !== '').length;
  const toggleMore = () => { moreFilters = !moreFilters; render(); };

  /* The four quick views are presets over the same filter object. */
  function setFilter(k) {
    wipe();
    if (k === 'flight') F.status = 'Processing';
    if (k === 'assist') F.lane = 'A';
    if (k === 'done')   F.status = 'Settled';
    render();
  }

  /* ---------------- executive band ---------------- */
  function paintExec() {
    const n = claims.length || 1;
    const lanes = { G: 0, A: 0, R: 0 };
    let awaiting = 0, surveysNeeded = 0, surveysBooked = 0,
        autoSettled = 0, newToday = 0, exposure = 0, tat = 0, touches = 0;

    claims.forEach(c => {
      const s = st(c);
      if (s.decided) lanes[c.lane]++;
      if (s.needsHuman) awaiting++;
      if (c.surveyor && c.surveyor.required) surveysNeeded++;
      if (c.survey) surveysBooked++;
      if (s.decided && c.lane === 'G') autoSettled++;
      if (ageHours(c) < 24) newToday++;
      if (s.bucket !== 'done') exposure += c.claimAmount;
      tat += c.laneTat;
      touches += (CP_CONST.TOUCHES_TODAY - c.laneTouches);
    });

    const active = claims.filter(c => st(c).bucket !== 'done').length;
    const avgAmt = claims.reduce((s, c) => s + c.claimAmount, 0) / n;
    const free = CP_SURVEYORS.filter(s => s.available === 'today' && s.workload < s.capacity).length;

    /* Thirteen equal tiles is thirteen things shouting at the same volume.
       Three lead figures answer "is today under control"; the rest are the
       detail you look at once one of the three is wrong. Same information,
       one level of hierarchy added. */
    const lead = (k, v, d, tone) => `
      <div class="lead ${tone || ''}">
        <div class="k">${UI.esc(k)}</div>
        <div class="v">${v}</div>
        <div class="d">${d || ''}</div>
      </div>`;
    const tile = (k, v, d, tone) => `
      <div class="stat ${tone || ''}">
        <div class="k">${UI.esc(k)}</div>
        <div class="v">${v}</div>
        <div class="d">${d || ''}</div>
      </div>`;

    UI.set('execLead',
      lead('Active claims', active,
           claims.length + ' on the desk · ' + newToday + ' filed in the last 24 h') +
      lead('Attention required', awaiting,
           awaiting ? 'waiting on a person right now' : 'nothing is waiting on a person',
           awaiting ? 'a' : 'g') +
      lead('Average TAT', (tat / n).toFixed(2) + ' d',
           'against ' + CP_CONST.TAT_TODAY + ' d before ClaimPulse', 'g'));

    UI.set('execBand',
      tile('Green · auto-settle', lanes.G, UI.pct(lanes.G / n, 0) + ' of the desk', 'g') +
      tile('Amber · assisted', lanes.A, UI.pct(lanes.A / n, 0) + ' of the desk', 'a') +
      tile('Red · investigate', lanes.R, UI.pct(lanes.R / n, 0) + ' of the desk', 'r') +
      tile('Surveys required', surveysNeeded, surveysBooked + ' already scheduled') +
      tile('Surveyors free', free, 'of ' + CP_SURVEYORS.length + ' on the panel') +
      tile('Average claim', UI.inr(avgAmt), 'across the desk') +
      tile('Value at risk', '₹' + UI.compact(exposure), 'open claims, gross') +
      tile('Auto-settled', autoSettled, touches.toFixed(0) + ' manual touches saved', 'g'));
  }

  /* ---------------- distribution + automation ---------------- */
  function paintPanels() {
    const n = claims.length || 1;
    const lanes = { G: 0, A: 0, R: 0 };
    let assessing = 0, noGenAi = 0, oneCall = 0, deep = 0, human = 0, rt = 0;
    claims.forEach(c => {
      const s = st(c);
      if (s.decided) lanes[c.lane]++; else assessing++;
      if (s.needsHuman) human++;
      if (c.genAiCalls === 0) noGenAi++; else if (c.genAiCalls === 1) oneCall++; else deep++;
      rt += c.runtimeMs;
    });
    const dn = (lanes.G + lanes.A + lanes.R) || 1;

    const seg = (lane, count, nm) => {
      const p = count / dn;
      return `<div class="dseg ${lane}" style="flex:${Math.max(p, 0.001)}" title="${nm}: ${count}">
                <span>${p >= 0.08 ? UI.pct(p, 0) : ''}</span></div>`;
    };

    UI.set('lanePanel', `
      <div class="card">
        <h3>Claim distribution</h3>
        <div class="sub">Where this desk actually routed, against the 65 / 25 / 10 the model assumes.</div>
        <div class="hr"></div>
        <div class="dbar">${seg('G', lanes.G, 'Green')}${seg('A', lanes.A, 'Amber')}${seg('R', lanes.R, 'Red')}</div>
        <div class="dlegend">
          ${[['G', 'Green · auto-settle', lanes.G, CP_CONST.LANE.G],
             ['A', 'Amber · assisted review', lanes.A, CP_CONST.LANE.A],
             ['R', 'Red · investigate', lanes.R, CP_CONST.LANE.R]].map(([k, nm, v, meta]) => `
            <div class="dl">
              <span class="sw ${k}"></span>
              <div class="nm">${UI.esc(nm)}</div>
              <div class="vv">${v}<small>${UI.pct(v / dn, 0)}</small></div>
              <div class="ds">model ${UI.pct(meta.share, 0)} · TAT ${meta.tat} d · ${meta.touches} touches</div>
            </div>`).join('')}
        </div>
        ${assessing ? `<div class="reason" style="margin-top:var(--s3);">
          ${assessing} claim${assessing > 1 ? 's are' : ' is'} still on the engines and
          ${assessing > 1 ? 'carry' : 'carries'} no lane yet.
        </div>` : ''}
      </div>`);

    const auto = (noGenAi + oneCall + deep) || 1;
    UI.set('autoPanel', `
      <div class="card">
        <h3>AI and automation</h3>
        <div class="sub">Intelligence is spent where it is needed, not on every claim.</div>
        <div class="hr"></div>
        <div class="rows" style="font-size:var(--t-xs);">
          ${UI.row('Resolved without GenAI', `<b>${noGenAi}</b> <span style="color:var(--dim);font-weight:400">${UI.pct(noGenAi / auto, 0)}</span>`)}
          ${UI.row('One targeted GenAI call', oneCall)}
          ${UI.row('Deep reasoning · investigation', deep)}
          ${UI.row('Needing a human right now', human)}
          ${UI.row('Mean pipeline runtime', (rt / n).toFixed(1) + ' ms', true)}
          ${UI.rowB('Automation rate', UI.pct((claims.length - human) / n, 1))}
        </div>
        <div class="hr"></div>
        <div class="layers">
          ${[['1', 'Deterministic', 'Rules, OCR, EXIF, GPS, VAHAN', 'every claim'],
             ['2', 'Specialised ML', 'CV, fraud graph, synthetic media', 'every claim'],
             ['3', 'Targeted GenAI', 'Policy reasoning, narrative resolution', 'only where 1 and 2 cannot resolve it']]
            .map(([no, nm, what, when]) => `
            <div class="ly l${no}">
              <div class="no">L${no}</div>
              <div>
                <div class="nm">${UI.esc(nm)}</div>
                <div class="ds">${UI.esc(what)}</div>
                <div class="wh">${UI.esc(when)}</div>
              </div>
            </div>`).join('')}
        </div>
        <div style="margin-top:var(--s3);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
          GenAI is invoked only on unresolved or ambiguous claims. The cheapest
          inference is the one never run.
        </div>
      </div>`);
  }

  /* ---------------- filter rail ---------------- */
  function paintFilters() {
    const uniq = (fn) => Array.from(new Set(claims.map(fn).filter(Boolean))).sort();
    const sel = (key, label, opts, allLabel) => `
      <label class="fl">
        <span>${UI.esc(label)}</span>
        <select onchange="CPOps.setF('${key}', this.value)">
          <option value="all"${F[key] === 'all' ? ' selected' : ''}>${UI.esc(allLabel || 'All')}</option>
          ${opts.map(o => {
            const v = typeof o === 'string' ? o : o.v;
            const nm = typeof o === 'string' ? o : o.nm;
            return `<option value="${UI.esc(v)}"${F[key] === v ? ' selected' : ''}>${UI.esc(nm)}</option>`;
          }).join('')}
        </select>
      </label>`;

    const primary =
      sel('status', 'Claim status', CPEngine.STATUSES, 'All statuses') +
      sel('lane', 'Risk lane', [{ v: 'G', nm: 'Green · auto-settle' },
        { v: 'A', nm: 'Amber · assisted' }, { v: 'R', nm: 'Red · investigate' }], 'All lanes') +
      sel('amount', 'Claim amount',
        CPEngine.AMOUNT_BANDS.map(b => ({ v: b.k, nm: b.nm })), 'Any amount') +
      sel('age', 'Claim age', AGE_BANDS.map(b => ({ v: b.k, nm: b.nm })), 'Any age') +
      sel('survey', 'Survey required',
        [{ v: 'yes', nm: 'Required' }, { v: 'no', nm: 'Not required' }], 'Either') +
      sel('surveyor', 'Surveyor',
        [{ v: 'assigned', nm: 'Assigned' }, { v: 'unassigned', nm: 'Not assigned' }], 'Either');

    const secondary =
      sel('city', 'Location', uniq(c => c.incident.city), 'All locations') +
      sel('vehicle', 'Vehicle type', uniq(vehicleClass), 'All vehicles') +
      sel('fraud', 'Fraud risk', ['Low', 'Medium', 'High'], 'Any risk') +
      sel('policy', 'Policy type', uniq(policyType), 'All policies') +
      sel('garage', 'Garage', uniq(c => c.repair.code).map(code => ({
        v: code, nm: (CP_GARAGES[code] ? CP_GARAGES[code].name : code) })), 'All garages');

    const chips = Object.keys(F)
      .filter(k => F[k] && F[k] !== 'all' && F[k] !== '')
      .map(k => `<button class="fchip" onclick="CPOps.setF('${k}','${k === 'q' ? '' : 'all'}')"
                   >${UI.esc(k === 'q' ? '"' + F.q + '"' : labelFor(k, F[k]))} <b>×</b></button>`).join('');

    UI.set('filterRail', `
      <div class="filterbar">
        <div class="fsearch">
          <span>🔍</span>
          <input type="search" id="fq" placeholder="Claim ID, customer, vehicle, registration or city"
                 value="${UI.esc(F.q)}" oninput="CPOps.setQ(this.value)">
        </div>
        <div class="fgrid">${primary}</div>
        ${moreFilters ? `<div class="fgrid more">${secondary}</div>` : ''}
        <div class="fbottom">
          <button class="btn ghost sm" onclick="CPOps.toggleMore()">${
            moreFilters ? '− Fewer filters' : '+ More filters'}</button>
          ${activeCount() ? '<button class="btn ghost sm" onclick="CPOps.clearFilters()">Clear all</button>' : ''}
          <div class="fchips">${chips}</div>
        </div>
      </div>`);
  }

  function labelFor(k, v) {
    if (k === 'lane')     return ({ G: 'Green', A: 'Amber', R: 'Red' })[v] || v;
    if (k === 'amount')   return (CPEngine.AMOUNT_BANDS.find(b => b.k === v) || {}).nm || v;
    if (k === 'age')      return (AGE_BANDS.find(b => b.k === v) || {}).nm || v;
    if (k === 'survey')   return v === 'yes' ? 'Survey required' : 'No survey';
    if (k === 'surveyor') return v === 'assigned' ? 'Surveyor assigned' : 'No surveyor';
    if (k === 'garage')   return (CP_GARAGES[v] || {}).name || v;
    if (k === 'fraud')    return v + ' fraud risk';
    return v;
  }

  /* innerHTML replacement kills the caret, so it is put back where it was. */
  function setQ(v) {
    F.q = v; render();
    const i = $('fq');
    if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  /* ---------------- the queue table ---------------- */
  function paintTable() {
    const rows = visible();
    UI.set('queueHead', `
      <div>
        <h3>Claim queue</h3>
        <div class="sub">${rows.length} of ${claims.length} claims${
          activeCount() ? ' · ' + activeCount() + ' filter' + (activeCount() > 1 ? 's' : '') + ' applied' : ''} ·
          ${CPSync.mode === 'live'
            ? 'live — a claim filed on any device appears here as it is assessed'
            : 'local — claims filed on this device appear here'}</div>
      </div>
      <button class="btn ghost sm" onclick="CPOps.toggleStream()">${
        streaming ? '⏸ Pause intake' : '▶ Simulate intake'}</button>`);

    if (!rows.length) {
      UI.set('queueTable', UI.empty('🗂', 'No claim matches these filters. Clear one and try again.'));
      return;
    }

    UI.set('queueTable', `
      <div class="tblwrap tall">
        <table class="tbl ctbl">
          <thead><tr>
            <th>Claim</th><th>Customer</th><th>Vehicle</th>
            <th class="num">Amount</th><th>Submitted</th><th>Stage</th>
            <th>Lane</th><th class="num">Trust</th><th>Survey</th><th>Priority</th>
          </tr></thead>
          <tbody>${rows.map(row).join('')}</tbody>
        </table>
      </div>`);
  }

  function row(c) {
    const s = st(c);
    const status = CPEngine.statusOf(c, s);
    const pr = CPEngine.priorityOf(c, s);
    const needsSurvey = c.surveyor && c.surveyor.required;
    return `<tr class="crow ${c.primary ? 'primary' : ''} ${c.id === selected ? 'on' : ''}"
                onclick="CPOps.open('${UI.esc(c.id)}')">
      <td class="mono"><b>${UI.esc(c.ref || c.id)}</b></td>
      <td>${UI.esc(c.policy.holder)}</td>
      <td>${UI.esc(c.policy.vehicle)}<div class="sub2">${UI.esc(c.policy.reg)} · ${UI.esc(c.incident.city)}</div></td>
      <td class="num"><b>${UI.inr(c.claimAmount)}</b></td>
      <td>${UI.ago(c.ts)}<div class="sub2">${UI.dt(c.ts)}</div></td>
      <td><span class="stat-chip s-${status.replace(/\s+/g, '-').toLowerCase()}">${UI.esc(status)}</span>
          <div class="stgbar mini"><i id="pb-${UI.esc(c.id)}" class="${s.bucket}"
               style="width:${(s.pct * 100).toFixed(1)}%"></i></div></td>
      <td>${s.decided ? UI.pill(c.lane) : '<span class="pill n">—</span>'}</td>
      <td class="num">${s.decided
        ? `<b class="tscore ${c.lane}">${c.trust.score}</b>`
        : '<span style="color:var(--mist-dim)">· ·</span>'}</td>
      <td>${!s.decided ? '<span style="color:var(--mist-dim)">—</span>'
        : needsSurvey ? '<span style="color:var(--gold);font-weight:700">Required</span>'
        : c.lane === 'A' ? '<span style="color:var(--mist)">Review rec.</span>'
        : '<span style="color:var(--green)">Not required</span>'}</td>
      <td><span class="prio ${pr.k}">${UI.esc(pr.nm)}</span></td>
    </tr>`;
  }

  /* Clicking a row is a hand-off, not a side panel: the inspector is a full
     surface, because "where exactly is the problem" needs the width. */
  function open(id) {
    selected = id;
    CPInspector.load(id);
    if (CPApp.surface !== 'inspector') CPApp.go('inspector');
    else { render(); CPInspector.render(); }
  }
  const select = (id) => { selected = id; render(); };

  /* ---------------- simulated intake ---------------- */
  function toggleStream() {
    streaming = !streaming;
    if (streaming) streamTimer = setInterval(() => CPSync.add(CPEngine.backgroundClaim()), 5200);
    else clearInterval(streamTimer);
    render();
  }

  /* ---------------- decisions ---------------- */
  const NOTES = {
    G: 'Adjuster satisfied the evidence supports settlement. Released to the green lane.',
    A: 'Adjuster held the claim for assisted review before settlement.',
    R: 'Adjuster referred the claim to investigation and the special investigation unit.'
  };

  async function override(id, lane) {
    const c = CPSync.all().find(x => x.id === id); if (!c) return;
    await CPSync.update(id, {
      overridden: { from: c.lane, lane, by: 'A. Deshpande · Claims (ID 4417)',
                    at: new Date().toISOString(), note: NOTES[lane] },
      lane,
      laneName: CP_CONST.LANE[lane].name,
      laneLabel: CP_CONST.LANE[lane].label,
      laneTat: CP_CONST.LANE[lane].tat,
      laneTouches: CP_CONST.LANE[lane].touches
    });
  }

  async function clearOverride(id) {
    const c = CPSync.all().find(x => x.id === id); if (!c || !c.overridden) return;
    const back = c.overridden.from;
    await CPSync.update(id, {
      overridden: null, lane: back,
      laneName: CP_CONST.LANE[back].name,
      laneLabel: CP_CONST.LANE[back].label,
      laneTat: CP_CONST.LANE[back].tat,
      laneTouches: CP_CONST.LANE[back].touches
    });
  }

  return { init, seedIfEmpty, onData, render, open, select, setF, setQ,
           setFilter, clearFilters, toggleMore, toggleStream,
           override, clearOverride, stageOf: st, visible,
           vehicleClass, fraudBand, policyType,
           get filters() { return F; } };
})();
