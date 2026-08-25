/* =====================================================================
   ClaimPulse · Impact Board
   ---------------------------------------------------------------------
   The bridge between the working demo and the investment case.

   Left of the board is what actually happened in this room: the claims
   filed on these devices, the touches they avoided, the days they
   returned. Right of it is the same arithmetic at book scale, straight
   out of Sheet 3. The point is that the second is the first multiplied
   by 164,584 claims a year — not a separate set of numbers.
   ===================================================================== */

const CPImpact = (() => {

  let claims = [];
  const B = () => CP_CONST.BOOK;

  function init() { }
  function onData(all) { claims = all; if (CPApp.surface === 'impact') render(); }

  function render() {
    if (!claims.length) claims = CPSync.all();
    UI.set('impactBody',
      hero() + paybackCard() + pilotCta() + session() + bridgeCard() + ratioCard()
      + stakeholderCard() + footnote());
  }

  /* ---------------- payback, on every basis ----------------
     A single payback number is the fastest way to lose a CFO. The report
     carries six, and they disagree by an order of magnitude — not because
     any is wrong, but because they answer different questions: does the
     ten-month build window count? Whose labour rate? Does fraud benefit
     land at all?

     So the board shows the span and names the basis on every row. The two
     the investment ask leads with are marked; the rest are the honest
     bracket around them. Every figure is computed from the model here, not
     transcribed from the PDF, so it cannot drift out of agreement with it. */
  const PAYBACKS = () => {
    const base = CPModel.run('base');
    const cons = CPModel.run('conservative');
    const aggr = CPModel.run('aggressive');
    return [
      { k: 'Steady state',            v: base.paybackSteady,
        lead: true,
        d: 'Build cost over net monthly benefit — the standard convention. Excludes the ten-month build window.',
        ref: 'W-38 · Note 18' },
      { k: 'From project kickoff',    v: base.paybackKickoff,
        lead: true,
        d: 'Carries the ten-month build window in which no benefit accrues. The figure the proposal headlines.',
        ref: 'Note 27' },
      { k: 'Realistic downside',      v: CPModel.stress('downside').paybackSteady,
        d: 'In-house handling, fraud detection at 82%, and no synthetic-media or renewal benefit at all.',
        ref: 'W-54 · Note 20' },
      { k: 'Absolute floor',          v: CPModel.stress('floor').paybackSteady,
        d: 'Labour savings only. Every rupee of fraud, gate, synthetic-media and renewal value set to zero.',
        ref: 'W-55 · Note 20' },
      { k: 'Correlated stress',       v: CPModel.stress('D').paybackKickoff,
        d: 'Operating reality, fraud and adoption all missing at once, on the kickoff basis. Still NPV-positive.',
        ref: 'Case D · Note 20' },
      { k: 'Conservative plan',       v: cons.paybackKickoff,
        d: 'Kickoff basis at 35% rollout instead of 60%. Aggressive at 85% repays in '
           + aggr.paybackKickoff.toFixed(1) + ' months.',
        ref: 'Note 27' }
    ];
  };

  const paybackSpan = () => {
    const v = PAYBACKS().map(x => x.v).filter(isFinite);
    return Math.min(...v).toFixed(1) + '<small> – </small>' + Math.max(...v).toFixed(0)
         + '<small> mo</small>';
  };

  function paybackCard() {
    const rows = PAYBACKS();
    const max = Math.max(...rows.map(r => r.v).filter(isFinite));
    return `<div class="card" style="margin-bottom:var(--s3);">
      <h3>Payback, on every basis the model carries</h3>
      <div class="sub">These disagree by an order of magnitude and all six are correct. What
        separates them is what each one counts — so each row says.</div>
      <div class="hr"></div>
      <div class="pbrows">
        ${rows.map(r => `
          <div class="pb ${r.lead ? 'lead' : ''}">
            <div class="pb-k">${UI.esc(r.k)}${r.lead ? '<span class="pb-tag">HEADLINE</span>' : ''}</div>
            <div class="pb-v">${r.v.toFixed(r.v < 10 ? 2 : 1)}<small> mo</small></div>
            <div class="pb-bar"><i style="width:${(r.v / max) * 100}%"></i></div>
            <div class="pb-d">${UI.esc(r.d)}</div>
            <div class="pb-ref">${UI.esc(r.ref)}</div>
          </div>`).join('')}
      </div>
      <div class="reason cap" style="margin-top:var(--s3);">
        The spread is the point. Quoting only the shortest row hides the build window; quoting
        only the longest prices a case in which nothing works. The investment ask is made on
        the two marked rows, and the rest are the bracket around them.
      </div>
    </div>`;
  }

  /* ---------------- the ask ----------------
     Every figure above this card is a modelled projection. The honest next
     step after a projection is not "approve the rollout", it is "let us
     measure it on your claims for three weeks" — so the business case ends
     on the way to validate it rather than on the number itself. */
  function pilotCta() {
    const live = typeof CPPilot !== 'undefined' && CPPilot.active;
    return `<div class="card pilot-status ${live ? 'on' : ''}" style="margin-bottom:var(--s3);">
      <div class="ps-head">
        <div>
          <div class="eyebrow">The next step</div>
          <h2>${live ? 'A controlled pilot is running' : 'Validate this on your own claims'}</h2>
          <div class="sub" style="max-width:89ch;">
            Everything above is modelled from the workbook. The way to find out whether it holds
            on the Bajaj book is not to argue about the assumptions &mdash; it is to run
            ClaimPulse beside the existing claims process on a narrow cohort for 15 to 20 days,
            record what the claims team actually decides against every recommendation, and read
            the difference. ClaimPulse settles nothing during that window.
          </div>
        </div>
        <div class="ps-right">
          <div class="pilotchip ${live ? 'live' : 'off'}">${live ? '&#9679; SHADOW MODE' : '&#9675; NOT RUNNING'}</div>
          <button class="btn sm" style="margin-top:var(--s2);width:100%"
            onclick="CPApp.go('pilot')">Run a controlled pilot &rarr;</button>
        </div>
      </div>
    </div>`;
  }

  /* ---------------- hero ---------------- */
  function hero() {
    const b = B();
    return `<div class="split" style="margin-bottom:var(--s3);">
      <div class="bigfig">
        <div class="k">Net annual benefit · Base plan, 60% rollout</div>
        <div class="v">${UI.cr(b.net)}</div>
        <div class="d">
          Gross benefit of ${UI.cr(b.gross)} less ${UI.cr(b.run)} of annual run cost,
          against a one-off build of ${UI.cr(b.build)}. Payback depends entirely on which
          basis you ask for — the panel below carries all of them.
        </div>
      </div>
      <div>
        <div class="kpirow k2" style="grid-template-columns:1fr 1fr;">
          ${UI.kpi('5-year NPV at 12%', UI.cr(b.npv5, 1), '3-year ' + UI.cr(b.npv3, 1))}
          ${UI.kpi('Payback range', paybackSpan(), 'six bases · see below')}
          ${UI.kpi('Motor OD combined ratio', UI.pp(b.combinedPP), UI.pp(b.combinedGroupPP) + ' on the group book')}
          ${UI.kpi('Whole-book TAT', UI.days(b.tatBook), 'from ' + CP_CONST.TAT_TODAY + ' days')}
        </div>
      </div>
    </div>`;
  }

  /* ---------------- this session ---------------- */
  function session() {
    const filed = claims.filter(c => !c.seeded);
    const n = filed.length;
    const touches = filed.reduce((s, c) => s + c.touchesSaved, 0);
    const daysBack = filed.reduce((s, c) => s + c.daysSaved, 0);
    const cost = filed.reduce((s, c) => s + c.costSaved, 0);
    const tokens = filed.filter(c => c.genAiCalls === 0).length;
    const hours = touches * CPModel.INPUTS.J01_minsPerTouch / 60;

    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);flex-wrap:wrap;">
        <div>
          <div class="eyebrow">Live · this session</div>
          <h3>What these claims actually did</h3>
          <div class="sub">Only claims filed on a device in this room. The seeded queue is excluded.</div>
        </div>
        <button class="btn ghost sm" onclick="CPImpact.reset()">Clear the queue</button>
      </div>
      <div class="hr"></div>
      ${n ? `
        <div class="kpirow k5" style="margin-bottom:0;">
          ${UI.kpi('Claims filed', n, 'on ' + (CPSync.mode === 'live' ? 'any connected device' : 'this device'))}
          ${UI.kpi('Manual touches avoided', touches.toFixed(1), UI.num(hours, 1) + ' handling hours released')}
          ${UI.kpi('Claimant-days returned', daysBack.toFixed(1), 'against a 9.8-day baseline')}
          ${UI.kpi('Cost to serve avoided', UI.inr(cost), UI.inr(cost / n) + ' a claim')}
          ${UI.kpi('Claims that cost ₹0 in tokens', `${tokens}<small> / ${n}</small>`, 'no generative model call at all', 'g')}
        </div>
        <div class="hr"></div>
        <div style="font-size:var(--t-sm);color:var(--body);line-height:1.65;">
          At ${UI.num(B().claims)} claims a year on the platform, ${n === 1 ? 'this claim' : 'these ' + n + ' claims'}
          repeated across the book is
          <b>${UI.compact(touches / n * B().claims)} manual touches</b> and
          <b>${UI.compact(daysBack / n * B().claims)} claimant-days</b> a year.
        </div>`
        : UI.empty('📈', 'No claims filed yet. File one from the Claimant surface and the counters move.')}
    </div>`;
  }

  /* ---------------- benefit bridge ---------------- */
  function bridgeCard() {
    const b = B().benefits, B_ = B();
    const steps = [
      { nm: 'Labour\ntouches saved', v: b.labour,     tone: 'var(--bajaj)' },
      { nm: 'Fraud\ngraph engine',   v: b.fraudGraph, tone: 'var(--bajaj-sky)' },
      { nm: 'Fraud\nthe Gate',       v: b.fraudGate,  tone: 'var(--bajaj-sky)' },
      { nm: 'Synthetic\nmedia',      v: b.synthetic,  tone: 'var(--bajaj-sky)' },
      { nm: 'Renewal\nretention',    v: b.renewal,    tone: 'var(--bajaj-sky)' },
      { nm: 'less\nfriction',        v: b.friction,   tone: 'var(--amber)' },
      { nm: 'GROSS\nBENEFIT',        v: B_.gross,     tone: 'var(--bajaj-deep)', total: true },
      { nm: 'less\nrun cost',        v: -B_.run,      tone: 'var(--amber)' },
      { nm: 'NET ANNUAL\nBENEFIT',   v: B_.net,       tone: 'var(--green)', total: true }
    ];

    // Running base so each bar starts where the previous one finished.
    let run = 0;
    const laid = steps.map(s => {
      const base = s.total ? 0 : (s.v >= 0 ? run : run + s.v);
      if (!s.total) run += s.v; else run = s.v;
      return { ...s, base, h: Math.abs(s.v) };
    });
    const max = Math.max(...laid.map(s => s.base + s.h));

    return `<div class="card">
      <h3>Where the annual benefit comes from</h3>
      <div class="sub">₹ Cr a year, steady state, Base plan — Sheet 2 Part 1B</div>
      <div class="hr"></div>
      <div class="bridge">
        ${laid.map(s => `
          <div class="b" title="${UI.esc(s.nm.replace('\n', ' '))} — ${UI.cr(s.v)}">
            <div class="amt">${s.v >= 0 ? '' : '−'}${Math.abs(s.v).toFixed(1)}</div>
            <div class="bar" style="height:${(s.h / max) * 100}%;margin-bottom:${(s.base / max) * 100}%;background:${s.tone};
                 ${s.total ? '' : 'opacity:.9;'}"></div>
            <div class="nm">${UI.esc(s.nm).replace(/\n/g, '<br>')}</div>
          </div>`).join('')}
      </div>
      <div class="hr"></div>
      <div style="font-size:var(--t-sm);color:var(--body);line-height:1.65;">
        Both halves of the combined ratio move and neither carries the case alone. Strip out
        <b>every rupee</b> of fraud benefit and the labour engine alone still repays the build —
        the floor case in the payback panel above.
      </div>
    </div>`;
  }

  /* ---------------- combined ratio ---------------- */
  function ratioCard() {
    const b = B();
    const w = (x) => (x / b.combinedPP) * 100;
    return `<div class="split">
      <div class="card">
        <h3>Motor OD combined ratio · both halves move</h3>
        <div class="sub">Loss ratio plus expense ratio, against Motor OD earned premium — Sheet 3 Part G</div>
        <div class="hr"></div>
        <div style="display:flex;height:34px;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);">
          <div style="width:${w(b.lossPP)}%;background:var(--bajaj);display:grid;place-items:center;color:#fff;font-size:var(--t-xs);font-weight:800;">${UI.pp(b.lossPP)}</div>
          <div style="width:${w(b.expensePP)}%;background:var(--bajaj-sky);display:grid;place-items:center;color:#fff;font-size:var(--t-xs);font-weight:800;">${UI.pp(b.expensePP)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:var(--t-xs);color:var(--mist);margin-top:var(--s2);">
          <span>Loss ratio — all three fraud lines</span><span>Expense ratio — labour, net of friction and run cost</span>
        </div>
        <div class="hr"></div>
        <div class="rows">
          ${UI.row('Motor OD basis (W-43)', `<b style="font-size:var(--t-md)">${UI.pp(b.combinedPP)}</b>`)}
          ${UI.row('Group basis (W-46)', UI.pp(b.combinedGroupPP))}
          ${UI.row('₹ per 1 pp of Motor OD ratio', UI.cr(b.perPP))}
        </div>
        <div class="hr"></div>
        <div style="font-size:var(--t-xs);color:var(--body);line-height:1.6;background:var(--amber-bg);border:1px solid var(--amber-line);border-radius:var(--r);padding:var(--s2) var(--s3);">
          The two bases are not interchangeable. Never subtract the Motor OD figure from a
          group combined ratio.
        </div>
      </div>

      <div class="card">
        <h3>Unit economics</h3>
        <div class="sub">Per claim, on the platform</div>
        <div class="hr"></div>
        <div class="rows">
          ${UI.row('Cost to serve, today', UI.inr(b.costToServeToday))}
          ${UI.row('Cost to serve, after', `<b>${UI.inr(b.costToServeAfter)}</b>`)}
          ${UI.row('Reduction', `<span style="color:var(--green)">−${UI.pct(b.costToServeCut)}</span>`)}
          ${UI.row('Run cost per claim', UI.inr(b.runCostPerClaim))}
          ${UI.row('Net benefit per claim', UI.inr(b.netPerClaim))}
          ${UI.row('Benefit per ₹1 of run cost', '₹' + (b.gross / b.run).toFixed(1))}
          ${UI.row('Blended manual touches', b.touches.toFixed(2) + ' from ' + CP_CONST.TOUCHES_TODAY)}
          ${UI.row('Adjuster throughput', b.throughput.toFixed(2) + '×')}
        </div>
      </div>
    </div>`;
  }

  /* ---------------- stakeholder scorecard ---------------- */
  function stakeholderCard() {
    const b = B();
    const rows = [
      ['Policyholder', `${CP_CONST.TAT_TODAY} d → ${b.tatPlatform.toFixed(2)} d`,
       'Green-lane auto-settlement, with status pushed instead of pulled',
       UI.compact(b.claimantDays) + ' claimant-days returned a year'],
      ['Claims operations', `${CP_CONST.TOUCHES_TODAY} → ${b.touches.toFixed(2)} touches`,
       'Trust Score routes each claim to the lane it needs — 65% never reaches a queue',
       UI.compact(b.touchesAvoided) + ' touches avoided · ' + b.fte.toFixed(1) + ' FTE released'],
      ['Surveyors', `${UI.compact(b.surveyToday)} → ${UI.compact(b.surveyAfter)}`,
       'Green and amber sit inside the IRDAI ₹50,000 corridor; surveyors move above it',
       UI.compact(b.surveyAvoided) + ' physical visits avoided a year'],
      ['Garages', `${CPModel.INPUTS.J06_garageToday} d → ${CPModel.INPUTS.J07_garageAfter} d`,
       'The repair cost engine returns an indicative band at first notification',
       b.garageDaysSaved + ' days cut from estimate to approval'],
      ['Fraud / SIU', `${UI.pct(CPModel.INPUTS.B13_fraudToday, 0)} → ${UI.pct(CPModel.INPUTS.B14_fraudTarget, 0)}`,
       'Gate 00 screens evidence before any model runs; the graph scores rings, not claims',
       'undetected share 38% → 10% · ' + UI.cr(b.split.underwriting) + ' of loss-ratio value'],
      ['Regulator', 'assumed → costed',
       'Human override, full audit trail and a per-decision explanation, built in',
       UI.cr(b.governance.build) + ' build + ' + UI.cr(b.governance.annual) +
       ' a year · ' + UI.pct(b.governance.share, 1) + ' of the build']
    ];

    return `<div class="card">
      <h3>One routing decision, six stakeholder outcomes</h3>
      <div class="sub">Each traced to the mechanism that produces it — Sheet 6, Sheet 3 Part I</div>
      <div class="hr"></div>
      <div class="tblwrap" style="max-height:none;">
        <table class="tbl">
          <thead><tr><th>Stakeholder</th><th>Today → ClaimPulse</th><th>The mechanism</th><th>Quantified outcome</th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td style="font-weight:800;color:var(--bajaj-navy)">${UI.esc(r[0])}</td>
            <td class="mono" style="white-space:nowrap;color:var(--bajaj-dark);font-weight:700">${UI.esc(r[1])}</td>
            <td>${UI.esc(r[2])}</td>
            <td style="font-weight:700;color:var(--ink)">${r[3]}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="hr"></div>
      <div style="font-size:var(--t-sm);color:#8A5800;background:var(--amber-bg);border:1px solid var(--amber-line);border-radius:var(--r);padding:var(--s3);line-height:1.6;">
        <b>And the group it costs.</b> ${UI.num(b.downgraded)} honest claimants a year cannot use
        live capture — older phones, indoor parking, GPS off — and drop from green to amber.
        Still handled, just not auto-settled. ${UI.cr(Math.abs(b.benefits.friction))} a year,
        ${UI.pct(Math.abs(b.benefits.friction) / b.gross, 2)} of gross benefit. We charge
        ourselves for our own hard rule, and we quote it unprompted.
      </div>
    </div>`;
  }

  function footnote() {
    return `<div class="card tint">
      <div style="font-size:var(--t-xs);color:var(--body);line-height:1.7;">
        <b>Every figure on this board is computed, not typed.</b> The model in
        <code style="font-family:var(--m);font-size:var(--t-micro)">model.js</code> reproduces
        Sheet 1 and Sheet 3 of the investor workbook and asserts itself against the workbook's
        own computed values on 58 checks — open the console and run
        <code style="font-family:var(--m);font-size:var(--t-micro)">CPModel.selfCheck()</code>.
        If a formula here ever drifts from the Excel, that check fails.
      </div>
    </div>`;
  }

  async function reset() { await CPSync.clear(); }

  return { init, onData, render, reset };
})();
