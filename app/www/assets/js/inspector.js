/* =====================================================================
   ClaimPulse · Claim Inspector
   ---------------------------------------------------------------------
   One claim, in full. The order on screen is the order a claims officer
   actually needs it:

     1  what is this claim            — overview strip
     2  where has it got to           — journey
     3  WHY did it go there           — the explanation, in words
     4  what exactly did the checks find — Gate 00, then five engines
     5  what do I do now              — dispatch a surveyor, or decide

   Point 3 is the one that matters. A score is not an explanation, and an
   officer who cannot say why a claim was routed cannot defend it to a
   customer, a manager or an ombudsman. So the explanation is assembled
   from what the engines actually found, and every number under it is the
   number that produced it.
   ===================================================================== */

const CPInspector = (() => {

  let id = null;
  let open = { gate: true, doc: false, cv: false, fraud: false, repair: false, policy: false };
  let dispatch = null;       // { surveyorId, date, slot } while the officer is choosing

  const claim = () => CPSync.all().find(c => c.id === id) || null;

  function init() { }
  function onData() { if (CPApp.surface === 'inspector') render(); }

  function load(claimId) {
    if (claimId !== id) { dispatch = null; shadowPick = null; open = { gate: true }; }
    id = claimId;
  }

  const toggle = (k) => { open[k] = !open[k]; render(); };

  /* ================= render ================= */
  function render() {
    const c = claim();
    if (!c) {
      UI.set('inspBody', `<div class="card">${UI.empty('🔍',
        'No claim selected. Pick one from the Command Center queue.')}</div>`);
      return;
    }
    const s = CPEngine.stageOf(c);
    UI.set('inspBody',
      overview(c, s) +
      journey(c, s) +
      whyCard(c, s) +
      shadowCard(c, s) +
      `<div class="split-i">
         <div>${gateCard(c)}${enginesCard(c)}</div>
         <div>${trustCard(c, s)}${settlementCard(c)}${surveyCard(c, s)}${decisionCard(c, s)}</div>
       </div>`);
  }

  /* ---------------- 1 · overview ---------------- */
  function overview(c, s) {
    const status = CPEngine.statusOf(c, s);
    const pr = CPEngine.priorityOf(c, s);
    return `<div class="card insp-head">
      <button class="btn ghost sm back" onclick="CPApp.go('ops')">← Back to the queue</button>
      <div class="ih-main">
        <div>
          <div class="eyebrow">${UI.esc(c.ref || c.id)} · filed ${UI.dt(c.ts)} · ${UI.ago(c.ts)}</div>
          <h2>${UI.esc(c.policy.holder)}</h2>
          <div class="sub">${UI.esc(c.policy.vehicle)} · ${UI.esc(c.policy.reg)} ·
            ${UI.esc(c.incident.locality || c.incident.city)}</div>
          <div class="ih-tags">
            <span class="stat-chip s-${status.replace(/\s+/g, '-').toLowerCase()}">${UI.esc(status)}</span>
            <span class="prio ${pr.k}">${UI.esc(pr.k === 'done' ? 'Closed' : pr.nm + ' priority')}</span>
            ${c.primary ? '<span class="pill b">DEMO CLAIM</span>' : ''}
            ${c.overridden ? '<span class="pill b">OVERRIDDEN</span>' : ''}
          </div>
        </div>
        <div class="ih-score">
          ${s.decided ? `
            <div class="lanebig ${c.lane}">${c.laneLabel}</div>
            <div class="scorebig">${c.trust.score}<small>/100</small></div>
            <div class="tag">TRUST SCORE · ${UI.esc(c.laneName)}</div>`
          : `<div class="lanebig W">ASSESSING</div>
             <div class="scorebig" style="color:var(--mist)">· ·</div>
             <div class="tag">NO LANE ASSIGNED YET</div>`}
        </div>
      </div>
      <div class="hr"></div>
      <div class="ih-facts">
        ${fact('Claim amount', UI.inr(c.claimAmount), 'as claimed by the garage')}
        ${fact('Net payable', s.decided ? UI.inr(c.money.payable) : '—', 'after depreciation and deductible')}
        ${fact('Policy', c.policyNo, UI.esc(c.policy.product))}
        ${fact('IDV', UI.inr(c.policy.idv), 'deductible ' + UI.inr(c.policy.deductible) + ' · NCB ' + UI.esc(c.policy.ncb))}
        ${fact('Incident', UI.esc(c.incident.cause), UI.esc(c.incident.city) + ' · ' + c.incident.hoursAgo + ' h before filing')}
        ${fact('Target TAT', s.decided ? c.laneTat + ' days' : '—', 'against ' + CP_CONST.TAT_TODAY + ' days today')}
      </div>
    </div>`;
  }

  const fact = (k, v, d) =>
    `<div class="fct"><div class="k">${UI.esc(k)}</div><div class="v">${v}</div>
     <div class="d">${d || ''}</div></div>`;

  /* ---------------- 2 · journey ---------------- */
  const STEPS = [
    { k: 'submit',  nm: 'Customer submission', d: 'Guided live capture, four frames' },
    { k: 'gate',    nm: 'Gate 00',             d: 'Capture integrity' },
    { k: 'engines', nm: 'Five engines',        d: 'Run in parallel' },
    { k: 'trust',   nm: 'Trust Score',         d: 'Signals fused' },
    { k: 'lane',    nm: 'Lane decision',       d: 'Green, amber or red' },
    { k: 'human',   nm: 'Review or survey',    d: 'Only where needed' },
    { k: 'approve', nm: 'Approval',            d: 'Settlement authorised' },
    { k: 'settle',  nm: 'Settlement',          d: 'Payment released' }
  ];

  function journey(c, s) {
    // Where the claim actually is, expressed against the eight steps a
    // stakeholder recognises rather than the internal stage keys.
    const at = { gate: 1, engines: 2, routing: 3, assist: 5, investigate: 5,
                 settling: 6, settled: 7, closed: 7 }[s.k];
    const skipHuman = c.lane === 'G' && !c.overridden;

    return `<div class="card">
      <h3>Claim journey</h3>
      <div class="sub">${UI.esc(s.d)}${s.waitingOn ? ' · waiting on ' + UI.esc(s.waitingOn) : ''}</div>
      <div class="hr"></div>
      <div class="journey">
        ${STEPS.map((step, i) => {
          const skipped = step.k === 'human' && skipHuman;
          const state = skipped ? 'skip' : i < at ? 'done' : i === at ? 'on' : '';
          return `<div class="jst ${state} ${i === at ? s.bucket : ''}">
            <div class="jdot">${skipped ? '–' : i < at ? '✓' : i === at ? '●' : ''}</div>
            <div class="jnm">${UI.esc(step.nm)}</div>
            <div class="jds">${skipped ? 'not required' : UI.esc(step.d)}</div>
          </div>`;
        }).join('')}
      </div>
      ${skipHuman ? `<div class="reason" style="margin-top:var(--s3);">
        Review and survey are skipped on this claim. That is the whole point of the
        green lane — a human adds nothing the engines have not already established.
      </div>` : ''}
    </div>`;
  }

  /* ---------------- 3 · why this lane ---------------- */
  function whyCard(c, s) {
    if (!s.decided) {
      return `<div class="card why W">
        <div class="whyhead"><span class="lanebig W">ASSESSING</span>
          <h3>This claim has not been routed yet</h3></div>
        <div class="hr"></div>
        <p class="whyp">Gate 00 and the five engines are still running. No lane, no score and
        no dossier are shown until routing has actually reached them — a console that
        displays a verdict the pipeline has not produced is a console that is guessing.</p>
      </div>`;
    }
    const lines = CPEngine.explain(c);
    const head = { G: 'Why this claim is GREEN', A: 'Why this claim is AMBER', R: 'Why this claim is RED' }[c.lane];
    return `<div class="card why ${c.lane}">
      <div class="whyhead">
        <span class="lanebig ${c.lane}">${c.laneLabel}</span>
        <h3>${UI.esc(head)}</h3>
      </div>
      <div class="hr"></div>
      ${lines.map((l, i) => `<p class="whyp${i === 0 ? ' lead' : ''}">${UI.esc(l)}</p>`).join('')}
      <div class="hr"></div>
      <div class="whyrules">
        ${c.reasons.map(r => `<div class="reason ${r.hard ? 'hard' : r.cap ? 'cap' : ''}">${UI.esc(r.t)}</div>`).join('')}
      </div>
    </div>`;
  }

  /* ---------------- 3b · shadow mode ----------------
     Only drawn while a pilot is running and this claim is in the cohort.

     The critical thing this panel does NOT do: it never touches c.lane.
     During shadow testing the recommendation must survive the officer
     disagreeing with it, or the pilot ends up measuring ClaimPulse
     against ClaimPulse. The production override further down the page is
     a different control with a different meaning, and both are on screen
     at once precisely so nobody confuses them.                        */
  let shadowPick = null;      // lane the officer is about to record

  function shadowCard(c, s) {
    if (typeof CPPilot === 'undefined' || !CPPilot.active) return '';
    if (!s.decided) return '';
    if (!CPPilot.inCohort(c)) {
      return `<div class="card shadow out">
        <div class="whyhead"><span class="pilotchip off">&#9675; OUTSIDE COHORT</span>
          <h3>Not part of this pilot</h3></div>
        <div class="hr"></div>
        <p class="whyp">A pilot is defined by what it excludes, and this claim sits outside the
        cohort &mdash; <b>${UI.esc(CPPilot.cohortLabel())}</b>. ClaimPulse still scored it, because
        the prototype scores everything, but nothing about it counts toward the measurement.</p>
      </div>`;
    }

    const d = c.pilotDecision;
    if (d) {
      const same = d.action === 'agreed';
      return `<div class="card shadow ${d.action}">
        <div class="whyhead">
          <span class="pilotchip live">&#9679; SHADOW MODE</span>
          <h3>Recommendation compared against the claims team</h3>
        </div>
        <div class="hr"></div>
        <div class="cmp">
          <div class="cmp-side">
            <div class="cmp-k">ClaimPulse recommended</div>
            <div class="cmp-v">${UI.pill(d.recommendation)}</div>
            <div class="cmp-d">Trust Score ${c.trust.score} &middot; ${UI.esc(c.laneName)}</div>
          </div>
          <div class="cmp-arrow ${d.action}">${same ? '=' : '&ne;'}</div>
          <div class="cmp-side">
            <div class="cmp-k">Claims officer decided</div>
            <div class="cmp-v">${UI.pill(d.lane)}</div>
            <div class="cmp-d">${UI.esc(d.by)} &middot; day ${d.day}</div>
          </div>
        </div>
        <div class="agreebox ${d.action}">
          <span class="agree ${d.action}">${d.action.toUpperCase()}</span>
          ${d.reason ? `<div class="agreereason">${UI.esc(d.reason)}</div>`
            : '<div class="agreereason">Recommendation accepted as issued.</div>'}
        </div>
        <div class="reason" style="margin-top:var(--s3);">
          The lane on this claim is still <b>${UI.esc(c.laneLabel)}</b> &mdash; the recommendation
          ClaimPulse issued. Recording a decision does not change it. That is what makes this a
          measurement rather than a feedback loop.
        </div>
        <button class="btn ghost sm" style="width:100%;margin-top:var(--s3);"
          onclick="CPInspector.undoShadow('${UI.esc(c.id)}')">Withdraw this decision</button>
      </div>`;
    }

    const pick = shadowPick || c.lane;
    const LANES = [['G', 'Green &middot; auto-settle'], ['A', 'Amber &middot; assisted review'],
                   ['R', 'Red &middot; investigate']];
    const needsReason = pick !== c.lane;

    return `<div class="card shadow open">
      <div class="whyhead">
        <span class="pilotchip live">&#9679; SHADOW MODE</span>
        <h3>Record the real decision</h3>
      </div>
      <div class="sub" style="margin-top:var(--s2);">The existing Bajaj process continues as
        normal. ClaimPulse has recommended <b>${UI.esc(c.laneLabel)}</b>; record what the claims
        team actually decided. The two are compared, and neither overwrites the other.</div>
      <div class="hr"></div>
      <div class="cmp">
        <div class="cmp-side">
          <div class="cmp-k">ClaimPulse recommends</div>
          <div class="cmp-v">${UI.pill(c.lane)}</div>
          <div class="cmp-d">Trust Score ${c.trust.score} &middot;
            ${c.surveyor.required ? 'survey required' : 'no survey required'}</div>
        </div>
        <div class="cmp-arrow ${needsReason ? 'modified' : 'agreed'}">${needsReason ? '&ne;' : '='}</div>
        <div class="cmp-side">
          <div class="cmp-k">Claims officer decides</div>
          <div class="lanepick">
            ${LANES.map(([k, nm]) => `
              <button class="lp ${k} ${pick === k ? 'on' : ''}"
                onclick="CPInspector.pickShadow('${k}')">${nm}</button>`).join('')}
          </div>
        </div>
      </div>

      ${needsReason ? `
        <div class="field" style="margin-top:var(--s3);">
          <label>Override reason &mdash; required</label>
          <input id="shadowReason" placeholder="e.g. Additional policy information verified manually">
          <div class="hint">Every override reason is read at evaluation. A pattern in these is the
            most useful thing a 20-day pilot produces.</div>
        </div>` : ''}

      <button class="btn" style="width:100%;margin-top:var(--s3);"
        onclick="CPInspector.recordShadow('${UI.esc(c.id)}')">
        ${needsReason ? 'Record override &middot; ' + pick : 'Approve recommendation &middot; ' + c.laneLabel}
      </button>
      <div style="margin-top:var(--s2);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
        Recorded against day ${CPPilot.cfg.day} of the pilot. Does not settle, pay, or notify the
        customer &mdash; shadow mode never touches the production path.
      </div>
    </div>`;
  }

  function pickShadow(lane) { shadowPick = lane; render(); }

  async function recordShadow(id) {
    const c = CPSync.all().find(x => x.id === id);
    if (!c) return;
    const lane = shadowPick || c.lane;
    const el = UI.$('shadowReason');
    const reason = el ? el.value.trim() : '';
    // An override with no reason is the one thing evaluation cannot use, so
    // it is refused rather than saved empty.
    if (lane !== c.lane && !reason) {
      if (el) { el.focus(); el.placeholder = 'A reason is required to override'; }
      return;
    }
    await CPPilot.decide(id, lane, reason);
    shadowPick = null;
    render();
  }

  async function undoShadow(id) {
    await CPPilot.clearDecision(id);
    shadowPick = null;
    render();
  }

  /* ---------------- 4a · Gate 00 ---------------- */
  function gateCard(c) {
    const worst = c.gate.checks.some(x => x.status === 'FAIL') ? 'FAIL'
                : c.gate.checks.some(x => x.status === 'WARN') ? 'WARN' : 'PASS';
    return `<div class="card">
      <div class="enghead" onclick="CPInspector.toggle('gate')">
        <div class="eno gate">00</div>
        <div class="einfo">
          <div class="enm">Gate 00 · Capture Integrity</div>
          <div class="ewhat">Runs before any engine. A hard fail here stops the pipeline.</div>
        </div>
        <div class="emetrics">
          <div class="escore ${tone(c.gate.score)}">${c.gate.score}<small>/100</small></div>
          <span class="estat ${worst}">${worst}</span>
          <div class="econf">${c.gate.checks.filter(x => x.status === 'PASS').length} of ${c.gate.checks.length} clean</div>
        </div>
        <div class="ecaret">${open.gate ? '▾' : '▸'}</div>
      </div>
      ${open.gate ? `<div class="hr"></div>
        <div class="ebody">
          ${c.gate.checks.map(UI.check).join('')}
          <div class="reason ${c.gate.hardFail ? 'hard' : c.gate.score < 60 ? 'cap' : ''}"
               style="margin-top:var(--s3);">
            ${c.gate.hardFail
              ? 'Gate 00 hard-failed. The five engines were never run — this claim was rejected having spent nothing: no tokens, no GPU seconds, no reviewer.'
              : c.gate.score < 60
                ? 'Capture integrity ' + c.gate.score + '/100. Nothing failed outright, so the engines still ran — but this session does not hold together, and at 30% of the fusion weight it is the largest single drag on the Trust Score.'
                : 'Capture integrity ' + c.gate.score + '/100. The session holds together well enough to spend model time on.'}
          </div>
        </div>` : ''}
    </div>`;
  }

  /* ---------------- 4b · the five engines ---------------- */
  const tone = (n) => n >= 82 ? 'g' : n >= 55 ? 'a' : 'r';
  const statOf = (n) => n >= 82 ? 'PASS' : n >= 55 ? 'REVIEW' : 'ALERT';

  /* One card per engine: the headline a claims officer reads at a glance
     (score, status, key finding, confidence), and the working underneath
     for when they have to defend it. Engine 04 scores nothing into the
     Trust Score — it sizes the claim — so its header says so rather than
     showing a number that does not feed the fusion. */
  function enginesCard(c) {
    return CP_ENGINES.map(e => {
      const d = detailOf(c, e.key);
      const isOpen = !!open[e.key];
      return `<div class="card engine ${d.status}">
        <div class="enghead" onclick="CPInspector.toggle('${e.key}')">
          <div class="eno">${UI.esc(e.no)}</div>
          <div class="einfo">
            <div class="enm">${UI.esc(e.name)}
              <span class="elayer l${e.layer}">Layer ${e.layer}</span></div>
            <div class="ewhat">${UI.esc(e.what)}</div>
            <div class="efind">${UI.esc(d.finding)}</div>
          </div>
          <div class="emetrics">
            ${d.score === null
              ? '<div class="escore n">—<small>no fusion weight</small></div>'
              : `<div class="escore ${tone(d.score)}">${d.score}<small>/100</small></div>`}
            <span class="estat ${d.status}">${UI.esc(d.status)}</span>
            <div class="econf">confidence ${d.conf}</div>
          </div>
          <div class="ecaret">${isOpen ? '▾' : '▸'}</div>
        </div>
        ${isOpen ? '<div class="hr"></div><div class="ebody">' + d.body + '</div>' : ''}
      </div>`;
    }).join('');
  }

  /* What each engine actually found, and the evidence behind it. */
  function detailOf(c, key) {
    if (key === 'doc') {
      const bad = c.doc.checks.filter(x => x.status !== 'PASS');
      return {
        score: c.doc.score, status: statOf(c.doc.score),
        conf: (0.72 + c.doc.score / 400).toFixed(2),
        finding: bad.length
          ? bad.length + ' of ' + c.doc.checks.length + ' document checks did not come back clean: '
            + bad.map(x => x.label.toLowerCase()).join(', ') + '.'
          : 'Vehicle registration and submitted documents match the policy record and the VAHAN registry.',
        body: c.doc.checks.map(UI.check).join('')
          + note(CP_ENGINE_BY_KEY.doc.blurb)
      };
    }

    if (key === 'cv') {
      const low = c.cv.parts.filter(p => p.conf < 0.5);
      return {
        score: c.cv.score, status: statOf(c.cv.score),
        conf: c.cv.avgConf.toFixed(2),
        finding: c.cv.parts.map(p => p.part).slice(0, 2).join(' and ')
          + ' damage detected. Catalogue value ' + UI.inr(c.cv.partsTotal) + '.'
          + (low.length ? ' ' + low.length + ' panel(s) below the 0.50 confidence floor.' : ''),
        body: UI.check({ status: c.cv.cause.status, label: 'Cause-of-loss consistency',
                         v: c.cv.cause.v, d: c.cv.cause.d })
          + `<div class="tblwrap" style="margin-top:var(--s2);">
              <table class="tbl">
                <thead><tr><th>Part</th><th>Action</th><th>Severity</th>
                  <th class="num">Confidence</th><th class="num">Catalogue</th></tr></thead>
                <tbody>${c.cv.parts.map(p => `<tr>
                  <td>${UI.esc(p.part)}</td>
                  <td><span class="pill ${p.action === 'REVIEW' ? 'a' : 'n'}">${UI.esc(p.action)}</span></td>
                  <td>${UI.esc(p.severity)}</td>
                  <td class="num" style="color:${p.conf < 0.5 ? 'var(--red)' : 'var(--ink)'}">${p.conf.toFixed(2)}</td>
                  <td class="num">${UI.inr(p.cost)}</td></tr>`).join('')}
                  <tr><td colspan="4" style="font-weight:800;color:var(--ink)">Catalogue total</td>
                      <td class="num">${UI.inr(c.cv.partsTotal)}</td></tr>
                </tbody></table></div>`
          + note(CP_ENGINE_BY_KEY.cv.blurb)
      };
    }

    if (key === 'fraud') return fraudDetail(c);

    if (key === 'repair') {
      const r = c.repair;
      return {
        score: null,
        status: r.status === 'PASS' ? 'PASS' : r.status === 'WARN' ? 'REVIEW' : 'ALERT',
        conf: '0.93',
        finding: r.overBand
          ? 'Repair estimate of ' + UI.inr(r.garageEstimate) + ' is ' + r.variance
            + '% above the benchmark band for this model and city.'
          : 'Repair estimate of ' + UI.inr(r.garageEstimate) + ' is within the benchmark band.',
        body: UI.check({ status: r.status, label: 'Garage estimate vs catalogue band',
                         v: UI.inr(r.garageEstimate), d: r.note })
          + `<div class="rows" style="font-size:var(--t-xs);margin-top:var(--s2);">
              ${UI.row('Benchmark band, this model and city', UI.inr(r.band[0]) + ' – ' + UI.inr(r.band[1]))}
              ${UI.row('Garage estimate', UI.inr(r.garageEstimate))}
              ${UI.row('Parts catalogue total', UI.inr(r.catalogueTotal))}
              ${r.overBand ? UI.row('Variance above band',
                `<span style="color:var(--red)">+${r.variance}%</span>`) : ''}
              ${UI.row('Garage', (r.garage ? UI.esc(r.garage.name) + ' · ' + UI.esc(r.garage.tier) : UI.esc(r.code)))}
              ${UI.row('Estimate to approval', r.daysAfter + ' day, from ' + r.daysToday + ' days')}
            </div>`
          + note('This engine carries no weight in the Trust Score. It sizes the claim, which is '
                 + 'what triggers the IRDAI corridor test, and it returns the indicative band at '
                 + 'first notification instead of after a physical inspection.')
      };
    }

    // policy
    const flagged = c.pol.clauses.filter(x => x.v === 'REVIEW' || x.v === 'EXCLUDED');
    return {
      score: c.pol.score, status: statOf(c.pol.score),
      conf: (0.80 + c.pol.score / 500).toFixed(2),
      finding: flagged.length
        ? flagged.length + ' clause(s) need reasoning: ' + flagged.map(x => x.ref).join(', ') + '.'
        : 'Damage is covered under the policy in force on the incident date.',
      body: c.pol.clauses.map(cl => UI.check({
              status: cl.v === 'COVERED' || cl.v === 'APPLIES' ? 'PASS'
                    : cl.v === 'REVIEW' ? 'WARN'
                    : cl.v === 'EXCLUDED' ? 'FAIL' : 'PASS',
              label: cl.ref, v: cl.v, d: cl.d })).join('')
        + note(CP_ENGINE_BY_KEY.policy.blurb + ' This is the one engine that reaches Layer 3, '
               + 'and only on the clauses the deterministic pass could not settle.')
    };
  }

  function fraudDetail(c) {
    const g = c.fraud.graph;
    const pos = {}; g.nodes.forEach(n => { pos[n.id] = n; });
    const ICON = { claim: '📄', person: '👤', vehicle: '🚗', garage: '🔧', bank: '🏦' };
    return {
      score: c.fraud.score,
      status: c.fraud.hardFail ? 'ALERT' : statOf(c.fraud.score),
      conf: (0.88).toFixed(2),
      finding: c.fraud.sharedEntities.length
        ? c.fraud.sharedEntities[0] + '.'
        : 'No entity on this claim is shared with any other open or settled claim.',
      body: UI.check({ status: c.fraud.verdict.status, label: 'Ring assessment',
                       v: c.fraud.verdict.v, d: c.fraud.verdict.d })
        + `<div class="graph" style="margin-top:var(--s3);">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              ${g.edges.map(([a, b]) => {
                const A = pos[a], B = pos[b]; if (!A || !B) return '';
                const hot = A.risk === 'high' && B.risk === 'high';
                return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"
                  stroke="${hot ? '#C0392B' : '#B7C9D8'}" stroke-width="${hot ? 0.7 : 0.4}"
                  vector-effect="non-scaling-stroke" ${hot ? '' : 'stroke-dasharray="1.5 1"'} />`;
              }).join('')}
            </svg>
            ${g.nodes.map(n => `
              <div class="gnode ${n.risk}" style="left:${n.x}%;top:${n.y}%;">
                <div class="b">${ICON[n.type] || '●'}</div>
                <div class="l">${UI.esc(n.label)}</div>
              </div>`).join('')}
          </div>
          <div class="rows" style="font-size:var(--t-xs);margin-top:var(--s3);">
            ${UI.row('Ring score', c.fraud.ring + ' <span style="color:var(--dim);font-weight:400">threshold '
              + CP_CONST.RING_FLOOR + '</span>', true)}
            ${UI.row('Duplicate media hits', c.fraud.duplicateMedia)}
            ${UI.row('Prior claims, 90 days', c.fraud.priorClaims90d)}
          </div>
          ${c.fraud.sharedEntities.length ? UI.sec('Shared entities')
            + c.fraud.sharedEntities.map(e => `<div class="reason hard">${UI.esc(e)}</div>`).join('') : ''}`
        + note('The graph scores rings, not claims. No single claim in a ring has to look wrong '
               + 'on its own — which is exactly why claim-level rules miss them.')
    };
  }

  const note = (t) => `<div class="enote">${UI.esc(t)}</div>`;

  /* ---------------- trust fusion ---------------- */
  function trustCard(c, s) {
    if (!s.decided) return '';
    return `<div class="card">
      <h3>Trust Score fusion</h3>
      <div class="sub">Five signals, one routing decision. The contribution column sums to the score.</div>
      <div class="hr"></div>
      <div class="fuse">
        ${c.trust.parts.map(p => `
          <div class="f">
            <div class="nm">${UI.esc(p.label)}</div>
            <div class="raw">${p.raw}</div>
            <div class="w">×${p.w}%</div>
            <div class="c">${p.contribution.toFixed(2)}</div>
            <div class="bar">${UI.meter(p.raw / 100, tone(p.raw))}</div>
          </div>`).join('')}
        <div class="total">
          <div class="nm">TRUST SCORE · routed ${c.laneLabel}</div>
          <div class="c">${c.trust.score}</div>
        </div>
      </div>
      <div style="margin-top:var(--s3);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
        Green floor ${CP_CONST.GREEN_FLOOR} · amber floor ${CP_CONST.AMBER_FLOOR} ·
        ring threshold ${CP_CONST.RING_FLOOR} · IRDAI corridor ${UI.inr(CP_CONST.SURVEYOR_EXEMPTION)}
      </div>
    </div>`;
  }

  /* ---------------- settlement ---------------- */
  function settlementCard(c) {
    const m = c.money;
    return `<div class="card">
      <h3>Settlement working</h3>
      <div class="sub">Assessed at the catalogue band, not at what the garage asked for.</div>
      <div class="hr"></div>
      <div class="rows">
        ${UI.row('Claimed by the garage', UI.inr(m.assessedBase + m.disallowed))}
        ${m.disallowed ? UI.row('less: outside catalogue band',
          `<span style="color:var(--red)">−${UI.inr(m.disallowed)}</span>`) : ''}
        ${UI.row('Assessed amount', UI.inr(m.assessedBase))}
        ${UI.row('less: depreciation ' + (m.zeroDep ? '(nil — zero-dep add-on)'
          : '(' + Math.round(m.depRate * 100) + '%)'), '−' + UI.inr(m.depreciation))}
        ${UI.row('less: compulsory deductible', '−' + UI.inr(m.deductible))}
        ${UI.rowB('NET PAYABLE', UI.inr(m.payable))}
      </div>
      ${m.payable > CP_CONST.SURVEYOR_EXEMPTION ? `
        <div class="reason cap" style="margin-top:var(--s3);">
          Above the IRDAI ₹50,000 surveyor-exemption corridor — a registered surveyor is
          required, so this claim cannot auto-settle however clean it is.
        </div>` : ''}
    </div>`;
  }

  /* ---------------- 5 · surveyor dispatch ---------------- */
  function surveyCard(c, s) {
    if (!s.decided) return '';
    const required = c.surveyor && c.surveyor.required;
    const recommended = c.lane === 'A' && !required;

    if (c.survey) {
      const sv = CP_SURVEYORS.find(x => x.id === c.survey.surveyorId) || {};
      return `<div class="card">
        <h3>Physical survey</h3>
        <div class="sub">Scheduled — the customer's tracker already shows this appointment.</div>
        <div class="hr"></div>
        <div class="booked">
          <div class="bk-av">${UI.esc(initials(c.survey.name))}</div>
          <div>
            <div class="bk-nm">${UI.esc(c.survey.name)} <span class="pill b">${UI.esc(c.survey.surveyorId)}</span></div>
            <div class="bk-ds">${UI.esc(sv.licence || '')} · ${UI.esc(sv.speciality || '')}</div>
            <div class="bk-when">${UI.esc(c.survey.date)} · ${UI.esc(c.survey.slot)}</div>
            <div class="bk-ds">Inspection report expected by
              ${UI.esc(c.survey.reportBy)} · assigned by ${UI.esc(c.survey.by)}</div>
          </div>
        </div>
        <button class="btn ghost sm" style="width:100%;margin-top:var(--s3);"
          onclick="CPInspector.cancelSurvey()">Cancel this appointment</button>
      </div>`;
    }

    if (!required && !recommended) {
      return `<div class="card">
        <h3>Physical survey</h3>
        <div class="hr"></div>
        <div class="nosurvey">
          <div class="big">✓</div>
          <div>
            <b>Not required.</b>
            <div>${UI.esc(c.surveyor.basis)}</div>
            <div class="sub" style="margin-top:4px;">A surveyor visit on this claim would cost
              a day and tell the desk nothing the engines have not already established.</div>
          </div>
        </div>
      </div>`;
    }

    /* Dispatchable means dispatchable. A surveyor 1,100 km from the vehicle
       is on the panel but is not an option for tomorrow morning, and listing
       them is how a dispatcher stops trusting the list. Inside the radius,
       sort by who can actually go first, then by distance. */
    const RADIUS_KM = 120;
    const seed = c.ref || c.id;
    const all = CP_SURVEYORS
      .map(sv => ({ sv, km: cpDistanceKm(sv, c.incident.city, seed + sv.id) }))
      .filter(x => x.km !== null)
      .sort((a, b) => {
        const fa = a.sv.available === 'today' ? 0 : 1, fb = b.sv.available === 'today' ? 0 : 1;
        if (fa !== fb) return fa - fb;
        return a.km - b.km;
      });
    const near = all.filter(x => x.km <= RADIUS_KM);
    const ranked = (near.length ? near : all.slice(0, 3)).slice(0, 5);
    const outOfArea = !near.length;

    const sel = dispatch || {};
    const dates = nextDates(3);

    return `<div class="card">
      <h3>Dispatch a surveyor</h3>
      <div class="sub">${required
        ? UI.esc(c.surveyor.basis)
        : 'Not mandatory on this claim — the reviewer may still want eyes on the vehicle.'}</div>
      <div class="hr"></div>
      <span class="estat ${required ? 'FAIL' : 'WARN'}"
        >SURVEY ${required ? 'REQUIRED' : 'RECOMMENDED'}</span>
      ${outOfArea ? `<div class="reason cap" style="margin-top:var(--s3);">
        No panel surveyor sits within ${RADIUS_KM} km of ${UI.esc(c.incident.city)}.
        The nearest three are offered — expect travel time on top of the inspection.
      </div>` : ''}
      <div class="svlist">
        ${ranked.map(({ sv, km }) => {
          const full = sv.workload >= sv.capacity;
          const on = sel.surveyorId === sv.id;
          return `<div class="sv ${on ? 'on' : ''} ${full ? 'full' : ''}"
                       onclick="CPInspector.pick('${sv.id}')">
            <div class="sv-av">${UI.esc(initials(sv.name))}</div>
            <div class="sv-main">
              <div class="sv-nm">${UI.esc(sv.name)}
                <span class="sv-rating">★ ${sv.rating}</span></div>
              <div class="sv-meta">${UI.esc(sv.city)} · ${km} km away · ${UI.esc(sv.speciality)}</div>
              <div class="sv-load">
                <div class="lbar"><i style="width:${(sv.workload / sv.capacity) * 100}%"
                     class="${full ? 'r' : sv.workload / sv.capacity > 0.6 ? 'a' : 'g'}"></i></div>
                <span>${sv.workload}/${sv.capacity} jobs · avg ${sv.avgHours} h · ${sv.jobs} completed</span>
              </div>
            </div>
            <div class="sv-av2">
              <span class="avail ${sv.available}">${full ? 'At capacity'
                : sv.available === 'today' ? 'Available today' : 'Tomorrow'}</span>
            </div>
          </div>`;
        }).join('')}
      </div>

      ${sel.surveyorId ? `
        <div class="hr"></div>
        <div class="bookrow">
          <label class="fl"><span>Inspection date</span>
            <select onchange="CPInspector.setSlot('date', this.value)">
              ${dates.map(d => `<option value="${UI.esc(d)}"${sel.date === d ? ' selected' : ''}>${UI.esc(d)}</option>`).join('')}
            </select></label>
          <label class="fl"><span>Time slot</span>
            <select onchange="CPInspector.setSlot('slot', this.value)">
              ${CP_SLOTS.map(t => `<option value="${UI.esc(t)}"${sel.slot === t ? ' selected' : ''}>${UI.esc(t)}</option>`).join('')}
            </select></label>
        </div>
        <button class="btn" style="width:100%;margin-top:var(--s3);"
          onclick="CPInspector.assign()">Assign survey to ${UI.esc(nameOf(sel.surveyorId))}</button>
        <div style="margin-top:var(--s2);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
          Assigning writes to the shared claim, so the customer's app shows the appointment
          within a second and the queue status moves to Survey Scheduled.
        </div>` : `
        <div class="reason" style="margin-top:var(--s3);">Pick a surveyor to choose a date and slot.</div>`}
    </div>`;
  }

  const initials = (n) => String(n).split(' ').map(x => x[0]).slice(0, 2).join('');
  const nameOf = (svId) => (CP_SURVEYORS.find(s => s.id === svId) || {}).name || '';

  function nextDates(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(Date.now() + (i + 1) * 86400000);
      out.push(d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }));
    }
    return out;
  }

  function pick(svId) {
    const sv = CP_SURVEYORS.find(s => s.id === svId);
    if (!sv || sv.workload >= sv.capacity) return;
    const d = nextDates(3);
    dispatch = { surveyorId: svId,
                 date: (dispatch && dispatch.date) || (sv.available === 'today' ? d[0] : d[1]),
                 slot: (dispatch && dispatch.slot) || CP_SLOTS[0] };
    render();
  }
  function setSlot(k, v) { if (dispatch) { dispatch[k] = v; render(); } }

  async function assign() {
    const c = claim(); if (!c || !dispatch) return;
    const sv = CP_SURVEYORS.find(s => s.id === dispatch.surveyorId); if (!sv) return;
    // The roster is demo state, but the workload has to move or the next
    // dispatch decision is made against a number that is already wrong.
    sv.workload = Math.min(sv.capacity, sv.workload + 1);
    await CPSync.update(c.id, {
      survey: {
        surveyorId: sv.id, name: sv.name, licence: sv.licence, city: sv.city,
        date: dispatch.date, slot: dispatch.slot,
        reportBy: dispatch.date + ', +' + sv.avgHours + ' h',
        by: 'A. Deshpande · Claims (ID 4417)',
        at: new Date().toISOString()
      }
    });
    dispatch = null;
  }

  async function cancelSurvey() {
    const c = claim(); if (!c || !c.survey) return;
    const sv = CP_SURVEYORS.find(s => s.id === c.survey.surveyorId);
    if (sv) sv.workload = Math.max(0, sv.workload - 1);
    await CPSync.update(c.id, { survey: null });
  }

  /* ---------------- 6 · decide ---------------- */
  function decisionCard(c, s) {
    if (!s.decided) return '';
    if (c.overridden) {
      return `<div class="card">
        <h3>Human override</h3>
        <div class="hr"></div>
        <div class="overridden">
          <b>${UI.esc(c.overridden.by)}</b> moved this claim from
          ${UI.pill(c.overridden.from)} to ${UI.pill(c.overridden.lane)} at ${UI.dt(c.overridden.at)}.<br>
          ${UI.esc(c.overridden.note)}
        </div>
        <div style="margin-top:var(--s3);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
          The override is written to the audit trail and pushed to the claimant's tracker.
          Reversing it is itself an audited event.
        </div>
        <button class="btn ghost sm" style="margin-top:var(--s3);width:100%;"
          onclick="CPOps.clearOverride('${UI.esc(c.id)}')">Revert to the engine decision</button>
      </div>`;
    }
    return `<div class="card">
      <h3>Next action</h3>
      <div class="sub">Every claim can be moved by a named adjuster. The reason is mandatory and audited.</div>
      <div class="hr"></div>
      <div class="override">
        <button class="btn ok sm" style="width:100%" onclick="CPOps.override('${UI.esc(c.id)}','G')">Approve · release to GREEN</button>
        <button class="btn ghost sm" style="width:100%" onclick="CPOps.override('${UI.esc(c.id)}','A')">Hold for AMBER review</button>
        <button class="btn danger sm" style="width:100%" onclick="CPOps.override('${UI.esc(c.id)}','R')">Refer to RED / SIU</button>
      </div>
      <div style="margin-top:var(--s3);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
        Production hardening — audit trail, human override, rollback, explainability —
        is build line D-10, ₹0.75 Cr. Governance is costed in the model, not assumed away.
      </div>
    </div>`;
  }

  return { init, onData, load, render, toggle, pick, setSlot, assign, cancelSurvey,
           pickShadow, recordShadow, undoShadow };
})();
