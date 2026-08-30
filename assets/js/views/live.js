/* =====================================================================
   ClaimPulse · Live simulator
   ---------------------------------------------------------------------
   Press play and the book runs in front of you. Claims arrive at the
   modelled rate, each one is gated, scored and routed by the real
   engine, and the counters accumulate as they land.

   Two things this proves that a static screen cannot. First, the lane
   mix is emergent — nobody is dealing cards into three piles, the
   evidence decides and the shares settle where they settle. Second,
   benefit accrues per claim: the annual figure is this, multiplied by
   time, and you can watch it tick.

   Speed is a multiplier on real time, stated on screen, so nobody
   mistakes an accelerated demo for a throughput claim.
   ===================================================================== */

const ViewLive = (() => {
  const { el, mount, fmt, $, $$ } = CP;

  let running = false, timer = null;
  let speed = 2000;              // × real time
  let feed = [];                 // most recent first
  let n = 0, lanes = { G: 0, A: 0, R: 0 };
  let touches = 0, days = 0, benefit = 0, calls = 0, gateStops = 0, capped = 0;
  let elapsedMs = 0;
  let pool = [], pi = 0;
  let series = [];        // green-lane share, sampled — the convergence story

  const SPEEDS = [[600, '600×'], [2000, '2,000×'], [8000, '8,000×'], [30000, '30,000×']];

  function reset() {
    stop();
    feed = []; n = 0; lanes = { G: 0, A: 0, R: 0 };
    touches = days = benefit = calls = gateStops = capped = 0;
    elapsedMs = 0; pi = 0; series = [];
    pool = CPClaims.all().slice().sort(() => 0.5 - Math.random());
    paint();
  }

  function render(host) {
    const r = CPModel.run('base');
    pool = CPClaims.all().slice();
    const perYear = r.claims;
    const secondsPerClaim = (365 * 24 * 3600) / perYear;

    mount(host, [
      el('div.panel.hero.rise', { 'data-dom': 'ops' }, [
        el('div.spread.wrap', { style: { alignItems: 'flex-start', gap: 'var(--s-6)' } }, [
          el('div', { style: { minWidth: 0 } }, [
            el('p.eyebrow', { style: { margin: 0 }, text: 'Simulation · live book' }),
            el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
              'The book, ', el('span.grad-ink', { text: 'running.' })
            ]),
            el('div.row', { style: { marginTop: 'var(--s-4)' } }, [
              el('span.orb.idle', { id: 'lvDot' }),
              el('div', {}, [
                el('div.small', { style: { fontWeight: 640 }, id: 'lvStatus', text: 'Idle' }),
                el('div.xsmall', { style: { color: 'var(--ink-faint)' }, id: 'lvClock', text: '—' })
              ])
            ])
          ]),
          el('div.row.wrap', {}, [
            el('div.seg', { id: 'lvSpeed' }, SPEEDS.map(([v, l]) =>
              el('button', { type: 'button', 'data-v': v, 'aria-pressed': String(v === speed), text: l }))),
            el('button.btn', { id: 'lvReset', type: 'button', text: '↺ reset' }),
            el('button.btn.primary', { id: 'lvPlay', type: 'button' }, [
              el('span', { id: 'lvIcon', text: '▶' }),
              el('span', { id: 'lvLabel', text: 'Start the book' })
            ])
          ])
        ]),
        el('div', { id: 'lvTiles', style: { marginTop: 'var(--s-6)' } }),
        el('div', { id: 'lvArea', style: { marginTop: 'var(--s-5)', maxWidth: '760px' } }),
        el('div.xsmall', { style: { color: 'var(--ink-faint)', marginTop: 'var(--s-4)' },
          text: `At the Base plan the book files one Motor OD claim every ${fmt.n1(secondsPerClaim / 60)} minutes. Speed is a multiplier on real time — it is not a throughput claim.` })
      ]),

      UI.clus('Claims arriving', 'ops'),
      el('div.g-phi-r', { style: { alignItems: 'start' } }, [
        el('div.stack-6', {}, [
          el('div.panel.rise', { 'data-dom': 'ai' }, [
            el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
              text: 'Lane mix, as it settles' }),
            el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
              text: 'Nobody is dealing these into piles — the evidence decides each one.' }),
            el('div', { id: 'lvLanes' }),
            el('div', { id: 'lvLaneTbl', style: { marginTop: 'var(--s-5)' } })
          ]),
          el('div.panel.rise', { 'data-dom': 'fin' }, [
            el('h3', { style: { margin: '0 0 var(--s-2)', fontSize: 'var(--fs-md)' },
              text: 'What has accumulated' }),
            el('div.small.muted', { style: { marginBottom: 'var(--s-5)' },
              text: 'The annual figures are these, multiplied by time.' }),
            el('div', { id: 'lvAcc' })
          ])
        ]),
        el('div.panel.rise.pad-0', { 'data-dom': 'cust' }, [
          el('div', { style: { padding: 'var(--s-4) var(--s-6)', borderBottom: '1px solid var(--border)' } }, [
            el('div.spread', {}, [
              el('div.xsmall.muted', { style: { fontWeight: 700, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }, text: 'Claimant & Loss Details' }),
              el('div.xsmall.muted', { style: { fontWeight: 700, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }, text: 'Trust Score (0–100) & Settlement' })
            ])
          ]),
          el('div', { id: 'lvFeed', style: { maxHeight: '560px', overflowY: 'auto' } })
        ])
      ])
    ]);

    $('#lvPlay').addEventListener('click', () => running ? stop() : start());
    $('#lvReset').addEventListener('click', reset);
    $('#lvSpeed').addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      speed = +b.dataset.v;
      $$('#lvSpeed button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (running) { stop(); start(); }
    });
    paint();
  }

  function start() {
    running = true;
    const tick = () => {
      if (!running) return;
      step();
      timer = setTimeout(tick, 1000 / (speed / 100));
    };
    tick();
    paint();
  }

  function stop() {
    running = false;
    clearTimeout(timer);
    paint();
  }

  function step() {
    const claim = pool[pi % pool.length];
    pi++;
    const res = CPClaims.process(claim.claim.id);
    feed.unshift({ c: res, at: Date.now() });
    if (feed.length > 50) feed.pop();

    n++;
    lanes[res.lane]++;
    touches += (res.touchesToday || 7) - (res.touches || 0);
    days += (res.tatToday || 9.8) - (res.tat || 0);
    benefit += res.benefit || 0;
    if (res.modelCalls) calls += res.modelCalls;
    if (res.gate && res.gate.hardFail) gateStops++;
    if (res.capped) capped++;

    elapsedMs += (365 * 24 * 3600 * 1000) / CPModel.run('base').claims;
    series.push((lanes.G / n) * 100);
    if (series.length > 60) series.shift();

    paint();
  }

  function paint() {
    const r = CPModel.run('base');
    const t = Math.max(1, n);

    const ic = $('#lvIcon'), lb = $('#lvLabel'), dt = $('#lvDot'), st = $('#lvStatus');
    if (ic) ic.textContent = running ? '■' : '▶';
    if (lb) lb.textContent = running ? 'Pause the book' : n ? 'Resume the book' : 'Start the book';
    if (dt) dt.className = 'orb ' + (running ? 'busy' : n ? 'idle' : 'idle');
    if (st) st.textContent = running ? 'Streaming live claims…' : n ? 'Paused' : 'Idle · press start';

    /* tiles */
    mount($('#lvTiles'), [el('div.cells.c-4', {
      style: { border: '1px solid var(--hairline)', borderRadius: 'var(--r-3)' } }, [
      el('div.cell-x', {}, [UI.metric({ dom: 'ops', size: 'sm', k: 'Claims processed',
        v: fmt.n(n), unit: 'of ' + fmt.compact(r.claims),
        d: 'Seeded book of ' + pool.length + ' real claims, looped.' })]),
      el('div.cell-x', {}, [UI.metric({ dom: 'cap', size: 'sm', k: 'Green lane share',
        v: n ? fmt.pct(lanes.G / t, 1) : '—',
        d: 'Target ' + fmt.pct(CPModel.INPUTS.B03_green, 0) + '. Emergent from the claims themselves.' })]),
      el('div.cell-x', {}, [UI.metric({ dom: 'ops', size: 'sm', k: 'Touches avoided',
        v: fmt.compact(touches), unit: 'touches',
        d: 'Against 7 touches on the same claims today.' })]),
      el('div.cell-x', {}, [UI.metric({ dom: 'fin', size: 'sm', k: 'Net benefit accrued',
        v: '₹' + fmt.cr(benefit / 1e7, 3), unit: '₹ Cr',
        d: `Net annual benefit divided across ${fmt.compact(r.claims)} claims, accumulated one claim at a time.` })])
    ])]);

    /* Benefit accruing */
    if ($('#lvArea')) Charts.area($('#lvArea'), { points: series, height: 132,
      c1: 'var(--dom-cap)', c2: 'var(--dom-cap-2)', floor: CPModel.INPUTS.B03_green * 100,
      label: 'green-lane share, converging on the ' + fmt.pct(CPModel.INPUTS.B03_green, 0) + ' book design' });

    $('#lvClock').textContent = n
      ? `${fmtElapsed(elapsedMs)} of book time elapsed · ${fmt.n(n)} claims · ${fmt.n(calls)} generative call${calls === 1 ? '' : 's'}`
      : 'Press play. Claims will arrive at the modelled rate.';

    /* lane ribbon */
    if (n) {
      Charts.stack($('#lvLanes'), { segments: [
        { label: 'Green', value: lanes.G || 0.0001, color: 'var(--lane-green)', display: String(lanes.G) },
        { label: 'Amber', value: lanes.A || 0.0001, color: 'var(--lane-amber)', display: String(lanes.A) },
        { label: 'Red',   value: lanes.R || 0.0001, color: 'var(--lane-red)',   display: String(lanes.R) }
      ], height: 28 });
      const I = CPModel.INPUTS;
      mount($('#lvLaneTbl'), [UI.table(
        [{ label: 'Lane' }, { label: 'Live', n: true }, { label: 'Design', n: true }],
        [['G', lanes.G, I.B03_green], ['A', lanes.A, I.B04_amber], ['R', lanes.R, I.B05_red]]
          .map(([k, v, d]) => [
            { node: UI.laneChip(k) }, fmt.pct(v / t, 1), fmt.pct(d, 0)
          ]))]);
    } else {
      mount($('#lvLanes'), [el('p.small.faint', { text: 'Nothing has arrived yet.' })]);
      mount($('#lvLaneTbl'), []);
    }

    mount($('#lvAcc'), [UI.dtable({
      cols: [
        { key: 'k', label: 'Since you pressed play',
          tip: x => x.r ? ({ title: x.k, rows: [['Workbook ref', x.r], ['Value', x.v]] }) : null },
        { key: 'v', label: '', n: true, render: x => el('span', {
          style: { fontWeight: 680, color: x.c || 'var(--ink)' }, text: x.v }) }
      ],
      rows: [
        { k: 'Manual touches avoided', r: 'W-66', v: fmt.n(touches), c: 'var(--dom-cap)' },
        { k: 'Rejected at Gate 00', r: '', v: fmt.n(gateStops), c: 'var(--dom-risk)' },
        { k: 'Held by the ₹50,000 corridor', r: 'A-11', v: fmt.n(capped), c: 'var(--dom-cust)' },
        { k: 'Generative calls made', r: '', v: fmt.n(calls), c: 'var(--dom-ai)' },
        { k: '…and never made', r: '', v: fmt.n(n - calls), c: 'var(--dom-cap)' }
      ]
    })]);
    if (n > 20) $('#lvAcc').appendChild(UI.disc('Why the mix drifts and then settles',
      `<p>Early on the shares jump around, because ten claims cannot express a 65/25/10 design. By a few hundred they settle close to it — not because anything is being forced, but because the evidence distribution that produces those shares is the same one the book assumes.</p>
       <p>That is the honest version of a lane-mix claim: it is a property of the claims, not a setting on the dashboard.</p>`));

    /* feed with colored trust pills and explicit columns */
    mount($('#lvFeed'), feed.length ? feed.map(({ c, at }, i) => {
      const isGateFail = c.trust.score === null;
      const scoreTone = isGateFail ? 'r' : c.trust.score >= 82 ? 'g' : c.trust.score >= 55 ? 'a' : 'r';
      const scoreText = isGateFail ? 'Gate Stop' : `${fmt.cr(c.trust.score, 1)} / 100`;

      return el('a.feed-row' + (i === 0 ? '.pop' : ''), { href: '#/inspector?id=' + c.claim.id }, [
        el('span.lane-dot', { class: CPEngine.LANE_META[c.lane].cls }),
        el('div.grow', {}, [
          el('div.small', { style: { fontWeight: 600 }, text: c.claim.claimant }),
          el('div.xsmall.faint', { text: `${c.claim.vehicle.make} ${c.claim.vehicle.model} · ${c.claim.city}` })
        ]),
        el('div', { style: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' } }, [
          UI.dchip('Trust ' + scoreText, scoreTone),
          el('div.xsmall.faint', { style: { fontWeight: 600 }, text: c.money.payable === null ? 'Investigation queue' : '₹' + fmt.n(c.money.payable) + ' payable' })
        ])
      ]);
    }) : [el('p.small.faint', { style: { padding: 'var(--s-6)' }, text: 'The feed fills as claims arrive.' })]);
  }

  function fmtElapsed(ms) {
    const d = ms / 864e5;
    if (d < 1) return fmt.n1(d * 24) + ' hours';
    if (d < 60) return fmt.n1(d) + ' days';
    return fmt.n1(d / 30.44) + ' months';
  }

  return { render, stop };
})();
