/* =========================================================================
   ClaimPulse - theme switch
   -------------------------------------------------------------------------
   CANONICAL at assets/js/theme.js; a byte-identical copy lives at
   app/www/assets/js/theme.js for the same reason theme.css is copied - www/
   is the document root for `npm start`, verify.js and the Capacitor APK.
   `npm run tokens` fails the build if the copies drift.

   Loaded SYNCHRONOUSLY in <head>, before the stylesheet. That is deliberate:
   the attribute has to be on <html> before first paint, or a light-default
   page flashes dark on every load. A deferred or async script would show
   the flash.

   Light is the default. Dark is a deliberate choice that is remembered.
   ========================================================================= */
(function () {
  'use strict';
  var KEY = 'cp-theme';
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }   /* private mode throws */
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  /* runs immediately, before <body> exists */
  root.setAttribute('data-theme', read() === 'dark' ? 'dark' : 'light');

  function label(t) { return t === 'light' ? '☾' : '☀'; }        /* moon / sun */
  function title(t) {
    return t === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
  }

  function apply(t) {
    root.setAttribute('data-theme', t);
    write(t);
    Array.prototype.forEach.call(document.querySelectorAll('.theme-toggle'), function (b) {
      b.textContent = label(t);
      b.setAttribute('title', title(t));
      b.setAttribute('aria-label', title(t));
      b.setAttribute('aria-pressed', String(t === 'dark'));
    });
    /* Charts are drawn to canvas, which cannot inherit a CSS variable, so the
       page that owns them repaints them itself. */
    if (typeof window.repaintCharts === 'function') { window.repaintCharts(); }
    window.dispatchEvent(new CustomEvent('cp-theme', { detail: t }));
  }

  window.CPTheme = {
    get: function () { return root.getAttribute('data-theme'); },
    set: apply,
    toggle: function () { apply(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light'); }
  };

  /* The button is injected rather than written into three files, so the three
     surfaces cannot drift apart. It goes in the rail where there is one, and
     falls back to a fixed corner on the home page, which has no rail. */
  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.theme-toggle')) { return; }
    var t = document.createElement('button');
    var cur = root.getAttribute('data-theme');
    t.className = 'theme-toggle';
    t.type = 'button';
    t.textContent = label(cur);
    t.setAttribute('title', title(cur));
    t.setAttribute('aria-label', title(cur));
    t.setAttribute('aria-pressed', String(cur === 'dark'));
    t.addEventListener('click', function () { window.CPTheme.toggle(); });

    var rail = document.querySelector('.sidebar, .navrail');
    if (rail) { rail.appendChild(t); } else { t.classList.add('floating'); document.body.appendChild(t); }
  });
})();
