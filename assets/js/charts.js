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
  function waterfall(host, { items, unit = '₹ Cr', height, width }) {
    const W = width || (items.length <= 6 ? 500 : 680);
    const H = height || (items.length <= 6 ? 280 : 300);
    const m = { t: 28, r: 16, b: 58, l: 44 };
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
    const bw = Math.min(36, Math.max(18, (iw / items.length) - 16));
    const step = iw / items.length;

    const s = svg(host, W, H);

    // grid
    ticks(bot, top, 4).forEach(t => {
      s.appendChild(el('line', { class: 'grid-line' + (Math.abs(t) < 1e-9 ? ' zero' : ''),
        x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }));
      s.appendChild(el('text', { class: 'lbl-axis', x: m.l - 6, y: y(t) + 3.5,
        'text-anchor': 'end', 'font-size': 10.5, text: fmt.cr(t, 0) }));
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
        fill: color, opacity: g.kind === 'total' ? 1 : .92,
        style: 'filter:drop-shadow(0 2px 6px color-mix(in srgb, ' + color + ' 35%, transparent))'
      });
      s.appendChild(p);

      // direct label — prominent and bold
      const labelY = grows ? top_ - 7 : top_ + h + 13;
      s.appendChild(el('text', { class: 'lbl-value', x: cx + bw / 2, y: labelY,
        'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 750,
        fill: g.kind === 'total' ? 'var(--ink-strong)' : (g.value >= 0 ? 'var(--dom-cap)' : 'var(--dom-risk)'),
        text: (g.kind === 'total' ? '' : (g.value >= 0 ? '+' : '−')) + fmt.cr(Math.abs(g.value), g.value % 1 === 0 ? 0 : 2) }));

      // wrapped category label
      const words = String(g.label).split(' ');
      const lines = []; let cur = '';
      words.forEach(w => {
        if ((cur + ' ' + w).trim().length > 12) { lines.push(cur.trim()); cur = w; }
        else cur = (cur + ' ' + w).trim();
      });
      if (cur) lines.push(cur);
      lines.slice(0, 3).forEach((ln, k) => {
        s.appendChild(el('text', { class: 'lbl-axis', x: cx + bw / 2, y: m.t + ih + 15 + k * 11.5,
          'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': g.kind === 'total' ? 700 : 500, fill: 'var(--ink)', text: ln }));
      });

      // hover
      const hit = el('rect.hit', { x: m.l + step * i, y: m.t, width: step, height: ih });
      hit.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, g.label,
        [[g.kind === 'total' ? 'Total' : 'Contribution', (g.value >= 0 ? '+' : '−') + fmt.cr(Math.abs(g.value)) + ' ' + unit],
         ...(g.note ? [['Context', g.note]] : [])]));
      hit.addEventListener('mouseleave', tip.hide);
      s.appendChild(hit);
    });

    s.appendChild(el('text', { class: 'lbl-axis', x: m.l, y: 13, 'font-size': 10.5, 'font-weight': 700, fill: 'var(--ink-muted)', text: unit }));
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
  function hbar(host, { items, unit = '₹ Cr', colorBy = 'series', height, width, valueFmt, compact = false }) {
    const vf = valueFmt || (v => (unit.includes('₹') ? (unit.includes('claim') ? '₹' + fmt.cr(v, 2) : '₹' + fmt.cr(v, 2) + ' Cr') : fmt.cr(v) + ' ' + unit));
    const W = width || (compact ? 480 : 600);
    const m = compact ? { t: 10, r: 90, b: 10, l: 180 } : { t: 14, r: 120, b: 14, l: 220 };
    const rowH = height ? Math.floor((height - m.t - m.b) / items.length) : (compact ? 36 : 48);
    const H = height || (m.t + m.b + items.length * rowH);
    const barH = Math.max(18, Math.min(30, Math.floor(rowH * 0.52)));
    const iw = W - m.l - m.r;
    const max = niceMax(Math.max(...items.map(i => i.value)));
    const s = svg(host, W, H);

    items.forEach((it, i) => {
      const y = m.t + i * rowH + (rowH - barH) / 2;
      const w = Math.max((it.value / max) * iw, 2);
      const color = it.color || (colorBy === 'series' ? seriesVar(i) : 'var(--d1)');

      // Background track
      s.appendChild(el('rect', {
        x: m.l, y, width: iw, height: barH, rx: 6,
        fill: 'var(--grid-2)'
      }));

      // Label on the left
      s.appendChild(el('text', { class: 'lbl-axis', x: m.l - 12, y: y + barH / 2 + 4.5,
        'text-anchor': 'end', 'font-size': compact ? 11.5 : 12.5, 'font-weight': 600, fill: 'var(--ink)',
        text: it.label }));

      // Filled active bar
      s.appendChild(el('rect.series', {
        x: m.l, y, width: w, height: barH, rx: 6, fill: color, opacity: .95,
        style: 'filter:drop-shadow(0 2px 7px color-mix(in srgb, ' + color + ' 45%, transparent))'
      }));

      // Value label on the right of the bar
      s.appendChild(el('text', { class: 'lbl-value', x: m.l + w + 10, y: y + barH / 2 + 4.5,
        'font-size': compact ? 12 : 13.5, 'font-weight': 800, fill: 'var(--ink-strong)',
        text: vf(it.value) + (it.share !== undefined ? ` · ${fmt.pct(it.share, 0)}` : '') }));

      const hit = el('rect.hit', { x: 0, y: m.t + i * rowH, width: W, height: rowH });
      hit.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, it.label,
        [[unit || 'Value', vf(it.value)], ...(it.share !== undefined ? [['Share', fmt.pct(it.share, 1)]] : []),
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
     TORNADO · Financial sensitivity ranking around baseline
     Job: Polarity plus magnitude. Clear downside (left, coral) vs
     upside (right, teal) around a central baseline axis.
     ===================================================================== */
  function tornado(host, { items, baseline, unit = '₹ Cr' }) {
    const rowH = 36, W = 940;
    const m = { t: 44, r: 100, b: 32, l: 230 };
    const H = m.t + m.b + items.length * rowH;
    const iw = W - m.l - m.r;
    const maxDev = niceMax(Math.max(...items.map(i => Math.max(Math.abs(i.downsideDelta), Math.abs(i.upsideDelta), 1))));
    const cx = m.l + iw / 2;
    const xPos = delta => cx + (delta / maxDev) * (iw / 2);
    const s = svg(host, W, H);

    // Ticks and scale labels (showing both absolute ₹ Cr and signed Δ)
    const tickSteps = [-maxDev, -maxDev / 2, 0, maxDev / 2, maxDev];
    tickSteps.forEach(t => {
      const isZero = Math.abs(t) < 1e-6;
      s.appendChild(el('line', {
        class: 'grid-line' + (isZero ? ' zero' : ''),
        x1: xPos(t), x2: xPos(t), y1: m.t - 8, y2: m.t + items.length * rowH + 4,
        stroke: isZero ? 'var(--ink)' : 'var(--hairline)',
        'stroke-dasharray': isZero ? '3 3' : undefined,
        'stroke-width': isZero ? 1.5 : 1
      }));
      s.appendChild(el('text', {
        class: 'lbl-axis', x: xPos(t), y: m.t - 22,
        'text-anchor': 'middle', 'font-size': 11, 'font-weight': isZero ? 700 : 500,
        fill: isZero ? 'var(--ink-strong)' : 'var(--ink-muted)',
        text: isZero ? `₹${fmt.cr(baseline)} Cr` : `₹${fmt.cr(baseline + t)} Cr`
      }));
      s.appendChild(el('text', {
        class: 'lbl-axis', x: xPos(t), y: m.t - 10,
        'text-anchor': 'middle', 'font-size': 9.5, 'font-family': 'var(--ff-mono)',
        fill: isZero ? 'var(--accent)' : 'var(--ink-faint)',
        text: isZero ? '[Baseline]' : (t > 0 ? `+₹${fmt.cr(t)}` : `−₹${fmt.cr(Math.abs(t))}`)
      }));
    });

    items.forEach((it, i) => {
      const y = m.t + i * rowH + (rowH - 18) / 2;
      const dDown = it.downsideDelta; // negative or 0
      const dUp = it.upsideDelta;     // positive or 0

      // Parameter label on left
      const labelEl = el('text', {
        class: 'lbl-axis', x: m.l - 12, y: y + 13,
        'text-anchor': 'end', 'font-size': 11.5, 'font-weight': 580,
        fill: 'var(--ink)', text: it.label
      });
      s.appendChild(labelEl);

      // Downside bar (Left from cx)
      const wDown = Math.max(0, (Math.abs(dDown) / maxDev) * (iw / 2) - (SURFACE_GAP / 2));
      if (wDown > 0.5) {
        const x0 = cx - (SURFACE_GAP / 2) - wDown;
        const pDown = el('path.series', {
          d: barPath(x0, y, wDown, 18, END_R, 'left'),
          fill: 'var(--dom-risk)', opacity: .92
        });
        pDown.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, `${it.label} (Downside)`, [
          ['Tested range', it.rangeDesc || ''],
          ['Tested condition', it.downsideNote || ''],
          ['Net annual benefit', `₹${fmt.cr(it.downside)} Cr`],
          ['Adverse variance', `−₹${fmt.cr(Math.abs(dDown))} Cr vs baseline`]
        ]));
        pDown.addEventListener('mouseleave', tip.hide);
        s.appendChild(pDown);

        // Downside value label
        s.appendChild(el('text', {
          class: 'lbl-value', x: x0 - 6, y: y + 13,
          'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--dom-risk)',
          text: `₹${fmt.cr(it.downside)}`
        }));
      }

      // Upside bar (Right from cx)
      const wUp = Math.max(0, (dUp / maxDev) * (iw / 2) - (SURFACE_GAP / 2));
      if (wUp > 0.5) {
        const x1 = cx + (SURFACE_GAP / 2);
        const pUp = el('path.series', {
          d: barPath(x1, y, wUp, 18, END_R, 'right'),
          fill: 'var(--dom-fin)', opacity: .92
        });
        pUp.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, `${it.label} (Upside)`, [
          ['Tested range', it.rangeDesc || ''],
          ['Tested condition', it.upsideNote || ''],
          ['Net annual benefit', `₹${fmt.cr(it.upside)} Cr`],
          ['Favourable variance', `+₹${fmt.cr(dUp)} Cr vs baseline`]
        ]));
        pUp.addEventListener('mouseleave', tip.hide);
        s.appendChild(pUp);

        // Upside value label
        s.appendChild(el('text', {
          class: 'lbl-value', x: x1 + wUp + 6, y: y + 13,
          'text-anchor': 'start', 'font-size': 10.5, fill: 'var(--dom-fin)',
          text: `₹${fmt.cr(it.upside)}`
        }));
      }

      // Total swing annotation on far right
      s.appendChild(el('text', {
        class: 'lbl-axis', x: W - 10, y: y + 13,
        'text-anchor': 'end', 'font-size': 10.5, 'font-family': 'var(--ff-mono)',
        fill: 'var(--ink-muted)', text: `± ₹${fmt.cr(it.swing / 2, 1)} Cr`
      }));
    });

    legend(host, [
      { label: 'Downside outcome (Adverse stress limit)', color: 'var(--dom-risk)' },
      { label: 'Upside outcome (Favourable stress limit)', color: 'var(--dom-fin)' },
      { label: `Baseline reference · ₹${fmt.cr(baseline)} Cr Net Annual Benefit`, color: 'var(--ink-strong)' }
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
      'font-size': 12, 'font-weight': 640, fill: 'var(--lane-red)',
      text: 'GATE STOPPED · Hard contradiction stopped claim before model scoring' }));
    return s;
  }
  const px = x(score);
  const scoreColor = score >= floors.green ? 'var(--lane-green)' : score >= floors.amber ? 'var(--lane-amber)' : 'var(--lane-red)';
  s.appendChild(el('path', { d: `M${px - 7},${m.t - 2} L${px},${m.t + 7} L${px + 7},${m.t - 2} Z`,
    fill: scoreColor }));
  s.appendChild(el('rect', { x: px - 1.25, y: m.t, width: 2.5, height: bh, fill: scoreColor }));
  s.appendChild(el('text', { x: px, y: m.t + bh + 24, 'text-anchor': 'middle',
    'font-size': 15, 'font-weight': 800, fill: scoreColor, text: `Trust Score: ${fmt.cr(score, 1)} / 100` }));
  return s;
};

