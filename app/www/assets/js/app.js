/* =====================================================================
   ClaimPulse · App shell
   Surface routing, sync boot, the share sheet and the stage shortcuts.
   ===================================================================== */

const CPApp = (() => {

  /* The rail mirrors the parent product's information architecture, not
     this workspace's file layout:

       CLAIMPULSE
       ├── Decision layer   — the case and the levers behind it
       └── Live operations  — the claims floor, which is what this is

     Grouping matters more than it looks. Eight flat items read as another
     application's menu; two named groups read as one workspace inside a
     larger product, which is what this is. */
  const SURFACES = [
    { k: 'impact',    ico: '📈', nm: 'Executive Case',     grp: 'Decision layer',   mod: () => CPImpact },
    { k: 'sim',       ico: '🎛️', nm: 'Scenario Simulator', grp: 'Decision layer',   mod: () => CPSim },
    { k: 'ops',       ico: '🖥️', nm: 'Command Center',     grp: 'Live operations',  mod: () => CPOps },
    { k: 'inspector', ico: '🔍', nm: 'Claim Inspector',    grp: 'Live operations',  mod: () => CPInspector },
    { k: 'network',   ico: '🔧', nm: 'Garage Network',     grp: 'Live operations',  mod: () => CPNetwork },
    { k: 'claimant',  ico: '📱', nm: 'Customer Journey',   grp: 'Live operations',  mod: () => CPClaimant },
    { k: 'audit',     ico: '⚖️', nm: 'Audit Trail',        grp: 'Live operations',  mod: () => CPAudit },
    { k: 'pilot',     ico: '🧪', nm: 'Controlled Pilot',   grp: 'Live operations',  mod: () => CPPilot }
  ];

  let surface = 'ops';
  let scenario = 'clean';

  /* ---------------- routing ---------------- */
  function go(k) {
    if (!SURFACES.some(s => s.k === k)) return;
    surface = k;
    SURFACES.forEach(s => {
      const v = UI.$('v-' + s.k);
      if (v) v.classList.toggle('on', s.k === k);
      const b = UI.$('nav-' + s.k);
      if (b) b.classList.toggle('on', s.k === k);
    });
    history.replaceState(null, '', '#' + k + location.search.replace(/^\?/, '&').replace(/^&$/, ''));
    const meta = SURFACES.find(s => s.k === k);
    const t = UI.$('surfaceTitle');
    if (t) t.textContent = meta.nm;
    const c = document.querySelector('.crumb');
    if (c) c.innerHTML = '<a href="../">ClaimPulse</a> <span>›</span> ' + UI.esc(meta.grp);
    const m = meta.mod();
    if (m && m.render) m.render();
  }

  function paintNav() {
    let html = '', grp = null, n = 0;
    SURFACES.forEach(s => {
      if (s.grp !== grp) {
        grp = s.grp;
        html += `<div class="navgrp">${UI.esc(grp)}</div>`;
      }
      n++;
      html += `<button id="nav-${s.k}" class="${s.k === surface ? 'on' : ''}"
                 onclick="CPApp.go('${s.k}')" title="${UI.esc(s.nm)}">
         <span class="no">${String(n).padStart(2, '0')}</span>
         <span class="ico">${s.ico}</span>
         <span class="nm">${UI.esc(s.nm)}</span>
       </button>`;
    });
    UI.set('surfaceNav', html);
  }

  /* ---------------- scenario (drives the claimant flow) ---------------- */
  /* Quiet: change which scenario the pipeline will run without bouncing
     the customer out of the screen they are on. The vehicle picker uses
     this, because there the choice IS the scenario. */
  function setScenarioQuiet(k) { if (CP_SCENARIOS[k]) scenario = k; }

  function setScenario(k) {
    setScenarioQuiet(k);
    if (CPClaimant.reset) CPClaimant.reset();
  }

  /* ---------------- sync status ---------------- */
  function paintSync() {
    const p = UI.$('syncPill'), t = UI.$('syncTxt');
    if (!p) return;
    p.className = 'syncpill ' + (CPSync.mode === 'live' ? 'live' : CPSync.mode === 'local' ? 'local' : '');
    // The room used to ride along here. In an 89px rail it wrapped into an
    // unreadable stack of digits, and it is already on the share sheet and
    // in this pill's tooltip, so the rail shows the state word only.
    t.textContent = CPSync.mode === 'live' ? 'live'
                  : CPSync.mode === 'local' ? 'local'
                  : '···';
    p.title = CPSync.mode === 'live'
      ? 'Live · room ' + CPSync.room + '. Claims sync across every device on this room. Click to share.'
      : CPSync.mode === 'local'
        ? 'No network — claims stay on this device. The demo still runs end to end.'
        : 'Connecting…';
  }

  /* ---------------- pilot strip ----------------
     A shadow-mode pilot that is only visible on its own tab is a pilot
     somebody will forget is running while they read a number off the
     Command Center. So it announces itself on every surface. */
  function paintPilotBar() {
    const el = UI.$('pilotBar');
    if (!el) return;
    if (!CPPilot || !CPPilot.active) { el.innerHTML = ''; return; }
    const m = CPPilot.metrics(), ph = CPPilot.phase();
    el.innerHTML = `
      <div class="pilotbar">
        <span class="pilotchip live">● SHADOW MODE</span>
        <span class="pb-t"><b>Day ${CPPilot.cfg.day}</b> of ${CPPilot.cfg.days} ·
          Phase ${ph.no} ${UI.esc(ph.nm)}</span>
        <span class="pb-t">Cohort <b>${m.cohort}</b> claims · <b>${m.judged}</b> judged</span>
        <span class="pb-note">ClaimPulse recommends. The claims team decides.</span>
        <button class="btn ghost sm" onclick="CPApp.go('pilot')">Open pilot workspace</button>
      </div>`;
  }

  /* ---------------- share sheet ---------------- */
  function share() {
    const url = CPSync.shareUrl();
    UI.set('sheetHost', `
      <div class="sheet" onclick="if(event.target===this)CPApp.closeSheet()">
        <div class="box">
          <h3>Open ClaimPulse on your phone</h3>
          <div class="sub">${CPSync.mode === 'live'
            ? 'Anything you file appears on this screen within a second.'
            : 'Live sync is unavailable, so claims will stay on the device that files them.'}</div>
          ${CPSync.room === 'atom9'
            ? `<img class="qr" src="assets/qr.png" alt="QR code to open ClaimPulse"
                    onerror="this.style.display='none'">`
            : `<div class="qr" style="display:grid;place-items:center;text-align:center;
                    color:var(--mist);font-size:var(--t-xs);line-height:1.6;padding:var(--s4);">
                 The printed QR opens the default room.<br>
                 You are on <b>${UI.esc(CPSync.room)}</b> — share the link below instead,
                 or drop <code style="font-family:var(--m)">?room=</code> from the address
                 to use the QR.
               </div>`}
          <div class="url">${UI.esc(url)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2);">
            <button class="btn ghost" onclick="CPApp.copy('${UI.esc(url)}', this)">Copy link</button>
            <button class="btn" onclick="CPApp.closeSheet()">Done</button>
          </div>
          <div class="hr"></div>
          <div style="font-size:var(--t-xs);color:var(--body);line-height:1.7;text-align:left;">
            <b>Install it as an app:</b> open this page on the phone, then
            <b>Add to Home Screen</b> — Share menu on iPhone, the ⋮ menu on Android.
            It launches full screen with no browser chrome.
          </div>
          <div id="apkSlot"></div>

          <div style="margin-top:var(--s3);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);line-height:1.6;">
            Room <b>${UI.esc(CPSync.room)}</b> · demo claims only, no real policyholder data<br>
            Add <b>?room=yourname</b> to the link for a private queue
          </div>
        </div>
      </div>`);
    offerApk();
  }

  /* The APK ships with the Vercel build but is excluded from the Firebase
     one — the free Spark plan refuses to host executables. So the button
     is only drawn once the file is confirmed reachable. A download link
     that 404s in front of a judge is worse than no link at all. */
  async function offerApk() {
    const slot = UI.$('apkSlot');
    if (!slot) return;
    try {
      const r = await fetch('ClaimPulse-demo.apk', { method: 'HEAD' });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || type.includes('text/html')) return;   // rewritten to index.html
      slot.innerHTML = `
        <a class="btn ghost" href="ClaimPulse-demo.apk" download
           style="text-decoration:none;margin-top:var(--s3);">⬇ Or install the Android app</a>
        <div style="margin-top:var(--s2);font-size:var(--t-micro);color:var(--dim);font-family:var(--m);">
          Android only · you will have to allow install from this browser
        </div>`;
    } catch (e) { /* offline or blocked — the Add to Home Screen route still stands */ }
  }

  const closeSheet = () => UI.set('sheetHost', '');
  function copy(url, btn) {
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    if (btn) btn.textContent = 'Copied ✓';
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    if (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
      document.body.classList.add('native');
    }
    paintNav();
    paintSync();
    paintPilotBar();
    CPPilot.onChange(paintPilotBar);

    // Surfaces render immediately against whatever the store already has;
    // sync then pushes updates in. Nothing blocks on the network.
    SURFACES.forEach(s => { const m = s.mod(); if (m && m.init) m.init(); });

    CPSync.onChange(() => {
      paintSync();
      SURFACES.forEach(s => {
        const m = s.mod();
        if (m && m.onData) m.onData(CPSync.all());
      });
    });

    await CPSync.init();
    paintSync();
    await CPOps.seedIfEmpty();

    // A phone opens on the capture flow because that is what you do on a
    // phone; anything wider opens on the board, because that is what you
    // do at a desk. An explicit #hash always wins over both.
    const hash = (location.hash || '').replace('#', '').split('&')[0];
    const isHandset = document.body.classList.contains('native') || window.innerWidth < 900;
    go(SURFACES.some(s => s.k === hash) ? hash : isHandset ? 'claimant' : 'ops');

    // Stage shortcuts: 1-4 pick a demo claim, Q-Y switch surface.
    const keys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'];
    document.addEventListener('keydown', e => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
      const sc = Object.keys(CP_SCENARIOS);
      if (e.key >= '1' && e.key <= String(sc.length)) { setScenario(sc[+e.key - 1]); go('claimant'); }
      if (e.key === '0') { setScenario('clean'); go('ops'); }
      const i = keys.indexOf(e.key.toLowerCase());
      if (i >= 0 && SURFACES[i]) go(SURFACES[i].k);
      if (e.key === 'Escape') closeSheet();
    });

    // Phone clock, and the desk clock on the command centre header.
    const tick = () => {
      const t = new Date();
      const c = UI.$('phClock');
      if (c) c.textContent = t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const d = UI.$('deskClock');
      if (d) d.innerHTML = t.toLocaleDateString('en-IN',
          { weekday: 'long', day: '2-digit', month: 'long' })
        + '<b>' + t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + '</b>';
    };
    tick(); setInterval(tick, 20000);
  }

  document.addEventListener('DOMContentLoaded', boot);

  return {
    go, setScenario, setScenarioQuiet, share, closeSheet, copy, paintSync,
    paintPilotBar, SURFACES,
    get surface() { return surface; },
    get scenario() { return scenario; }
  };
})();
