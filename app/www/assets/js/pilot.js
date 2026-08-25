/* =====================================================================
   ClaimPulse · Controlled Pilot
   ---------------------------------------------------------------------
   The bridge between "this is a working prototype" and "we could run this
   against a slice of our real book for three weeks".

   ONE RULE GOVERNS EVERYTHING HERE. In shadow mode ClaimPulse recommends
   and the existing Bajaj process decides. Recording a human decision must
   therefore NOT change the claim's lane — if it did, the pilot would be
   measuring itself against its own output, and the whole exercise would
   be worthless. `pilotDecision` sits beside the recommendation and is
   never allowed to overwrite it. That is why this module has its own
   decide() rather than reusing the production override in CPOps.

   Everything the pilot reports is a MEASUREMENT, not a result. Nothing
   here claims a target has been met.
   ===================================================================== */

const CPPilot = (() => {

  const KEY = 'claimpulse.pilot.v1';

  /* Configuration lives on the device rather than in the claim store: it
     is how this operator has set the workspace up, not a fact about any
     claim. The decisions themselves DO sync, because they are claim
     facts and the whole point is that a supervisor sees them. */
  const DEFAULTS = {
    active: false,
    startedOn: null,
    day: 1,                 // simulated pilot day, 1-20, so phases are demonstrable
    days: 18,
    source: 'demo',
    cohort: { amount: 'all', city: 'all', vehicle: 'all', garage: 'all', policy: 'all' },
    officer: 'A. Deshpande · Claims (ID 4417)'
  };

  let cfg = load();
  let claims = [];
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS, cohort: { ...DEFAULTS.cohort } };
      const v = JSON.parse(raw);
      return { ...DEFAULTS, ...v, cohort: { ...DEFAULTS.cohort, ...(v.cohort || {}) } };
    } catch (e) { return { ...DEFAULTS, cohort: { ...DEFAULTS.cohort } }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* private mode */ }
    listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }
  const onChange = (fn) => listeners.push(fn);

  /* ---------------- lifecycle ---------------- */
  function init() { }
  function onData(all) {
    claims = all;
    if (CPApp.surface === 'pilot') render();
  }

  /* ---------------- cohort ----------------
     A controlled pilot is defined by what it EXCLUDES. Everything here is
     an inclusion test against the same fields the Command Center filters
     on, so a cohort a supervisor can describe in a sentence is a cohort
     the system can actually enforce. */
  function inCohort(c) {
    const k = cfg.cohort;
    if (k.amount !== 'all' && CPEngine.bandOf(c.claimAmount).k !== k.amount) return false;
    if (k.city !== 'all' && c.incident.city !== k.city) return false;
    if (k.vehicle !== 'all' && CPOps.vehicleClass(c) !== k.vehicle) return false;
    if (k.garage !== 'all' && (c.repair.code || '') !== k.garage) return false;
    if (k.policy !== 'all' && CPOps.policyType(c) !== k.policy) return false;
    return true;
  }
  const cohort = () => (claims.length ? claims : CPSync.all()).filter(inCohort);
  /* Only decided claims can be compared — a claim still on the engines has
     no recommendation to agree or disagree with yet. */
  const scored = () => cohort().filter(c => CPEngine.stageOf(c).decided);

  const cohortLabel = () => {
    const k = cfg.cohort, bits = [];
    if (k.amount !== 'all') bits.push((CPEngine.AMOUNT_BANDS.find(b => b.k === k.amount) || {}).nm);
    if (k.city !== 'all') bits.push(k.city + ' only');
    if (k.vehicle !== 'all') bits.push(k.vehicle);
    if (k.garage !== 'all') bits.push((CP_GARAGES[k.garage] || {}).name || k.garage);
    if (k.policy !== 'all') bits.push(k.policy);
    return bits.length ? bits.join(' · ') : 'All Motor OD claims — no cohort filter set';
  };

  /* ---------------- the shadow decision ----------------
     Writes the officer's real decision ALONGSIDE the recommendation. Note
     what is absent: no lane, no laneTat, no laneTouches. The claim's
     routing is untouched, deliberately and permanently. */
  async function decide(id, lane, reason) {
    const c = CPSync.all().find(x => x.id === id);
    if (!c) return;
    const rec = c.lane;
    const action = lane === rec ? 'agreed' : (lane === 'R' && rec !== 'R' ? 'rejected' : 'modified');
    await CPSync.update(id, {
      pilotDecision: {
        recommendation: rec, lane, action,
        reason: reason || '',
        by: cfg.officer, at: new Date().toISOString(),
        day: cfg.day
      }
    });
  }
  const clearDecision = (id) => CPSync.update(id, { pilotDecision: null });

  /* ---------------- measurement ----------------
     Every figure below is derived from claims that carry BOTH a
     recommendation and a recorded human decision. A claim nobody has
     judged yet is excluded rather than counted as agreement — silently
     treating "not looked at" as "agreed" is the easiest way to make a
     pilot report a number it has not earned. */
  function metrics() {
    const co = cohort();
    const sc = scored();
    const judged = sc.filter(c => c.pilotDecision);
    const n = sc.length || 1;

    const lanes = { G: 0, A: 0, R: 0 };
    let touches = 0, tat = 0, noGenAi = 0, needsHuman = 0,
        surveyRec = 0, surveyAvoidedRec = 0;

    sc.forEach(c => {
      lanes[c.lane]++;
      touches += c.laneTouches;
      tat += c.laneTat;
      if (c.genAiCalls === 0) noGenAi++;
      if (CPEngine.stageOf(c).needsHuman) needsHuman++;
      if (c.surveyor && c.surveyor.required) surveyRec++; else surveyAvoidedRec++;
    });

    let agreed = 0, modified = 0, rejected = 0;
    let falsePos = 0, falseNeg = 0;
    let surveyAccepted = 0, surveyAvoided = 0;

    judged.forEach(c => {
      const d = c.pilotDecision;
      if (d.action === 'agreed') agreed++;
      else if (d.action === 'rejected') rejected++;
      else modified++;

      // Flagged = amber or red. Over-flagging costs the desk time;
      // under-flagging costs money. They are not the same error and are
      // not counted together.
      const recFlag = c.lane !== 'G', humFlag = d.lane !== 'G';
      if (recFlag && !humFlag) falsePos++;
      if (!recFlag && humFlag) falseNeg++;

      const needed = !!(c.surveyor && c.surveyor.required);
      if (needed && d.action === 'agreed') surveyAccepted++;
      if (!needed && d.lane === 'G') surveyAvoided++;
    });

    const jn = judged.length || 1;
    const baselineTat = CP_CONST.TAT_TODAY;
    const baselineTouch = CP_CONST.TOUCHES_TODAY;

    return {
      total: (claims.length ? claims : CSafe()).length,
      cohort: co.length, scored: sc.length, judged: judged.length,
      pending: sc.length - judged.length,
      lanes,
      shareG: lanes.G / n, shareA: lanes.A / n, shareR: lanes.R / n,
      avgTat: tat / n, baselineTat,
      avgTouches: touches / n, baselineTouch,
      touchesSaved: (baselineTouch * sc.length) - touches,
      automation: (sc.length - needsHuman) / n,
      noGenAi, genAiShare: noGenAi / n,
      needsHuman, exception: (lanes.A + lanes.R) / n,
      surveyRec, surveyAvoidedRec, surveyRecShare: surveyAvoidedRec / n,
      agreed, modified, rejected,
      agreement: judged.length ? agreed / jn : null,
      overrideRate: judged.length ? (modified + rejected) / jn : null,
      falsePos, falseNeg,
      surveyAccepted, surveyAvoided,
      perOfficer: sc.length / CP_PILOT_ROLES[0].n
    };
  }
  const CSafe = () => (typeof CPSync !== 'undefined' ? CPSync.all() : []);

  /* Which phase the simulated day falls in. */
  const phase = () => CP_PILOT_PHASES.find(p => cfg.day >= p.from && cfg.day <= p.to)
                   || CP_PILOT_PHASES[CP_PILOT_PHASES.length - 1];

  /* ---------------- config setters ---------------- */
  function start() {
    cfg.active = true;
    cfg.startedOn = cfg.startedOn || new Date().toISOString();
    if (cfg.day < 1) cfg.day = 1;
    save(); render(); if (CPApp.paintPilotBar) CPApp.paintPilotBar();
  }
  function stop() {
    cfg.active = false;
    save(); render(); if (CPApp.paintPilotBar) CPApp.paintPilotBar();
  }
  function setDay(d) { cfg.day = Math.max(1, Math.min(20, +d || 1)); save(); render(); }
  function setSource(k) { cfg.source = k; save(); render(); }
  function setCohort(k, v) { cfg.cohort[k] = v; save(); render(); }
  function resetCohort() {
    cfg.cohort = { ...DEFAULTS.cohort }; save(); render();
  }

  /* ================= render ================= */
  function render() {
    if (!claims.length) claims = CPSync.all();
    const m = metrics();
    UI.set('pilotBody',
      statusCard(m) +
      journeyCard() +
      `<div class="split">${configCard(m)}${sourceCard()}</div>` +
      kpiCard(m) +
      gatesCard(m) +
      comparisonCard(m) +
      positioningCard());
  }

  /* ---------------- 1 · status ---------------- */
  function statusCard(m) {
    const ph = phase();
    return `<div class="card pilot-status ${cfg.active ? 'on' : ''}">
      <div class="ps-head">
        <div>
          <div class="eyebrow">Pilot workspace</div>
          <h2>${cfg.active ? 'Shadow mode is running' : 'Controlled pilot — not started'}</h2>
          <div class="sub">${cfg.active
            ? 'ClaimPulse is scoring the cohort beside the existing claims process. It recommends; it does not settle.'
            : 'Configure the cohort below, then start. Nothing in the live demo changes until you do.'}</div>
        </div>
        <div class="ps-right">
          <div class="pilotchip ${cfg.active ? 'live' : 'off'}">
            ${cfg.active ? '● SHADOW MODE' : '○ NOT RUNNING'}
          </div>
          <button class="btn ${cfg.active ? 'ghost' : ''} sm" style="margin-top:var(--s2);width:100%"
            onclick="CPPilot.${cfg.active ? 'stop' : 'start'}()">
            ${cfg.active ? 'End pilot' : 'Start controlled pilot'}</button>
        </div>
      </div>
      ${cfg.active ? `
        <div class="hr"></div>
        <div class="ps-day">
          <div>
            <div class="k">Simulated pilot day</div>
            <div class="v">Day ${cfg.day} of ${cfg.days} · Phase ${ph.no} · ${UI.esc(ph.nm)}</div>
          </div>
          <input type="range" min="1" max="20" value="${cfg.day}"
                 oninput="CPPilot.setDay(this.value)">
        </div>
        <div class="reason" style="margin-top:var(--s3);">
          <b>ClaimPulse does not make the final settlement decision during this pilot.</b>
          Every claim below carries a recommendation. The Bajaj claims team records the
          real decision against it, and the difference between the two is the measurement.
        </div>` : ''}
    </div>`;
  }

  /* ---------------- 2 · journey ---------------- */
  function journeyCard() {
    const ph = phase();
    return `<div class="card">
      <h3>15 – 20 day controlled pilot</h3>
      <div class="sub">Three phases. Scoring does not start until the plumbing is proved,
        and no decision changes hands at any point.</div>
      <div class="hr"></div>
      <div class="phases">
        ${CP_PILOT_PHASES.map(p => {
          const state = !cfg.active ? '' : p.no < ph.no ? 'done' : p.no === ph.no ? 'on' : '';
          return `<div class="phase ${state}">
            <div class="ph-top">
              <span class="ph-ico">${p.ico}</span>
              <div>
                <div class="ph-nm">Phase ${p.no} · ${UI.esc(p.nm)}</div>
                <div class="ph-days">Days ${p.from}–${p.to}</div>
              </div>
              ${state === 'on' ? '<span class="ph-now">NOW</span>'
                : state === 'done' ? '<span class="ph-done">✓</span>' : ''}
            </div>
            <div class="ph-what">${UI.esc(p.what)}</div>
            <ul class="ph-tasks">
              ${p.tasks.map(t => `<li>${UI.esc(t)}</li>`).join('')}
            </ul>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  /* ---------------- 3 · scope configuration ---------------- */
  function configCard(m) {
    const uniq = (fn) => Array.from(new Set(CPSync.all().map(fn).filter(Boolean))).sort();
    const sel = (key, label, opts, allLabel) => `
      <label class="fl">
        <span>${UI.esc(label)}</span>
        <select onchange="CPPilot.setCohort('${key}', this.value)">
          <option value="all"${cfg.cohort[key] === 'all' ? ' selected' : ''}>${UI.esc(allLabel)}</option>
          ${opts.map(o => {
            const v = typeof o === 'string' ? o : o.v, nm = typeof o === 'string' ? o : o.nm;
            return `<option value="${UI.esc(v)}"${cfg.cohort[key] === v ? ' selected' : ''}>${UI.esc(nm)}</option>`;
          }).join('')}
        </select>
      </label>`;

    return `<div class="card">
      <h3>Pilot scope</h3>
      <div class="sub">A controlled pilot is defined by what it excludes. Narrow this until
        the blast radius is something the claims floor would sign off.</div>
      <div class="hr"></div>
      <div class="fgrid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
        ${sel('amount', 'Claim amount', CPEngine.AMOUNT_BANDS.map(b => ({ v: b.k, nm: b.nm })), 'Any amount')}
        ${sel('city', 'Geography', uniq(c => c.incident.city), 'All locations')}
        ${sel('vehicle', 'Vehicle type', uniq(CPOps.vehicleClass), 'All vehicles')}
        ${sel('policy', 'Policy type', uniq(CPOps.policyType), 'All policy types')}
        ${sel('garage', 'Garage', uniq(c => c.repair.code).map(code => ({
          v: code, nm: (CP_GARAGES[code] || {}).name || code })), 'All garages')}
        <label class="fl"><span>Pilot duration</span>
          <select onchange="CPPilot.setDays(this.value)">
            ${[15, 18, 20].map(d => `<option value="${d}"${cfg.days === d ? ' selected' : ''}>${d} days</option>`).join('')}
          </select></label>
      </div>
      <div class="hr"></div>
      <div class="cohortline">
        <div>
          <div class="k">Cohort</div>
          <div class="v">${UI.esc(cohortLabel())}</div>
        </div>
        <div class="cohortn">
          <b>${m.cohort}</b><span>of ${CPSync.all().length} claims</span>
        </div>
      </div>
      ${m.cohort === 0 ? `<div class="reason hard" style="margin-top:var(--s3);">
        No claim matches this cohort. A pilot with nothing in it measures nothing — widen a filter.
      </div>` : ''}
      <button class="btn ghost sm" style="width:100%;margin-top:var(--s3);"
        onclick="CPPilot.resetCohort()">Clear cohort filters</button>
      <div class="hr"></div>
      ${UI.sec('Pilot users · ' + CP_PILOT_ROLES.reduce((s, r) => s + r.n, 0) + ' people')}
      <div class="rows" style="font-size:var(--t-xs);">
        ${CP_PILOT_ROLES.map(r => UI.row(r.nm + ' × ' + r.n, UI.esc(r.can))).join('')}
      </div>
    </div>`;
  }

  /* ---------------- 4 · data source ---------------- */
  function sourceCard() {
    return `<div class="card">
      <h3>Claim data source</h3>
      <div class="sub">The engines do not care where a claim comes from. Swapping the source
        is a mapping exercise, not a rebuild — this is what would actually have to change.</div>
      <div class="hr"></div>

      <div class="srcflow">
        <div class="sf demo ${cfg.source === 'demo' ? 'on' : ''}">
          <div class="sf-k">Today · prototype</div>
          <div class="sf-v">Mock claim</div>
          <div class="sf-a">→</div>
          <div class="sf-v">ClaimPulse engines</div>
          <div class="sf-a">→</div>
          <div class="sf-v">Decision</div>
        </div>
        <div class="sf pilot ${cfg.source !== 'demo' ? 'on' : ''}">
          <div class="sf-k">Pilot</div>
          <div class="sf-v">Selected Bajaj claims</div>
          <div class="sf-a">→</div>
          <div class="sf-v">Secure pilot data layer</div>
          <div class="sf-a">→</div>
          <div class="sf-v">ClaimPulse engines</div>
          <div class="sf-a">→</div>
          <div class="sf-v rec">Recommendation</div>
        </div>
      </div>

      <div class="srclist">
        ${CP_SOURCES.map(s => `
          <div class="src ${cfg.source === s.key ? 'on' : ''}" onclick="CPPilot.setSource('${s.key}')">
            <div class="src-ico">${s.ico}</div>
            <div class="src-main">
              <div class="src-nm">${UI.esc(s.nm)}
                <span class="src-state ${s.state}">${s.state === 'live' ? 'IN USE'
                  : s.state === 'ready' ? 'MAPPING ONLY' : 'INTEGRATION NEEDED'}</span></div>
              <div class="src-d">${UI.esc(s.d)}</div>
              <div class="src-needs"><b>Needs:</b> ${UI.esc(s.needs)}</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="reason cap" style="margin-top:var(--s3);">
        Only <b>Demo data</b> is built. The other three declare the contract each would have to
        satisfy — shown so the integration cost is visible rather than glossed over.
      </div>
    </div>`;
  }

  /* ---------------- 5 · KPI dashboard ---------------- */
  function kpiCard(m) {
    const pct = (v, d) => v === null ? '—' : UI.pct(v, d === undefined ? 1 : d);
    const grp = (title, sub, rows) => `
      <div class="kgrp">
        <div class="kg-h">${UI.esc(title)}</div>
        <div class="kg-s">${UI.esc(sub)}</div>
        ${rows.map(([k, v, d]) => `
          <div class="kg-r"><span class="kg-k">${UI.esc(k)}</span>
            <span class="kg-v">${v}</span>
            <span class="kg-d">${d ? UI.esc(d) : ''}</span></div>`).join('')}
      </div>`;

    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);flex-wrap:wrap;">
        <div>
          <h3>Pilot performance</h3>
          <div class="sub">Measured over the cohort only. ${m.judged} of ${m.scored} scored claims
            carry a recorded human decision${m.pending ? ` · ${m.pending} still to be judged` : ''}.</div>
        </div>
        <div class="pilotchip ${m.judged ? 'live' : 'off'}">${m.judged ? 'MEASURING' : 'NO DATA YET'}</div>
      </div>
      <div class="hr"></div>
      <div class="kgrid">
        ${grp('Operational', 'Volume and effort', [
          ['Claims in cohort', m.cohort],
          ['Claims analysed', m.scored, 'scored by the engines'],
          ['Average TAT', m.avgTat.toFixed(2) + ' d', 'baseline ' + m.baselineTat + ' d'],
          ['Average manual touches', m.avgTouches.toFixed(2), 'baseline ' + m.baselineTouch],
          ['Automation rate', pct(m.automation), 'no human needed'],
          ['Green lane share', pct(m.shareG, 0), 'model assumes 65%'],
          ['Amber lane share', pct(m.shareA, 0), 'model assumes 25%'],
          ['Red lane share', pct(m.shareR, 0), 'model assumes 10%']
        ])}
        ${grp('Accuracy', 'ClaimPulse against the claims officer', [
          ['Agreement rate', pct(m.agreement), m.judged ? 'n = ' + m.judged : 'nothing judged yet'],
          ['Agreed', m.agreed],
          ['Modified', m.modified],
          ['Rejected', m.rejected],
          ['Over-flagged', m.falsePos, 'flagged, officer said green'],
          ['Under-flagged', m.falseNeg, 'green, officer escalated'],
          ['Survey recs accepted', m.surveyAccepted],
          ['Surveys avoided', m.surveyAvoided, 'officer agreed none needed']
        ])}
        ${grp('Capacity', 'What the claims floor actually feels', [
          ['Surveyor visits avoided', m.surveyAvoidedRec, 'of ' + m.scored + ' scored'],
          ['Human review workload', m.needsHuman, 'claims needing a person'],
          ['Claims per officer', m.perOfficer.toFixed(1), 'across ' + CP_PILOT_ROLES[0].n + ' officers'],
          ['Exception queue', pct(m.exception, 0), 'amber + red'],
          ['Manual touches saved', m.touchesSaved.toFixed(0), 'against the baseline'],
          ['Resolved without GenAI', m.noGenAi, pct(m.genAiShare, 0) + ' of scored']
        ])}
      </div>
      ${!m.judged ? `<div class="reason" style="margin-top:var(--s3);">
        The accuracy column stays empty until a claims officer records a decision. Open a cohort
        claim in the <b>Claim Inspector</b> and use the shadow-mode panel — a claim nobody has
        judged is not counted as agreement.
      </div>` : ''}
    </div>`;
  }

  /* ---------------- 6 · success criteria ---------------- */
  function gatesCard(m) {
    const observed = {
      agreement: m.agreement,
      tat: m.scored ? m.avgTat : null,
      survey: m.scored ? m.surveyRecShare : null,
      override: m.overrideRate,
      exception: m.scored ? m.exception : null
    };
    const sample = { agreement: m.judged, tat: m.scored, survey: m.scored,
                     override: m.judged, exception: m.scored };
    const fmt = (g, v) => v === null ? '—'
      : g.fmt === 'pct' ? UI.pct(v, 0) : v.toFixed(2) + ' d';

    return `<div class="card">
      <h3>Pilot measurement metrics</h3>
      <div class="sub"><b>These are the questions the pilot answers, not results it has produced.</b>
        A target is what we would compare against at day 20 — nothing below is a claim that it
        has been met.</div>
      <div class="hr"></div>
      <div class="tblwrap">
        <table class="tbl gatetbl">
          <thead><tr>
            <th>Measure</th><th>The question the pilot answers</th>
            <th class="num">Target</th><th class="num">Observed so far</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${CP_PILOT_GATES.map(g => {
              const v = observed[g.key], n = sample[g.key];
              const thin = v !== null && n < 8;
              return `<tr>
                <td><b>${UI.esc(g.nm)}</b><div class="sub2">${UI.esc(g.note)}</div></td>
                <td>${UI.esc(g.q)}</td>
                <td class="num">${g.fmt === 'pct' ? UI.pct(g.target, 0) : g.target + ' d'}
                  <div class="sub2">${g.dir === 'up' ? 'higher is better' : 'lower is better'}</div></td>
                <td class="num">${fmt(g, v)}${v !== null ? `<div class="sub2">n = ${n}</div>` : ''}</td>
                <td>${v === null
                  ? '<span class="gstat none">NOT YET MEASURED</span>'
                  : thin
                    ? '<span class="gstat thin">SAMPLE TOO SMALL</span>'
                    : '<span class="gstat measuring">MEASURING</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="reason cap" style="margin-top:var(--s3);">
        No row above will ever read PASSED in this prototype. A pilot that reports its own success
        before it has run is the reason pilots stop being believed.
      </div>
    </div>`;
  }

  /* ---------------- 7 · decision comparison ---------------- */
  function comparisonCard(m) {
    const rows = scored().sort((a, b) => (b.pilotDecision ? 1 : 0) - (a.pilotDecision ? 1 : 0)
      || new Date(b.ts) - new Date(a.ts));
    if (!rows.length) {
      return `<div class="card"><h3>Recommendation vs decision</h3>
        <div class="hr"></div>${UI.empty('⚖️', 'No scored claim is in the cohort yet.')}</div>`;
    }
    return `<div class="card flush">
      <div class="queuehead">
        <div>
          <h3>Recommendation vs decision</h3>
          <div class="sub">Every cohort claim, side by side. This table is the pilot's
            deliverable — the rest of the dashboard is a summary of it.</div>
        </div>
      </div>
      <div class="tblwrap tall">
        <table class="tbl ctbl">
          <thead><tr>
            <th>Claim</th><th>Customer</th><th class="num">Amount</th>
            <th>ClaimPulse recommends</th><th>Claims officer decided</th>
            <th>Outcome</th><th>Override reason</th>
          </tr></thead>
          <tbody>${rows.map(c => {
            const d = c.pilotDecision;
            return `<tr class="crow" onclick="CPPilot.openClaim('${UI.esc(c.id)}')">
              <td class="mono"><b>${UI.esc(c.ref || c.id)}</b></td>
              <td>${UI.esc(c.policy.holder)}<div class="sub2">${UI.esc(c.policy.vehicle)}</div></td>
              <td class="num">${UI.inr(c.claimAmount)}</td>
              <td>${UI.pill(c.lane)} <span class="sub2">Trust ${c.trust.score}</span></td>
              <td>${d ? UI.pill(d.lane) : '<span class="gstat none">AWAITING OFFICER</span>'}</td>
              <td>${d ? `<span class="agree ${d.action}">${d.action.toUpperCase()}</span>` : '—'}</td>
              <td>${d && d.reason ? UI.esc(d.reason)
                : d ? '<span style="color:var(--dim)">—</span>' : ''}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>`;
  }

  function openClaim(id) { CPOps.open(id); }

  /* ---------------- 8 · positioning ---------------- */
  function positioningCard() {
    const yes = ['Working interactive prototype', 'Pilot-ready front end and orchestration layer',
                 'Controlled claim cohort', 'Shadow-mode validation', 'Human-in-the-loop throughout',
                 'Every recommendation explainable and audited'];
    const no = ['Production-ready today', 'A replacement for the Bajaj claims system',
                'Autonomous settlement without validation', 'Integrated with Bajaj systems',
                'Security, DPDP and load hardening complete', 'Proven at book scale'];
    return `<div class="card">
      <h3>What this is, and what it is not</h3>
      <div class="sub">The pilot exists to reduce risk. Overstating readiness is the fastest way
        to lose the right to run one.</div>
      <div class="hr"></div>
      <div class="split">
        <div>
          ${UI.sec('What ClaimPulse is today')}
          <div class="poslist">${yes.map(t => `<div class="pos y">✓ ${UI.esc(t)}</div>`).join('')}</div>
        </div>
        <div>
          ${UI.sec('What it is not, and we are not claiming')}
          <div class="poslist">${no.map(t => `<div class="pos n">✗ ${UI.esc(t)}</div>`).join('')}</div>
        </div>
      </div>
      <div class="hr"></div>
      <div class="pathline">
        ${['Competition prototype', 'Controlled pilot', 'Validated product', 'Production rollout']
          .map((t, i) => `<div class="pathstep ${i === 0 ? 'done' : i === 1 ? 'on' : ''}">
            <div class="pd">${i === 0 ? '✓' : i === 1 ? '●' : ''}</div>
            <div class="pt">${UI.esc(t)}</div>
            <div class="pn">${['where we are', 'what this workspace is for',
                               'after day 20, if the measurement holds', 'a separate decision'][i]}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  function setDays(d) { cfg.days = +d || 18; save(); render(); }

  return { init, onData, render, start, stop, setDay, setDays, setSource,
           setCohort, resetCohort, decide, clearDecision, openClaim,
           inCohort, cohort, scored, metrics, phase, cohortLabel, onChange,
           get cfg() { return cfg; },
           get active() { return cfg.active; } };
})();
