/* =====================================================================
   ClaimPulse · Shared UI helpers
   Formatting and the handful of render primitives every surface uses.
   Kept in one place so the six surfaces read the same way.
   ===================================================================== */

const UI = (() => {

  /* ---------------- formatting ---------------- */
  // The minus sign goes before the rupee symbol, not between it and the
  // digits — "−₹0.59 Cr", never "₹-0.59 Cr".
  const sign   = n => n < 0 ? '−' : '';
  const inr    = n => sign(n) + '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
  const inrP   = (n, d) => sign(n) + '₹' + Math.abs(Number(n)).toLocaleString('en-IN', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const cr     = (n, d) => sign(n) + '₹' + Math.abs(Number(n)).toFixed(d === undefined ? 2 : d) + ' Cr';
  const num    = (n, d) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const pct    = (n, d) => (n * 100).toFixed(d === undefined ? 1 : d) + '%';
  const pp     = (n, d) => n.toFixed(d === undefined ? 2 : d) + ' pp';
  const days   = n => n.toFixed(2) + ' d';

  /* Indian short scale — what a judge reads off a screen at 3 metres. */
  function compact(n) {
    const a = Math.abs(n);
    if (a >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
    if (a >= 1e5) return (n / 1e5).toFixed(2) + ' L';
    if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return num(Math.round(n));
  }

  const time = t => new Date(t).toLocaleTimeString('en-IN', { hour12: false });
  const dt   = t => new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  const ago  = (t) => {
    const s = Math.max(0, (Date.now() - new Date(t)) / 1000);
    if (s < 60) return Math.floor(s) + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  };

  /* Escape anything that reaches innerHTML. Claim text can come off a
     synced document written by another device, so it is never trusted. */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ---------------- render primitives ---------------- */

  const kpi = (k, v, d, tone) =>
    `<div class="kpi ${tone || ''}">
       <div class="k">${esc(k)}</div>
       <div class="v">${v}</div>
       ${d ? `<div class="d">${d}</div>` : ''}
     </div>`;

  const row = (lbl, val, mono) =>
    `<div class="row"><span class="lbl">${esc(lbl)}</span>
     <span class="val ${mono ? 'mono' : ''}">${val}</span></div>`;

  /* A totals row. Same shape, emphasised — so callers never have to put
     markup through `row`, whose label is escaped. */
  const rowB = (lbl, val) =>
    `<div class="row" style="border-top:1px solid var(--line);border-bottom:none;margin-top:2px;">
       <span class="lbl" style="color:var(--bajaj-navy);font-weight:800;">${esc(lbl)}</span>
       <span class="val" style="font-weight:800;">${val}</span></div>`;

  const check = (c) =>
    `<div class="check ${esc(c.status)}">
       <div class="mk">${c.status === 'PASS' ? '✓' : c.status === 'WARN' ? '!' : '×'}</div>
       <div class="nm">${esc(c.label)}</div>
       <div class="vv">${esc(c.v)}</div>
       <div class="ds">${esc(c.d)}</div>
       ${c.live ? `<div class="live">live: ${esc(c.live)}</div>` : ''}
     </div>`;

  const pill = (lane) => {
    const m = { G: ['g', 'GREEN'], A: ['a', 'AMBER'], R: ['r', 'RED'] }[lane] || ['n', lane];
    return `<span class="pill ${m[0]}">${m[1]}</span>`;
  };

  const meter = (frac, tone) =>
    `<div class="meter"><i class="${tone || ''}" style="width:${Math.max(0, Math.min(1, frac)) * 100}%"></i></div>`;

  const empty = (icon, text) =>
    `<div class="empty"><div class="big">${icon}</div>${esc(text)}</div>`;

  const sec = (t) => `<div class="sec-head">${esc(t)}</div>`;

  /* Signed delta, coloured by direction. `good` says which way is good. */
  function delta(now, base, fmt, goodDown) {
    const d = now - base;
    if (Math.abs(d) < 1e-9) return `<span class="deltas flat">— no change</span>`;
    const better = goodDown ? d < 0 : d > 0;
    return `<span class="deltas ${better ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))}</span>`;
  }

  const $ = id => document.getElementById(id);
  const set = (id, html) => { const e = $(id); if (e) e.innerHTML = html; };

  return { inr, inrP, cr, num, pct, pp, days, compact, time, dt, ago, esc,
           kpi, row, rowB, check, pill, meter, empty, sec, delta, $, set };
})();
