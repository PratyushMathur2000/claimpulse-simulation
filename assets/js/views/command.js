/* =====================================================================
   ClaimPulse · Claims Command Centre
   ---------------------------------------------------------------------
   The screen a claims manager opens at 09:00, stripped to what they act
   on. It used to spend a third of its width on a lane-distribution chart
   and a savings summary; both were interesting and neither was
   operational, so the lane chart is gone and the savings moved to Value
   to management, where an executive will actually look for them.

   What is left answers four questions in order:
     what is on the desk        — the band
     what needs me first        — the attention strip
     which claims exactly       — the queue, searchable and sortable
     why did that one go there  — the row opens the inspector

   Nothing is stored. Every counter derives from the claim store, so the
   band and the table can never disagree.
   ===================================================================== */

const ViewCommand = (() => {
  const { el, mount, fmt, $, $$ } = CP;

  let filter = 'all';
  let sort = 'time';
  let query = '';

  const FILTERS = [
    ['all',      'All'],
    ['A',        'Needs a reviewer'],
    ['R',        'Investigation'],
    ['surveyor', 'Surveyor required'],
    ['capped',   'Held by ₹50k corridor'],
    ['gate',     'Rejected at Gate 00'],
    ['G',        'Auto-settled']
  ];

  function match(c) {
    if (query) {
      const hay = (c.claim.id + ' ' + c.claim.claimant + ' ' + c.claim.vehicle.model + ' ' +
                   c.claim.vehicle.reg + ' ' + c.claim.city + ' ' + c.claim.garage.name).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    switch (filter) {
      case 'all': return true;
      case 'G': case 'A': case 'R': return c.lane === filter;
      case 'surveyor': return c.surveyor.required;
      case 'capped': return c.capped;
      case 'gate': return c.skipped;
      default: return true;
    }
  }

  function render(host) {
    const all = CPClaims.all();
    const counts = CPClaims.laneCounts();
    const t = all.length;
    const book = CPModel.run('base');
    const needHuman = all.filter(c => c.lane !== 'G').length;
    const avgTat = all.reduce((s, c) => s + c.tat, 0) / t;

    /* The three queues a manager is actually accountable for clearing. */
    const attention = [
      { k: 'gate',     dom: 'risk', label: 'Rejected at Gate 00',
        n: all.filter(c => c.skipped).length,
        sub: 'Evidence failed integrity. Investigation, zero model calls.' },
      { k: 'surveyor', dom: 'cust', label: 'Surveyor allocation pending',
        n: all.filter(c => c.surveyor.required).length,
        sub: 'Red lane or above the ₹50,000 corridor.' },
      { k: 'A',        dom: 'ops',  label: 'Awaiting one reviewer',
        n: counts.A, sub: 'Evidence assembled, reasoning written. A decision, not a collection job.' }
    ];

    mount(host, [

      /* ---- the band ---- */
      el('div.panel.hero.rise', { 'data-dom': 'ops' }, [
        el('div.spread.wrap', { style: { alignItems: 'flex-start', gap: 'var(--s-6)' } }, [
          el('div', { style: { minWidth: 0, maxWidth: '56ch' } }, [
            el('p.eyebrow', { style: { margin: 0 }, text: 'Demo · claims command centre' }),
            el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
              'The desk at ', el('span.grad-ink', { text: '09:00.' })
            ]),
            el('p.lede', { style: { marginTop: 'var(--s-4)', color: 'var(--ink-muted)' },
              text: 'Intelligent tri-lane orchestration: straight-through payouts, assisted human reviews, and automated fraud interception.' })
          ]),
          el('div.row', { style: { gap: 'var(--s-2)', alignItems: 'center' } }, [
            el('span.orb.busy'),
            el('span.small.muted', { text: '5 AI Engines Live · 09:00 IST' })
          ])
        ]),
        el('div.cells.c-4', { style: { marginTop: 'var(--s-6)',
          border: '1px solid var(--hairline)', borderRadius: 'var(--r-4)',
          background: 'color-mix(in srgb, var(--surface) 30%, transparent)' } }, [
          el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'ops',
            k: 'On the desk', v: fmt.n(t), unit: 'claims',
            d: 'Filed on this demo. At book scale that is ' + fmt.compact(book.claims) + ' claims a year.' })]),
          el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cap',
            k: 'Cleared straight-through', v: fmt.n(counts.G), unit: 'claims (' + fmt.pct(counts.G / t, 0) + ')',
            delta: fmt.pct(counts.G / t, 0) + ' auto-settled', deltaGood: true,
            d: 'Green lane. Book design target is ' + fmt.pct(CPModel.INPUTS.B03_green, 0) + '.' })]),
          el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cust',
            k: 'Assisted human review', v: fmt.n(needHuman), unit: 'claims',
            d: 'Amber and red. Judgement is redeployed here, not removed.' })]),
          el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'fin',
            k: 'Average turnaround', v: fmt.cr(avgTat), unit: 'days',
            delta: '▼ ' + fmt.cr(CPModel.INPUTS.B09_tatToday - avgTat) + ' d vs today', deltaGood: true,
            d: 'Against 9.8 days on the legacy process.' })])
        ]),

        /* Real-Time Proportional Tri-Lane Throughput Bar */
        el('div', { style: { marginTop: 'var(--s-6)' } }, [
          el('div.spread.wrap', { style: { fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', gap: 'var(--s-2)', marginBottom: 'var(--s-2)' } }, [
            el('span', { text: 'Real-Time Tri-Lane Routing Velocity' }),
            el('span.mono', { text: `${counts.G} Straight-Through (${fmt.pct(counts.G/t,0)}) · ${counts.A} Assisted Review (${fmt.pct(counts.A/t,0)}) · ${counts.R} Complex (${fmt.pct(counts.R/t,0)})` })
          ]),
          el('div.lane-track', {}, [
            el('div.lane-seg.seg-g', { style: { flex: counts.G }, title: `Green Lane (Straight-Through): ${counts.G} claims (${fmt.pct(counts.G/t,0)}) — Auto-settled in minutes with ₹0 surveyor cost` }, [
              el('span', { text: `🟢 Straight-Through (${fmt.pct(counts.G/t, 0)})` })
            ]),
            el('div.lane-seg.seg-a', { style: { flex: counts.A }, title: `Amber Lane (Decision-Assisted): ${counts.A} claims (${fmt.pct(counts.A/t,0)}) — Evidence assembled, 1 reviewer sign-off` }, [
              el('span', { text: `🟡 Assisted Review (${fmt.pct(counts.A/t, 0)})` })
            ]),
            el('div.lane-seg.seg-r', { style: { flex: counts.R }, title: `Red Lane (Investigation / High Severity): ${counts.R} claims (${fmt.pct(counts.R/t,0)}) — ₹50k corridor or Gate 00 anomaly` }, [
              el('span', { text: `🔴 Complex (${fmt.pct(counts.R/t, 0)})` })
            ])
          ])
        ])
      ]),

      /* ---- what needs a person first ---- */
      UI.clus('What needs a person first', 'cust'),
      el('div.g-3', { id: 'cmdAttn' }, attention.map(a =>
        el('button.panel.lift', { 'data-dom': a.dom, type: 'button', 'data-f': a.k,
          style: { textAlign: 'left', cursor: 'pointer', font: 'inherit', width: '100%' } }, [
          el('div.spread', { style: { alignItems: 'flex-start' } }, [
            UI.metric({ dom: a.dom, size: 'sm', k: a.label, v: fmt.n(a.n), unit: 'claims' }),
            el('span.small', { style: { color: 'var(--ink-faint)' }, text: '→' })
          ]),
          el('div.small.muted', { style: { marginTop: 'var(--s-4)' }, text: a.sub })
        ]))),

      /* ---- the queue ---- */
      UI.clus('The queue', 'ops'),
      el('div.panel.rise.pad-0', { 'data-dom': 'ops' }, [
        el('div', { style: { padding: 'var(--s-6)' } }, [
          el('div.spread.wrap', { style: { gap: 'var(--s-5)' } }, [
            el('div.srch', { style: { flex: '1 1 240px', maxWidth: '340px' } }, [
              el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
                'stroke-width': '2', 'stroke-linecap': 'round' }, [
                el('circle', { cx: '11', cy: '11', r: '7' }),
                el('path', { d: 'M21 21l-4.35-4.35' })
              ]),
              el('input', { id: 'cmdQ', type: 'search', placeholder: 'Search claim, claimant, vehicle, city…',
                'aria-label': 'Search the queue' })
            ]),
            el('div.seg', { id: 'cmdSort' }, [['time', 'Newest'], ['risk', 'Lowest trust'], ['value', 'Largest value']]
              .map(([k, l]) => el('button', { type: 'button', 'data-s': k,
                'aria-pressed': String(k === sort), text: l })))
          ]),
          el('div.row.wrap', { id: 'cmdFilters', style: { marginTop: 'var(--s-5)' } },
            FILTERS.map(([k, l]) => el('button.gbtn', { type: 'button', 'data-f': k,
              'aria-pressed': String(k === filter), text: l }))),
          el('div.small.muted', { id: 'cmdCount', style: { marginTop: 'var(--s-5)' } })
        ]),
        el('div', { id: 'cmdTable', style: { maxHeight: '640px', overflow: 'auto' } })
      ])
    ]);

    $('#cmdFilters').addEventListener('click', e => {
      const b = e.target.closest('button[data-f]'); if (!b) return;
      setFilter(b.dataset.f);
    });
    $('#cmdAttn').addEventListener('click', e => {
      const b = e.target.closest('button[data-f]'); if (!b) return;
      setFilter(b.dataset.f);
      $('#cmdTable').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#cmdSort').addEventListener('click', e => {
      const b = e.target.closest('button[data-s]'); if (!b) return;
      sort = b.dataset.s;
      $$('#cmdSort button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      drawTable();
    });
    $('#cmdQ').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); drawTable(); });

    drawTable();
  }

  function setFilter(f) {
    filter = f;
    $$('#cmdFilters button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.f === f)));
    drawTable();
  }

  function drawTable() {
    const rows = CPClaims.all().filter(match).slice().sort((a, b) => {
      if (sort === 'risk') return (a.trust.score === null ? -1 : a.trust.score) - (b.trust.score === null ? -1 : b.trust.score);
      if (sort === 'value') return (b.money.payable || b.money.claimed || 0) - (a.money.payable || a.money.claimed || 0);
      return b.claim.reportedAt - a.claim.reportedAt;
    });
    $('#cmdCount').textContent = rows.length + (rows.length === 1 ? ' claim' : ' claims') +
      ' shown. Click any row for the full decision record.';

    mount($('#cmdTable'), [UI.dtable({
      cols: [
        { key: 'id', label: 'Claim', render: c => el('span', {}, [
          el('span.mono', { style: { fontWeight: 640, color: 'var(--accent)' }, text: c.claim.id }),
          el('div.sub', { text: since(c.claim.reportedAt) })
        ]) },
        { key: 'who', label: 'Claimant and vehicle', render: c => el('span', {}, [
          el('span', { style: { fontWeight: 580 }, text: c.claim.claimant }),
          el('div.sub', { text: `${c.claim.vehicle.make} ${c.claim.vehicle.model} · ${c.claim.vehicle.reg} · ${c.claim.city}` })
        ]) },
        { key: 'lane', label: 'Lane', render: c => el('span.row', { style: { gap: 'var(--s-3)' } }, [
          UI.dchip(c.laneMeta.label, c.lane === 'G' ? 'g' : c.lane === 'A' ? 'a' : 'r'),
          c.capped ? UI.dchip('cap', 'cust') : null,
          c.skipped ? UI.dchip('gate', 'risk') : null
        ]) },
        { key: 'trust', label: 'Trust', n: true, render: c => c.trust.score === null
          ? el('span', { style: { color: 'var(--ink-faint)' }, text: '—' })
          : el('span', {}, [
            el('span', { style: { fontWeight: 680,
              color: c.trust.score >= CPEngine.GREEN_FLOOR ? 'var(--lane-green)'
                   : c.trust.score >= CPEngine.AMBER_FLOOR ? 'var(--lane-amber)' : 'var(--lane-red)' },
              text: fmt.cr(c.trust.score, 1) }),
            UI.cbar(c.trust.score / 100,
              c.trust.score >= CPEngine.GREEN_FLOOR ? 'var(--dom-cap-grad)'
              : c.trust.score >= CPEngine.AMBER_FLOOR ? 'var(--dom-cust-grad)' : 'var(--dom-risk-grad)')
          ]) },
        { key: 'pay', label: 'Payable', n: true, render: c => el('span', {
          style: { fontWeight: 600 },
          text: c.money.payable === null ? '—' : '₹' + fmt.n(c.money.payable) }) },
        { key: 'tat', label: 'TAT', n: true, render: c => el('span', { text: fmt.cr(c.tat, 1) + ' d' }) }
      ],
      rows,
      onRow: c => { location.hash = '#/inspector?id=' + c.claim.id; },
      empty: 'No claim on this desk matches that.'
    })]);
  }

  function since(d) {
    const h = (Date.now() - +d) / 3600e3;
    if (h < 1) return Math.round(h * 60) + ' min ago';
    if (h < 48) return Math.round(h) + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }

  return { render };
})();
