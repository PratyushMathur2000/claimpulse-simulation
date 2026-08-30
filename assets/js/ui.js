/* =====================================================================
   ClaimPulse · Shared view furniture
   Small builders the ten screens share, so a tile looks like a tile
   everywhere and a change lands in one place.
   ===================================================================== */

const UI = (() => {
  const { el, fmt } = CP;

  /* Page header — eyebrow, headline, standfirst */
  function head(eyebrow, title, lede, aside) {
    return el('div.view-head', {}, [
      el('p.eyebrow', { text: eyebrow }),
      el('div.spread.wrap', {}, [
        el('div', {}, [
          typeof title === 'string' ? el('h1', { text: title }) : title,
          lede ? (typeof lede === 'string' ? el('p.lede', { style: { marginTop: 'var(--s-4)' }, text: lede }) : lede) : null
        ]),
        aside || null
      ])
    ]);
  }

  /* Stat tile. `ref` is the Excel cell the figure came from — every
     number on screen can be traced back to the workbook.

     The description does NOT sit on the page. A tile shows a label and a
     number; point at it and the explanation arrives. Twelve tiles each
     carrying two lines of prose is how a screen becomes a wall of text,
     which is exactly what this used to be. */
  function tile({ k, ref, v, unit, d, hero, accent, warm, delta, deltaGood, showD }) {
    const t = el('div.tile' + (hero ? '.hero' : '') + (accent ? '.accent' : '') + (warm ? '.warm' : ''), {}, [
      el('div.k', {}, [k]),
      el('div.v', {}, [String(v), unit ? el('span.unit', { text: unit }) : null]),
      delta ? el('span.delta.' + (deltaGood === false ? 'down' : deltaGood === true ? 'up' : 'flat'),
        { text: delta }) : null,
      (d && showD) ? el('div.d', { text: d }) : null
    ]);
    if ((d && !showD) || ref || delta) {
      t.setAttribute('data-tip', '1');
      const rows = [];
      if (delta) rows.push(['Change', delta]);
      if (ref) rows.push(['Workbook ref', ref]);
      if (d) rows.push(['', d]);
      t.addEventListener('mousemove', e => CP.tip.show(e.clientX, e.clientY, k, rows));
      t.addEventListener('mouseleave', CP.tip.hide);
      t.addEventListener('click', () => {
        if (t.querySelector('.d')) return;
        if (d) t.appendChild(el('div.d.pop', { text: d }));
      });
    }
    return t;
  }

  /* Collapsed by default. The argument is available, not unavoidable. */
  function disc(summary, body, opts = {}) {
    return el('details.disc', opts.open ? { open: 'open' } : {}, [
      el('summary', {}, [
        summary,
        opts.chip ? el('span.chip', { text: opts.chip }) : null
      ]),
      el('div.disc-body', typeof body === 'string' ? { html: body } : {},
        typeof body === 'string' ? [] : (Array.isArray(body) ? body : [body]))
    ]);
  }

  /* A clickable card — the unit of interaction on the rebuilt screens */
  function pick({ title, value, sub, on, onClick, accentColor }) {
    const b = el('button.pick', { type: 'button', 'data-on': String(!!on) }, [
      el('span.pt', { text: title }),
      value !== undefined ? el('span.pv', { text: String(value) }) : null,
      sub ? el('span.ps', { text: sub }) : null
    ]);
    if (accentColor) b.style.setProperty('--accent', accentColor);
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function card(title, sub, body, action) {
    return el('div.card', {}, [
      (title || sub) ? el('div.card-head', {}, [
        el('div', {}, [
          title ? el('h3', { text: title }) : null,
          sub ? el('div.sub', { text: sub }) : null
        ]),
        action || null
      ]) : null,
      ...(Array.isArray(body) ? body : [body])
    ]);
  }

  /* Table from rows of cells; `n` marks a numeric column */
  function table(cols, rows) {
    return el('div.tbl-wrap', {}, [el('table.tbl', {}, [
      el('thead', {}, [el('tr', {}, cols.map(c =>
        el('th', { class: c.n ? 'n' : '', text: c.label })))]),
      el('tbody', {}, rows.map(r => el('tr', { class: r.total ? 'total' : '' },
        (r.cells || r).map((cell, i) => {
          const td = el('td', {
            class: (cols[i] && cols[i].n ? 'n ' : '') + (cell && cell.cls ? cell.cls : '')
          }, [cell && cell.node ? cell.node : String(cell && cell.text !== undefined ? cell.text : cell)]);
          if (cell && cell.tip) {
            td.style.cursor = 'default';
            td.addEventListener('mousemove', e => CP.tip.show(e.clientX, e.clientY, cell.tip.title || '', cell.tip.rows || []));
            td.addEventListener('mouseleave', CP.tip.hide);
          }
          return td;
        })
      )))
    ])]);
  }

  function callout(html, kind) {
    return el('div.callout' + (kind ? '.' + kind : ''), { html });
  }

  function badge(text, kind) { return el('span.badge.' + (kind || 'neutral'), { text }); }
  function ref(text) { return el('span.ref', { text }); }

  function laneChip(laneKey) {
    const m = CPEngine.LANE_META[laneKey];
    return el('span.badge', {
      class: 'lane-' + m.cls,
      style: {
        background: `var(--lane-${m.cls}-soft)`, color: `var(--lane-${m.cls})`,
        borderColor: `color-mix(in srgb, var(--lane-${m.cls}) 26%, transparent)`
      }
    }, [el('span.lane-dot', { class: m.cls }), m.label]);
  }

  /* A labelled proportion bar for use inside a table cell */
  function bar(frac, color) {
    return el('div.bar', {}, [el('i', {
      style: { width: Math.max(2, Math.min(1, frac) * 100) + '%', background: color || 'var(--accent)' }
    })]);
  }

  /* Key-value definition rows */
  function facts(rows) {
    return el('div.stack-4', {}, rows.map(([k, v, r]) => {
      const labelEl = el('span.small.muted', { style: { cursor: r ? 'default' : 'inherit' } }, [k]);
      if (r) {
        labelEl.addEventListener('mousemove', e => CP.tip.show(e.clientX, e.clientY, k, [['Workbook ref', r]]));
        labelEl.addEventListener('mouseleave', CP.tip.hide);
      }
      return el('div.spread', { style: { alignItems: 'baseline', gap: 'var(--s-5)' } }, [
        labelEl,
        el('span.small', { style: { fontWeight: 640, textAlign: 'right' } }, [String(v)])
      ]);
    }));
  }

  /* "What we are not claiming" — collapsed. Stating the limits is what
     makes the rest credible, but it should not be the first thing a
     judge reads on every screen. */
  function limits(items) {
    return disc(
      el('span', {}, ['What this does not claim']),
      el('div.stack-4', {}, items.map(t => el('div.row', { style: { alignItems: 'flex-start' } }, [
        el('span', { style: { color: 'var(--ink-faint)', flex: '0 0 auto', marginTop: '1px' }, text: '—' }),
        el('span.small.muted', { html: t })
      ]))),
      { chip: items.length + ' limits' });
  }


  /* =====================================================================
     THE FUTURE LAYER
     ---------------------------------------------------------------------
     Six builders that replace the flat-card vocabulary. A screen is now
     made of panels carrying a domain identity, cells divided by
     hairlines rather than by more boxes, and metrics whose numbers are
     the loudest thing on them.
     ===================================================================== */

  /* A surface. `dom` is one of fin | ops | ai | cust | risk | cap and
     decides the top rule, the corner bloom and the hover glow. */
  function panel({ dom, title, sub, action, body, cls = '', hero, flush, id, style }) {
    const p = el('div.panel' + (hero ? '.hero' : '') + (flush ? '.pad-0' : '') + (cls ? '.' + cls.split(' ').join('.') : ''),
      { id: id || undefined, style: style || undefined });
    if (dom) p.setAttribute('data-dom', dom);
    if (title || sub || action) {
      p.appendChild(el('div.spread.wrap', {
        style: { marginBottom: 'var(--s-6)', padding: flush ? 'var(--s-6) var(--s-6) 0' : '0' } }, [
        el('div', { style: { minWidth: 0 } }, [
          title ? el('h3', { style: { margin: 0, fontSize: 'var(--fs-md)', letterSpacing: 'var(--tracking-tight)' },
            text: title }) : null,
          sub ? el('div.small.muted', { style: { marginTop: 'var(--s-2)' }, text: sub }) : null
        ]),
        action || null
      ]));
    }
    (Array.isArray(body) ? body : [body]).filter(Boolean).forEach(n => p.appendChild(n));
    return p;
  }

  /* A number, its label, and — on hover only — what it means. */
  function metric({ k, v, unit, d, dom, size, ref, delta, deltaGood, id }) {
    const m = el('div.metric' + (size ? '.' + size : ''), { id: id || undefined }, [
      el('div.m-k', {}, [k]),
      el('div.m-v', {}, [String(v), unit ? el('span.u', { text: unit }) : null]),
      delta ? el('span.delta.' + (deltaGood === false ? 'down' : deltaGood === true ? 'up' : 'flat'), { text: delta }) : null
    ]);
    if (dom) m.setAttribute('data-dom', dom);
    if (d || ref || delta) {
      const rows = [];
      if (delta) rows.push(['Change', delta]);
      if (ref) rows.push(['Workbook ref', ref]);
      if (d) rows.push(['', d]);
      m.style.cursor = 'default';
      m.addEventListener('mousemove', e => CP.tip.show(e.clientX, e.clientY, k, rows));
      m.addEventListener('mouseleave', CP.tip.hide);
      m.addEventListener('click', () => {
        if (m.querySelector('.m-d')) return;
        if (d) m.appendChild(el('div.m-d', { text: d }));
      });
    }
    return m;
  }

  /* A grid of metrics divided by hairlines, inside one panel. */
  function cells(n, items, opts = {}) {
    return el('div.cells.c-' + n + (opts.noBottom ? '.no-bb' : ''), {},
      items.filter(Boolean).map(x => el('div.cell-x', {}, [x])));
  }

  /* A cluster heading — how a screen announces a change of subject
     without spending a whole panel on it. */
  function clus(label, dom, right) {
    const c = el('div.clus', {}, [el('i'), el('h2', { text: label }),
      el('span.rest'), right || null]);
    if (dom) c.setAttribute('data-dom', dom);
    return c;
  }

  function dchip(text, dom) {
    const c = el('span.dchip', { text });
    if (dom) c.setAttribute('data-' + (['g','a','r'].includes(dom) ? 'lane' : 'dom'), dom);
    if (['g','a','r'].includes(dom)) { c.classList.add(dom); c.removeAttribute('data-lane'); }
    return c;
  }

  /* The interactive table. cols: [{key,label,n,w,render,tip}]. Rows are
     objects; `render` gets the row and may return a node. */
  function dtable({ cols, rows, onRow, selected, empty = 'Nothing matches.' }) {
    const wrap = el('div.dtable-wrap');
    if (!rows.length) {
      wrap.appendChild(el('div.small.muted', { style: { padding: 'var(--s-7)', textAlign: 'center' }, text: empty }));
      return wrap;
    }
    const t = el('table.dtable', {}, [
      el('thead', {}, [el('tr', {}, cols.map(c =>
        el('th', { class: c.n ? 'n' : '', style: c.w ? { width: c.w } : undefined, text: c.label })))]),
      el('tbody', {}, rows.map(r => {
        const tr = el('tr', { class: (onRow ? 'clickable ' : '') + (selected && selected(r) ? 'on' : '') });
        cols.forEach(c => {
          const td = el('td', { class: c.n ? 'n' : '' },
            [c.render ? c.render(r) : el('span', { text: String(r[c.key] === undefined ? '' : r[c.key]) })]);
          if (c.tip) {
            const tipData = typeof c.tip === 'function' ? c.tip(r) : c.tip;
            if (tipData) {
              td.style.cursor = 'default';
              td.addEventListener('mousemove', e => CP.tip.show(e.clientX, e.clientY, tipData.title || '', tipData.rows || []));
              td.addEventListener('mouseleave', CP.tip.hide);
            }
          }
          tr.appendChild(td);
        });
        if (onRow) tr.addEventListener('click', () => onRow(r));
        return tr;
      }))
    ]);
    wrap.appendChild(t);
    return wrap;
  }

  /* A bar inside a table cell. */
  function cbar(frac, grad) {
    return el('span.cbar', {}, [el('i', {
      style: { width: Math.max(3, Math.min(1, frac) * 100) + '%', background: grad || 'var(--accent-grad)' } })]);
  }

  /* The transformation ribbon used by the capacity screen. */
  function flow(nodes) {
    return el('div.flow', {}, nodes.map(n => el('div.flow-node', {
      style: { '--f-c': n.color || 'var(--accent)' } }, [
      el('div.f-k', { text: n.k }),
      el('div.f-v', { text: String(n.v) }),
      n.d ? el('div.f-d', { text: n.d }) : null
    ])));
  }

  const money = v => '₹' + fmt.cr(v) + ' Cr';

  return { head, tile, card, table, callout, badge, ref, laneChip, bar, facts,
           limits, money, disc, pick,
           panel, metric, cells, clus, dchip, dtable, cbar, flow };
})();
