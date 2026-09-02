/* =====================================================================
   ClaimPulse app · offline shell
   ---------------------------------------------------------------------
   Two jobs: survive a venue Wi-Fi that drops mid-demo, and give Chrome
   the fetch handler it requires before it will offer "Install app".
   Bump CACHE to ship a new build.
   ===================================================================== */
const CACHE = 'claimpulse-app-v2';

const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', './claimant.js',
  '../assets/css/fonts.css', '../assets/css/tokens.css', '../assets/css/base.css',
  '../assets/css/components.css', '../assets/css/future.css',
  '../assets/fonts/font_0.ttf', '../assets/fonts/font_1.ttf', '../assets/fonts/font_2.ttf',
  '../assets/fonts/font_3.ttf', '../assets/fonts/font_4.ttf', '../assets/fonts/font_5.ttf',
  '../assets/js/core.js', '../assets/js/model.js', '../assets/js/engine.js',
  '../assets/js/claims.js'
];

self.addEventListener('install', e => {
  /* One bad URL must not fail the whole install, or the app is left with
     no cache at all — which is the opposite of what this file is for. */
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
