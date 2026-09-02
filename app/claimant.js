/* =====================================================================
   ClaimPulse · the claimant's app
   ---------------------------------------------------------------------
   This is Priya's screen, not the judges'. Every word here is addressed
   to the person making the claim, so there is no case-study framing, no
   "three different journeys", no Gate 00, no lanes, no token economics.
   The dashboard keeps that language; this surface must not.

   The numbers, the vehicles, the timeline and the outcome all still come
   from CPClaims / CPEngine, so nothing here can quietly disagree with
   the model behind the dashboard.

   THE RULE THIS FLOW EXISTS TO HOLD: capture is live only. There is no
   gallery button anywhere — not hidden, absent.
   ===================================================================== */

const Claimant = (() => {
  const { el, mount, fmt, $ } = CP;

  /* Four guided shots, described the way you would say them out loud. */
  const SHOTS = [
    { n: 'The whole car',        guide: 'Stand about three steps back so the whole car fits in the frame' },
    { n: 'The damage',           guide: 'Move in close. Fill the frame with the damaged area' },
    { n: 'Chassis number plate', guide: 'Open the bonnet and line the chassis plate up squarely' },
    { n: 'Odometer',             guide: 'Switch the ignition on and photograph the dashboard' }
  ];

  /* The engine's own causes, in the words a claimant would pick. The
     value stays the model's string so the claim still resolves. */
  const CAUSES = [
    ['Parked-vehicle damage',     'Damaged while parked'],
    ['Rear-end collision',        'Hit from behind'],
    ['Side impact at a junction', 'Side impact at a junction'],
    ['Kerb strike',               'Hit a kerb or an object'],
    ['Single-vehicle skid',       'Skidded — no other vehicle'],
    ['Hail and falling debris',   'Hail or falling debris'],
    ['Waterlogging ingress',      'Flood or water damage']
  ];

  /* The tracker's internal step names, said plainly. */
  const PLAIN = {
    'Evidence verified at Gate 00':  'Photos verified',
    'Engines scored, lane assigned': 'Claim assessed',
    'Referred to investigation':     'Sent for a closer look',
    'Surveyor and SIU review':       'Surveyor review',
    'Settlement computed':           'Settlement worked out'
  };

  let step = 0, shot = 0, pickId = null, cause = null;

  const cars  = () => CPClaims.stories();
  const claim = () => CPClaims.byId(pickId) || cars()[0];

  function go(n) { step = n; draw(); }

  function nav(nextLabel, onNext) {
    return [
      step > 0 ? el('button.phone-ghost', { type: 'button', text: 'Back',
        onclick: () => go(step - 1) }) : null,
      el('button.phone-cta', { type: 'button', style: { flex: '1 1 auto' },
        text: nextLabel, onclick: onNext || (() => go(step + 1)) })
    ];
  }

  function draw() {
    const res = claim(), c = res.claim;
    const body = $('#body'), foot = $('#foot');
    const B = [];

    switch (step) {

      /* ---- 1 · already signed in -------------------------------- */
      case 0:
        B.push(
          el('div.phone-title', { text: 'Welcome back, Priya' }),
          el('div.phone-sub', { text: 'You are signed in with your Bajaj account. We already have your policy, your vehicles and your garage — so we will not ask you for any of it.' }),
          el('div.phone-field', {}, [el('div.lab', { text: 'Policy' }), el('div.val', { text: c.policy.no })]),
          el('div.phone-field', {}, [el('div.lab', { text: 'Cover' }),
            el('div.val', { text: 'Own Damage' + (c.policy.zeroDep ? ' · zero-depreciation add-on' : '') })]));
        mount(foot, nav('Start a claim'));
        break;

      /* ---- 2 · which car ---------------------------------------- */
      case 1:
        B.push(
          el('div.phone-title', { text: 'Which vehicle?' }),
          el('div.phone-sub', { text: 'Tap the car this claim is for.' }),
          ...cars().map(rr => {
            const on = rr.claim.id === res.claim.id;
            const f = el('div.phone-field', { style: Object.assign({ cursor: 'pointer' },
              on ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}) }, [
              el('div.lab', { text: rr.claim.vehicle.make + ' ' + rr.claim.vehicle.year }),
              el('div.val', { text: rr.claim.vehicle.model }),
              el('div.phone-sub', { style: { marginTop: '4px' }, text: rr.claim.vehicle.reg })
            ]);
            f.addEventListener('click', () => { pickId = rr.claim.id; shot = 0; cause = null; draw(); });
            return f;
          }),
          el('div.phone-sub', { text: 'We are checking the registration against RTO records while you carry on. If something does not match, we will ask you here — not three days later.' }));
        mount(foot, nav('Continue'));
        break;

      /* ---- 3 · what happened ------------------------------------ */
      case 2: {
        const picked = cause || c.cause;
        const list = CAUSES.slice();
        if (!list.some(([v]) => v === picked)) list.unshift([picked, picked]);
        B.push(
          el('div.phone-title', { text: 'What happened?' }),
          el('div.phone-sub', { text: 'Pick the closest one. It is quicker than typing it out, and it means nobody has to ring you to clarify.' }),
          ...list.map(([value, label]) => {
            const f = el('div.phone-field', { style: Object.assign({ cursor: 'pointer' },
              value === picked ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}) },
              [el('div.val', { style: { fontSize: 'var(--fs-sm)' }, text: label })]);
            f.addEventListener('click', () => { cause = value; draw(); });
            return f;
          }));
        mount(foot, nav('Continue'));
        break;
      }

      /* ---- 4 · where and when ----------------------------------- */
      case 3:
        B.push(
          el('div.phone-title', { text: 'Where and when?' }),
          el('div.phone-field', {}, [el('div.lab', { text: 'Location' }),
            el('div.val', { text: c.city }),
            el('div.phone-sub', { style: { marginTop: '4px' }, text: 'From your phone. Move the pin if this is not right.' })]),
          el('div.phone-field', {}, [el('div.lab', { text: 'When' }),
            el('div.val', { text: 'Today, 08:40' })]),
          el('div.phone-sub', { text: 'We save this now so the photos you are about to take can be checked against it.' }));
        mount(foot, nav('Continue to photos'));
        break;

      /* ---- 5 · the four photos ---------------------------------- */
      case 4: {
        const done = shot >= SHOTS.length;
        const s = SHOTS[Math.min(shot, SHOTS.length - 1)];
        B.push(
          el('div.phone-title', { text: done ? 'All four photos taken' : s.n }),
          el('div.viewfinder' + (done ? '' : ' live'), {}, [
            el('div.frame'),
            el('div', { style: { color: 'rgba(255,255,255,.62)', fontSize: '11px',
              fontWeight: 700, letterSpacing: '.12em' }, text: done ? '✓ DONE' : '● LIVE' }),
            el('div.hint', { text: done ? 'Ready to send' : s.guide })
          ]),
          el('div.stack-3', { style: { marginTop: 'var(--s-4)' } }, SHOTS.map((sh, i) =>
            el('div.chk' + (i < shot ? '.on' : i === shot ? '.now' : ''), {}, [
              el('span.cbox', { text: i < shot ? '✓' : i === shot ? '◉' : '○' }),
              el('span', { text: sh.n }),
              i < shot ? el('span.ctag', { text: 'saved' }) : null
            ]))),
          el('div.phone-sub', { style: { textAlign: 'center', marginTop: 'var(--s-3)' },
            text: done ? 'That is everything we need from you.'
                       : 'Photo ' + (shot + 1) + ' of ' + SHOTS.length }),
          el('div.phone-sub', { style: { textAlign: 'center' },
            text: 'Photos have to be taken here, in the app. That is what lets us settle in minutes instead of sending someone out to look.' }));
        mount(foot, [
          el('button.phone-ghost', { type: 'button', text: 'Back',
            onclick: () => { if (shot > 0) shot--; else step--; draw(); } }),
          el('button.phone-cta', { type: 'button', style: { flex: '1 1 auto' },
            text: done ? 'Send my claim' : 'Take photo',
            onclick: () => { if (shot < SHOTS.length) shot++; else step++; draw(); } })
        ]);
        break;
      }

      /* ---- 6 · checking ----------------------------------------- */
      case 5:
        B.push(
          el('div.phone-title', { text: 'Checking your claim' }),
          el('div.phone-sub', { text: 'This usually takes under a minute. You can close the app — we will message you.' }),
          ...[['Your photos',    'that they are clear, and taken just now'],
              ['Your vehicle',   'registration, chassis number and odometer'],
              ['The damage',     ((res.cv && res.cv.parts ? res.cv.parts.length : 0)) + ' panels identified'],
              ['Your cover',     'your policy wording and add-ons'],
              ['Routine checks', 'the standard verification every claim gets']]
            .map(([t, d]) => el('div.engine-run', {}, [
              el('span.dot'),
              el('div', {}, [
                el('div', { style: { fontWeight: 620, color: 'var(--ink)' }, text: t }),
                el('div.phone-sub', { text: d })
              ])
            ])));
        mount(foot, nav('See the result'));
        break;

      /* ---- 7 · the answer --------------------------------------- */
      case 6: {
        const O = {
          G: { icon: '✓', tone: 'var(--lane-green)', title: 'Your claim is approved',
               sub: 'Settled straight away. No visit, no paperwork.',
               next: ['The money reaches your account within 24 hours',
                      'Your garage already has the approval',
                      'Nothing further is needed from you'] },
          A: { icon: '◐', tone: 'var(--lane-amber)', title: 'Almost there',
               sub: res.capped
                 ? 'Everything checked out. Because the amount is above ₹50,000, a registered surveyor has to confirm it — that is a rule we have to follow, not a doubt about your claim.'
                 : 'Your claim needs one quick human review before we can settle it.',
               next: ['We are booking a surveyor visit now',
                      'Your slot will appear on this screen — we will not make you wait for a phone call',
                      'Expected decision in about ' + fmt.cr(res.tat, 1) + ' days'] },
          R: { icon: '!', tone: 'var(--lane-red)', title: 'We need to look more closely',
               sub: res.skipped
                 ? 'We could not verify the photographs. This usually means they were not taken live in the app — please take the four photos again, from the vehicle.'
                 : 'Your claim needs a little more checking before we can decide.',
               next: res.skipped
                 ? ['Re-open the claim and take the four photos here',
                    'Photos from your camera roll cannot be verified',
                    'Nothing is rejected — we just need usable photographs']
                 : ['Someone is reviewing your file now',
                    'You may be asked for one more document',
                    'You will hear from a named person, not a queue'] }
        }[res.lane];

        B.push(el('div', { style: { textAlign: 'center', padding: 'var(--s-5) 0 var(--s-3)' } }, [
          el('div', { style: { fontSize: '34px', color: O.tone }, text: O.icon }),
          el('div.phone-title', { style: { marginTop: 'var(--s-3)' }, text: O.title }),
          el('div.phone-sub', { text: O.sub })
        ]));

        if (res.money && res.money.payable !== null) {
          B.push(
            el('div.phone-field', { style: { borderColor: O.tone } }, [
              el('div.lab', { text: res.lane === 'G' ? 'Amount payable' : 'Likely amount' }),
              el('div.val', { style: { fontSize: 'var(--fs-lg)' }, text: '₹' + fmt.n(res.money.payable) })]),
            el('div.phone-field', {}, [el('div.lab', { text: 'Repair assessed at' }),
              el('div.val', { text: '₹' + fmt.n(res.money.assessedBase) })]),
            el('div.phone-field', {}, [el('div.lab', { text: 'Depreciation' }),
              el('div.val', { text: res.money.zeroDep ? '₹0 — your zero-depreciation add-on'
                                                      : '₹' + fmt.n(res.money.depreciation) })]));
        }
        B.push(el('div.phone-sub', { style: { fontWeight: 640, color: 'var(--ink)' }, text: 'What happens next' }),
          ...O.next.map(t => el('div.engine-run', {}, [
            el('span.dot', { style: { background: O.tone } }), el('div', { text: t })])));
        mount(foot, nav('Track my claim'));
        break;
      }

      /* ---- 8 · tracker ------------------------------------------ */
      case 7:
        B.push(
          el('div.phone-title', { text: 'Your claim' }),
          el('div.phone-sub', { text: c.id }),
          ...res.timeline.map((t, i) => el('div.engine-run', {}, [
            el('span.dot', { style: { background: i <= 2 ? 'var(--lane-green)' : 'var(--border-strong)' } }),
            el('div', {}, [
              el('div', { style: { fontWeight: 620, color: 'var(--ink)' }, text: PLAIN[t.t] || t.t }),
              el('div.phone-sub', { text: t.at.toLocaleString('en-IN',
                { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })
            ])
          ])),
          el('div.phone-sub', { style: { marginTop: 'var(--s-3)' },
            text: 'We will update this page and message you as it moves. You do not need to keep checking.' }));
        mount(foot, [
          el('button.phone-ghost', { type: 'button', text: 'Back', onclick: () => go(6) }),
          el('button.phone-cta', { type: 'button', style: { flex: '1 1 auto' }, text: 'Done',
            onclick: () => { step = 0; shot = 0; cause = null; draw(); } })
        ]);
        break;
    }

    mount(body, B);
    body.scrollTop = 0;
  }

  return { start: draw };
})();
