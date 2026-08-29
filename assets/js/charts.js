/* =====================================================================
   ClaimPulse · Charts
   ---------------------------------------------------------------------
   A small SVG kit, written rather than imported. Three reasons: no CDN
   to fail in a competition room, every mark inherits the theme tokens so
   light and dark are one implementation, and the mark geometry follows
   the house spec exactly — thin marks, 4px rounded data-ends anchored to
   the baseline, 2px lines, >=8px markers, a 2px surface gap between
   adjacent fills, recessive grid, selective direct labels.

   Every chart renders into a viewBox and scales fluidly, so the same
   markup reads on a projector and on a phone.
   ===================================================================== */

const Charts = (() => {
  const { el, clear, fmt, tip } = CP;
  const SURFACE_GAP = 2;   // px of surface between adjacent fills
  const END_R       = 4;   // rounded data-end radius

  const SERIES = ['--d1','--d2','--d3','--d4','--d5','--d6','--d7','--d8'];
  const seriesVar = i => `var(${SERIES[i % SERIES.length]})`;

  /* Path for a bar with only its data-end rounded. `dir` is the growth
     direction; the baseline end stays square so the bar sits on the axis. */
  function barPath(x, y, w, h, r = END_R, dir = 'up') {
    r = Math.max(0, Math.min(r, w / 2, h));
    if (h <= 0.5) return `M${x},${y+h} h${w}`;
    switch (dir) {
      case 'up':    return `M${x},${y+h} L${x},${y+r} Q${x},${y} ${x+r},${y} L${x+w-r},${y} Q${x+w},${y} ${x+w},${y+r} L${x+w},${y+h} Z`;
      case 'down':  return `M${x},${y} L${x},${y+h-r} Q${x},${y+h} ${x+r},${y+h} L${x+w-r},${y+h} Q${x+w},${y+h} ${x+w},${y+h-r} L${x+w},${y} Z`;
      case 'right': return `M${x},${y} L${x+w-r},${y} Q${x+w},${y} ${x+w},${y+r} L${x+w},${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} L${x},${y+h} Z`;
      case 'left':  return `M${x+w},${y} L${x+r},${y} Q${x},${y} ${x},${y+r} L${x},${y+h-r} Q${x},${y+h} ${x+r},${y+h} L${x+w},${y+h} Z`;
    }
  }

  /* Round a value up to a "nice" magnitude (1, 2, 5 x a power of ten) */
  function nice(v) {
    if (v <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  }
  const niceMax = nice;

  /* Ticks are multiples of a nice step, so every label is a round number
     and — because zero is a multiple of everything — the zero line is
     always drawn when the range crosses it. */
  function ticks(min, max, target = 5) {
    if (!(max > min)) return [min];
    let step = nice((max - min) / target);
    let out = collect(min, max, step);
    if (out.length < 4) out = collect(min, max, step / 2);
    return out;
  }
  function collect(min, max, step) {
    const out = [];
    const start = Math.ceil(min / step - 1e-9) * step;
    for (let v = start; v <= max + 1e-9; v += step) out.push(Math.abs(v) < 1e-9 ? 0 : +v.toPrecision(12));
    return out;
  }

  function svg(host, w, h) {
    clear(host);
    const s = el('svg.chart', {
      viewBox: `0 0 ${w} ${h}`, width: '100%',
      preserveAspectRatio: 'xMidYMid meet', role: 'img'
    });
    host.appendChild(s);
    return s;
  }

  function legend(host, items) {
    const l = el('div.legend');
    items.forEach(it => l.appendChild(el('div.legend-item', {}, [
      el('span.legend-swatch', { style: { background: it.color } }),
      el('span', { text: it.label })
    ])));
    host.appendChild(l);
    return l;
  }

  /* =====================================================================
     WATERFALL · the benefit bridge
     Job: polarity plus magnitude — which lines add, which subtract, and
     what survives. Every bar is directly labelled, so the three light-mode
     slots that sit under 3:1 never have to carry meaning by colour alone.
     items: [{ label, value, kind: 'add'|'sub'|'total', note }]
     ===================================================================== */
  function waterfall(host, { items, unit = '₹ Cr', height = 340 }) {
    const W = 900, H = height;
    const m = { t: 30, r: 18, b: 74, l: 52 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    // running extent
    let run = 0, lo = 0, hi = 0;
    const geo = items.map(it => {
      const start = it.kind === 'total' ? 0 : run;
      const end   = it.kind === 'total' ? it.value : run + it.value;
      if (it.kind !== 'total') run = end;
      lo = Math.min(lo, start, end); hi = Math.max(hi, start, end);
      return { ...it, start, end };
    });
    const top = niceMax(hi), bot = lo < 0 ? -niceMax(-lo) : 0;
    const y = v => m.t + ih - ((v - bot) / (top - bot)) * ih;
    const bw = Math.min(62, (iw / items.length) - 14);
    const step = iw / items.length;

    const s = svg(host, W, H);

    // grid
    ticks(bot, top, 4).forEach(t => {
      s.appendChild(el('line', { class: 'grid-line' + (Math.abs(t) < 1e-9 ? ' zero' : ''),
        x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }));
      s.appendChild(el('text', { class: 'lbl-axis', x: m.l - 8, y: y(t) + 3.5,
        'text-anchor': 'end', text: fmt.cr(t, 0) }));
    });

    geo.forEach((g, i) => {
      const cx = m.l + step * i + (step - bw) / 2;
      const y0 = y(g.start), y1 = y(g.end);
      const top_ = Math.min(y0, y1), h = Math.max(Math.abs(y1 - y0), 2);
      const grows = g.end >= g.start;
      const color = g.kind === 'total' ? 'var(--dom-fin)'
                  : g.kind === 'sub'   ? 'var(--dom-risk)' : 'var(--dom-cap)';

      // connector to the next bar
      if (i < geo.length - 1 && g.kind !== 'total' && geo[i+1].kind !== 'total') {
        s.appendChild(el('line', { class: 'grid-line',
          x1: cx + bw, x2: m.l + step * (i+1) + (step - bw) / 2,
          y1: y(g.end), y2: y(g.end), 'stroke-dasharray': '2 3' }));
      }

      const p = el('path.series', {
        d: barPath(cx, top_, bw, h, END_R, grows ? 'up' : 'down'),
        fill: color, opacity: g.kind === 'total' ? 1 : .92
      });
      s.appendChild(p);

      // direct label — always, never a hover-only number
      const labelY = grows ? top_ - 8 : top_ + h + 15;
      s.appendChild(el('text', { class: 'lbl-value', x: cx + bw / 2, y: labelY,
        'text-anchor': 'middle', 'font-size': 11.5,
        text: (g.kind === 'total' ? '' : (g.value >= 0 ? '+' : '−')) + fmt.cr(Math.abs(g.value)) }));

      // wrapped category label
      const words = String(g.label).split(' ');
      const lines = []; let cur = '';
      words.forEach(w => {
        if ((cur + ' ' + w).trim().length > 15) { lines.push(cur.trim()); cur = w; }
        else cur = (cur + ' ' + w).trim();
      });
      if (cur) lines.push(cur);
      lines.slice(0, 3).forEach((ln, k) => {
        s.appendChild(el('text', { class: 'lbl-axis', x: cx + bw / 2, y: m.t + ih + 18 + k * 12,
          'text-anchor': 'middle', 'font-weight': g.kind === 'total' ? 650 : 400, text: ln }));
      });

      // hover
      const hit = el('rect.hit', { x: m.l + step * i, y: m.t, width: step, height: ih });
      hit.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, g.label,
        [[g.kind === 'total' ? 'Total' : 'Contribution', fmt.money(g.value)],
         ...(g.note ? [['', g.note]] : [])]));
      hit.addEventListener('mouseleave', tip.hide);
      s.appendChild(hit);
    });

    s.appendChild(el('text', { class: 'lbl-axis', x: m.l, y: 14, text: unit }));
    return s;
  }

  /* =====================================================================
     CASHFLOW · cumulative position with the payback crossing
     Job: change over time plus one threshold. Crosshair tooltip.
     ===================================================================== */
  function cashflow(host, { points, buildCost, paybackMonths, paybackLabel, height = 320 }) {
    const W = 900, H = height;
    const m = { t: 26, r: 24, b: 44, l: 60 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    const vals = points.map(p => p.v);
    const hi = niceMax(Math.max(...vals, 0));
    const lo = -niceMax(Math.abs(Math.min(...vals, -buildCost)));
    const x = i => m.l + (iw * i) / (points.length - 1);
    const y = v => m.t + ih - ((v - lo) / (hi - lo)) * ih;

    const s = svg(host, W, H);

    ticks(lo, hi, 5).forEach(t => {
      s.appendChild(el('line', { class: 'grid-line' + (Math.abs(t) < 1e-9 ? ' zero' : ''),
        x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }));
      s.appendChild(el('text', { class: 'lbl-axis', x: m.l - 8, y: y(t) + 3.5,
        'text-anchor': 'end', text: fmt.cr(t, 0) }));
    });

    // area under the curve, clipped at zero for the positive part
    const dLine = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
    const dArea = `${dLine} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

    const gid = 'cfgrad-' + Math.random().toString(36).slice(2, 8);
    const defs = el('defs', {}, [
      el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, [
        el('stop', { offset: '0%',   'stop-color': 'var(--d1)', 'stop-opacity': .26 }),
        el('stop', { offset: '100%', 'stop-color': 'var(--d1)', 'stop-opacity': .01 })
      ])
    ]);
    s.appendChild(defs);
    s.appendChild(el('path', { d: dArea, fill: `url(#${gid})` }));
    s.appendChild(el('path.series', { d: dLine, fill: 'none', stroke: 'var(--d1)',
      'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    // payback crossing
    if (paybackMonths && paybackMonths <= points[points.length - 1].m) {
      const px = m.l + iw * (paybackMonths / points[points.length - 1].m);
      s.appendChild(el('line', { x1: px, x2: px, y1: m.t, y2: m.t + ih,
        stroke: 'var(--warm)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      s.appendChild(el('text', { class: 'lbl-value', x: px + 6, y: m.t + 12,
        'font-size': 11, fill: 'var(--warm)',
        text: paybackLabel || `build repaid · month ${fmt.n1(paybackMonths)}` }));
    }

    // markers + labels at each year end
    points.forEach((p, i) => {
      if (!p.tick) return;
      s.appendChild(el('circle', { cx: x(i), cy: y(p.v), r: 4.5,
        fill: 'var(--d1)', stroke: 'var(--surface)', 'stroke-width': 2 }));
      s.appendChild(el('text', { class: 'lbl-axis', x: x(i), y: m.t + ih + 18,
        'text-anchor': 'middle', text: p.tick }));
    });

    // crosshair
    const focus = el('g', { opacity: 0 }, [
      el('line', { class: 'grid-line', y1: m.t, y2: m.t + ih, stroke: 'var(--border-strong)' }),
      el('circle', { r: 5, fill: 'var(--d1)', stroke: 'var(--surface)', 'stroke-width': 2 })
    ]);
    s.appendChild(focus);
    const hit = el('rect.hit', { x: m.l, y: m.t, width: iw, height: ih });
    hit.addEventListener('mousemove', e => {
      const r = s.getBoundingClientRect();
      const rel = ((e.clientX - r.left) / r.width) * W;
      const i = Math.round(CP.clamp((rel - m.l) / iw, 0, 1) * (points.length - 1));
      const p = points[i];
      focus.setAttribute('opacity', 1);
      focus.children[0].setAttribute('x1', x(i)); focus.children[0].setAttribute('x2', x(i));
      focus.children[1].setAttribute('cx', x(i)); focus.children[1].setAttribute('cy', y(p.v));
      tip.show(e.clientX, e.clientY, p.label || `Month ${p.m}`,
        [['Cumulative', fmt.money(p.v)]]);
    });
    hit.addEventListener('mouseleave', () => { focus.setAttribute('opacity', 0); tip.hide(); });
    s.appendChild(hit);

    s.appendChild(el('text', { class: 'lbl-axis', x: m.l, y: 12, text: '₹ Cr, cumulative' }));
    return s;
  }

  /* =====================================================================
     HBAR · part-to-whole, ranked
     Job: magnitude with identity. Direct value labels; a share column
     rather than a pie, because comparing angles is guesswork.
     ===================================================================== */
  function hbar(host, { items, unit = '₹ Cr', colorBy = 'series', height, valueFmt, compact = false }) {
    const vf = valueFmt || (v => fmt.cr(v));
    const rowH = compact ? 26 : 30, W = compact ? 480 : 760;
    const m = compact ? { t: 8, r: 58, b: 8, l: 166 } : { t: 8, r: 92, b: 8, l: 224 };
    const H = height || (m.t + m.b + items.length * rowH);
    const iw = W - m.l - m.r;
    const max = niceMax(Math.max(...items.map(i => i.value)));
    const s = svg(host, W, H);

    items.forEach((it, i) => {
      const y = m.t + i * rowH + (rowH - 16) / 2;
      const w = Math.max((it.value / max) * iw, 1.5);
      const color = it.color || (colorBy === 'series' ? seriesVar(i) : 'var(--d1)');

      s.appendChild(el('text', { class: 'lbl-axis', x: m.l - 12, y: y + 12,
        'text-anchor': 'end', 'font-size': 11.5, fill: 'var(--ink-muted)',
        text: it.label.length > (compact ? 26 : 34) ? it.label.slice(0, (compact ? 25 : 33)) + '…' : it.label }));

      s.appendChild(el('path.series', {
        d: barPath(m.l, y, w, 16, END_R, 'right'), fill: color, opacity: .92
      }));

      s.appendChild(el('text', { class: 'lbl-value', x: m.l + w + 10, y: y + 12,
        'font-size': 11.5, text: vf(it.value) + (it.share !== undefined ? `  ·  ${fmt.pct(it.share, 0)}` : '') }));

      const hit = el('rect.hit', { x: 0, y: m.t + i * rowH, width: W, height: rowH });
      hit.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, it.label,
        [[unit, vf(it.value)], ...(it.share !== undefined ? [['Share', fmt.pct(it.share, 1)]] : []),
         ...(it.note ? [['', it.note]] : [])]));
      hit.addEventListener('mouseleave', tip.hide);
      s.appendChild(hit);
    });
    return s;
  }

  /* =====================================================================
     STACK · one bar, part-to-whole, with a 2px surface gap between fills
     ===================================================================== */
  function stack(host, { segments, height = 30, showLegend = true }) {
    const W = 760, H = height;
    const total = segments.reduce((s, x) => s + x.value, 0);
    const s = svg(host, W, H);
    let x = 0;
    segments.forEach((seg, i) => {
      const w = Math.max((seg.value / total) * W - SURFACE_GAP, 1);
      const first = i === 0, last = i === segments.length - 1;
      const r = END_R;
      const d = first ? barPath(x, 0, w, H, r, 'left')
              : last  ? barPath(x, 0, w, H, r, 'right')
              : `M${x},0 h${w} v${H} h${-w} Z`;
      const p = el('path.series', { d, fill: seg.color || seriesVar(i) });
      p.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, seg.label,
        [['Value', seg.display || fmt.cr(seg.value)], ['Share', fmt.pct(seg.value / total, 1)]]));
      p.addEventListener('mouseleave', tip.hide);
      s.appendChild(p);
      x += w + SURFACE_GAP;
    });
    if (showLegend) legend(host, segments.map((seg, i) => ({
      label: `${seg.label} · ${seg.display || fmt.cr(seg.value)}`,
      color: seg.color || seriesVar(i)
    })));
    return s;
  }

  /* =====================================================================
     TORNADO · sensitivity ranking around a baseline
     Job: polarity plus magnitude. Diverging blue<->red about a gray zero.
     ===================================================================== */
  function tornado(host, { items, baseline, unit = '₹ Cr' }) {
    const rowH = 34, W = 820;
    const m = { t: 26, r: 20, b: 26, l: 250 };
    const H = m.t + m.b + items.length * rowH;
    const iw = W - m.l - m.r;
    const span = niceMax(Math.max(...items.map(i => Math.max(Math.abs(i.low - baseline), Math.abs(i.high - baseline)))));
    const cx = m.l + iw / 2;
    const x = d => cx + (d / span) * (iw / 2);
    const s = svg(host, W, H);

    // zero line and scale
    ticks(-span, span, 4).forEach(t => {
      s.appendChild(el('line', { class: 'grid-line' + (Math.abs(t) < 1e-9 ? ' zero' : ''),
        x1: x(t), x2: x(t), y1: m.t - 6, y2: m.t + items.length * rowH }));
      s.appendChild(el('text', { class: 'lbl-axis', x: x(t), y: m.t - 12,
        'text-anchor': 'middle', text: (t > 0 ? '+' : '') + fmt.cr(t, 0) }));
    });

    items.forEach((it, i) => {
      const y = m.t + i * rowH + (rowH - 15) / 2;
      const dLow = it.low - baseline, dHigh = it.high - baseline;

      s.appendChild(el('text', { class: 'lbl-axis', x: m.l - 14, y: y + 11.5,
        'text-anchor': 'end', 'font-size': 11.5, text: it.label }));

      [[dLow, 'var(--d8)', it.lowNote], [dHigh, 'var(--d1)', it.highNote]].forEach(([d, col, note]) => {
        if (Math.abs(d) < 1e-9) return;
        const x0 = Math.min(cx, x(d)), w = Math.abs(x(d) - cx) - (SURFACE_GAP / 2);
        if (w <= 0) return;
        const p = el('path.series', {
          d: barPath(d < 0 ? x0 : cx + SURFACE_GAP / 2, y, w, 15, END_R, d < 0 ? 'left' : 'right'),
          fill: col, opacity: .9
        });
        p.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, it.label,
          [['Net annual', fmt.money(baseline + d)], ['Change', fmt.crSigned(d) + ' Cr'],
           ...(note ? [['', note]] : [])]));
        p.addEventListener('mouseleave', tip.hide);
        s.appendChild(p);
      });

      const outer = Math.abs(dHigh) >= Math.abs(dLow) ? dHigh : dLow;
      s.appendChild(el('text', { class: 'lbl-value', x: x(outer) + (outer < 0 ? -8 : 8), y: y + 11.5,
        'text-anchor': outer < 0 ? 'end' : 'start', 'font-size': 11,
        text: `${fmt.cr(Math.min(it.low, it.high))} – ${fmt.cr(Math.max(it.low, it.high))}` }));
    });

    legend(host, [
      { label: 'Lever at its low end',  color: 'var(--d8)' },
      { label: 'Lever at its high end', color: 'var(--d1)' },
      { label: `Baseline · net ₹${fmt.cr(baseline)} Cr at the current board setting`, color: 'var(--border-strong)' }
    ]);
    return s;
  }

  /* =====================================================================
     BULLET · a measured value against a reference, for KPI rows
     ===================================================================== */
  function bullet(host, { value, reference, max, color = 'var(--d1)', height = 12 }) {
    const W = 240, H = height;
    const s = svg(host, W, H);
    const top = niceMax(Math.max(max || 0, value, reference));
    s.appendChild(el('rect', { x: 0, y: H/2 - 3, width: W, height: 6, rx: 3, fill: 'var(--surface-sunken)' }));
    s.appendChild(el('path', { d: barPath(0, H/2 - 3, (value / top) * W, 6, 3, 'right'), fill: color }));
    if (reference !== undefined) {
      const rx = (reference / top) * W;
      s.appendChild(el('line', { x1: rx, x2: rx, y1: 1, y2: H - 1,
        stroke: 'var(--ink-faint)', 'stroke-width': 2 }));
    }
    return s;
  }

  return { waterfall, cashflow, hbar, stack, tornado, bullet, legend, seriesVar, barPath, niceMax };
})();

