/* =====================================================================
   ClaimPulse · Diagrams
   ---------------------------------------------------------------------
   Pictures that show a mechanism, not decoration. Each one is built from
   the same tokens as the rest of the interface, so it themes with the
   page and never needs a second light-mode version.
   ===================================================================== */

const Diagrams = (() => {
  const { el, clear, fmt, tip } = CP;

  function svg(host, w, h, cls = '') {
    clear(host);
    const s = el('svg.chart' + (cls ? '.' + cls : ''), {
      viewBox: `0 0 ${w} ${h}`, width: '100%',
      preserveAspectRatio: 'xMidYMid meet', role: 'img'
    });
    host.appendChild(s);
    return s;
  }

  /* A rounded box with a title, a subtitle and an optional accent edge */
  function box(s, { x, y, w, h, title, sub, meta, accent, fill, dashed, r = 10 }) {
    const g = el('g', { class: 'series' });
    g.appendChild(el('rect', {
      x, y, width: w, height: h, rx: r,
      fill: fill || 'var(--surface-raised)',
      stroke: accent || 'var(--border-strong)',
      'stroke-width': accent ? 1.6 : 1,
      'stroke-dasharray': dashed ? '5 4' : null
    }));
    if (accent) {
      g.appendChild(el('path', {
        d: `M${x},${y + r} Q${x},${y} ${x + r},${y} L${x + r},${y} L${x + r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} Z`,
        fill: accent
      }));
    }
    const tx = x + (accent ? 18 : 13);
    if (title) g.appendChild(el('text', {
      x: tx, y: y + (sub ? 21 : h / 2 + 4), 'font-size': 12.5, 'font-weight': 660,
      fill: 'var(--ink-strong)', text: title
    }));
    if (sub) g.appendChild(el('text', {
      x: tx, y: y + 37, 'font-size': 10.5, fill: 'var(--ink-muted)', text: sub
    }));
    if (meta) g.appendChild(el('text', {
      x: x + w - 13, y: y + (sub ? 21 : h / 2 + 4), 'font-size': 11, 'font-weight': 660,
      'text-anchor': 'end', fill: accent || 'var(--ink-muted)', text: meta
    }));
    s.appendChild(g);
    return g;
  }

  /* Orthogonal connector with an arrow head */
  function link(s, x1, y1, x2, y2, { color = 'var(--border-strong)', dashed, label, width = 1.4 } = {}) {
    const mid = x1 + (x2 - x1) / 2;
    const d = Math.abs(y1 - y2) < 1
      ? `M${x1},${y1} L${x2 - 7},${y2}`
      : `M${x1},${y1} L${mid},${y1} L${mid},${y2} L${x2 - 7},${y2}`;
    s.appendChild(el('path', {
      d, fill: 'none', stroke: color, 'stroke-width': width,
      'stroke-dasharray': dashed ? '4 4' : null, 'stroke-linejoin': 'round'
    }));
    s.appendChild(el('path', {
      d: `M${x2 - 7},${y2 - 4} L${x2},${y2} L${x2 - 7},${y2 + 4} Z`, fill: color
    }));
    if (label) s.appendChild(el('text', {
      x: mid + 5, y: (y1 + y2) / 2 - 5, 'font-size': 10, 'font-weight': 620,
      fill: color, text: label
    }));
  }

  /* =====================================================================
     PIPELINE · the routing architecture, end to end
     The ordering is the architectural claim: Gate 00 runs BEFORE any
     engine, so a hard fail routes red without a single model call.
     ===================================================================== */
  function pipeline(host, r) {
    const W = 1180, H = 560;
    const s = svg(host, W, H);
    const green = r.plan ? CPModel.INPUTS.B03_green : 0.65;
    const amber = CPModel.INPUTS.B04_amber, red = CPModel.INPUTS.B05_red;

    const col = { intake: 24, gate: 214, eng: 452, fuse: 742, lane: 962 };
    const midY = 250;

    /* intake */
    box(s, { x: col.intake, y: midY - 34, w: 158, h: 68,
      title: 'All claims', sub: 'FNOL · guided capture', meta: '100%', accent: 'var(--d1)' });

    /* Gate 00 */
    box(s, { x: col.gate, y: midY - 52, w: 196, h: 104,
      title: 'GATE 00', sub: 'Capture integrity', accent: 'var(--warm)' });
    ['Direct-from-camera only', 'EXIF · timestamp · GPS', 'Diffusion / re-capture screen'].forEach((t, i) => {
      s.appendChild(el('text', { x: col.gate + 18, y: midY - 2 + i * 15, 'font-size': 10,
        fill: 'var(--ink-muted)', text: '· ' + t }));
    });
    link(s, col.intake + 158, midY, col.gate, midY);

    /* Hard-fail branch — the whole point of the ordering. It leaves the
       gate, runs under the engines without touching one of them, and
       arrives at RED. The route is the argument: nothing downstream is
       reached, so nothing downstream is paid for. */
    const hfY = 440, redCx = col.lane + 97, redBottom = 130 + 2 * 108 + 84;
    s.appendChild(el('path', {
      d: `M${col.gate + 98},${midY + 52} L${col.gate + 98},${hfY} L${redCx},${hfY} L${redCx},${redBottom + 9}`,
      fill: 'none', stroke: 'var(--lane-red)', 'stroke-width': 1.5,
      'stroke-dasharray': '5 4', 'stroke-linejoin': 'round'
    }));
    s.appendChild(el('path', {
      d: `M${redCx - 4},${redBottom + 9} L${redCx},${redBottom + 2} L${redCx + 4},${redBottom + 9} Z`,
      fill: 'var(--lane-red)'
    }));
    s.appendChild(el('text', { x: col.intake + 6, y: 402, 'font-size': 11,
      'font-weight': 700, fill: 'var(--lane-red)', text: 'HARD FAIL' }));
    ['routed RED before any engine ran —', 'no model called, no token spent'].forEach((t, i) =>
      s.appendChild(el('text', { x: col.intake + 6, y: 418 + i * 13, 'font-size': 10,
        fill: 'var(--ink-muted)', text: t })));

    /* the five engines */
    const engines = [
      ['01', 'OCR + document AI', 'deterministic', 'var(--d1)'],
      ['02', 'CV damage assessment', 'specialised ML', 'var(--d3)'],
      ['03', 'Fraud + duplicate graph', 'specialised ML', 'var(--d2)'],
      ['04', 'Repair cost estimation', 'specialised ML', 'var(--d4)'],
      ['05', 'Policy validation, RAG', 'GenAI, selective', 'var(--d7)']
    ];
    const eh = 56, egap = 12, etop = midY - (engines.length * (eh + egap) - egap) / 2;
    engines.forEach(([n, name, kind, c], i) => {
      const y = etop + i * (eh + egap);
      box(s, { x: col.eng, y, w: 244, h: eh, title: `${n} · ${name}`, sub: kind, accent: c, r: 8 });
      link(s, col.gate + 196, midY, col.eng, y + eh / 2, { color: 'var(--border)' });
      link(s, col.eng + 244, y + eh / 2, col.fuse, midY, { color: 'var(--border)' });
    });
    s.appendChild(el('text', { x: col.eng, y: etop - 14, 'font-size': 10.5, 'font-weight': 700,
      fill: 'var(--ink-faint)', 'letter-spacing': '.1em', text: 'FIVE SPECIALISED ENGINES' }));

    /* Trust Score fusion */
    box(s, { x: col.fuse, y: midY - 62, w: 178, h: 124,
      title: 'TRUST SCORE', sub: 'weighted fusion, 0–100', accent: 'var(--accent)' });
    const W_ = CPEngine.WEIGHTS;
    Object.entries({ 'Gate 00': W_.gate, 'Doc AI': W_.doc, 'CV': W_.cv, 'Fraud': W_.fraud, 'Policy': W_.policy })
      .forEach(([k, v], i) => {
        s.appendChild(el('text', { x: col.fuse + 18, y: midY - 6 + i * 13, 'font-size': 9.5,
          fill: 'var(--ink-muted)', text: k }));
        s.appendChild(el('text', { x: col.fuse + 160, y: midY - 6 + i * 13, 'font-size': 9.5,
          'text-anchor': 'end', 'font-weight': 660, fill: 'var(--ink)', text: v + '%' }));
      });

    /* three lanes */
    const lanes = [
      ['GREEN', 'Auto-settle', green, CPModel.INPUTS.B10_tatGreen, CPModel.INPUTS.B06_touchGreen, 'var(--lane-green)'],
      ['AMBER', 'Assisted review', amber, CPModel.INPUTS.B11_tatAmber, CPModel.INPUTS.B07_touchAmber, 'var(--lane-amber)'],
      ['RED', 'Investigate', red, CPModel.INPUTS.B12_tatRed, CPModel.INPUTS.B08_touchRed, 'var(--lane-red)']
    ];
    lanes.forEach(([label, name, share, tat, touches, c], i) => {
      const y = 130 + i * 108;
      box(s, { x: col.lane, y, w: 194, h: 84, title: label, sub: name, accent: c,
        meta: fmt.pct(share, 0) });
      s.appendChild(el('text', { x: col.lane + 18, y: y + 58, 'font-size': 10,
        fill: 'var(--ink-muted)', text: `${fmt.cr(tat, 1)} days · ${touches} touches` }));
      link(s, col.fuse + 178, midY, col.lane, y + 42, { color: c, width: 1.6 });
    });

    /* the GenAI annotation — the answer to the question they will ask */
    s.appendChild(el('rect', { x: col.eng - 8, y: 468, width: 700, height: 62, rx: 10,
      fill: 'var(--accent-soft)', stroke: 'none' }));
    s.appendChild(el('text', { x: col.eng + 8, y: 492, 'font-size': 12, 'font-weight': 680,
      fill: 'var(--accent)', text: `GenAI runs on ${fmt.pct(amber + red, 0)} of claims, not 100%.` }));
    s.appendChild(el('text', { x: col.eng + 8, y: 511, 'font-size': 11, fill: 'var(--ink-muted)',
      text: `The green lane clears on deterministic checks alone — ${fmt.pct(green, 0)} of claims settle without a single model call.` }));
    return s;
  }

  /* =====================================================================
     JOURNEY · the same claim, before and after
     ---------------------------------------------------------------------
     Two tracks on one scale. Today is a long run of red-violet segments,
     nearly all of them needing a person. ClaimPulse is a short run in
     which only one segment is warm. The bars draw themselves in from the
     left, so the second track visibly stops short of the first.

     Labels alternate above and below the axis, because five segments in
     280px will collide on one line every time.
     ===================================================================== */
  function journey(host, { today, after, todayTotal, afterTotal }) {
    const W = 1000, rowH = 104, H = rowH * 2 + 4;
    const s = svg(host, W, H);
    const m = { l: 132, r: 104 };
    const iw = W - m.l - m.r;
    const scale = d => (d / todayTotal) * iw;

    /* One gradient per track, defined once. */
    function trackGrad(id, a, b) {
      s.appendChild(el('defs', {}, [
        el('linearGradient', { id, x1: '0%', y1: '0%', x2: '100%', y2: '0%' }, [
          el('stop', { offset: '0%', 'stop-color': a }),
          el('stop', { offset: '100%', 'stop-color': b })
        ])
      ]));
      return 'url(#' + id + ')';
    }
    const gToday = trackGrad('jt', 'var(--dom-risk)', 'var(--dom-cust)');
    const gAfter = trackGrad('ja', 'var(--dom-ops)', 'var(--dom-cap)');

    [['TODAY', today, todayTotal, 6, 'var(--dom-risk)', gToday, true],
     ['CLAIMPULSE', after, afterTotal, rowH + 14, 'var(--dom-cap)', gAfter, false]
    ].forEach(([label, steps, total, y0, col, fill, isToday]) => {

      s.appendChild(el('text', { x: 0, y: y0 + 40, 'font-size': 11.5, 'font-weight': 700,
        'letter-spacing': '.12em', fill: col, text: label }));
      s.appendChild(el('text', { x: 0, y: y0 + 58, 'font-size': 10.5,
        fill: 'var(--ink-faint)', text: fmt.cr(total, 2) + ' days' }));
      s.appendChild(el('text', { x: 0, y: y0 + 74, 'font-size': 9.5, fill: 'var(--ink-faint)',
        text: steps.filter(x => x.manual).length + ' of ' + steps.length + ' need a person' }));

      /* The track it runs on. On the second row the unused remainder is
         washed green and labelled — the removed time is a thing you can
         see, not a subtraction you have to do. */
      s.appendChild(el('rect', { x: m.l, y: y0 + 26, width: iw, height: 34, rx: 8,
        fill: 'var(--grid-2)' }));
      if (!isToday) {
        const xe = m.l + scale(afterTotal), xt = m.l + scale(todayTotal);
        s.appendChild(el('rect', { x: xe + 3, y: y0 + 26, width: Math.max(xt - xe - 3, 4), height: 34,
          rx: 8, fill: 'color-mix(in srgb, var(--dom-cap) 13%, transparent)',
          stroke: 'color-mix(in srgb, var(--dom-cap) 30%, transparent)',
          'stroke-width': 1, 'stroke-dasharray': '4 4' }));
        s.appendChild(el('text', { x: (xe + xt) / 2, y: y0 + 47, 'text-anchor': 'middle',
          'font-size': 11.5, 'font-weight': 700, fill: 'var(--dom-cap)',
          text: fmt.cr(todayTotal - afterTotal, 1) + ' days removed' }));
      }

      let x = m.l;
      steps.forEach((st, i) => {
        const w = Math.max(scale(st.days) - 2, 3);
        const g = el('g');
        const p = el('path.series', {
          d: Charts.barPath(x, y0 + 26, w, 34, 5,
            i === 0 ? 'left' : (i === steps.length - 1 ? 'right' : 'up')),
          fill, opacity: st.manual ? 1 : .42
        });
        if (st.manual) p.setAttribute('style', 'filter:drop-shadow(0 2px 7px color-mix(in srgb, ' + col + ' 55%, transparent))');
        g.appendChild(p);
        g.addEventListener('mousemove', e => tip.show(e.clientX, e.clientY, st.name,
          [['Elapsed', fmt.cr(st.days, 2) + ' days'],
           ['Handling', st.manual ? 'manual touch' : 'automated'],
           ...(st.note ? [['', st.note]] : [])]));
        g.addEventListener('mouseleave', tip.hide);
        s.appendChild(g);

        if (w > 28) g.appendChild(el('text', { x: x + w / 2, y: y0 + 48, 'font-size': 11,
          'text-anchor': 'middle', fill: '#FFFFFF', 'font-weight': 800,
          stroke: 'rgba(0,0,0,.65)', 'stroke-width': 2.2,
          'paint-order': 'stroke fill', text: fmt.cr(st.days, 1) + 'd' }));

        /* Labels alternate above and below so short segments still read. */
        const above = i % 2 === 1;
        const ly = above ? y0 + 18 : y0 + 76;
        /* Clamp the first label so it cannot reach back into the row's
           own name column. */
        const lx = Math.max(x + w / 2, m.l + 30);
        s.appendChild(el('text', { x: lx, y: ly, 'font-size': 9.5,
          'text-anchor': i === 0 ? 'start' : 'middle', fill: 'var(--ink-faint)',
          text: st.short || '' }));
        s.appendChild(el('line', { x1: x + w / 2, x2: x + w / 2,
          y1: above ? y0 + 21 : y0 + 60, y2: above ? y0 + 26 : y0 + 66,
          stroke: 'var(--grid)', 'stroke-width': 1 }));

        x += w + 2;
      });

      s.appendChild(el('text', { x: W - m.r + 14, y: y0 + 48, 'font-size': 14,
        'font-weight': 700, fill: col, text: fmt.cr(total, 2) + ' d' }));
    });

    return s;
  }

  /* =====================================================================
     LANE RIBBON · where the book sits, at the current rollout
     ===================================================================== */
  function laneRibbon(host, r) {
    const I = CPModel.INPUTS;
    const onPlat = r.rollout;
    const segs = [
      { label: 'Green · auto-settled', value: onPlat * I.B03_green, color: 'var(--lane-green)',
        display: fmt.n(r.autoSettled) + ' claims' },
      { label: 'Amber · one reviewer', value: onPlat * I.B04_amber, color: 'var(--lane-amber)',
        display: fmt.n(r.claims * I.B04_amber) + ' claims' },
      { label: 'Red · investigated', value: onPlat * I.B05_red, color: 'var(--lane-red)',
        display: fmt.n(r.claims * I.B05_red) + ' claims' },
      { label: 'Not yet reached · still on the 9.8-day journey', value: 1 - onPlat,
        color: 'var(--border-strong)', display: fmt.n(r.claimsFull - r.claims) + ' claims' }
    ].filter(x => x.value > 0.0001);
    return Charts.stack(host, { segments: segs, height: 34 });
  }

  return { pipeline, journey, laneRibbon, box, link, svg };
})();
