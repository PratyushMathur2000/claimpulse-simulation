/* =====================================================================
   ClaimPulse · Sync
   ---------------------------------------------------------------------
   One store, two backends.

     LIVE   Firestore. A claim filed on a phone appears on every other
            open surface in about a second. This is the cross-device
            moment: judge files on their handset, it lands on the
            projected Ops Console.

     LOCAL  localStorage + BroadcastChannel. Same API, same behaviour
            across tabs on one machine, zero network.

   The app never chooses. Sync tries Firestore, and if anything at all
   goes wrong — no config, no network, blocked venue wifi, rules
   rejection — it falls back to LOCAL silently and the demo continues.
   A demo that can hard-fail on stage is not a demo.
   ===================================================================== */

const CPSync = (() => {

  const FIREBASE = {
    apiKey: 'AIzaSyAGBvgslSLQQfI2e_-z0UG66okMDDkgM7U',
    authDomain: 'claimpulse-demo-atom9.firebaseapp.com',
    projectId: 'claimpulse-demo-atom9',
    storageBucket: 'claimpulse-demo-atom9.firebasestorage.app',
    messagingSenderId: '400259775107',
    appId: '1:400259775107:web:0356a35ac258430ddcb9b6'
  };

  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const CAP = 60;                 // claims kept in the queue
  const CONNECT_TIMEOUT = 6000;   // ms before we stop waiting and go local

  let mode = 'connecting';        // connecting | live | local
  let room = 'atom9';
  let claims = [];
  let listeners = [];
  let fs = null;                  // { db, collection, addDoc, updateDoc, doc, ... }
  let channel = null;
  let deviceId = null;

  /* ---------------- public ---------------- */

  async function init() {
    room = new URLSearchParams(location.search).get('room') || 'atom9';
    deviceId = localStorage.getItem('cp_device')
      || (localStorage.setItem('cp_device', rid(6)), localStorage.getItem('cp_device'));

    try {
      await Promise.race([connectFirestore(), timeout(CONNECT_TIMEOUT)]);
    } catch (e) {
      console.warn('ClaimPulse: live sync unavailable, running local.', e && e.message);
      goLocal();
    }
    return mode;
  }

  /* Add a claim. Returns the id it was stored under. */
  async function add(claim) {
    const rec = serialise(claim);

    if (mode === 'live') {
      try {
        const ref = await fs.addDoc(fs.collection(fs.db, 'rooms', room, 'claims'), rec);
        return ref.id;                       // onSnapshot will deliver it
      } catch (e) {
        console.warn('ClaimPulse: write failed, dropping to local.', e.message);
        goLocal();
      }
    }
    const local = Object.assign({ id: claim.id || rid(10) }, claim);
    claims = [local, ...claims].slice(0, CAP);
    persistLocal();
    emit();
    return local.id;
  }

  /* Patch a claim — used by the ops override.
     The record travels as one JSON payload, so a patch is a read, a merge
     and a whole-record write. Last write wins, which is the right
     behaviour for a demo with one adjuster on stage. */
  async function update(id, patch) {
    const c = claims.find(x => x.id === id);
    if (!c) return;
    const merged = Object.assign({}, c, patch);

    if (mode === 'live') {
      try {
        await fs.updateDoc(fs.doc(fs.db, 'rooms', room, 'claims', id), serialise(merged));
        return;
      } catch (e) {
        console.warn('ClaimPulse: update failed, dropping to local.', e.message);
        goLocal();
      }
    }
    const i = claims.findIndex(x => x.id === id);
    if (i >= 0) claims[i] = merged;
    persistLocal();
    emit();
  }

  async function clear() {
    if (mode === 'live') {
      try {
        const snap = await fs.getDocs(fs.collection(fs.db, 'rooms', room, 'claims'));
        await Promise.all(snap.docs.map(d => fs.deleteDoc(d.ref)));
        return;
      } catch (e) { console.warn('ClaimPulse: clear failed.', e.message); }
    }
    claims = [];
    persistLocal();
    emit();
  }

  const onChange = (fn) => { listeners.push(fn); fn(claims, mode); };
  const all = () => claims;
  const get = (id) => claims.find(c => c.id === id);
  const shareUrl = () => location.origin + location.pathname + '?room=' + room;

  /* ---------------- Firestore ---------------- */

  async function connectFirestore() {
    // No sign-in step. The rules confine access to one demo path holding
    // synthetic claims only, so nothing stands between a judge scanning the
    // QR and the app working.
    const [app, store] = await Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-firestore.js')
    ]);

    const a = app.initializeApp(FIREBASE);
    const db = store.getFirestore(a);
    fs = {
      db,
      collection: store.collection, addDoc: store.addDoc, doc: store.doc,
      updateDoc: store.updateDoc, getDocs: store.getDocs, deleteDoc: store.deleteDoc
    };

    // Live subscription. The first snapshot also seeds the queue.
    const q = store.query(
      store.collection(db, 'rooms', room, 'claims'),
      store.orderBy('createdAt', 'desc'),
      store.limit(CAP)
    );

    await new Promise((resolve, reject) => {
      let first = true;
      store.onSnapshot(q,
        (snap) => {
          claims = snap.docs.map(d => deserialise(d.id, d.data())).filter(Boolean);
          if (first) { first = false; mode = 'live'; resolve(); }
          emit();
        },
        (err) => { if (first) { first = false; reject(err); } else goLocal(); }
      );
    });
  }

  /* ---------------- local backend ---------------- */

  function goLocal() {
    if (mode === 'local') return;
    mode = 'local';
    fs = null;
    // Keep whatever is already on screen. Falling back mid-demo must not
    // make the queue appear to empty itself in front of the room.
    const seen = new Set(claims.map(c => c.id));
    claims = claims.concat(readLocal().filter(c => !seen.has(c.id))).slice(0, CAP);
    if (!channel && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('claimpulse-' + room);
      channel.onmessage = () => { claims = readLocal(); emit(); };
    }
    // Another tab wrote directly to storage.
    window.addEventListener('storage', e => {
      if (e.key === key()) { claims = readLocal(); emit(); }
    });
    emit();
  }

  const key = () => 'cp_claims_' + room;
  function readLocal() {
    try { return JSON.parse(localStorage.getItem(key()) || '[]'); }
    catch (e) { return []; }
  }
  function persistLocal() {
    try { localStorage.setItem(key(), JSON.stringify(claims)); }
    catch (e) { /* quota — the queue is capped, so this is survivable */ }
    if (channel) channel.postMessage(1);
  }

  /* ---------------- helpers ---------------- */

  /* A claim carries structures a document store will not take as-is —
     most notably the fraud graph's edge list, which is an array of
     arrays, and Firestore rejects nested arrays outright. Rather than
     flatten each one and have the next nested field break it again, the
     whole record travels as a single JSON payload with only the fields
     the query needs left at the top level.

     ponytail: one opaque payload, not a document schema. If the queue
     ever needs server-side filtering beyond ordering, promote those
     fields out of the payload and index them. */
  function serialise(c) {
    const rec = {
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
      device: c.device || deviceId,
      lane: c.lane || 'G',
      payload: JSON.stringify(c, (k, v) => v instanceof Date ? v.toISOString() : v)
    };
    return rec;
  }

  /* Read one back out. Anything malformed is dropped rather than allowed
     to take the whole queue down mid-demo. */
  function deserialise(id, d) {
    try {
      const c = JSON.parse(d.payload);
      c.ref = c.ref || c.id;    // the CLM-xxxxx a human reads
      c.id = id;                // the store's key, used for updates
      c.createdAt = d.createdAt;
      return c;
    } catch (e) {
      console.warn('ClaimPulse: skipping an unreadable claim record.', id);
      return null;
    }
  }

  function emit() { listeners.forEach(fn => { try { fn(claims, mode); } catch (e) { console.error(e); } }); }
  const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  const rid = (n) => Math.random().toString(36).slice(2, 2 + n);

  return {
    init, add, update, clear, onChange, all, get, shareUrl,
    get mode() { return mode; },
    get room() { return room; },
    get device() { return deviceId; }
  };
})();
