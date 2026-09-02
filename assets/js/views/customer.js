/* =====================================================================
   ClaimPulse · The customer's app
   ---------------------------------------------------------------------
   Eight steps, one thumb, at the roadside.

   THE HARD RULE THIS SCREEN EXISTS TO DEMONSTRATE: capture is LIVE ONLY.
   There is no gallery button anywhere in this flow — not hidden, not
   discouraged, absent — because a gallery upload silently destroys the
   metadata forensics Gate 00 depends on. Everything downstream assumes
   that rule held, so the rule cannot be optional.
   ===================================================================== */

const ViewCustomer = (() => {
  const { el, mount, fmt, $ } = CP;

  const SHOTS = [
    { n: 'Front three-quarter', guide: 'Stand about 3 m back. Fit the whole vehicle inside the frame',
      reads: 'Vehicle identity · make, model and colour matched to the policy' },
    { n: 'The damage',          guide: 'Move in close. Fill the frame with the damaged area',
      reads: 'Damage extent · panels, depth and whether it fits the reported cause' },
    { n: 'Chassis plate',       guide: 'Open the bonnet. Frame the chassis plate squarely',
      reads: 'Registration and VIN · resolved against VAHAN' },
    { n: 'Odometer',            guide: 'Ignition on. Capture the odometer and dash cluster',
      reads: 'Odometer · usage sense-checked against the policy record' }
  ];

  const STEPS = ['Sign in', 'Vehicle', 'What happened', 'Where and when',
                 'Live capture', 'Analysis', 'Outcome', 'Tracker'];

  let step = 0, shot = 0, pickId = null;

  /* Three vehicles, three genuinely different outcomes. The old version
     had this and it mattered: a demo that only ever shows the happy path
     is not a demo of a routing engine, it is a screenshot. */
  const CARS = () => {
    const st = CPClaims.stories();
    return [
      { res: st[0], tag: 'settles itself' },
      { res: st[1], tag: 'needs a surveyor' },
      { res: st[2], tag: 'evidence rejected' }
    ];
  };
  const claim = () => CPClaims.byId(pickId) || CPClaims.stories()[0];

  function render(host) {
    mount(host, [
      el('div.spread.wrap', { style: { alignItems: 'flex-end', marginBottom: 'var(--s-6)' } }, [
        el('div', { style: { maxWidth: '52ch' } }, [
          el('p.eyebrow', { style: { margin: 0 }, text: 'Policyholder Interface · Zero-Trust Hardware-Attested FNOL' }),
          el('h1', { style: { fontSize: 'var(--fs-xl)', margin: 'var(--s-3) 0 0' } }, [
            'Zero-Trust Roadside Intake: ',
            el('span.grad-ink', { text: 'Sub-minute evidentiary verification & STP settlement' })
          ])
        ]),
        el('div.row', {}, [
          el('span.orb'),
          el('span.small.muted', { text: 'Hardware-attested live camera capture · zero gallery injection' })
        ])
      ]),

      /* the sticky step rail / quick access panel — frozen on scroll */
      el('div.sticky-step-bar', { style: {
        position: 'sticky', top: 'var(--topbar-h)', zIndex: 30,
        background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: 'var(--s-3) 0 var(--s-4)', marginBottom: 'var(--s-5)',
        borderBottom: '1px solid var(--border)'
      } }, [
        el('div.stages', { id: 'cuSteps' })
      ]),

      el('div.g-phi-r', { style: { alignItems: 'start' } }, [

        /* ---- the handset ---- */
        el('div.panel.rise', { 'data-dom': 'cust', style: { alignSelf: 'start',
          position: 'sticky', top: 'calc(var(--topbar-h) + 76px)' } }, [
          el('div.spread', { style: { marginBottom: 'var(--s-5)' } }, [
            el('div.small.muted', { id: 'cuStepName' }),
            el('button.gbtn', { id: 'cuRestart', type: 'button', text: '↺' })
          ]),
          el('div', { style: { display: 'flex', justifyContent: 'center' } }, [
            el('div.phone', {}, [
              el('div.phone-screen', {}, [
                el('div.phone-notch'),
                el('div.phone-status', {}, [
                  el('span', { text: '9:41' }),
                  el('span', { text: 'ClaimPulse' })
                ]),
                el('div.phone-body', { id: 'cuBody' }),
                el('div.phone-foot', { id: 'cuFoot' })
              ])
            ])
          ])
        ]),

        /* ---- what the system understands, live ---- */
        el('div.stack-6', {}, [
          el('div.panel.rise', { 'data-dom': 'ai' }, [
            el('div.spread.wrap', { style: { marginBottom: 'var(--s-5)' } }, [
              el('div', {}, [
                el('h3', { style: { margin: 0, fontSize: 'var(--fs-md)' },
                  text: 'Live Telemetry & Evidentiary Knowledge Graph' }),
                el('div.small.muted', { style: { marginTop: 'var(--s-2)' },
                  text: 'Progressive extraction of policy parameters, VAHAN records, and damage keyframes' })
              ]),
              el('span.dchip', { id: 'cuProgChip', 'data-dom': 'ai', text: '0%' })
            ]),
            el('div', { id: 'cuIntel' })
          ]),
          el('div.panel.rise', { 'data-dom': 'ops' }, [
            el('div', { id: 'cuBehind' })
          ]),
          el('div.panel.rise', { 'data-dom': 'risk' }, [
            el('h3', { style: { margin: '0 0 var(--s-5)', fontSize: 'var(--fs-md)' },
              text: 'Zero-Trust Protocol & Conservative Friction Constraint' }),
            UI.disc('Live capture only — why the gallery button does not exist',
              '<p>Every frame is taken inside our SDK, with EXIF, timestamp and GPS written at the moment of capture and signed. A gallery upload cannot carry that, so the gate would have nothing to verify. The button does not exist rather than being discouraged.</p>',
              { open: true }),
            UI.disc('And it costs us ' + UI.money(Math.abs(CPModel.run('base').lines.frictionCost)) + ' a year',
              `<p>${fmt.pct(CPModel.INPUTS.B20_friction, 0)} of honest claimants — an older phone, an indoor car park, GPS switched off — cannot complete live capture and drop from the green lane to amber. That is W-23, and it is subtracted before the headline benefit rather than footnoted.</p>`,
              { chip: 'W-23' })
          ])
        ])
      ]),
      el('div.card', { style: { marginTop: 'var(--s-6)', textAlign: 'center', width: '100%' } }, [
        el('div.eyebrow', { text: 'Customer Mobile App' }),
        el('h3', { text: 'Install the Customer App', style: { margin: 'var(--s-1) 0 var(--s-2)' } }),
        el('div.small.muted', { text: 'Scan to open the claimant app on your phone · add to home screen to install' }),
        el('hr', { style: { margin: 'var(--s-3) 0', border: 'none', borderTop: '1px solid var(--border)' } }),
        el('img', { src: 'assets/apk-qr.png', alt: 'QR code to open the ClaimPulse customer app', style: { width: '160px', height: '160px', borderRadius: 'var(--r-sm)', margin: 'var(--s-1) 0' } }),
        el('hr', { style: { margin: 'var(--s-3) 0', border: 'none', borderTop: '1px solid var(--border)' } }),
        el('a.btn.ghost', { href: 'app/', target: '_blank', rel: 'noopener', text: 'Open the Customer App', style: { display: 'inline-block' } })
      ])
    ]);

    draw();
    $('#cuSteps').addEventListener('click', e => {
      const d = e.target.closest('[data-i]'); if (!d) return;
      step = +d.dataset.i; shot = step > 4 ? SHOTS.length : 0; draw();
    });
    $('#cuRestart').addEventListener('click', () => { step = 0; shot = 0; pickId = null; draw(); });
  }

  function nav(backLabel, nextLabel, onNext) {
    return [
      step > 0 ? el('button.phone-ghost', { type: 'button', text: backLabel || 'Back',
        onclick: () => { step = Math.max(0, step - 1); draw(); } }) : null,
      el('button.phone-cta', { type: 'button', style: { flex: '1 1 auto' }, text: nextLabel,
        onclick: onNext || (() => { step = Math.min(STEPS.length - 1, step + 1); draw(); }) })
    ];
  }

  function draw() {
    const res = claim(), c = res.claim;
    const body = $('#cuBody'), foot = $('#cuFoot');
    $('#cuStepName').textContent = `Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`;

    mount($('#cuSteps'), STEPS.map((s, i) =>
      el('div.stage' + (i === step ? '.act' : i < step ? '.done' : ''),
        { 'data-i': i, style: { cursor: 'pointer' }, role: 'button', tabindex: '0' }, [
        el('div.s-n', { text: String(i + 1).padStart(2, '0') }),
        el('div.s-t', { text: s })
      ])));

    const B = [];
    switch (step) {
      case 0:
        B.push(el('div.phone-title', { text: 'Welcome back, Priya' }),
          el('div.phone-sub', { text: 'Signed in with the policy on your Bajaj account. We already know your vehicle, your cover and your garage preferences — so we will not ask for any of it' }),
          el('div.phone-field', {}, [el('div.lab', { text: 'Policy' }), el('div.val', { text: c.policy.no })]),
          el('div.phone-field', {}, [el('div.lab', { text: 'Cover' }), el('div.val', { text: 'Own Damage · zero-depreciation add-on' })]));
        mount(foot, nav(null, 'Start a claim'));
        break;

      case 1:
        B.push(el('div.phone-title', { text: 'Which vehicle?' }),
          el('div.phone-sub', { text: 'Three cars on this policy — and three different journeys from here. Pick one and the engine routes it on its own evidence' }),
          ...CARS().map(({ res: rr, tag }) => {
            const on = rr.claim.id === claim().claim.id;
            const f = el('div.phone-field', {
              style: Object.assign({ cursor: 'pointer' },
                on ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}) }, [
              el('div.lab', { text: `${rr.claim.vehicle.make} ${rr.claim.vehicle.year}` }),
              el('div.val', { text: rr.claim.vehicle.model }),
              el('div.phone-sub', { style: { marginTop: '4px' }, text: rr.claim.vehicle.reg + ' · ' + tag })
            ]);
            f.addEventListener('click', () => { pickId = rr.claim.id; shot = 0; draw(); });
            return f;
          }),
          el('div.phone-sub', { text: 'Registration is confirmed against VAHAN in the background. If it does not resolve, we ask here rather than three days later' }));
        mount(foot, nav(null, 'Continue'));
        break;

      case 2:
        B.push(el('div.phone-title', { text: 'What happened?' }),
          el('div.phone-sub', { text: 'Pick the closest description. A directed form rather than a free-text box — it is faster for you, and it removes an entire extraction step for us' }),
          ...['Parked-vehicle damage', 'Collision with another vehicle', 'Hit an object or kerb',
              'Weather or falling debris', 'Theft or attempted theft']
            .map(t => el('div.phone-field', {
              style: t === c.cause ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}
            }, [el('div.val', { style: { fontSize: 'var(--fs-sm)' }, text: t })])));
        mount(foot, nav(null, 'Continue'));
        break;

      case 3:
        B.push(el('div.phone-title', { text: 'Where and when?' }),
          el('div.phone-field', {}, [el('div.lab', { text: 'Location' }),
            el('div.val', { text: c.city }), el('div.phone-sub', { style: { marginTop: '4px' }, text: 'Taken from your handset. You can move the pin' })]),
          el('div.phone-field', {}, [el('div.lab', { text: 'When' }),
            el('div.val', { text: 'Today, 08:40' })]),
          el('div.phone-sub', { text: 'Both are recorded now so the capture that follows can be checked against them. If the photographs were taken somewhere else, or before this, the gate will say so' }));
        mount(foot, nav(null, 'Continue to capture'));
        break;

      case 4: {
        const s4 = SHOTS[Math.min(shot, SHOTS.length - 1)];
        const done = shot >= SHOTS.length;
        B.push(el('div.phone-title', { text: done ? 'All four captured' : s4.n }),
          el('div.viewfinder' + (done ? '' : ' live'), {}, [
            el('div.frame'),
            el('div', { style: { color: 'rgba(255,255,255,.62)', fontSize: '11px',
              fontWeight: 700, letterSpacing: '.12em' }, text: done ? '✓ SIGNED' : '● LIVE' }),
            el('div.hint', { text: done ? 'Ready to submit' : s4.guide })
          ]),
          /* the checklist the claimant can see filling up */
          el('div.stack-3', { style: { marginTop: 'var(--s-4)' } }, SHOTS.map((sh, i) =>
            el('div.chk' + (i < shot ? '.on' : i === shot ? '.now' : ''), {}, [
              el('span.cbox', { text: i < shot ? '✓' : i === shot ? '◉' : '○' }),
              el('span', { text: sh.n }),
              i < shot ? el('span.ctag', { text: 'signed' }) : null
            ]))),
          el('div.phone-sub', { style: { textAlign: 'center', marginTop: 'var(--s-3)' },
            text: done ? 'Four frames, each signed at the moment of capture.'
                       : 'Frame ' + (shot + 1) + ' of ' + SHOTS.length + ' · EXIF, GPS and timestamp written now' }));
        mount(foot, [
          el('button.phone-ghost', { type: 'button', text: 'Back',
            onclick: () => { if (shot > 0) shot--; else step--; draw(); } }),
          el('button.phone-cta', { type: 'button', style: { flex: '1 1 auto' },
            text: done ? 'Submit claim' : 'Capture',
            onclick: () => { if (shot < SHOTS.length) shot++; else step++; draw(); } })
        ]);
        break;
      }

      case 5:
        B.push(el('div.phone-title', { text: 'Checking your evidence' }),
          el('div.phone-sub', { text: 'This takes seconds, not days. You can close the app — we will message you' }),
          ...[['Capture integrity', 'six checks on the raw frames'],
              ['Documents and VAHAN', 'registration, chassis, odometer'],
              ['Damage assessment', `${res.cv.parts.length} panels identified`],
              ['Fraud and duplicate graph', 'network checked'],
              ['Your policy wording', 'cover and add-ons read']]
            .map(([t, d]) => el('div.engine-run', {}, [
              el('span.dot'),
              el('div', {}, [
                el('div', { style: { fontWeight: 620, color: 'var(--ink)' }, text: t }),
                el('div.phone-sub', { text: d })
              ])
            ])));
        mount(foot, nav(null, 'See the outcome'));
        break;

      case 6: {
        /* Three genuinely different customer experiences, not one screen
           with the word changed. What a claimant is told, and what they
           are asked to do next, is different in each lane. */
        const O = {
          G: { icon: '✓', tone: 'var(--lane-green)', title: 'Approved',
               sub: 'Settled without a single manual review',
               next: ['Money reaches your account within 24 hours',
                      'Your garage already has the approval',
                      'Nothing further is needed from you'] },
          A: { icon: '◐', tone: 'var(--lane-amber)', title: 'Almost there',
               sub: res.capped
                 ? 'Everything checked out. Because the amount is above ₹50,000, a registered surveyor has to confirm it — that is a regulatory requirement, not a doubt about your claim.'
                 : 'Your claim needs one quick human review before we can settle it',
               next: ['A surveyor visit is being booked now',
                      'You will get the slot on this screen, not by phone',
                      'Expected decision in about ' + fmt.cr(res.tat, 1) + ' days'] },
          R: { icon: '!', tone: 'var(--lane-red)', title: 'We need to look more closely',
               sub: res.skipped
                 ? 'The photographs could not be verified. This usually means they were not taken live in the app — please re-capture them from the vehicle.'
                 : 'Your claim needs additional verification before we can decide',
               next: res.skipped
                 ? ['Re-open the claim and capture the four shots live',
                    'Photographs from your camera roll cannot be verified',
                    'Nothing is rejected — we just need usable evidence']
                 : ['A specialist is reviewing the file',
                    'You may be asked for one more document',
                    'You will hear from a named person, not a queue'] }
        }[res.lane];

        B.push(
          el('div', { style: { textAlign: 'center', padding: 'var(--s-5) 0 var(--s-3)' } }, [
            el('div', { style: { fontSize: '34px', color: O.tone }, text: O.icon }),
            el('div.phone-title', { style: { marginTop: 'var(--s-3)' }, text: O.title }),
            el('div.phone-sub', { text: O.sub })
          ]));

        if (res.money.payable !== null) {
          B.push(el('div.phone-field', { style: { borderColor: O.tone } }, [
            el('div.lab', { text: res.lane === 'G' ? 'Amount payable' : 'Indicative amount' }),
            el('div.val', { style: { fontSize: 'var(--fs-lg)' }, text: '₹' + fmt.n(res.money.payable) })]),
            el('div.phone-field', {}, [el('div.lab', { text: 'Assessed base' }),
              el('div.val', { text: '₹' + fmt.n(res.money.assessedBase) })]),
            el('div.phone-field', {}, [el('div.lab', { text: 'Depreciation' }),
              el('div.val', { text: res.money.zeroDep ? '₹0 · zero-dep add-on' : '₹' + fmt.n(res.money.depreciation) })]));
        }
        B.push(el('div.phone-sub', { style: { fontWeight: 640, color: 'var(--ink)' }, text: 'What happens next' }),
          ...O.next.map(t => el('div.engine-run', {}, [
            el('span.dot', { style: { background: O.tone } }),
            el('div', { text: t })])));
        mount(foot, nav(null, 'Track it'));
        break;
      }

      case 7:
        B.push(el('div.phone-title', { text: 'Your claim' }),
          el('div.phone-sub', { text: c.id }),
          ...res.timeline.map((t, i) => el('div.engine-run', {}, [
            el('span.dot', { style: { background: i <= 2 ? 'var(--lane-green)' : 'var(--border-strong)' } }),
            el('div', {}, [
              el('div', { style: { fontWeight: 620, color: 'var(--ink)' }, text: t.t }),
              el('div.phone-sub', { text: t.at.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })
            ])
          ])),
          el('div.phone-sub', { style: { marginTop: 'var(--s-3)' },
            text: 'Status is pushed to you. The average claimant checks a status page 2.5 times before giving up and calling — this removes the reason to check at all' }));
        mount(foot, [
          el('button.phone-ghost', { type: 'button', text: 'Back', onclick: () => { step--; draw(); } }),
          el('button.phone-cta', { type: 'button', style: { flex: '1 1 auto' }, text: 'Start again',
            onclick: () => { step = 0; shot = 0; draw(); } })
        ]);
        break;
    }
    mount(body, B);
    drawIntel();
    drawBehind();
  }

  /* ------------------------------------------------------------------
     The running understanding. This is the answer to "what is the AI
     actually doing" — a checklist that fills as the claimant moves, so
     the intelligence is visible rather than asserted.
     ------------------------------------------------------------------ */
  function drawIntel() {
    const res = claim(), c = res.claim;
    const shotsDone = step > 4 ? SHOTS.length : (step === 4 ? shot : 0);

    const items = [
      { t: 'Policy and cover', on: step >= 0,
        v: step >= 0 ? c.policy.no + ' · Own Damage' + (c.policy.zeroDep ? ' · zero-dep' : '') : null,
        src: 'known before the claim started' },
      { t: 'Vehicle identity', on: step >= 1,
        v: step >= 1 ? c.vehicle.make + ' ' + c.vehicle.model + ' · ' + c.vehicle.reg : null,
        src: 'policy record, confirmed against VAHAN' },
      { t: 'Cause of loss', on: step >= 2, v: step >= 2 ? c.cause : null,
        src: 'directed form — no free text to parse' },
      { t: 'Place and time', on: step >= 3, v: step >= 3 ? c.city + ' · today, 08:40' : null,
        src: 'handset location and clock, declared up front' },
      ...SHOTS.map((sh, i) => ({ t: sh.n, on: shotsDone > i,
        v: shotsDone > i ? sh.reads : null, src: 'signed at capture · EXIF, GPS, timestamp',
        pending: step === 4 && shot === i })),
      { t: 'Gate 00 verdict', on: step >= 5,
        v: step >= 5 ? (res.gate.hardFail ? 'REJECTED · ' + (res.gate.checks.filter(x => !x.ok)[0] || {}).label
                                          : res.gate.passed + ' of ' + res.gate.total + ' integrity checks clear') : null,
        src: 'six forensic checks on the raw frames' },
      { t: 'Trust Score and lane', on: step >= 6,
        v: step >= 6 ? (res.skipped ? 'no score — the gate stopped it'
                                    : fmt.cr(res.trust.score, 1) + ' · ' + res.laneMeta.label) : null,
        src: 'five weighted sub-scores' },
      { t: 'Settlement', on: step >= 6 && !res.skipped,
        v: (step >= 6 && !res.skipped) ? '₹' + fmt.n(res.money.payable) + ' payable' : null,
        src: 'band, depreciation and deductible applied' }
    ];

    const done = items.filter(x => x.on).length;
    const pct = Math.round(done / items.length * 100);
    if ($('#cuProgChip')) $('#cuProgChip').textContent = pct + '%';

    mount($('#cuIntel'), [
      el('div.prog', {}, [el('i', { style: { width: pct + '%' } })]),
      el('div.stack-3', { style: { marginTop: 'var(--s-5)' } }, items.map(x =>
        el('div.chk' + (x.on ? '.on' : x.pending ? '.now' : ''), {}, [
          el('span.cbox', { text: x.on ? '✓' : x.pending ? '◉' : '○' }),
          el('div', { style: { minWidth: 0 } }, [
            el('div', { style: { fontWeight: 600 }, text: x.t }),
            x.v ? el('div.xsmall', { style: { color: 'var(--ink-muted)', marginTop: '1px' }, text: x.v })
                : el('div.xsmall', { style: { color: 'var(--ink-faint)', marginTop: '1px' },
                    text: x.pending ? 'capturing now…' : 'not yet' }),
            x.on ? el('div.xsmall', { style: { color: 'var(--ink-faint)', marginTop: '1px' }, text: x.src }) : null
          ])
        ])))
    ]);
  }

  function drawBehind() {
    const res = claim();
    const notes = [
      ['Sign in', 'The policy, the vehicle and the cover are already known. Every question we do not ask is a step that cannot go wrong'],
      ['Vehicle', 'Registration resolves against VAHAN now. A mismatch surfaces here, not after three days of document chase'],
      ['What happened', 'Decision 1 on the token-economics screen. A directed form removes an entire extraction step — there is no prose to parse, so the parsing call never happens'],
      ['Where and when', 'These two values become the reference the capture is checked against. Gate 00 compares the EXIF timestamp and GPS of every frame to what was declared here'],
      ['Live capture', 'The SDK writes and signs EXIF, timestamp and GPS at the moment of capture. Four guided shots, no gallery, no retries from the camera roll. This is the moat, and it carries ' + UI.money(CPModel.run('base').build.gate) + ' of build cost'],
      ['Analysis', `Gate 00 first, on the raw frames. Then the engines. The green lane clears on deterministic checks and specialised ML — ${res.modelCalls === 0 ? 'this claim needed no generative call at all' : 'this claim needed one generative call'}.`],
      ['Outcome', `Trust Score ${res.trust.score} against a green floor of ${CPEngine.GREEN_FLOOR}, and ₹${fmt.n(res.money.payable)} sits inside the ₹50,000 IRDAI corridor — so it may auto-settle. One rupee more and it could not, however clean it is`],
      ['Tracker', 'W-62. Across the book this is ' + fmt.compact(CPModel.run('base').claimantDays) + ' claimant-days returned a year']
    ];
    const [t, d] = notes[step];
    mount($('#cuBehind'), [
      el('p.eyebrow', { style: { margin: 0 }, text: 'Behind that screen · ' + t }),
      el('p', { class: 'small', style: { marginTop: 'var(--s-4)' }, text: d }),
      step === 4 ? UI.callout('<strong>Look for the gallery button.</strong> There isn\'t one', 'warn') : null,
      step === 6 ? UI.facts([
        ['Trust Score', fmt.cr(res.trust.score, 1), '0–100'],
        ['Lane', 'GREEN · auto-settle', 'B-03'],
        ['Turnaround', fmt.cr(res.tat, 1) + ' days', 'B-10'],
        ['Manual touches', String(res.touches) + ' of 7', 'B-06'],
        ['Generative calls', String(res.modelCalls), '']
      ]) : null
    ]);
  }

  return { render };
})();