/* Contribution bar — five weighted parts summing to the headline */
Charts.contrib = function (host, parts) {
  const { el, clear, fmt, tip } = CP;
  const W = 560, H = 32;
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
    if (w > 36) g.appendChild(el('text', { x: x + w / 2, y: H / 2 + 4.5, 'text-anchor': 'middle',
      'font-size': 11, 'font-weight': 800, fill: '#FFFFFF',
      text: fmt.cr(p.contribution, 1) }));
    g.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, p.label,
      [['Sub-score', fmt.cr(p.raw, 1) + ' / 100'], ['Weight', p.w + '%'],
       ['Contribution', fmt.cr(p.contribution, 1) + ' pts']]));
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
  Charts.beam = function (host, { from, to, unit = '', fromLabel = 'today', toLabel = 'on ClaimPulse', c1, c2, height = 156 }) {
    const W = 620, H = height, s = svgOf(host, W, H);
    const pad = 96, mid = H / 2 + 6;
    const maxH = H * .48;
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
        'font-size': 32, 'font-weight': 780, fill: c, text: fmt.cr(v, 1) }));
      s.appendChild(el('text', { x, y: mid + 16, 'text-anchor': 'middle',
        'font-size': 11, 'font-weight': 600, fill: 'var(--ink-faint)', text: unit }));
      s.appendChild(el('text', { x, y: mid + 38, 'text-anchor': 'middle', 'font-size': 10.5,
        'font-weight': 700, fill: 'var(--ink-muted)',
        style: 'letter-spacing:.12em;text-transform:uppercase', text: lab }));
    });

    /* Prominent central reduction badge */
    const cut = (from - to) / from;
    const badgeG = el('g', { style: 'filter: drop-shadow(0 4px 10px rgba(0,0,0,0.12))' });
    badgeG.appendChild(el('rect', {
      x: W / 2 - 84, y: 8, width: 168, height: 32, rx: 16,
      fill: 'color-mix(in srgb, var(--surface) 92%, transparent)',
      stroke: 'var(--dom-cap)', 'stroke-width': 1.5
    }));
    badgeG.appendChild(el('text', {
      x: W / 2, y: 29, 'text-anchor': 'middle',
      'font-size': 15, 'font-weight': 800, fill: 'var(--dom-cap)',
      'letter-spacing': '-0.02em',
      text: '▼ ' + fmt.pct(cut, 0) + ' TAT COLLAPSE'
    }));
    s.appendChild(badgeG);

    return s;
  };

  /* -------------------------------------------------------------------
     SANKEY · where capacity goes
     A clean three-tier flow: sources (automated) -> links -> destinations (repurposed).
     Ample margins prevent text clipping, and nodes/ribbons provide deep context.
     ------------------------------------------------------------------- */
  Charts.sankey = function (host, { left, right, height = 340, unit = 'FTE' }) {
    const W = 1060, H = height, s = svgOf(host, W, H);
    const colW = 16, m = { t: 36, b: 24 };
    const ih = H - m.t - m.b;
    const totalL = left.reduce((a, x) => a + x.value, 0);
    const totalR = right.reduce((a, x) => a + x.value, 0);
    const xL = 248, xR = W - 248;
    const gapL = 8, gapR = 8;

    // Column titles
    s.appendChild(el('text', {
      class: 'lbl-axis', x: xL, y: 16, 'text-anchor': 'end',
      'font-size': 10.5, 'font-weight': 700, 'letter-spacing': 'var(--tracking-caps)',
      fill: 'var(--ink-muted)', text: 'REPETITIVE WORK AUTOMATED (SOURCES)'
    }));
    s.appendChild(el('text', {
      class: 'lbl-axis', x: xR - colW, y: 16, 'text-anchor': 'start',
      'font-size': 10.5, 'font-weight': 700, 'letter-spacing': 'var(--tracking-caps)',
      fill: 'var(--ink-muted)', text: 'CAPACITY REPURPOSED INTO (DESTINATIONS)'
    }));

    function stackOf(items, total, gap) {
      let y = m.t; const out = [];
      items.forEach(it => {
        const h = Math.max((it.value / total) * (ih - gap * (items.length - 1)), 10);
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
        const flowVal = l.value * share;
        const path = el('path', {
          d: `M${xL + colW},${y0} C${c},${y0} ${c},${y1} ${xR - colW},${y1}
              L${xR - colW},${y1 + h} C${c},${y1 + h} ${c},${y0 + h} ${xL + colW},${y0 + h} Z`,
          fill: l.color, opacity: 0, style: 'mix-blend-mode:normal; cursor:pointer' });
        s.appendChild(path);
        requestAnimationFrame(() => {
          path.style.transition = 'opacity 700ms ease ' + (li * 90 + ri * 45) + 'ms';
          path.setAttribute('opacity', '.22');
        });
        path.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY,
          `${l.label} → ${r.label}`, [
            ['Capacity transfer', `${fmt.n1(flowVal)} ${unit} (${fmt.pct(flowVal / totalL, 1)} of released)`],
            ['Automated source', l.d || 'Redundant manual effort eliminated by AI automation'],
            ['High-value destination', r.d || 'Specialized capacity redeployed to complex human tasks']
          ]));
        path.addEventListener('mouseleave', tip.hide);
        cy += h; cursorR[ri] += h;
      });
    });

    [[L, xL, 'end', -14, totalL], [R, xR - colW, 'start', colW + 14, totalR]].forEach(([col, x, anch, dx, tot]) => {
      col.forEach(n => {
        const barRect = el('rect', { x, y: n.y, width: colW, height: n.h, rx: 4, fill: n.color,
          style: 'filter:drop-shadow(0 0 8px ' + n.color + '); cursor:pointer' });
        s.appendChild(barRect);

        const lbl1 = el('text', { x: x + dx, y: n.y + n.h / 2 - 3, 'text-anchor': anch,
          'font-size': 11.5, 'font-weight': 620, fill: 'var(--ink)', style: 'cursor:pointer',
          text: n.label });
        const lbl2 = el('text', { x: x + dx, y: n.y + n.h / 2 + 11, 'text-anchor': anch,
          'font-size': 10.5, 'font-weight': 600, fill: 'var(--ink-faint)', style: 'cursor:pointer',
          text: `${fmt.n1(n.value)} ${unit} · ${fmt.pct(n.value / tot, 0)}` });
        s.appendChild(lbl1);
        s.appendChild(lbl2);

        const showNodeTip = e => tip.show(e.clientX, e.clientY, n.label, [
          ['Capacity impact', `${fmt.n1(n.value)} ${unit} (${fmt.pct(n.value / tot, 1)} of total)`],
          ['Operational role', n.d || 'Workforce capacity reallocation']
        ]);
        [barRect, lbl1, lbl2].forEach(elem => {
          elem.addEventListener('mousemove', showNodeTip);
          elem.addEventListener('mouseleave', tip.hide);
        });
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

  /* -------------------------------------------------------------------
     DONUT · an interactive pie/donut chart with legend and center summary
     ------------------------------------------------------------------- */
  Charts.donut = function (host, { slices, height = 250, hole = 0.62, unit = '₹ Cr' }) {
    const { el, clear, fmt, tip } = CP;
    const W = 520, H = height;
    clear(host);
    const s = el('svg.chart', { viewBox: `0 0 ${W} ${H}`, width: '100%', preserveAspectRatio: 'xMidYMid meet' });
    host.appendChild(s);

    const cx = 135, cy = H / 2, r = Math.min(cx - 16, cy - 16), rIn = r * hole;
    const total = slices.reduce((sum, sl) => sum + sl.value, 0);

    let start = -Math.PI / 2;
    slices.forEach((sl, i) => {
      const angle = (sl.value / total) * 2 * Math.PI;
      const end = start + angle;
      
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
      const ix1 = cx + rIn * Math.cos(end),   iy1 = cy + rIn * Math.sin(end);
      const ix2 = cx + rIn * Math.cos(start), iy2 = cy + rIn * Math.sin(start);

      const large = angle > Math.PI ? 1 : 0;
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${rIn} ${rIn} 0 ${large} 0 ${ix2} ${iy2} Z`;

      const path = el('path.hot', {
        d, fill: sl.color || `var(--d${(i % 8) + 1})`,
        stroke: 'var(--surface-raised)', 'stroke-width': 1.5,
        style: 'transition: all 0.2s ease;'
      });

      path.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, sl.label, [
        ['Amount', `₹${fmt.cr(sl.value, 2)} Cr`],
        ['Share', fmt.pct(sl.value / total, 1)],
        ['Context', sl.d || 'Annual run cost component']
      ]));
      path.addEventListener('mouseleave', tip.hide);
      s.appendChild(path);

      start = end;
    });

    // Center text
    s.appendChild(el('text', { x: cx, y: cy - 6, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, fill: 'var(--ink-muted)', 'letter-spacing': '.05em', text: 'TOTAL RUN' }));
    s.appendChild(el('text', { x: cx, y: cy + 15, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 800, fill: 'var(--ink-strong)', text: '₹' + fmt.cr(total, 2) + ' Cr' }));

    // Legend on the right side
    const lx = 270, ly = 24, rowH = 34;
    slices.forEach((sl, i) => {
      const y = ly + i * rowH;
      const g = el('g.hot');
      g.appendChild(el('circle', { cx: lx, cy: y + 4, r: 5, fill: sl.color || `var(--d${(i % 8) + 1})` }));
      g.appendChild(el('text', { x: lx + 14, y: y + 5, 'font-size': 11.5, 'font-weight': 650, fill: 'var(--ink-strong)', text: sl.label }));
      g.appendChild(el('text', { x: lx + 14, y: y + 19, 'font-size': 10.5, fill: 'var(--ink-muted)', text: `₹${fmt.cr(sl.value, 2)} Cr · ${fmt.pct(sl.value / total, 1)}` }));
      
      g.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, sl.label, [
        ['Amount', `₹${fmt.cr(sl.value, 2)} Cr`],
        ['Share', fmt.pct(sl.value / total, 1)],
        ['Context', sl.d || 'Annual run cost component']
      ]));
      g.addEventListener('mouseleave', tip.hide);
      s.appendChild(g);
    });

    return s;
  };
})();