/* =====================================================================
   TRUST METER · one score against two thresholds
   A gauge earns its place here because the question is not "how big" but
   "which side of the line", and a line is what the reader must see.
   ===================================================================== */
Charts.meter = function (host, { score, floors, height = 74 }) {
  const { el, clear, fmt } = CP;
  const W = 560, H = height;
  clear(host);
  const s = el('svg.chart', { viewBox: `0 0 ${W} ${H}`, width: '100%',
    preserveAspectRatio: 'xMidYMid meet' });
  host.appendChild(s);
  const m = { l: 6, r: 6, t: 30 }, iw = W - m.l - m.r, bh = 14;
  const x = v => m.l + (v / 100) * iw;

  /* the three bands, with a 2px surface gap between them */
  const bands = [
    [0, floors.amber, 'var(--lane-red)'],
    [floors.amber, floors.green, 'var(--lane-amber)'],
    [floors.green, 100, 'var(--lane-green)']
  ];
  bands.forEach(([a, b, c], i) => {
    const w = x(b) - x(a) - (i < 2 ? 2 : 0);
    s.appendChild(el('path', {
      d: Charts.barPath(x(a), m.t, w, bh, 4, i === 0 ? 'left' : i === 2 ? 'right' : 'up'),
      fill: c, opacity: .28
    }));
  });
  [['amber', floors.amber], ['green', floors.green]].forEach(([k, v]) => {
    s.appendChild(el('line', { x1: x(v), x2: x(v), y1: m.t - 6, y2: m.t + bh + 6,
      stroke: `var(--lane-${k})`, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
    s.appendChild(el('text', { x: x(v), y: m.t - 11, 'text-anchor': 'middle',
      'font-size': 9.5, 'font-weight': 700, fill: `var(--lane-${k})`, text: k + ' ' + v }));
  });

  if (score === null || score === undefined) {
    s.appendChild(el('text', { x: W / 2, y: m.t + bh + 26, 'text-anchor': 'middle',
      'font-size': 12, 'font-weight': 640, fill: 'var(--ink-faint)',
      text: 'no score — the gate stopped this claim before anything was computed' }));
    return s;
  }
  const px = x(score);
  s.appendChild(el('path', { d: `M${px - 7},${m.t - 2} L${px},${m.t + 7} L${px + 7},${m.t - 2} Z`,
    fill: 'var(--ink-strong)' }));
  s.appendChild(el('rect', { x: px - 1.25, y: m.t, width: 2.5, height: bh, fill: 'var(--ink-strong)' }));
  s.appendChild(el('text', { x: px, y: m.t + bh + 24, 'text-anchor': 'middle',
    'font-size': 15, 'font-weight': 700, fill: 'var(--ink-strong)', text: fmt.cr(score, 1) }));
  return s;
};

/* Contribution bar — five weighted parts summing to the headline */
Charts.contrib = function (host, parts) {
  const { el, clear, fmt, tip } = CP;
  const W = 560, H = 30;
  clear(host);
  const s = el('svg.chart', { viewBox: `0 0 ${W} ${H}`, width: '100%' });
  host.appendChild(s);
  const total = 100;
  let x = 0;
  const COLORS = { gate: 'var(--warm)', doc: 'var(--d1)', cv: 'var(--d3)',
                   fraud: 'var(--d2)', policy: 'var(--d7)' };
  parts.forEach((p, i) => {
    const w = Math.max((p.w / total) * W - 2, 1);
    const earned = p.raw / 100;
    const g = el('g.hot');
    g.appendChild(el('rect', { x, y: 0, width: w, height: H, rx: 4,
      fill: COLORS[p.key], opacity: .18 }));
    g.appendChild(el('path', { d: Charts.barPath(x, 0, Math.max(w * earned, 1), H, 4,
      i === 0 ? 'left' : 'up'), fill: COLORS[p.key] }));
    if (w > 46) g.appendChild(el('text', { x: x + w / 2, y: H / 2 + 4, 'text-anchor': 'middle',
      'font-size': 10.5, 'font-weight': 700, fill: 'var(--ink-invert)',
      text: fmt.cr(p.contribution, 1) }));
    g.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, p.label,
      [['Sub-score', fmt.cr(p.raw, 1) + ' / 100'], ['Weight', p.w + '%'],
       ['Contribution', fmt.cr(p.contribution, 1)]]));
    g.addEventListener('mouseleave', tip.hide);
    s.appendChild(g);
    x += w + 2;
  });
  return s;
};

/* =====================================================================
   THE FUTURE CHART SET
   ---------------------------------------------------------------------
   Five marks the redesign needs and the original kit did not have. All
   of them draw themselves in — a chart that appears already finished
   looks printed; a chart that resolves looks computed.
   ===================================================================== */
(function () {
  const { el, clear, fmt, tip } = CP;

  /* Gradient defs, created once per chart, keyed so two charts on one
     screen never collide. */
  let gid = 0;
  function grad(s, c1, c2, angle) {
    const id = 'g' + (++gid);
    const a = (angle === undefined ? 135 : angle) * Math.PI / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    const d = el('defs', {}, [
      el('linearGradient', { id, x1: (.5 - dx / 2) * 100 + '%', y1: (.5 - dy / 2) * 100 + '%',
        x2: (.5 + dx / 2) * 100 + '%', y2: (.5 + dy / 2) * 100 + '%' }, [
        el('stop', { offset: '0%', 'stop-color': c1 }),
        el('stop', { offset: '100%', 'stop-color': c2 })
      ])
    ]);
    s.appendChild(d);
    return 'url(#' + id + ')';
  }
  function svgOf(host, w, h) {
    clear(host);
    const s = el('svg.chart', { viewBox: `0 0 ${w} ${h}`, width: '100%',
      preserveAspectRatio: 'xMidYMid meet', role: 'img' });
    host.appendChild(s);
    return s;
  }

  /* -------------------------------------------------------------------
     RING · a proportion, drawn as an arc that sweeps in
     Used where the question is "how much of the whole", and where the
     answer deserves to be the largest thing on the panel.
     ------------------------------------------------------------------- */
  Charts.ring = function (host, { pct, label, value, sub, c1, c2, size = 200, thickness = 14, track }) {
    const S = size, R = (S - thickness) / 2 - 2, C = S / 2;
    const s = svgOf(host, S, S);
    const stroke = grad(s, c1 || 'var(--accent)', c2 || 'var(--accent)', 120);
    const circ = 2 * Math.PI * R;
    s.appendChild(el('circle', { cx: C, cy: C, r: R, fill: 'none',
      stroke: track || 'var(--hairline)', 'stroke-width': thickness }));
    const arc = el('circle', { cx: C, cy: C, r: R, fill: 'none', stroke,
      'stroke-width': thickness, 'stroke-linecap': 'round',
      transform: `rotate(-90 ${C} ${C})`,
      'stroke-dasharray': circ, 'stroke-dashoffset': circ,
      style: 'filter:drop-shadow(0 0 8px ' + (c1 || 'var(--accent)') + ')' });
    s.appendChild(arc);
    requestAnimationFrame(() => {
      arc.style.transition = 'stroke-dashoffset 1100ms cubic-bezier(.16,1,.3,1)';
      arc.setAttribute('stroke-dashoffset', String(circ * (1 - Math.max(0, Math.min(1, pct)))));
    });
    if (value !== undefined) s.appendChild(el('text', { x: C, y: C + (label ? 0 : 6),
      'text-anchor': 'middle', 'font-size': S * .2, 'font-weight': 700,
      fill: 'var(--ink-strong)', text: String(value) }));
    if (label) s.appendChild(el('text', { x: C, y: C + S * .15, 'text-anchor': 'middle',
      'font-size': S * .062, 'font-weight': 600, fill: 'var(--ink-faint)',
      style: 'letter-spacing:.1em;text-transform:uppercase', text: label }));
    if (sub) s.appendChild(el('text', { x: C, y: C - S * .14, 'text-anchor': 'middle',
      'font-size': S * .058, 'font-weight': 600, fill: 'var(--ink-muted)', text: sub }));
    return s;
  };

  /* -------------------------------------------------------------------
     BEAM · before and after, as two beams joined by a taper
     The taper is the point: you see the collapse, you do not compute it
     from two numbers sitting side by side.
     ------------------------------------------------------------------- */
  Charts.beam = function (host, { from, to, unit = '', fromLabel = 'today', toLabel = 'on ClaimPulse', c1, c2, height = 148 }) {
    const W = 620, H = height, s = svgOf(host, W, H);
    const pad = 96, mid = H / 2;
    const maxH = H * .52;
    const hFrom = maxH, hTo = Math.max(maxH * (to / from), 10);
    const xa = pad, xb = W - pad, gap = 118;
    const fill = grad(s, c1 || 'var(--dom-risk)', c2 || 'var(--dom-cap)', 0);

    /* the taper */
    const yA1 = mid - hFrom / 2, yA2 = mid + hFrom / 2;
    const yB1 = mid - hTo / 2,   yB2 = mid + hTo / 2;
    const cx = (xa + gap + xb - gap) / 2;
    const p = el('path', {
      d: `M${xa + gap},${yA1} C${cx},${yA1} ${cx},${yB1} ${xb - gap},${yB1}
          L${xb - gap},${yB2} C${cx},${yB2} ${cx},${yA2} ${xa + gap},${yA2} Z`,
      fill, opacity: 0 });
    s.appendChild(p);
    requestAnimationFrame(() => { p.style.transition = 'opacity 800ms ease'; p.setAttribute('opacity', '.34'); });

    /* the two ends */
    [[xa, hFrom, from, fromLabel, c1 || 'var(--dom-risk)', 'end'],
     [xb, hTo, to, toLabel, c2 || 'var(--dom-cap)', 'start']].forEach(([x, h, v, lab, c, anch]) => {
      s.appendChild(el('rect', { x: anch === 'end' ? x + gap - 8 : x - gap, y: mid - h / 2,
        width: 8, height: h, rx: 4, fill: c, style: 'filter:drop-shadow(0 0 10px ' + c + ')' }));
      s.appendChild(el('text', { x, y: mid - 4, 'text-anchor': 'middle',
        'font-size': 30, 'font-weight': 700, fill: c, text: fmt.cr(v, 1) }));
      s.appendChild(el('text', { x, y: mid + 16, 'text-anchor': 'middle',
        'font-size': 11, 'font-weight': 600, fill: 'var(--ink-faint)', text: unit }));
      s.appendChild(el('text', { x, y: mid + 40, 'text-anchor': 'middle', 'font-size': 10.5,
        'font-weight': 700, fill: 'var(--ink-muted)',
        style: 'letter-spacing:.12em;text-transform:uppercase', text: lab }));
    });

    const cut = (from - to) / from;
    s.appendChild(el('text', { x: W / 2, y: mid - maxH / 2 - 14, 'text-anchor': 'middle',
      'font-size': 12.5, 'font-weight': 700, fill: 'var(--dom-cap)',
      text: '▼ ' + fmt.pct(cut, 0) }));
    return s;
  };

  /* -------------------------------------------------------------------
     SANKEY · where capacity goes
     A deliberately small implementation: one source column, one middle,
     one destination column. That is the shape of the capacity argument,
     and a general sankey would be more code for no more meaning.
     ------------------------------------------------------------------- */
  Charts.sankey = function (host, { left, right, height = 300, unit = 'FTE' }) {
    const W = 900, H = height, s = svgOf(host, W, H);
    const colW = 15, m = { t: 22, b: 22 };
    const ih = H - m.t - m.b;
    const totalL = left.reduce((a, x) => a + x.value, 0);
    const totalR = right.reduce((a, x) => a + x.value, 0);
    const xL = 168, xR = W - 168;
    const gapL = 6, gapR = 6;

    function stackOf(items, total, gap) {
      let y = m.t; const out = [];
      items.forEach(it => {
        const h = Math.max((it.value / total) * (ih - gap * (items.length - 1)), 6);
        out.push({ ...it, y, h }); y += h + gap;
      });
      return out;
    }
    const L = stackOf(left, totalL, gapL), R = stackOf(right, totalR, gapR);

    /* links: every source feeds every destination in proportion */
    let cursorR = R.map(r => r.y);
    L.forEach((l, li) => {
      let cy = l.y;
      R.forEach((r, ri) => {
        const share = r.value / totalR;
        const h = l.h * share;
        const y0 = cy, y1 = cursorR[ri];
        const c = W / 2;
        const path = el('path', {
          d: `M${xL + colW},${y0} C${c},${y0} ${c},${y1} ${xR - colW},${y1}
              L${xR - colW},${y1 + h} C${c},${y1 + h} ${c},${y0 + h} ${xL + colW},${y0 + h} Z`,
          fill: l.color, opacity: 0, style: 'mix-blend-mode:normal' });
        s.appendChild(path);
        requestAnimationFrame(() => {
          path.style.transition = 'opacity 700ms ease ' + (li * 90 + ri * 45) + 'ms';
          path.setAttribute('opacity', '.20');
        });
        path.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY,
          l.label + ' → ' + r.label, [[unit, fmt.n1(l.value * share)]]));
        path.addEventListener('mouseleave', tip.hide);
        cy += h; cursorR[ri] += h;
      });
    });

    [[L, xL, 'end', -12], [R, xR - colW, 'start', colW + 12]].forEach(([col, x, anch, dx]) => {
      col.forEach(n => {
        s.appendChild(el('rect', { x, y: n.y, width: colW, height: n.h, rx: 4, fill: n.color,
          style: 'filter:drop-shadow(0 0 8px ' + n.color + ')' }));
        s.appendChild(el('text', { x: x + dx, y: n.y + n.h / 2 - 3, 'text-anchor': anch,
          'font-size': 11.5, 'font-weight': 640, fill: 'var(--ink)',
          text: n.label.length > 30 ? n.label.slice(0, 29) + '…' : n.label }));
        s.appendChild(el('text', { x: x + dx, y: n.y + n.h / 2 + 11, 'text-anchor': anch,
          'font-size': 10.5, 'font-weight': 600, fill: 'var(--ink-faint)',
          text: fmt.n1(n.value) + ' ' + unit }));
      });
    });
    return s;
  };

  /* -------------------------------------------------------------------
     AREA · a running series, for the live book
     Gradient fill under a 2px line, with the last point marked.
     ------------------------------------------------------------------- */
  Charts.area = function (host, { points, c1, c2, height = 130, label, floor }) {
    const W = 760, H = height, s = svgOf(host, W, H);
    const m = { t: 14, r: 10, b: 18, l: 10 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    if (!points.length) {
      s.appendChild(el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', 'font-size': 12,
        fill: 'var(--ink-faint)', text: 'waiting for the first claim' }));
      return s;
    }
    const max = Math.max(1, ...points, floor || 0) * 1.08, n = points.length;
    const x = i => m.l + (n === 1 ? iw : (i / (n - 1)) * iw);
    const y = v => m.t + ih - (v / max) * ih;
    const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const fill = grad(s, c1 || 'var(--dom-ops)', 'transparent', 90);
    s.appendChild(el('path', { d: `${line} L${x(n - 1)},${m.t + ih} L${x(0)},${m.t + ih} Z`,
      fill, opacity: .5 }));
    s.appendChild(el('path', { d: line, fill: 'none', stroke: c1 || 'var(--dom-ops)',
      'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      style: 'filter:drop-shadow(0 0 6px ' + (c1 || 'var(--dom-ops)') + ')' }));
    s.appendChild(el('circle', { cx: x(n - 1), cy: y(points[n - 1]), r: 4,
      fill: c2 || c1 || 'var(--dom-ops)', style: 'filter:drop-shadow(0 0 8px ' + (c1 || 'var(--dom-ops)') + ')' }));
    /* The target the series is converging on, drawn as a reference. */
    if (floor !== undefined) {
      s.appendChild(el('line', { x1: m.l, x2: W - m.r, y1: y(floor), y2: y(floor),
        stroke: 'var(--ink-faint)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
      s.appendChild(el('text', { x: W - m.r, y: y(floor) - 5, 'text-anchor': 'end',
        'font-size': 10, 'font-weight': 700, fill: 'var(--ink-faint)',
        text: 'design ' + Math.round(floor) + '%' }));
    }
    if (label) s.appendChild(el('text', { x: m.l, y: 11, 'font-size': 10,
      'font-weight': 700, fill: 'var(--ink-faint)',
      style: 'letter-spacing:.1em;text-transform:uppercase', text: label }));
    return s;
  };

  /* -------------------------------------------------------------------
     GAUGEBAR · a value on a scale with a marked reference
     Replaces four separate cards wherever "value vs benchmark" repeats.
     ------------------------------------------------------------------- */
  Charts.gaugebar = function (host, { rows, height }) {
    const W = 620, rh = 42, H = height || rows.length * rh + 8;
    const s = svgOf(host, W, H);
    const lx = 200, iw = W - lx - 86;
    rows.forEach((r, i) => {
      const y = 12 + i * rh;
      const max = r.max || Math.max(r.value, r.ref) * 1.25;
      const fill = grad(s, r.c1 || 'var(--accent)', r.c2 || r.c1 || 'var(--accent)', 0);
      s.appendChild(el('text', { x: lx - 14, y: y + 12, 'text-anchor': 'end', 'font-size': 11.5,
        'font-weight': 600, fill: 'var(--ink-muted)', text: r.label }));
      s.appendChild(el('rect', { x: lx, y: y + 3, width: iw, height: 14, rx: 7, fill: 'var(--hairline)' }));
      const w = Math.max((r.value / max) * iw, 4);
      const bar = el('rect', { x: lx, y: y + 3, width: 0, height: 14, rx: 7, fill,
        style: 'filter:drop-shadow(0 0 7px ' + (r.c1 || 'var(--accent)') + ')' });
      s.appendChild(bar);
      requestAnimationFrame(() => {
        bar.style.transition = 'width 800ms cubic-bezier(.16,1,.3,1) ' + (i * 70) + 'ms';
        bar.setAttribute('width', String(w));
      });
      if (r.ref !== undefined) {
        const rx = lx + (r.ref / max) * iw;
        s.appendChild(el('line', { x1: rx, x2: rx, y1: y - 2, y2: y + 22,
          stroke: 'var(--ink-faint)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
      }
      s.appendChild(el('text', { x: W - 76, y: y + 14, 'font-size': 12.5, 'font-weight': 700,
        fill: 'var(--ink-strong)', text: r.display !== undefined ? r.display : fmt.cr(r.value) }));
    });
    return s;
  };
})();
