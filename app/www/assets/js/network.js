/* =====================================================================
   ClaimPulse · Garage and Surveyor surface
   ---------------------------------------------------------------------
   Two stakeholders the deck claims and nothing else in the demo showed.

   GARAGES  The repair cost engine returns an indicative band at first
            notification instead of after a physical inspection. That is
            the mechanism behind W-73: estimate-to-approval 4 days to 1.

   SURVEYORS  Green and amber sit inside the IRDAI Rs 50,000 corridor;
            surveyors move above it, where judgement is actually needed.
            W-70 to W-72 — redeployed, not displaced.
   ===================================================================== */

const CPNetwork = (() => {

  let claims = [];
  const B = () => CP_CONST.BOOK;

  function init() { }
  function onData(all) { claims = all; if (CPApp.surface === 'network') render(); }

  function render() {
    if (!claims.length) claims = CPSync.all();
    paintKpis();
    UI.set('netMain', garageBoard());
    UI.set('netSide', surveyorBoard() + bookBoard());
  }

  /* ---------------- KPIs ---------------- */
  function paintKpis() {
    const needSurvey = claims.filter(c => c.surveyor && c.surveyor.required).length;
    const n = claims.length || 1;
    const overBand = claims.filter(c => c.repair.overBand).length;
    const disallowed = claims.reduce((s, c) => s + c.money.disallowed, 0);

    UI.set('netKpis',
      UI.kpi('Estimate to approval', CPModel.INPUTS.J07_garageAfter + ' day',
             `from ${CPModel.INPUTS.J06_garageToday} days · W-73`) +
      UI.kpi('Surveys needed, this queue', `${needSurvey}<small> / ${claims.length}</small>`,
             UI.pct(needSurvey / n, 0) + ' — against 55% of claims surveyed today',
             needSurvey / n > 0.3 ? 'a' : 'g') +
      UI.kpi('Estimates above band', overBand,
             overBand ? UI.inr(disallowed) + ' held back from settlement' : 'every estimate inside the catalogue band',
             overBand ? 'a' : 'g') +
      UI.kpi('Surveyor visits avoided', UI.compact(B().surveyAvoided),
             'a year at 60% rollout · W-72'));
  }

  /* ---------------- garage jobs ---------------- */
  function garageBoard() {
    const byGarage = {};
    claims.forEach(c => {
      const code = c.repair.code || 'G-1180';
      (byGarage[code] = byGarage[code] || []).push(c);
    });

    const cards = Object.entries(byGarage).map(([code, list]) => {
      const g = CP_GARAGES[code] || { name: code, city: '—', tier: 'Network', rating: 0, network: true };
      const flagged = list.filter(c => c.repair.overBand).length;
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);flex-wrap:wrap;">
          <div>
            <div class="eyebrow">${UI.esc(code)}</div>
            <h3>${UI.esc(g.name)}</h3>
            <div class="sub">${UI.esc(g.city)}</div>
          </div>
          <div style="text-align:right;">
            <span class="pill ${g.network ? 'b' : 'a'}">${UI.esc(g.tier)}</span>
            <div style="font-size:var(--t-sm);font-weight:800;color:var(--ink);margin-top:4px;">★ ${g.rating}</div>
            ${flagged ? `<div class="tag" style="color:var(--red)">${flagged} above band</div>` : ''}
          </div>
        </div>
        <div class="hr"></div>
        <div class="tblwrap" style="max-height:none;">
          <table class="tbl">
            <thead><tr>
              <th>Claim</th><th>Vehicle</th>
              <th style="text-align:right">Band at FNOL</th>
              <th style="text-align:right">Estimate</th>
              <th style="text-align:right">Approved</th>
              <th>Status</th>
            </tr></thead>
            <tbody>${list.map(c => `<tr>
              <td class="mono">${UI.esc(c.ref || c.id)}</td>
              <td>${UI.esc(c.policy.vehicle)}<div class="tag">${UI.esc(c.policy.reg)}</div></td>
              <td class="num" style="font-weight:600;color:var(--mist)">${UI.inr(c.repair.band[0])}–${UI.inr(c.repair.band[1])}</td>
              <td class="num">${UI.inr(c.repair.garageEstimate)}</td>
              <td class="num">${UI.inr(c.money.assessedBase)}</td>
              <td>${c.repair.overBand
                    ? `<span class="pill r">+${c.repair.variance}%</span>`
                    : `<span class="pill g">IN BAND</span>`}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
    });

    return `<div class="card tint">
        <h3>What the garage sees now</h3>
        <div class="sub">The indicative band arrives with the first notification, before anyone drives anywhere.</div>
        <div class="hr"></div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:var(--s3);align-items:center;text-align:center;">
          <div>
            <div class="tag">TODAY</div>
            <div style="font-size:var(--t-lg);font-weight:800;color:var(--mist);letter-spacing:-1px;">${CPModel.INPUTS.J06_garageToday} days</div>
            <div style="font-size:var(--t-xs);color:var(--mist);line-height:1.5;">Manual estimate, physical inspection, then approval</div>
          </div>
          <div style="font-size:var(--t-lg);color:var(--bajaj);">→</div>
          <div>
            <div class="tag" style="color:var(--bajaj)">CLAIMPULSE</div>
            <div style="font-size:var(--t-lg);font-weight:800;color:var(--bajaj-navy);letter-spacing:-1px;">${CPModel.INPUTS.J07_garageAfter} day</div>
            <div style="font-size:var(--t-xs);color:var(--mist);line-height:1.5;">Band returned at FNOL from settled claims and live parts feeds</div>
          </div>
        </div>
      </div>` +
      (cards.length ? cards.join('') : `<div class="card">${UI.empty('🔧', 'No jobs in the network yet.')}</div>`);
  }

  /* ---------------- surveyor deployment ---------------- */
  function surveyorBoard() {
    const need = claims.filter(c => c.surveyor && c.surveyor.required);
    const inside = claims.filter(c => c.surveyor && !c.surveyor.required);

    return `<div class="card">
      <h3>Surveyor deployment</h3>
      <div class="sub">Redeployed above the corridor, not displaced.</div>
      <div class="hr"></div>

      ${UI.sec('Needs a registered surveyor · ' + need.length)}
      ${need.length ? need.map(c => `
        <div class="check ${c.lane === 'R' ? 'FAIL' : 'WARN'}">
          <div class="mk">${c.lane === 'R' ? '×' : '!'}</div>
          <div class="nm">${UI.esc(c.ref || c.id)} · ${UI.esc(c.policy.vehicle)}</div>
          <div class="vv">${UI.inr(c.money.payable)}</div>
          <div class="ds">${UI.esc(c.surveyor.basis)}</div>
        </div>`).join('')
        : `<div style="font-size:var(--t-sm);color:var(--mist);padding:var(--s2) 0;">Nothing in the queue needs a physical survey.</div>`}

      <div class="hr"></div>
      ${UI.sec('Inside the corridor · no survey · ' + inside.length)}
      <div style="font-size:var(--t-sm);color:var(--body);line-height:1.6;">
        ${inside.length} of ${claims.length} claims settle below ${UI.inr(CP_CONST.SURVEYOR_EXEMPTION)},
        where the IRDAI Master Circular on Protection of Policyholders' Interests (2024)
        requires no registered surveyor. Today ${UI.pct(CPModel.INPUTS.J03_surveyToday, 0)} of claims
        get one anyway.
      </div>
    </div>`;
  }

  /* ---------------- book scale ---------------- */
  function bookBoard() {
    const b = B();
    return `<div class="card">
      ${UI.sec('At book scale · Base plan, 60% rollout')}
      <div class="rows">
        ${UI.row('Claims needing a survey today', UI.compact(b.surveyToday) + ' (W-70)')}
        ${UI.row('Claims needing one after', UI.compact(b.surveyAfter) + ' (W-71)')}
        ${UI.row('Visits avoided a year', `<span style="color:var(--green)">${UI.compact(b.surveyAvoided)}</span> (W-72)`)}
        ${UI.row('Garage days saved per claim', b.garageDaysSaved + ' d (W-73)')}
      </div>
      <div class="hr"></div>
      <div style="font-size:var(--t-xs);color:var(--body);line-height:1.65;">
        Surveyors' own complaint is re-inspection caused by poor images. Guided live capture
        removes the cause, and the corridor moves them to the claims where judgement actually
        pays — not to the ${UI.pct(CPModel.INPUTS.J03_surveyToday, 0)} of claims that are
        surveyed today because nothing decides which ones need it.
      </div>
      <div class="hr"></div>
      <div style="font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
        Sheet 1 J-03, J-04, J-06, J-07 · Sheet 3 Part I W-70 to W-73 · A-11 IRDAI corridor
      </div>
    </div>`;
  }

  return { init, onData, render };
})();
