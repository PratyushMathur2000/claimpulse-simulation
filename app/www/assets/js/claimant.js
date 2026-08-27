/* =====================================================================
   ClaimPulse · Customer mobile app
   0 Login → 1 Vehicle → 2 What happened → 3 Where and when
   → 4 Guided live capture → 5 Live analysis → 6 Outcome → 7 Tracker
   ---------------------------------------------------------------------
   The hard rule this screen exists to demonstrate: capture is LIVE ONLY.
   There is no gallery button anywhere in this flow, because our own
   research found gallery uploads silently destroy the metadata forensics
   that Gate 00 depends on. Everything downstream assumes that rule held.
   ===================================================================== */

const CPClaimant = (() => {

  const SHOTS = [
    { n: 'Front 3/4',     guide: 'Stand 3 m back. Fit the whole vehicle inside the frame.' },
    { n: 'Damage',        guide: 'Move in close. Fill the frame with the damaged area.'    },
    { n: 'Chassis / VIN', guide: 'Open the bonnet. Frame the chassis plate squarely.'      },
    { n: 'Odometer',      guide: 'Ignition on. Capture the odometer and dash cluster.'     }
  ];

  let step = 0, stream = null, shots = [], geo = null, claim = null, claimId = null;
  let timers = [], pipeState = {};
  // What the customer chose on the way in. The demo scenario is driven by
  // which vehicle they pick, so the three cars ARE the three scenarios.
  let picked = { vehicle: null, incidentType: null, whenKey: 'now', place: 'current' };

  const FLOW = ['login', 'vehicle', 'what', 'when', 'capture', 'pipeline', 'verdict', 'tracker'];

  const $ = UI.$;
  const sc = () => CP_SCENARIOS[CPApp.scenario];

  /* ================= lifecycle ================= */
  function init() { /* nothing to warm up */ }

  function reset(toLogin) {
    timers.forEach(clearTimeout); timers = [];
    stopCam();
    shots = []; claim = null; claimId = null; pipeState = {};
    step = toLogin === true ? 0 : 1;
    picked = { vehicle: null, incidentType: null, whenKey: 'now', place: 'current' };
    // A scenario chosen from the demo switcher preselects its vehicle, so the
    // operator never has to remember which car maps to which lane.
    const v = CP_MY_VEHICLES.find(x => x.scenario === CPApp.scenario);
    if (v && toLogin !== true) { picked.vehicle = v.id; picked.incidentType = 'accident'; }
    render();
  }

  function go(n) {
    timers.forEach(clearTimeout); timers = [];
    if (n !== 4) stopCam();
    step = n;
    render();
  }

  /* Live updates from the ops console land here — if an adjuster
     overrides the claim this phone filed, the tracker moves. */
  /* Live updates from the command centre land here. If an adjuster
     overrides the claim or dispatches a surveyor, this phone moves —
     which is the whole point of the two surfaces sharing one store. */
  function onData(all) {
    if (!claimId || step !== 7) return;
    const fresh = all.find(c => c.id === claimId);
    if (!fresh) return;
    const moved = JSON.stringify(fresh.overridden) !== JSON.stringify(claim.overridden)
               || JSON.stringify(fresh.survey) !== JSON.stringify(claim.survey);
    if (moved) { claim = fresh; render(); }
  }

  /* ================= render ================= */
  function render() {
    paintSteps();
    ({ 0: login, 1: vehicle, 2: what, 3: when,
       4: capture, 5: pipeline, 6: verdict, 7: tracker })[step]();
  }

  /* The progress dots cover the claim journey only. Login is not a step
     the customer is being asked to make progress through. */
  function paintSteps() {
    const el = $('phSteps');
    if (!el) return;
    if (step === 0) { el.innerHTML = ''; return; }
    el.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(i =>
      `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('');
  }

  const head = (t, s) => { $('phTitle').textContent = t; $('phSub').textContent = s; };

  /* ---------- the explainer column beside the phone ---------- */
  function side(eyebrow, title, sub, body, metrics) {
    $('sideNote').innerHTML = `
      <div class="card">
        <div class="eyebrow">Demo mode · pick a scenario</div>
        <div class="demoswitch">
          ${Object.values(CP_SCENARIOS).map(s => `
            <button class="dsw ${s.key === CPApp.scenario ? 'on' : ''} ${s.chip}"
              title="${UI.esc(s.blurb)}" onclick="CPApp.setScenario('${s.key}')">
              <span class="dsw-nm">${UI.esc(s.vehicle || s.title)}</span>
              <span class="dsw-ds">${UI.esc(s.ref || '')} · ${UI.esc(s.title)}</span>
              <span class="dsw-chip ${s.chip}">${UI.esc(s.chip)}</span>
            </button>`).join('')}
        </div>
        <div class="sub" style="font-size:var(--t-micro);font-family:var(--m);color:var(--dim);">
          The four claims are fixed profiles so the pipeline behaves identically every run.
          Everything downstream of the sub-signals — fusion, routing, the ₹50,000 corridor,
          the settlement working and the audit trail — is computed live.
        </div>
      </div>
      <div class="card">
        <div class="eyebrow">${UI.esc(eyebrow)}</div>
        <h3>${UI.esc(title)}</h3>
        <div class="sub">${sub}</div>
        <div class="hr"></div>
        ${body}
      </div>
      ${metrics || ''}`;
  }

  /* ================= STEP 0 · FNOL ================= */
  /* ================= STEP 0 · LOGIN ================= */
  function login() {
    head('Welcome back', 'Bajaj Allianz · Motor');
    $('phBody').innerHTML = `
      <div class="loginwrap">
        <div class="loginmark">CP</div>
        <div class="loginhi">Sign in to ClaimPulse</div>
        <div class="loginsub">Report and track a motor claim in minutes.</div>
        <div class="field">
          <label>Mobile number</label>
          <input readonly value="${UI.esc(CP_CUSTOMER.mobile)}">
        </div>
        <div class="field">
          <label>One-time password</label>
          <div class="otp">
            ${[4, 7, 1, 2].map(d => `<div class="otpbox">${d}</div>`).join('')}
          </div>
          <div class="hint">Sent to your registered number · expires in 04:52</div>
        </div>
        <div class="loginnote">
          By continuing you agree to evidence being captured live inside this app.
          Gallery uploads are not accepted for motor damage claims.
        </div>
      </div>`;
    $('phFoot').innerHTML =
      `<button class="btn" onclick="CPClaimant.go(1)">Verify and continue →</button>`;

    side('Customer app', 'This is the policyholder side',
      'A consumer insurance app, not an internal tool.',
      `<p style="font-size:var(--t-sm);line-height:1.65;">
         Everything on this phone is what a Bajaj Allianz customer would see. The claims
         desk sees the same claim on the <b>Command Center</b> the moment it is filed.</p>
       <div class="hr"></div>
       ${UI.sec('The three demo claims')}
       <div class="rows" style="font-size:var(--t-xs);">
         ${UI.row('Honda City', 'CLM-20481 · settles green')}
         ${UI.row('Hyundai Creta', 'CLM-20482 · goes amber')}
         ${UI.row('Mahindra XUV700', 'CLM-20483 · goes red')}
       </div>
       <div style="margin-top:var(--s3);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
         Pick the car on the next screen and the claim routes accordingly. Nothing is
         scripted after that point — the routing is computed.
       </div>`);
  }

  /* ================= STEP 1 · WHICH VEHICLE ================= */
  function vehicle() {
    head('Your vehicles', CP_CUSTOMER.name + ' · ' + CP_MY_VEHICLES.length + ' active policies');
    $('phBody').innerHTML = `
      <div class="vlist">
        ${CP_MY_VEHICLES.map(v => `
          <div class="vcard ${picked.vehicle === v.id ? 'on' : ''}"
               onclick="CPClaimant.pickVehicle('${v.id}')">
            <div class="vtop">
              <div class="vico" style="background:${v.colour}">🚗</div>
              <div class="vmain">
                <div class="vnm">${UI.esc(v.make)}</div>
                <div class="vreg">${UI.esc(v.reg)} · ${v.year}</div>
              </div>
              <span class="pill g">${UI.esc(v.status)}</span>
            </div>
            <div class="vmeta">
              <div><span>Policy</span><b>${UI.esc(v.policy.slice(-8))}</b></div>
              <div><span>IDV</span><b>${UI.inr(v.idv)}</b></div>
              <div><span>Renews</span><b>${UI.esc(v.expires)}</b></div>
            </div>
            ${v.addOns.length ? `<div class="vadd">${v.addOns.map(a =>
              `<span>${UI.esc(a)}</span>`).join('')}</div>` : ''}
          </div>`).join('')}
      </div>`;
    $('phFoot').innerHTML = picked.vehicle
      ? `<button class="btn" onclick="CPClaimant.go(2)">Report a claim →</button>`
      : `<button class="btn" disabled style="opacity:.45;cursor:not-allowed">Select a vehicle</button>`;

    side('Step 1 of 7', 'Start from what we already know',
      'The policy, the vehicle and the cover are already on file.',
      `<p style="font-size:var(--t-sm);line-height:1.65;">
         A claimant should never be asked to type a policy number, an IDV or a
         registration the insurer already holds. Every field the app can answer
         for itself is one the customer cannot get wrong.</p>
       <div class="hr"></div>
       ${UI.sec('What this pre-fills')}
       <div class="rows" style="font-size:var(--t-xs);">
         ${UI.row('Policy and product', 'from the account')}
         ${UI.row('IDV, deductible, NCB', 'from the schedule')}
         ${UI.row('Add-ons in force', 'drives the settlement working')}
         ${UI.row('Vehicle and registration', 'cross-checked against VAHAN')}
       </div>`);
  }

  function pickVehicle(id) {
    const v = CP_MY_VEHICLES.find(x => x.id === id);
    if (!v) return;
    picked.vehicle = id;
    // The chosen car IS the scenario. Selecting here rather than from a
    // developer switch keeps the demo inside the product.
    CPApp.setScenarioQuiet(v.scenario);
    render();
  }

  /* ================= STEP 2 · WHAT HAPPENED ================= */
  function what() {
    const v = CP_MY_VEHICLES.find(x => x.id === picked.vehicle) || CP_MY_VEHICLES[0];
    head('What happened?', UI.esc(v.make) + ' · ' + UI.esc(v.reg));
    $('phBody').innerHTML = `
      <div class="askwrap">
        <div class="ask">Pick the closest description. You will not be asked to write a statement.</div>
        <div class="optlist">
          ${CP_INCIDENT_TYPES.map(t => `
            <div class="opt ${picked.incidentType === t.key ? 'on' : ''}"
                 onclick="CPClaimant.pickType('${t.key}')">
              <div class="oico">${t.ico}</div>
              <div>
                <div class="onm">${UI.esc(t.nm)}</div>
                <div class="ods">${UI.esc(t.d)}</div>
              </div>
              <div class="otick">${picked.incidentType === t.key ? '✓' : ''}</div>
            </div>`).join('')}
        </div>
        ${picked.incidentType ? `
          <div class="askmore">
            ${UI.sec('A few quick details')}
            <div class="chiprow">
              <span class="qlabel">Anyone injured?</span>
              <button class="qchip on">No</button><button class="qchip">Yes</button>
            </div>
            <div class="chiprow">
              <span class="qlabel">Another vehicle involved?</span>
              <button class="qchip ${sc().incident.thirdParty ? '' : 'on'}">No</button>
              <button class="qchip ${sc().incident.thirdParty ? 'on' : ''}">Yes</button>
            </div>
            <div class="chiprow">
              <span class="qlabel">Is the vehicle driveable?</span>
              <button class="qchip on">Yes</button><button class="qchip">No</button>
            </div>
          </div>` : ''}
      </div>`;
    $('phFoot').innerHTML = picked.incidentType
      ? `<button class="btn" onclick="CPClaimant.go(3)">Continue →</button>`
      : `<button class="btn" disabled style="opacity:.45;cursor:not-allowed">Choose what happened</button>`;

    side('Step 2 of 7', 'Four taps, not a two-page form',
      'The FNOL form is the first place a claim goes wrong.',
      `<p style="font-size:var(--t-sm);line-height:1.65;">
         A traditional motor FNOL asks a distressed person at the roadside for two pages
         of structured detail. They guess, they abbreviate, and the desk spends the next
         four days correcting it.</p>
       <p style="font-size:var(--t-sm);line-height:1.65;margin-top:var(--s2);">
         Everything here is a tap. The narrative detail the engines actually need comes
         from the <b>evidence</b>, not from the customer's typing.</p>`);
  }

  function pickType(k) { picked.incidentType = k; render(); }

  /* ================= STEP 3 · WHERE AND WHEN ================= */
  function when() {
    const s0 = sc();
    head('Where and when?', 'Two taps, then the camera');
    const WHENS = [
      { k: 'now',   nm: 'Just now',        d: 'Within the last hour' },
      { k: 'today', nm: 'Earlier today',   d: 'Same day' },
      { k: 'back',  nm: 'A day or more ago', d: 'Reported late' }
    ];
    $('phBody').innerHTML = `
      <div class="askwrap">
        ${UI.sec('Where did it happen?')}
        <div class="optlist">
          <div class="opt ${picked.place === 'current' ? 'on' : ''}"
               onclick="CPClaimant.pickPlace('current')">
            <div class="oico">📍</div>
            <div>
              <div class="onm">Use my current location</div>
              <div class="ods">${geo ? UI.esc(geo.full) : UI.esc(s0.incident.locality)}</div>
            </div>
            <div class="otick">${picked.place === 'current' ? '✓' : ''}</div>
          </div>
          <div class="opt ${picked.place === 'manual' ? 'on' : ''}"
               onclick="CPClaimant.pickPlace('manual')">
            <div class="oico">🗺</div>
            <div>
              <div class="onm">Enter a different location</div>
              <div class="ods">If the vehicle has already been moved</div>
            </div>
            <div class="otick">${picked.place === 'manual' ? '✓' : ''}</div>
          </div>
        </div>
        ${picked.place === 'manual' ? `<div class="field" style="margin-top:var(--s2)">
          <input readonly value="${UI.esc(s0.incident.locality)}">
          <div class="hint">Moving the vehicle before capture is normal — Gate 00 accounts for it
            rather than rejecting it.</div>
        </div>` : ''}
        <div class="hr"></div>
        ${UI.sec('When did it happen?')}
        <div class="optlist">
          ${WHENS.map(w => `
            <div class="opt ${picked.whenKey === w.k ? 'on' : ''}"
                 onclick="CPClaimant.pickWhen('${w.k}')">
              <div class="oico">🕐</div>
              <div><div class="onm">${UI.esc(w.nm)}</div><div class="ods">${UI.esc(w.d)}</div></div>
              <div class="otick">${picked.whenKey === w.k ? '✓' : ''}</div>
            </div>`).join('')}
        </div>
        <div class="loginnote" style="margin-top:var(--s3);">
          Reported ${s0.incident.hoursAgo} hours after the incident on this claim.
          Capture recency is one of the five things Gate 00 scores.
        </div>
      </div>`;
    $('phFoot').innerHTML = `<button class="btn" onclick="CPClaimant.go(4)">Continue to photos →</button>`;

    side('Step 3 of 7', 'Location is evidence, not admin',
      'The GPS fix on the capture is checked against the reported incident.',
      `<p style="font-size:var(--t-sm);line-height:1.65;">
         The place and time the customer reports are not filing metadata — they are the
         claim's first two integrity checks. Gate 00 compares them against where and when
         the photographs were actually taken.</p>
       <p style="font-size:var(--t-sm);line-height:1.65;margin-top:var(--s2);">
         A mismatch does not reject the claim. It moves it, with the reason attached.</p>`);
  }

  function pickPlace(k) { picked.place = k; render(); }
  function pickWhen(k)  { picked.whenKey = k; render(); }

  /* ================= STEP 4 · GUIDED LIVE CAPTURE ================= */
  function capture() {
    head('Capture the damage', `${shots.length} of 4 frames · live only`);

    $('phBody').innerHTML = `
      <div class="capstage" id="capStage"></div>
      <div class="shots" id="shotStrip"></div>
      <div style="background:var(--amber-bg);border:1px solid var(--amber-line);border-radius:var(--r);padding:var(--s2) var(--s3);font-size:var(--t-xs);color:var(--amber-ink);line-height:1.5;">
        <b>Gallery upload is disabled.</b> Photos picked from a gallery lose the camera
        metadata Gate 00 checks, so ClaimPulse will not accept them.
      </div>`;

    paintStrip();
    startCam();
    locate();

    $('phFoot').innerHTML = shots.length < 4
      ? `<button class="btn" onclick="CPClaimant.grab()">📷 Capture ${SHOTS[shots.length].n}</button>`
      : `<button class="btn" onclick="CPClaimant.submit()">Submit claim →</button>`;

    side('Step 2 of 5', 'Guided live capture',
      'The hard rule the whole architecture rests on.',
      `<p style="font-size:var(--t-sm);line-height:1.65;">
         The camera is opened by the app and the gallery is not reachable. Four guided
         frames, each with its own framing instruction, captured in one session with GPS
         and camera metadata attached.</p>
       <p style="font-size:var(--t-sm);line-height:1.65;margin-top:var(--s2);">
         This is what makes the EXIF, GPS and sensor-consistency checks meaningful. Without
         it, Gate 00 is screening metadata that a gallery round-trip already destroyed.</p>
       <div class="hr"></div>
       ${UI.sec('Live device signals')}
       <div class="rows">
         ${UI.row('GPS fix', geo ? `<span style="color:var(--green)">${UI.esc(geo.short)}</span>` : '<span style="color:var(--dim)">acquiring…</span>', true)}
         ${UI.row('Session started', UI.time(Date.now()), true)}
         ${UI.row('Frames captured', shots.length + ' / 4', true)}
       </div>
       <div class="hr"></div>
       <div style="font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
         Build lines D-03, D-04, D-05 and D-13 — ₹1.91 Cr, the largest single block in the
         build. The moat is carried as cost, not as a slide claim.
       </div>`);
  }

  function paintStrip() {
    const el = $('shotStrip'); if (!el) return;
    el.innerHTML = SHOTS.map((s, i) => shots[i]
      ? `<div class="shot done"><img src="${shots[i]}" alt="${UI.esc(s.n)}"></div>`
      : `<div class="shot"><div class="n">${UI.esc(s.n)}</div></div>`).join('');
  }

  /* ---------- camera ---------- */
  async function startCam() {
    const stage = $('capStage'); if (!stage) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false
      });
      const v = document.createElement('video');
      v.autoplay = true; v.playsInline = true; v.muted = true; v.srcObject = stream;
      stage.innerHTML = ''; stage.appendChild(v);
    } catch (e) {
      // Desktop, headless, http:// or permission denied. The demo still runs
      // end to end on synthesised frames — it must never dead-end on stage.
      stage.innerHTML = `<div class="placeholder">Camera unavailable on this device<br>
        <b style="color:var(--bajaj-sky)">Simulated capture is active</b><br>
        <span style="font-size:9px;opacity:.7">Open over https or on the installed app for live capture</span></div>`;
    }
    overlay(stage);
  }

  function overlay(stage) {
    const f = document.createElement('div'); f.className = 'capframe';
    const g = document.createElement('div'); g.className = 'capguide'; g.id = 'capGuide';
    stage.appendChild(f); stage.appendChild(g);
    paintGuide();
  }

  function paintGuide() {
    const g = $('capGuide'); if (!g) return;
    const s = SHOTS[shots.length];
    g.innerHTML = s
      ? `<span>${shots.length + 1} / 4 · ${UI.esc(s.n)}<br>
           <span style="font-weight:400;font-size:var(--t-micro);opacity:.9">${UI.esc(s.guide)}</span></span>
         <span class="gm">● LIVE<br>${geo ? UI.esc(geo.short) : 'no GPS fix'}<br>${UI.time(Date.now())}</span>`
      : `<span>All four frames captured</span>`;
  }

  const stopCam = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };

  function grab() {
    if (shots.length >= 4) return;
    shots.push(frame());
    paintStrip(); paintGuide();
    head('Capture the damage', `${shots.length} of 4 frames · live only`);
    $('phFoot').innerHTML = shots.length < 4
      ? `<button class="btn" onclick="CPClaimant.grab()">📷 Capture ${SHOTS[shots.length].n}</button>`
      : `<button class="btn" onclick="CPClaimant.submit()">Submit claim →</button>`;
    if (shots.length === 4) stopCam();
    side_refreshSignals();
  }

  function side_refreshSignals() { if (step === 4) capture(); }

  /* Small frames: they travel to every other device over the sync layer,
     so they are downscaled hard rather than sent at capture resolution. */
  function frame() {
    const stage = $('capStage');
    const v = stage && stage.querySelector('video');
    const c = document.createElement('canvas');
    c.width = 192; c.height = 119;                      // ~φ
    const x = c.getContext('2d');
    if (v && v.videoWidth) {
      x.drawImage(v, 0, 0, c.width, c.height);
    } else {
      const g = x.createLinearGradient(0, 0, c.width, c.height);
      g.addColorStop(0, '#0B3C63'); g.addColorStop(1, '#00243F');
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#4EA8DE'; x.font = 'bold 11px monospace';
      x.fillText('FRAME ' + (shots.length + 1), 10, 22);
      x.fillStyle = '#93A6B8'; x.font = '9px monospace';
      x.fillText(SHOTS[shots.length].n, 10, 38);
      x.fillText(UI.time(Date.now()), 10, c.height - 10);
    }
    return c.toDataURL('image/jpeg', 0.55);
  }

  async function locate() {
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Geolocation) {
        const p = await Capacitor.Plugins.Geolocation.getCurrentPosition();
        return setGeo(p.coords.latitude, p.coords.longitude);
      }
    } catch (e) { /* fall through to the browser API */ }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setGeo(p.coords.latitude, p.coords.longitude),
      () => { }, { enableHighAccuracy: true, timeout: 8000 });
  }

  function setGeo(lat, lon) {
    geo = {
      lat, lon,
      short: lat.toFixed(3) + ', ' + lon.toFixed(3),
      full: Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S') + ', ' +
            Math.abs(lon).toFixed(4) + '° ' + (lon >= 0 ? 'E' : 'W')
    };
    paintGuide();
    if (step === 4) capture();
  }

  /* ================= STEP 5 · LIVE ANALYSIS ================= */
  const STAGES = [
    { k: 'gate',   nm: 'Gate 00 · Capture Integrity',  ms: 750 },
    { k: 'doc',    nm: 'Engine 01 · Document AI',      ms: 620 },
    { k: 'cv',     nm: 'Engine 02 · CV Damage',        ms: 700 },
    { k: 'fraud',  nm: 'Engine 03 · Fraud Graph',      ms: 780 },
    { k: 'repair', nm: 'Engine 04 · Repair Cost',      ms: 520 },
    { k: 'policy', nm: 'Engine 05 · Policy RAG',       ms: 560 },
    { k: 'fuse',   nm: 'Trust Score fusion',           ms: 640 }
  ];

  async function submit() {
    claim = CPEngine.process(CPApp.scenario, {
      coords: geo ? geo.full : null,
      capturedAt: UI.time(Date.now()),
      frames: shots.length
    });
    claim.shots = shots.slice();
    pipeState = {};
    go(5);

    /* File it BEFORE the pipeline animates, not after. The control tower is
       meant to watch a claim move through the stages; if we only publish the
       finished dossier it is told about a claim that has already stopped
       moving. Deliberately not awaited — the write must not stall the
       animation, and the claim's own `ts` is what the tower derives the
       stage from, so the two stay in step regardless of network latency. */
    CPSync.add(claim).then(id => { claimId = id; claim.id = id; });

    // Gate 00 first, always. If it hard-fails the engines are skipped —
    // that is the architecture, so the animation has to show it.
    let t = 0;
    const gateFail = claim.gate.hardFail;
    STAGES.forEach((s, i) => {
      const skipped = gateFail && i > 0 && s.k !== 'fuse';
      timers.push(setTimeout(() => { pipeState[s.k] = 'run'; paintPipe(); }, t));
      t += skipped ? 90 : s.ms;
      timers.push(setTimeout(() => {
        pipeState[s.k] = stageStatus(s.k, skipped);
        paintPipe();
      }, t));
    });
    timers.push(setTimeout(() => go(6), t + 420));
  }

  function stageStatus(k, skipped) {
    if (skipped) return 'skip';
    const c = claim;
    if (k === 'gate')   return c.gate.hardFail ? 'fail' : 'done';
    if (k === 'doc')    return c.doc.hardFail ? 'fail' : 'done';
    if (k === 'cv')     return c.cv.hardFail ? 'fail' : 'done';
    if (k === 'fraud')  return c.fraud.hardFail ? 'fail' : 'done';
    if (k === 'repair') return c.repair.status === 'FAIL' ? 'fail' : 'done';
    if (k === 'policy') return 'done';
    return 'done';
  }

  function pipeline() {
    head('Assessing your claim', 'Gate 00, then five engines in parallel');
    $('phBody').innerHTML = `<div class="pipe" id="pipe"></div>`;
    $('phFoot').innerHTML = `<div style="text-align:center;font-size:var(--t-xs);color:var(--mist);">
      This normally takes seconds. Today it takes 9.8 days.</div>`;
    paintPipe();

    side('Step 3 of 5', 'The escalation cascade',
      'Deterministic checks on 100% of claims. GenAI only where they cannot resolve it.',
      `<p style="font-size:var(--t-sm);line-height:1.65;">
         Gate 00 screens the evidence <b>before any model runs</b>. If the capture session
         fails integrity, the claim is rejected having spent nothing — no tokens, no GPU
         seconds, no reviewer.</p>
       <p style="font-size:var(--t-sm);line-height:1.65;margin-top:var(--s2);">
         Where the gate passes, five specialised engines score the claim in parallel and
         Trust Score fuses them into one routing decision. The cheapest inference is the
         one never run.</p>
       <div class="hr"></div>
       ${UI.sec('Fusion weights')}
       <div class="rows">
         ${Object.entries({ 'Gate 00 · Capture Integrity': 30, 'Engine 01 · Document AI': 20,
            'Engine 02 · CV Damage': 15, 'Engine 03 · Fraud Graph': 25, 'Engine 05 · Policy RAG': 10 })
            .map(([k, v]) => UI.row(k, v + '%', true)).join('')}
       </div>`);
  }

  function paintPipe() {
    const el = $('pipe'); if (!el) return;
    el.innerHTML = STAGES.map(s => {
      const st = pipeState[s.k] || '';
      const cls = st === 'skip' ? '' : st;
      const mark = st === 'done' ? '✓' : st === 'fail' ? '×' : st === 'run' ? '•' : '';
      const note = st === 'skip' ? 'skipped'
        : st && claim ? scoreOf(s.k) : '';
      return `<div class="st ${cls}">
        <div class="ic">${mark}</div>
        <div class="nm">${UI.esc(s.nm)}</div>
        <div class="sc">${UI.esc(note)}</div>
      </div>`;
    }).join('');
  }

  function scoreOf(k) {
    const c = claim; if (!c) return '';
    if (k === 'gate')   return c.gate.score;
    if (k === 'doc')    return c.doc.score;
    if (k === 'cv')     return c.cv.score;
    if (k === 'fraud')  return c.fraud.score;
    if (k === 'repair') return c.repair.status;
    if (k === 'policy') return c.pol.score;
    if (k === 'fuse')   return c.trust.score;
    return '';
  }

  /* ================= STEP 6 · OUTCOME ================= */
  /* Three genuinely different customer experiences, not one screen with the
     lane swapped in. The green claimant is being congratulated; the amber
     claimant is being reassured; the red claimant is being told the truth
     without being told the internal reason for it — publishing "our fraud
     graph flagged your network" to a customer who may be entirely innocent
     is both a legal problem and a decent-behaviour problem. */
  const OUTCOME = {
    G: {
      ico: '✓',
      title: 'Great news — your claim is verified',
      lead: 'ClaimPulse checked your evidence and every signal agreed. Nothing further is needed from you.',
      statusLabel: 'VERIFIED · FAST TRACK',
      timing: 'Fast-track processing',
      timingSub: 'Typically settled within ' + CP_CONST.LANE.G.tat + ' days',
      amountLabel: 'Amount being released'
    },
    A: {
      ico: '◔',
      title: 'Your claim needs a quick review',
      lead: 'We have received and analysed your claim. One of our claims officers will take a short look before it is settled.',
      statusLabel: 'UNDER REVIEW',
      timing: 'Approximately ' + CP_CONST.LANE.A.tat + ' days',
      timingSub: 'You will be told as soon as it moves',
      amountLabel: 'Assessed amount, subject to review'
    },
    R: {
      ico: '⏱',
      title: 'Your claim requires additional verification',
      lead: 'Our team needs to complete some additional checks before proceeding. This is a standard part of how some claims are handled.',
      statusLabel: 'ADDITIONAL VERIFICATION',
      timing: 'Up to ' + CP_CONST.LANE.R.tat + ' days',
      timingSub: 'A claims representative may contact you',
      amountLabel: null
    }
  };

  function verdict() {
    const c = claim;
    const o = OUTCOME[c.lane];
    head(c.lane === 'G' ? 'Claim verified' : c.lane === 'A' ? 'Under review' : 'In verification',
         c.ref || c.id);

    // The three next-step lists a customer actually needs. Never the engines,
    // never the score — those are internal.
    const NEXT = {
      G: ['Your garage can begin repairs now',
          'Payment is released to your registered account',
          'You will get a confirmation message when it lands'],
      A: ['A claims officer reviews the file — no action needed from you',
          'If anything else is required we will ask once, in this app',
          'A survey appointment will appear here if one is booked'],
      R: ['Our team completes the additional checks',
          'A representative may call you on your registered number',
          'Any appointment we book will appear on this screen']
    }[c.lane];

    $('phBody').innerHTML = `
      <div class="outcome ${c.lane}">
        <div class="oico">${o.ico}</div>
        <div class="otitle">${UI.esc(o.title)}</div>
        <div class="olead">${UI.esc(o.lead)}</div>
        <div class="ostatus ${c.lane}">${UI.esc(o.statusLabel)}</div>
      </div>

      ${o.amountLabel ? `
        <div class="card tint" style="margin-bottom:var(--s3);padding:var(--s3);">
          ${UI.sec(o.amountLabel)}
          <div style="font-size:var(--t-xl);font-weight:800;color:var(--bajaj-navy);letter-spacing:-2px;line-height:1.05;">
            ${UI.inr(c.money.payable)}</div>
          <div class="rows" style="margin-top:var(--s2);font-size:var(--t-xs);">
            ${UI.row('Assessed at catalogue band', UI.inr(c.money.assessedBase))}
            ${c.money.disallowed ? UI.row('Above the benchmark band', '−' + UI.inr(c.money.disallowed)) : ''}
            ${UI.row('Depreciation' + (c.money.zeroDep ? ' (nil — zero-dep add-on)'
              : ' (' + Math.round(c.money.depRate * 100) + '%)'), '−' + UI.inr(c.money.depreciation))}
            ${UI.row('Compulsory deductible', '−' + UI.inr(c.money.deductible))}
          </div>
        </div>` : ''}

      <div class="tcard">
        <div class="tk">Estimated processing time</div>
        <div class="tv">${UI.esc(o.timing)}</div>
        <div class="td2">${UI.esc(o.timingSub)}</div>
      </div>

      ${c.lane === 'G' ? `
        <div class="nosurvey" style="margin-bottom:var(--s3);">
          <div class="big">✓</div>
          <div><b>No survey required.</b>
            <div class="sub">Nobody needs to come and look at your vehicle.</div></div>
        </div>` : ''}

      ${UI.sec('What happens next')}
      <div class="nextlist">
        ${NEXT.map((t, i) => `<div class="nx"><span>${i + 1}</span>${UI.esc(t)}</div>`).join('')}
      </div>

      <div class="hr"></div>
      ${UI.sec('Your claim')}
      <div class="rows" style="font-size:var(--t-xs);">
        ${UI.row('Claim reference', UI.esc(c.ref || c.id), true)}
        ${UI.row('Vehicle', UI.esc(c.policy.vehicle))}
        ${UI.row('Reported', UI.dt(c.ts))}
        ${UI.row('Photos submitted', (c.shots || []).length + ' of 4')}
      </div>`;

    $('phFoot').innerHTML = `<button class="btn" onclick="CPClaimant.go(7)">Track my claim →</button>`;

    side('Step 6 of 7', 'One routing decision, three experiences',
      `Trust Score ${c.trust.score} → ${c.laneLabel} lane.`,
      `<p style="font-size:var(--t-sm);line-height:1.65;">
         The customer is never shown the Trust Score, the engine scores or the fraud
         reasoning. A red claimant may be entirely innocent — telling them a graph flagged
         their garage is both a legal exposure and simply not decent.</p>
       <p style="font-size:var(--t-sm);line-height:1.65;margin-top:var(--s2);">
         What they always get is the honest answer to <b>what happens next</b> and
         <b>how long</b>. Everything below is the internal view, on the Command Center only.</p>
       <div class="hr"></div>
       ${UI.sec('How the score was built · internal')}
       <div class="fuse">
         ${c.trust.parts.map(p => `
           <div class="f">
             <div class="nm">${UI.esc(p.label)}</div>
             <div class="raw">${p.raw}</div>
             <div class="w">×${p.w}%</div>
             <div class="c">${p.contribution.toFixed(2)}</div>
             <div class="bar">${UI.meter(p.raw / 100, laneTone(p.raw))}</div>
           </div>`).join('')}
         <div class="total"><div class="nm">TRUST SCORE</div><div class="c">${c.trust.score}</div></div>
       </div>
       <div class="hr"></div>
       <div style="font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
         The contribution column sums to the headline figure. Nothing on this screen was
         stored — it was computed from the five sub-scores.
       </div>`,
      `<div class="card">
        ${UI.sec('This claim vs the process today')}
        <div class="rows">
          ${UI.row('Turnaround', c.laneTat + ' d from ' + CP_CONST.TAT_TODAY + ' d')}
          ${UI.row('Manual touches', c.laneTouches + ' from ' + CP_CONST.TOUCHES_TODAY)}
          ${UI.row('Cost to serve', UI.inr(c.costToServe) + ' from ' + UI.inr(CP_CONST.COST_TO_SERVE_TODAY))}
          ${UI.row('GenAI calls made', c.genAiCalls === 0
            ? '<span style="color:var(--green);font-weight:800">0 · ₹0 in tokens</span>' : c.genAiCalls)}
        </div>
      </div>`);
  }

  const laneTone = (s) => s >= 82 ? 'g' : s >= 55 ? 'a' : 'r';

  /* ================= STEP 7 · TRACKER ================= */
  function tracker() {
    const c = claim;
    head('Your claim', c.ref || c.id);

    const ov = c.overridden;
    $('phBody').innerHTML = `
      ${ov ? `<div class="overridden" style="margin-bottom:var(--s3);">
          <b>Updated by a claims reviewer.</b><br>${UI.esc(ov.note || ('Moved to the ' + ov.lane + ' lane.'))}
        </div>` : ''}
      ${c.survey ? `
        <div class="apt">
          <div class="apt-h">Survey appointment booked</div>
          <div class="apt-when">${UI.esc(c.survey.date)} · ${UI.esc(c.survey.slot)}</div>
          <div class="apt-who">${UI.esc(c.survey.name)} · IRDAI-licensed surveyor</div>
          <div class="apt-note">Please have the vehicle available and keep your policy
            documents to hand. You do not need to be present for the whole slot.</div>
        </div>` : ''}
      <div class="track">
        ${c.timeline.map(s => `
          <div class="tstep ${s.done ? 'done' : s.now ? 'now' : ''}">
            <div class="dot">${s.done ? '✓' : s.now ? '•' : ''}</div>
            <div>
              <div class="tt">${UI.esc(s.t)}</div>
              <div class="td">${UI.esc(s.d)}</div>
              <div class="tm">${UI.dt(s.at)}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="hr"></div>
      ${UI.sec('Evidence you submitted')}
      <div class="shots">${(c.shots || []).map((s, i) =>
        `<div class="shot done"><img src="${s}" alt="frame ${i + 1}"></div>`).join('')}</div>
      <div style="font-size:var(--t-micro);color:var(--dim);font-family:var(--m);margin-top:var(--s2);line-height:1.6;">
        No further documents will be requested. Status is pushed to you — you do not have to
        come back and check.
      </div>`;

    $('phFoot').innerHTML = `
      <button class="btn ghost" onclick="CPClaimant.reset()">File another claim</button>`;

    side('Step 7 of 7', 'Proactive status, not a status page',
      'The claim is now visible on every other surface.',
      `<p style="font-size:var(--t-sm);line-height:1.65;">
         This claim has been written to the shared queue. Open the <b>Command Center</b> and
         it is on the board — click it for the Trust Score arithmetic, every engine finding,
         the fraud graph and the surveyor dispatch. Assign a surveyor there and the
         appointment appears on this phone within a second.</p>
       <p style="font-size:var(--t-sm);line-height:1.65;margin-top:var(--s2);">
         ${CPSync.mode === 'live'
           ? 'Sync is live, so it also appeared on every other device open on this room.'
           : 'Sync is running local-only, so it is visible to the other surfaces on this device.'}</p>
       <div class="hr"></div>
       ${UI.sec('Claimant value, at book scale')}
       <div class="rows">
         ${UI.row('Days returned by this claim', (CP_CONST.TAT_TODAY - c.laneTat).toFixed(2) + ' d')}
         ${UI.row('Claimant-days a year', UI.compact(CP_CONST.BOOK.claimantDays))}
         ${UI.row('Claims settled with zero touch', UI.compact(CP_CONST.BOOK.zeroTouch))}
       </div>
       <div class="hr"></div>
       <div style="font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
         Sheet 3 Part I · W-61, W-62, W-63.
       </div>`);
  }

  return { init, reset, go, grab, submit, render, onData,
           pickVehicle, pickType, pickPlace, pickWhen,
           get step() { return step; } };
})();
