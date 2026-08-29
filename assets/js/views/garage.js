/* =====================================================================
   ClaimPulse · Garage and surveyor
   ---------------------------------------------------------------------
   Rebuilt as an operations console rather than a wall of cards.

   The previous version put six garage cards, four KPI cards, a chart
   card and a table card on one screen and let the reader assemble the
   argument. This one is two consoles behind one switch, and each console
   is a single hierarchy: a headline row, a network table you sort and
   select, and the selected row's work list beside it.

   A garage cares about one thing: how long the bay is held. A surveyor
   cares about one thing: which visits are still mine. Everything on each
   console serves that question and nothing else is on it.
   ===================================================================== */

const ViewGarage = (() => {
  const { el, mount, fmt, $, $$ } = CP;

  let tab = 'garage';
  let selGarage = 'all';
  let selReason = 'all';
  let sortBy = 'jobs';

  function render(host) {
    const r = CPModel.run('base');

    mount(host, [
      el('div.spread.wrap', { style: { alignItems: 'flex-end', marginBottom: 'var(--s-6)' } }, [
        el('div', { style: { maxWidth: '52ch' } }, [
          el('p.eyebrow', { style: { margin: 0 }, text: 'Demo · garage and surveyor' }),
          el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
            'The repair network waits one day, ',
            el('span.grad-ink', { text: 'not four.' })
          ])
        ]),
        el('div.seg', { id: 'gaTab' }, [['garage', 'Garage console'], ['surveyor', 'Surveyor desk']]
          .map(([k, l]) => el('button', { type: 'button', 'data-t': k,
            'aria-pressed': String(k === tab), text: l })))
      ]),
      el('div', { id: 'gaView' })
    ]);

    $('#gaTab').addEventListener('click', e => {
      const b = e.target.closest('button[data-t]'); if (!b) return;
      tab = b.dataset.t;
      $$('#gaTab button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      draw(r);
    });

    draw(r);
  }

  function draw(r) {
    if (tab === 'garage') drawGarage(r); else drawSurveyor(r);
  }

  /* ==================================================================
     GARAGE CONSOLE
     ================================================================== */
  function drawGarage(r) {
    const all = CPClaims.all().filter(c => !c.skipped);
    const byG = {};
    Object.values(CPClaims.GARAGES).forEach(g => byG[g.code] = { g, jobs: [] });
    all.forEach(c => { if (byG[c.claim.garage.code]) byG[c.claim.garage.code].jobs.push(c); });
    const list = Object.values(byG).sort((a, b) =>
      sortBy === 'over' ? over(b.jobs) - over(a.jobs)
      : sortBy === 'value' ? value(b.jobs) - value(a.jobs)
      : b.jobs.length - a.jobs.length);

    const jobs = selGarage === 'all' ? all : (byG[selGarage] ? byG[selGarage].jobs : all);
    const sel = selGarage === 'all' ? null : byG[selGarage];
    const median = list.map(x => x.jobs.length).sort((a, b) => a - b)[Math.floor(list.length / 2)];

    mount($('#gaView'), [

      /* ---- the headline: bay time, which is the whole argument ---- */
      el('div.panel.hero.rise', { 'data-dom': 'cust' }, [
        el('div.g-phi', { style: { alignItems: 'center', gap: 'var(--s-7)' } }, [
          el('div', { id: 'gaBeam' }),
          el('div.cells.c-1', { style: { border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-4)' } }, [
            el('div.cell-x', {}, [UI.metric({ dom: 'cap', size: 'sm', k: 'Bay-days returned',
              ref: 'W-73', v: fmt.n(jobs.length * r.garageDaysSaved), unit: 'days',
              d: 'On this desk alone. At book scale it is ' + fmt.compact(r.claims * r.garageDaysSaved) + ' a year.' })]),
            el('div.cell-x', {}, [UI.metric({ dom: 'ops', size: 'sm', k: 'Jobs on this console',
              v: fmt.n(jobs.length), unit: 'claims',
              d: sel ? sel.g.name : 'Across all six network garages.' })]),
            el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'risk', size: 'sm',
              k: 'Estimates above band', v: fmt.n(over(jobs)), unit: 'of ' + jobs.length,
              d: 'The excess is disallowed, not the claim. The garage sees the band before it quotes.' })])
          ])
        ])
      ]),

      /* ---- the network, as a table ---- */
      UI.clus('The network', 'ops',
        el('div.seg', { id: 'gaSort' }, [['jobs', 'Volume'], ['over', 'Above band'], ['value', 'Value']]
          .map(([k, l]) => el('button', { type: 'button', 'data-s': k,
            'aria-pressed': String(k === sortBy), text: l })))),
      el('div.panel.rise.pad-0', { 'data-dom': 'ops' }, [
        UI.dtable({
          cols: [
            { key: 'g', label: 'Garage', render: x => el('span', {}, [
              el('span', { style: { fontWeight: 620,
                color: x.code === selGarage ? 'var(--accent)' : 'var(--ink)' },
                text: x.name }),
              el('div.sub', { text: x.code + ' · ' + x.city }) ]) },
            { key: 'tier', label: 'Tier', render: x => UI.dchip(x.tier.toLowerCase(),
              x.tier === 'Preferred' ? 'cap' : 'ops') },
            { key: 'rating', label: 'Rating', n: true, render: x => el('span', {
              style: { fontWeight: 620, color: x.rating >= 4.3 ? 'var(--lane-green)'
                : x.rating >= 3.8 ? 'var(--ink)' : 'var(--lane-amber)' },
              text: x.rating.toFixed(1) }) },
            { key: 'jobs', label: 'Jobs', n: true, render: x => el('span', {}, [
              el('span', { style: { fontWeight: 680 }, text: String(x.jobs) }),
              UI.cbar(x.jobs / Math.max(...list.map(y => y.jobs.length)),
                x.jobs > median * 1.5 ? 'var(--dom-risk-grad)' : 'var(--dom-ops-grad)')
            ]) },
            { key: 'over', label: 'Above band', n: true, render: x => x.over
              ? UI.dchip(String(x.over), 'risk') : el('span', { style: { color: 'var(--ink-faint)' }, text: '—' }) },
            { key: 'val', label: 'Value', n: true, render: x => el('span', {
              text: '₹' + fmt.n(x.val) }) },
            { key: 'flag', label: '', render: x => (x.code !== 'all' && x.jobs > median * 1.5)
              ? el('span.small', { style: { color: 'var(--lane-amber)' }, text: 'watched by the fraud graph' })
              : el('span') }
          ],
          rows: [{ code: 'all', name: 'All network garages', city: 'six locations', tier: 'Network',
                   rating: 4.2, jobs: all.length, over: over(all), val: value(all) }]
            .concat(list.map(x => ({ code: x.g.code, name: x.g.name, city: x.g.city,
              tier: x.g.tier, rating: x.g.rating, jobs: x.jobs.length,
              over: over(x.jobs), val: value(x.jobs) }))),
          selected: x => x.code === selGarage,
          onRow: x => { selGarage = x.code; drawGarage(r); }
        })
      ]),

      /* ---- the work list for whatever is selected ---- */
      UI.clus(sel ? 'The queue at ' + sel.g.name : 'The queue, as a garage sees it', 'cust'),
      el('div.panel.rise.pad-0', { 'data-dom': 'cust' }, [
        el('div', { style: { padding: 'var(--s-6)' } }, [
          el('div.small.muted', { text: 'Every job arrives with an indicative band already attached, returned at first notification. A garage no longer waits to be told what it may spend.' })
        ]),
        el('div', { style: { maxHeight: '520px', overflow: 'auto' } }, [
          UI.dtable({
            cols: [
              { key: 'c', label: 'Claim', render: c => el('span', {}, [
                el('span.mono', { style: { color: 'var(--accent)', fontWeight: 640 }, text: c.claim.id }),
                el('div.sub', { text: c.claim.claimant + ' · ' + c.claim.city }) ]) },
              { key: 'v', label: 'Vehicle', render: c => el('span', {}, [
                el('span', { style: { fontWeight: 580 }, text: c.claim.vehicle.make + ' ' + c.claim.vehicle.model }),
                el('div.sub', { text: c.claim.vehicle.reg }) ]) },
              { key: 'b', label: 'Indicative band', n: true, render: c => el('span', {
                style: { fontVariantNumeric: 'tabular-nums' },
                text: '₹' + fmt.n(c.repair.band[0]) + '–' + fmt.n(c.repair.band[1]) }) },
              { key: 'e', label: 'Estimate', n: true, render: c => el('span', {
                style: { fontWeight: 660, color: c.repair.over ? 'var(--lane-red)' : 'var(--ink)' },
                text: '₹' + fmt.n(c.repair.garageEstimate) }) },
              { key: 's', label: 'Status', render: c => c.repair.over
                ? UI.dchip('above band', 'r') : UI.dchip('in band', 'g') },
              { key: 'a', label: 'Next action', render: c => el('span.small.muted', {
                text: c.repair.over ? 'Excess disallowed — re-quote or justify'
                    : c.lane === 'G' ? 'Approved. Start the repair.'
                    : c.surveyor.required ? 'Hold the bay for the surveyor slot'
                    : 'Awaiting one reviewer' }) }
            ],
            rows: jobs,
            onRow: c => { location.hash = '#/inspector?id=' + c.claim.id; },
            empty: 'No open jobs at this garage.'
          })
        ])
      ]),

      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.disc('Why estimate-to-approval can fall at all',
          `<p>The repair cost engine returns a band at first notification rather than after a physical inspection, so the garage knows what it may spend before it starts. Estimate-to-approval falls from ${CPModel.INPUTS.J06_garageToday} days to ${CPModel.INPUTS.J07_garageAfter}. A bay held for an unapproved job earns nothing; ${r.garageDaysSaved} days a job across a national panel is real money to people who are not the insurer.</p>`)
      ])
    ]);

    Charts.beam($('#gaBeam'), {
      from: CPModel.INPUTS.J06_garageToday, to: CPModel.INPUTS.J07_garageAfter,
      unit: 'days waiting', fromLabel: 'today', toLabel: 'on ClaimPulse',
      c1: 'var(--dom-risk)', c2: 'var(--dom-cap)', height: 150
    });

    $('#gaSort').addEventListener('click', e => {
      const b = e.target.closest('button[data-s]'); if (!b) return;
      sortBy = b.dataset.s; drawGarage(r);
    });
  }

  const over  = js => js.filter(c => c.repair && c.repair.over).length;
  const value = js => js.reduce((s, c) => s + (c.repair ? c.repair.garageEstimate : 0), 0);

  /* ==================================================================
     SURVEYOR DESK
     ================================================================== */
  function drawSurveyor(r) {
    const all = CPClaims.all();
    const need = all.filter(c => c.surveyor.required);
    const REASONS = [
      ['all',      'Everything',            () => true],
      ['red',      'Red lane',              c => c.lane === 'R'],
      ['corridor', 'Above the corridor',    c => c.surveyor.above],
      ['gate',     'Gate 00 rejection',     c => c.skipped]
    ];
    const pred = (REASONS.find(x => x[0] === selReason) || REASONS[0])[2];
    const rows = need.filter(pred);

    mount($('#gaView'), [

      el('div.panel.hero.rise', { 'data-dom': 'ops' }, [
        el('div.g-phi', { style: { alignItems: 'center', gap: 'var(--s-7)' } }, [
          el('div', { id: 'gaGauge' }),
          el('div.cells.c-1', { style: { border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-4)' } }, [
            el('div.cell-x', {}, [UI.metric({ dom: 'cap', size: 'sm', k: 'Visits avoided a year',
              ref: 'W-72', v: fmt.compact(r.visitsAvoided),
              d: 'All below ₹50,000, where the evidence already resolved the claim.' })]),
            el('div.cell-x', {}, [UI.metric({ dom: 'ops', size: 'sm', k: 'Still surveyed',
              ref: 'W-71', v: fmt.compact(r.surveyAfter), unit: 'a year',
              d: 'Red lane, large losses and disputed assessments. The work where judgement was always the point.' })]),
            el('div.cell-x', { style: { borderBottom: 0 } }, [UI.metric({ dom: 'cust', size: 'sm',
              k: 'On this desk', v: fmt.n(need.length), unit: 'of ' + all.length,
              d: 'Claims on the demo desk that still require a registered surveyor.' })])
          ])
        ])
      ]),

      UI.clus('Why each visit is still required', 'cust',
        el('div.seg', { id: 'gaWhy' }, REASONS.map(([k, l]) =>
          el('button', { type: 'button', 'data-w': k,
            'aria-pressed': String(k === selReason), text: l })))),

      el('div.panel.rise.pad-0', { 'data-dom': 'cust' }, [
        el('div', { style: { padding: 'var(--s-6)' } }, [
          el('div.small.muted', { text: rows.length + ' claim' + (rows.length === 1 ? '' : 's') +
            ' on this filter. The surveyor arrives to an assembled file, not an empty one — which is the whole change to their day.' })
        ]),
        el('div', { style: { maxHeight: '560px', overflow: 'auto' } }, [
          UI.dtable({
            cols: [
              { key: 'c', label: 'Claim', render: c => el('span', {}, [
                el('span.mono', { style: { color: 'var(--accent)', fontWeight: 640 }, text: c.claim.id }),
                el('div.sub', { text: c.claim.claimant + ' · ' + c.claim.city }) ]) },
              { key: 'l', label: 'Lane', render: c => UI.dchip(c.laneMeta.label,
                c.lane === 'G' ? 'g' : c.lane === 'A' ? 'a' : 'r') },
              { key: 'a', label: 'Amount', n: true, render: c => el('span', {
                style: { fontWeight: 620 },
                text: '₹' + fmt.n(c.money.payable === null ? c.money.claimed : c.money.payable) }) },
              { key: 'w', label: 'Why a surveyor', render: c => el('span.small.muted', { text: c.surveyor.basis }) },
              { key: 'p', label: 'Prepared for them', render: c => el('span.row', { style: { gap: 'var(--s-3)' } },
                c.skipped
                  ? [UI.dchip('gate report', 'risk')]
                  : [UI.dchip(c.cv.parts.length + ' panels', 'ops'),
                     UI.dchip('band', 'fin'),
                     c.fraud.ringFail ? UI.dchip('ring', 'risk') : null]) }
            ],
            rows,
            onRow: c => { location.hash = '#/inspector?id=' + c.claim.id; },
            empty: 'No claim on this desk matches that reason.'
          })
        ])
      ]),

      el('div', { style: { marginTop: 'var(--s-6)' } }, [
        UI.disc('Surveyors move up, not out',
          `<p>The ${fmt.compact(r.visitsAvoided)} visits avoided are visits to claims below ₹50,000 that the evidence had already resolved. What remains — the red lane, the large losses, the disputed assessments — is the work where a surveyor's judgement was always the point.</p>
           <p>This is the same argument as W-22a, applied to a different group of people: capacity is redeployed to where judgement matters, not removed.</p>`,
          { open: true })
      ])
    ]);

    Charts.gaugebar($('#gaGauge'), { rows: [
      { label: 'Surveyed today', value: r.surveyToday, max: r.surveyToday * 1.12,
        display: fmt.compact(r.surveyToday), c1: 'var(--dom-risk)', c2: 'var(--dom-risk-2)' },
      { label: 'Surveyed on ClaimPulse', value: r.surveyAfter, max: r.surveyToday * 1.12,
        display: fmt.compact(r.surveyAfter), c1: 'var(--dom-cap)', c2: 'var(--dom-cap-2)' },
      { label: 'Visits avoided', value: r.visitsAvoided, max: r.surveyToday * 1.12,
        display: fmt.compact(r.visitsAvoided), c1: 'var(--dom-ops)', c2: 'var(--dom-ops-2)' }
    ], height: 148 });

    $('#gaWhy').addEventListener('click', e => {
      const b = e.target.closest('button[data-w]'); if (!b) return;
      selReason = b.dataset.w; drawSurveyor(r);
    });
  }

  return { render };
})();
