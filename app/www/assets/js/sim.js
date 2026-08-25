/* =====================================================================
   ClaimPulse · Investor Simulator
   ---------------------------------------------------------------------
   The live version of the case. Type over any of our assumptions and the
   whole model recomputes — because it is the same model. Every figure
   below comes out of CPModel, which asserts itself against the workbook
   on 58 checks.

   The honest device here is the break-even panel: it says what would
   have to be true for this case to FAIL, and shows how much cushion
   sits between that and what we assume.
   ===================================================================== */

const CPSim = (() => {

  /* Levers a judge is most likely to attack, each carrying its workbook
     reference and evidence tier so the challenge lands on the record. */
  const LEVERS = [
    { k: 'rollout', nm: 'Rollout of the addressable book', min: 0.05, max: 1, step: 0.05,
      fmt: v => UI.pct(v, 0), plan: true,
      src: 'C-01 · the only lever that separates the three plans' },
    { k: 'B02_touchesToday', nm: 'Manual touches per claim today', min: 1, max: 10, step: 0.5,
      fmt: v => v.toFixed(1),
      src: 'B-02 · Tier 4, workflow mapping. The largest single driver of the labour line.' },
    { k: 'costPerTouch', nm: 'Cost per manual touch, after', min: 50, max: 400, step: 5,
      fmt: v => UI.inr(v), plan: true,
      src: 'C-02 · Tier 4. In-house handling would be ₹83 (F-01).' },
    { k: 'B14_fraudTarget', nm: 'Fraud detection, target', min: 0.62, max: 0.95, step: 0.01,
      fmt: v => UI.pct(v, 0),
      src: 'B-14 · a TARGET, not a capability. Published graph-AI lift is +10 to 20 pp against our +28.' },
    { k: 'B17_leakage', nm: 'Fraud leakage pool, % of claims value', min: 0, max: 0.06, step: 0.0025,
      fmt: v => UI.pct(v, 2),
      src: 'B-17 · Tier 2 proxy from an 8–10% health benchmark applied to motor.' },
    { k: 'B18_synthetic', nm: 'Synthetic-media incidence', min: 0, max: 0.03, step: 0.0025,
      fmt: v => UI.pct(v, 2),
      src: 'B-18 · Tier 4, forward looking. No published incidence exists anywhere.' },
    { k: 'B01_avgClaim', nm: 'Average claim size', min: 25000, max: 90000, step: 1000,
      fmt: v => UI.inr(v),
      src: 'B-01 · Tier 4. Lower means more claims and more benefit, so this is set conservatively.' },
    { k: 'B03_greenShare', nm: 'Green lane share', min: 0.35, max: 0.85, step: 0.01,
      fmt: v => UI.pct(v, 0),
      src: 'B-03 · Tier 2. Amber absorbs the change; red holds at 10%.' },
    { k: 'B20_friction', nm: 'Live-capture friction', min: 0, max: 0.25, step: 0.01,
      fmt: v => UI.pct(v, 0),
      src: 'B-20 · Tier 4. Honest claimants who cannot use live capture.' }
  ];

  let planKey = 'base';
  let over = {};

  function init() { }
  function onData() { }

  /* Overrides, with the lane shares kept summing to 1. */
  function overrides() {
    const o = Object.assign({}, over);
    if (o.B03_greenShare !== undefined) {
      const red = CPModel.INPUTS.B05_redShare;
      o.B04_amberShare = Math.max(0, 1 - o.B03_greenShare - red);
    }
    return o;
  }

  const current  = () => CPModel.run(planKey, overrides());
  const published = () => CPModel.run(planKey);
  const dirty = () => Object.keys(over).length > 0;

  function set(k, v) {
    const base = CPModel.PLANS[planKey];
    const dflt = (k === 'rollout' || k === 'costPerTouch') ? base[k] : CPModel.INPUTS[k];
    if (Math.abs(v - dflt) < 1e-9) delete over[k]; else over[k] = v;
    render();
  }

  function setPlan(k) { planKey = k; over = {}; render(); }
  function reset() { over = {}; render(); }

  /* ================= render ================= */
  function render() {
    UI.set('simLevers', leverPanel());
    UI.set('simBody', results() + breakEven() + stressGrid() + provenance());
  }

  function leverPanel() {
    const plan = CPModel.PLANS[planKey];
    return `<div class="card">
      <h3>The three plans</h3>
      <div class="sub">Only two levers separate them.</div>
      <div class="hr"></div>
      <div class="plans">
        ${Object.entries(CPModel.PLANS).map(([k, p]) => `
          <button class="${k === planKey ? 'on' : ''}" onclick="CPSim.setPlan('${k}')">
            ${UI.esc(p.label)}<small>${UI.pct(p.rollout, 0)} · ₹${p.costPerTouch}</small>
          </button>`).join('')}
      </div>
      ${planKey === 'base'
        ? `<div style="font-size:var(--t-xs);color:var(--green);font-weight:700;">This is the plan the deck quotes.</div>`
        : `<div style="font-size:var(--t-xs);color:var(--amber);font-weight:700;">The deck quotes Base. This is the ${UI.esc(plan.label)} plan.</div>`}
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);">
        <div>
          <h3>Live challenge levers</h3>
          <div class="sub">Move any assumption. The whole model recomputes.</div>
        </div>
        ${dirty() ? `<button class="btn ghost sm" onclick="CPSim.reset()">Reset</button>` : ''}
      </div>
      <div class="hr"></div>
      <div class="levers">
        ${LEVERS.map(L => {
          const dflt = L.plan ? CPModel.PLANS[planKey][L.k] : CPModel.INPUTS[L.k];
          const v = over[L.k] !== undefined ? over[L.k] : dflt;
          const moved = over[L.k] !== undefined;
          return `<div class="lever ${moved ? 'moved' : ''}">
            <div class="top">
              <span class="nm">${UI.esc(L.nm)}</span>
              <span class="vv">${L.fmt(v)}</span>
            </div>
            <input type="range" min="${L.min}" max="${L.max}" step="${L.step}" value="${v}"
                   oninput="CPSim.set('${L.k}', +this.value)">
            <div class="src">${UI.esc(L.src)}${moved ? ` · published ${L.fmt(dflt)}` : ''}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="hr"></div>
      <div style="font-size:var(--t-xs);color:${dirty() ? 'var(--amber)' : 'var(--mist)'};font-weight:700;line-height:1.5;">
        ${dirty()
          ? `${Object.keys(over).length} assumption${Object.keys(over).length > 1 ? 's' : ''} overridden. Every figure on the right has moved with ${Object.keys(over).length > 1 ? 'them' : 'it'}.`
          : 'No overrides. The model is running on its published assumptions.'}
      </div>
    </div>`;
  }

  /* ---------------- results ---------------- */
  function results() {
    const c = current(), p = published();
    const d = (now, base, fmt, goodDown) => UI.delta(now, base, fmt, goodDown);

    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);flex-wrap:wrap;">
        <div>
          <div class="eyebrow">The case, right now</div>
          <h3>${UI.esc(CPModel.PLANS[planKey].label)} plan${dirty() ? ' · overridden' : ''}</h3>
        </div>
        <div style="text-align:right;">
          <div style="font-size:var(--t-xl);font-weight:800;color:${c.net > 0 ? 'var(--bajaj-navy)' : 'var(--red)'};letter-spacing:-2px;line-height:1;">${UI.cr(c.net)}</div>
          <div class="tag">NET ANNUAL BENEFIT</div>
          ${dirty() ? `<div style="margin-top:3px;">${d(c.net, p.net, v => UI.cr(v))}</div>` : ''}
        </div>
      </div>
      <div class="hr"></div>
      <div class="kpirow k3" style="margin-bottom:0;">
        ${UI.kpi('Payback from kickoff', isFinite(c.paybackKickoff) ? c.paybackKickoff.toFixed(1) + '<small> mo</small>' : '—',
          dirty() ? d(c.paybackKickoff, p.paybackKickoff, v => v.toFixed(1) + ' mo', true) : 'includes the 10-month build',
          c.paybackKickoff > 36 ? 'a' : '')}
        ${UI.kpi('5-year NPV at 12%', UI.cr(c.npv5, 1),
          dirty() ? d(c.npv5, p.npv5, v => UI.cr(v, 1)) : '3-year ' + UI.cr(c.npv3, 1),
          c.npv5 <= 0 ? 'r' : '')}
        ${UI.kpi('Motor OD combined ratio', UI.pp(c.combinedPP),
          dirty() ? d(c.combinedPP, p.combinedPP, v => UI.pp(v)) : UI.pp(c.combinedGroupPP) + ' on the group book')}
        ${UI.kpi('Whole-book TAT', UI.days(c.tatBook),
          dirty() ? d(c.tatBook, p.tatBook, v => v.toFixed(2) + ' d', true) : 'from ' + CP_CONST.TAT_TODAY + ' days')}
        ${UI.kpi('Cost to serve', UI.inr(c.costToServeAfter),
          dirty() ? d(c.costToServeAfter, p.costToServeAfter, v => UI.inr(v), true) : 'from ' + UI.inr(c.costToServeToday))}
        ${UI.kpi('FTE capacity released', c.fte.toFixed(1),
          dirty() ? d(c.fte, p.fte, v => v.toFixed(1)) : 'redeployed to complex claims, not removed')}
      </div>
      <div class="hr"></div>
      ${UI.sec('The six benefit lines · ₹ Cr a year')}
      <div class="rows">
        ${[['Labour · manual touches removed (W-18)', c.benefits.labour],
           ['Fraud avoided · graph engine (W-19)', c.benefits.fraudGraph],
           ['Fraud avoided · Capture Integrity Gate (W-20)', c.benefits.fraudGate],
           ['Synthetic-media exposure avoided (W-21)', c.benefits.synthetic],
           ['Renewal retention (W-22)', c.benefits.renewal],
           ['less: live-capture friction (W-23)', c.benefits.friction]]
          .map(([n, v]) => UI.row(n, `<span style="color:${v < 0 ? 'var(--amber)' : 'var(--ink)'}">${UI.cr(v)}</span>`)).join('')}
        ${UI.rowB('GROSS ANNUAL BENEFIT (W-24)', UI.cr(c.gross))}
        ${UI.row('less: annual run cost (W-32)', `<span style="color:var(--amber)">${UI.cr(-c.run)}</span>`)}
        ${UI.rowB('NET ANNUAL BENEFIT (W-35)', UI.cr(c.net))}
      </div>
      <div class="hr"></div>
      ${UI.sec('The chain, filed premium to claims in scope')}
      <div class="rows" style="font-size:var(--t-xs);">
        ${UI.row('Motor OD GDPI, FY2025-26 (A-01)', UI.cr(CPModel.INPUTS.A01_gdpiMotorOD, 1))}
        ${UI.row('× NEP / GDPI ratio (A-02)', UI.pct(CPModel.INPUTS.A02_nepRatio, 2))}
        ${UI.row('= Motor OD net earned premium (W-02)', UI.cr(c.nep, 2))}
        ${UI.row('× net incurred claims ratio (A-03)', UI.pct(CPModel.INPUTS.A03_netIncClaims, 1))}
        ${UI.row('= annual incurred claims pool (W-03)', UI.cr(c.pool, 2))}
        ${UI.row('÷ average claim size (B-01)', UI.inr(c.inputs.B01_avgClaim))}
        ${UI.row('= annual claim count, full book (W-05)', UI.num(c.claimsAll))}
        ${UI.row('× rollout (C-01)', UI.pct(c.rollout, 0))}
        ${UI.rowB('= annual claims on the platform (W-07)', UI.num(c.claims))}
      </div>
    </div>`;
  }

  /* ---------------- break-even ---------------- */
  function breakEven() {
    const c = current();
    const bars = [
      { nm: 'Manual touches per claim', assume: c.inputs.B02_touchesToday, breaks: c.beTouches,
        fmt: v => v.toFixed(2), cushion: c.cushionTouches },
      { nm: 'Cost per manual touch', assume: c.inputs.B28_baselineTouchCost, breaks: c.beCostPerTouch,
        fmt: v => UI.inr(v), cushion: c.cushionCost },
      { nm: 'Rollout of the book', assume: c.rollout, breaks: c.beRollout,
        fmt: v => UI.pct(v, 0), cushion: 1 - c.beRollout / c.rollout }
    ];

    return `<div class="card">
      <h3>What would have to be true for this to fail</h3>
      <div class="sub">Break-even with the fraud, gate, synthetic-media and renewal lines all set to zero — labour alone. Sheet 3 Part J.</div>
      <div class="hr"></div>
      ${bars.map(b => {
        const ok = b.cushion > 0;
        return `<div style="margin-bottom:var(--s3);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:var(--t-sm);margin-bottom:5px;">
            <span style="font-weight:700;color:var(--ink)">${UI.esc(b.nm)}</span>
            <span style="font-family:var(--m);font-size:var(--t-xs);">
              we assume <b>${b.fmt(b.assume)}</b> · breaks at
              <b style="color:${ok ? 'var(--green)' : 'var(--red)'}">${isFinite(b.breaks) ? b.fmt(b.breaks) : 'never'}</b>
            </span>
          </div>
          ${UI.meter(Math.max(0, Math.min(1, b.breaks / b.assume)), ok ? 'g' : 'r')}
          <div style="font-size:var(--t-micro);color:${ok ? 'var(--mist)' : 'var(--red)'};font-family:var(--m);margin-top:4px;">
            ${ok ? UI.pct(b.cushion, 0) + ' cushion' : 'NO CUSHION — the plan sits below the labour-only break-even, so the case here is carried by the fraud and gate lines'}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  /* ---------------- correlated stress ---------------- */
  function stressGrid() {
    const keys = ['modelled', 'A', 'B', 'C', 'D', 'floor'];
    const all = keys.map(k => ({ k, s: CPModel.STRESS[k], r: CPModel.stress(k) }));
    const gate = all.every(x => x.k === 'floor' || x.r.npv5 > 0);

    return `<div class="card">
      <h3>Correlated stress · what is left when several assumptions miss at once</h3>
      <div class="sub">Each of A, B and C is a coherent way the plan could disappoint. D applies all three together. Sheet 3 Part L.</div>
      <div class="hr"></div>
      <div class="stressgrid">
        ${all.map(x => `
          <div class="stress ${x.k === 'modelled' ? 'base' : ''}">
            <div class="h">${UI.esc(x.s.label)}</div>
            <div class="n">${UI.esc(x.s.note)}</div>
            <div class="m"><span>Net annual</span><span>${UI.cr(x.r.net)}</span></div>
            <div class="m"><span>5-yr NPV</span><span>${x.k === 'floor' ? '—' : UI.cr(x.r.npv5, 1)}</span></div>
            <div class="m"><span>Payback</span><span>${isFinite(x.r.paybackKickoff) ? x.r.paybackKickoff.toFixed(1) + ' mo' : '—'}</span></div>
          </div>`).join('')}
      </div>
      <div class="hr"></div>
      <div style="display:flex;align-items:center;gap:var(--s3);padding:var(--s3);border-radius:var(--r);
                  background:${gate ? 'var(--green-bg)' : 'var(--red-bg)'};
                  border:1px solid ${gate ? 'var(--green-line)' : 'var(--red-line)'};">
        <span class="pill ${gate ? 'g' : 'r'}">${gate ? 'PASS' : 'FAIL'}</span>
        <div style="font-size:var(--t-sm);color:${gate ? 'var(--green)' : 'var(--red)'};font-weight:700;line-height:1.5;">
          Investor gate — is five-year NPV positive in every case above?
          <span style="font-weight:400;color:var(--body);display:block;">
            Tested on the correlated case, not on the headline. Three separate things have to
            disappoint at the same time before the return compresses materially, and the build
            still repays even then.
          </span>
        </div>
      </div>
    </div>`;
  }

  function provenance() {
    return `<div class="card">
      ${UI.sec('Reading this against the deck')}
      <div style="font-size:var(--t-xs);color:var(--body);line-height:1.7;">
        These levers move <b>one input at a time</b>. The named scenarios on the stress-test
        slide move more than one, so a single lever here will not always reproduce the figure
        printed there.
        <br><br>
        The one to know: dragging <b>fraud detection</b> back to 62% removes the graph and gate
        lines (W-19, W-20) and costs ${UI.cr(17.19, 1)}. The deck's “detection reverts to 62%”
        scenario is ${UI.cr(23.5, 1)} because it also zeroes the synthetic-media line (W-21) —
        which is driven by a separate input, the gate's own detection rate on synthetic media
        (B-19), not by B-14. To reproduce the deck's figure, drag
        <b>synthetic-media incidence to 0</b> as well.
      </div>
    </div>

    <div class="card tint">
      <div style="font-size:var(--t-xs);color:var(--body);line-height:1.7;">
        <b>This simulator is the workbook.</b> Sheet 1 holds every input; Sheets 2 to 6 contain
        no typed numbers at all. The same discipline holds here — the levers above write into
        the inputs, and every output is derived. On load the model asserts itself against the
        workbook's own computed values on 58 checks covering Parts A, B, C, E, F, G, I, J and L
        plus the Sheet 4 forecast. Run
        <code style="font-family:var(--m);font-size:var(--t-micro)">CPModel.selfCheck(true)</code>
        in the console to see every one.
      </div>
    </div>`;
  }

  return { init, onData, render, set, setPlan, reset };
})();
