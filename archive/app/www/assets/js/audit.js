/* =====================================================================
   ClaimPulse · Audit and Regulator surface
   ---------------------------------------------------------------------
   What 29.5% of the build actually buys.

   Three obligations land inside the investment window: the IRDAI Fraud
   Monitoring Framework (1 Apr 2026), the IRDAI AI Working Group (Jun
   2026) and full DPDP compliance (13 May 2027). This surface is the
   answer to all three — a per-decision record showing what was decided,
   on what evidence, by which component, and where a human intervened.
   ===================================================================== */

const CPAudit = (() => {

  let claims = [];
  let selected = null;
  let filter = '';

  const G = () => CP_CONST.BOOK.governance;

  const OBLIGATIONS = [
    { d: '1 Apr 2026',  t: 'IRDAI Fraud Monitoring Framework',
      n: 'Board-governed fraud monitoring becomes compulsory.',
      m: 'Engine 03 batch-scores rings and writes every hit to this trail.' },
    { d: 'Jun 2026',    t: 'IRDAI AI Working Group constituted',
      n: 'Governance, safeguards and an AI audit framework.',
      m: 'Per-decision explanation and a human override on every claim.' },
    { d: '13 May 2027', t: 'DPDP Rules 2025 — full compliance',
      n: 'Penalties to ₹250 Cr, with no grace period.',
      m: 'Security, DPDP and SOC2 setup is build line D-15, ₹0.25 Cr.' }
  ];

  function init() { }
  function onData(all) {
    claims = all;
    if (selected && !claims.some(c => c.id === selected)) selected = null;
    if (!selected && claims.length) selected = claims[0].id;
    if (CPApp.surface === 'audit') render();
  }

  function render() {
    if (!claims.length) claims = CPSync.all();
    if (!selected && claims.length) selected = claims[0].id;
    paintKpis();
    UI.set('auditSide', picker() + obligations() + spend());
    UI.set('auditMain', trail());
  }

  /* ---------------- KPIs ---------------- */
  function paintKpis() {
    const events = claims.reduce((s, c) => s + c.audit.length, 0);
    const overrides = claims.filter(c => c.overridden).length;
    const zeroToken = claims.filter(c => c.genAiCalls === 0).length;
    const n = claims.length || 1;

    UI.set('auditKpis',
      UI.kpi('Decisions recorded', UI.num(events), 'across ' + claims.length + ' claims · every step, in order') +
      UI.kpi('Human overrides', overrides, overrides ? 'each one attributed and reasoned' : 'none in this queue') +
      UI.kpi('Claims decided with no model call', `${zeroToken}<small> / ${claims.length}</small>`,
             UI.pct(zeroToken / n, 0) + ' · deterministic and fully replayable', 'g') +
      UI.kpi('Governance share of build', UI.pct(G().share, 1),
             UI.cr(G().build) + ' build + ' + UI.cr(G().annual) + ' a year · W-74, W-77'));
  }

  /* ---------------- claim picker ---------------- */
  function picker() {
    return `<div class="card">
      <h3>Decision record</h3>
      <div class="sub">Pick a claim to replay every decision the system took.</div>
      <div class="hr"></div>
      <div class="field" style="margin-bottom:var(--s2);">
        <select onchange="CPAudit.select(this.value)">
          ${claims.map(c => `<option value="${UI.esc(c.id)}" ${c.id === selected ? 'selected' : ''}>
            ${UI.esc(c.ref || c.id)} · ${UI.esc(c.policy.holder)} · ${c.laneLabel} · ${c.trust.score}
          </option>`).join('')}
        </select>
      </div>
      <div class="field" style="margin-bottom:0;">
        <label>Filter events</label>
        <input placeholder="GATE 00, FUSION, ROUTING…" value="${UI.esc(filter)}"
               oninput="CPAudit.setFilter(this.value)">
      </div>
      <div class="hr"></div>
      <button class="btn ghost sm" style="width:100%" onclick="CPAudit.exportCsv()">
        ⬇ Export the full trail as CSV
      </button>
    </div>`;
  }

  /* ---------------- obligations ---------------- */
  function obligations() {
    return `<div class="card">
      ${UI.sec('Obligations inside the investment window')}
      ${OBLIGATIONS.map(o => `
        <div style="padding:var(--s2) 0;border-bottom:1px solid var(--line-2);">
          <div style="display:flex;justify-content:space-between;gap:var(--s2);align-items:baseline;">
            <div style="font-size:var(--t-sm);font-weight:800;color:var(--bajaj-navy);line-height:1.35;">${UI.esc(o.t)}</div>
            <span class="pill b">${UI.esc(o.d)}</span>
          </div>
          <div style="font-size:var(--t-xs);color:var(--mist);line-height:1.5;margin-top:2px;">${UI.esc(o.n)}</div>
          <div style="font-size:var(--t-xs);color:var(--green);line-height:1.5;margin-top:3px;font-weight:600;">→ ${UI.esc(o.m)}</div>
        </div>`).join('')}
    </div>`;
  }

  function spend() {
    return `<div class="card">
      ${UI.sec('What defensibility costs, in the model')}
      <div class="rows">
        ${UI.row('Production hardening (D-10)', UI.cr(G().hardening))}
        ${UI.row('Security, DPDP, SOC2 setup (D-15)', UI.cr(G().security))}
        ${UI.row('Governance build total (W-74)', UI.cr(G().build))}
        ${UI.row('Capture Integrity Gate build (W-75)', UI.cr(G().gateBuild))}
        ${UI.row('Annual security, compliance, legal (W-76)', UI.cr(G().annual))}
        ${UI.row('Gate + governance share of build (W-77)', UI.pct(G().share, 1))}
      </div>
      <div class="hr"></div>
      <div style="font-size:var(--t-xs);color:var(--body);line-height:1.65;">
        Roughly a third of the build buys auditability rather than capability. It is carried
        as costed lines in the model, not asserted on a slide.
      </div>
    </div>`;
  }

  /* ---------------- the trail ---------------- */
  function trail() {
    const c = claims.find(x => x.id === selected);
    if (!c) return `<div class="card">${UI.empty('⚖️', 'No claims to audit yet.')}</div>`;

    const f = filter.trim().toUpperCase();
    const rows = c.audit.filter(r => !f ||
      (r.stage + ' ' + r.detail + ' ' + r.ref).toUpperCase().includes(f));

    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);flex-wrap:wrap;">
        <div>
          <div class="eyebrow">${UI.esc(c.ref || c.id)} · ${UI.dt(c.ts)}</div>
          <h3>${UI.esc(c.policy.holder)} · ${UI.esc(c.policy.vehicle)}</h3>
          <div class="sub">${rows.length} of ${c.audit.length} events${f ? ` matching “${UI.esc(filter)}”` : ''}</div>
        </div>
        <div style="text-align:right;">${UI.pill(c.lane)}
          <div style="font-size:var(--t-md);font-weight:800;color:var(--bajaj-navy);">${c.trust.score}</div>
        </div>
      </div>

      ${c.overridden ? `
        <div class="overridden" style="margin-top:var(--s3);">
          <b>Human intervention recorded.</b> ${UI.esc(c.overridden.by)} moved this claim from
          ${c.overridden.from} to ${c.overridden.lane} at ${UI.dt(c.overridden.at)}.
          ${UI.esc(c.overridden.note)}
        </div>` : ''}

      <div class="hr"></div>
      ${UI.sec('Plain-language explanation')}
      <div style="font-size:var(--t-sm);color:var(--body);line-height:1.7;">
        ${UI.esc(explain(c))}
      </div>

      <div class="hr"></div>
      ${UI.sec('Event trail')}
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Ref</th><th>Time</th><th>Stage</th><th>Detail</th><th>Result</th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td class="mono">${UI.esc(r.ref)}</td>
            <td class="mono">${UI.time(r.at)}</td>
            <td><span class="pill n">${UI.esc(r.stage)}</span></td>
            <td>${UI.esc(r.detail)}</td>
            <td>${statusPill(r.status)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="hr"></div>
      <div style="font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.7;">
        Every routing decision is reproducible from this record alone: the five sub-scores,
        the weights, the arithmetic, the thresholds applied and the reason each one fired.
        A claim decided in the green lane made no generative model call, so its decision is
        fully deterministic and replayable.
      </div>
    </div>`;
  }

  function statusPill(s) {
    const m = { OK: 'g', PASS: 'g', WARN: 'a', FAIL: 'r' };
    return `<span class="pill ${m[s] || 'n'}">${UI.esc(s)}</span>`;
  }

  /* A regulator reading one claim should not have to parse the table. */
  function explain(c) {
    const bits = [];
    bits.push(c.gate.hardFail
      ? `Gate 00 rejected the capture session before any engine ran, so no model was called and no inference was paid for.`
      : `Gate 00 accepted the capture session with a capture-integrity score of ${c.gate.score} out of 100.`);
    if (!c.gate.hardFail) {
      bits.push(`Five engines then scored the claim in parallel — documents ${c.doc.score}, damage ${c.cv.score}, fraud graph ${c.fraud.score}, policy ${c.pol.score} — and Trust Score fused them at their published weights to ${c.trust.score}.`);
    }
    bits.push(c.reasons.map(r => r.t).join(' '));
    if (c.surveyor.required) bits.push(`A registered surveyor is required: ${c.surveyor.basis.toLowerCase()}.`);
    if (c.lane !== 'R') bits.push(`Settlement was assessed at the parts-catalogue band of ${UI.inr(c.money.assessedBase)}, less depreciation of ${UI.inr(c.money.depreciation)} and the compulsory deductible of ${UI.inr(c.money.deductible)}, giving ${UI.inr(c.money.payable)} payable.`);
    if (c.overridden) bits.push(`A named adjuster subsequently overrode the engine decision, and that intervention is recorded above.`);
    return bits.join(' ');
  }

  /* ---------------- export ---------------- */
  function exportCsv() {
    const c = claims.find(x => x.id === selected); if (!c) return;
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    const lines = [
      ['claim_id', 'policy_no', 'holder', 'vehicle', 'lane', 'trust_score', 'ref', 'timestamp', 'stage', 'detail', 'result']
        .map(q).join(','),
      ...c.audit.map(r => [(c.ref || c.id), c.policyNo, c.policy.holder, c.policy.vehicle,
        c.laneLabel, c.trust.score, r.ref, r.at, r.stage, r.detail, r.status].map(q).join(','))
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ClaimPulse_AuditTrail_' + (c.ref || c.id) + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  const select = (id) => { selected = id; render(); };
  const setFilter = (v) => { filter = v; UI.set('auditMain', trail()); };

  return { init, onData, render, select, setFilter, exportCsv };
})();
