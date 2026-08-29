/* =====================================================================
   ClaimPulse · Core — DOM helpers, formatting, theme, tooltip
   ===================================================================== */

const CP = (() => {

  /* ---------------- DOM ---------------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* el('div.card', {attrs}, [children | string]) */
  function el(spec, attrs = {}, kids = []) {
    const [tagPart, ...classes] = String(spec).split('.');
    const tag = tagPart || 'div';
    const node = document.createElementNS(
      ['svg','g','path','rect','circle','line','text','tspan','polyline','polygon','defs','linearGradient','stop','clipPath','ellipse']
        .includes(tag) ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml',
      tag
    );
    if (classes.length) node.setAttribute('class', classes.join(' '));
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class')      node.setAttribute('class', ((node.getAttribute('class') || '') + ' ' + v).trim());
      else if (k === 'html')  node.innerHTML = v;
      else if (k === 'text')  node.textContent = v;
      /* Custom properties need setProperty; Object.assign silently drops
         them, which is how a themed component ends up with no theme. */
      else if (k === 'style' && typeof v === 'object') {
        for (const [pk, pv] of Object.entries(v)) {
          if (pv === null || pv === undefined) continue;
          if (pk.startsWith('--')) node.style.setProperty(pk, String(pv));
          else node.style[pk] = pv;
        }
      }
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    }
    (Array.isArray(kids) ? kids : [kids]).forEach(k => {
      if (k === null || k === undefined || k === false) return;
      node.appendChild(typeof k === 'string' || typeof k === 'number'
        ? document.createTextNode(String(k)) : k);
    });
    return node;
  }

  const clear = n => { while (n && n.firstChild) n.removeChild(n.firstChild); return n; };
  const mount = (n, kids) => { clear(n); (Array.isArray(kids)?kids:[kids]).forEach(k => k && n.appendChild(k)); return n; };

  /* ---------------- Formatting ----------------
     Indian conventions throughout: rupee crore for money, lakh/crore
     grouping for counts. A figure is never shown to more precision than
     the model can defend — two decimals on crore, none on counts.       */
  const nf = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v))
    ? '—'
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

  const fmt = {
    /* Rs Cr */
    cr:   (v, d = 2) => nf(v, d),
    crSigned: (v, d = 2) => (v >= 0 ? '+' : '−') + nf(Math.abs(v), d),
    money: (v, d = 2) => '₹' + nf(v, d) + ' Cr',
    /* counts */
    n:    (v) => nf(Math.round(v)),
    n1:   (v) => nf(v, 1),
    /* compact for axis ticks */
    compact: (v) => {
      const a = Math.abs(v);
      if (a >= 1e7) return nf(v / 1e7, 1) + ' Cr';
      if (a >= 1e5) return nf(v / 1e5, 1) + ' L';
      if (a >= 1e3) return nf(v / 1e3, 0) + 'k';
      return nf(v, a < 10 && a % 1 !== 0 ? 1 : 0);
    },
    pct:  (v, d = 1) => nf(v * 100, d) + '%',
    pp:   (v, d = 2) => nf(v, d) + ' pp',
    days: (v, d = 2) => nf(v, d) + ' d',
    mo:   (v, d = 1) => nf(v, d) + ' mo',
    x:    (v, d = 1) => nf(v, d) + '×'
  };

  /* ---------------- Theme ----------------
     Three states: an explicit light stamp, an explicit dark stamp, and
     "system", which stamps nothing and lets prefers-color-scheme decide. */
  const THEME_KEY = 'cp.theme';
  const theme = {
    get() {
      try { return localStorage.getItem(THEME_KEY) || 'system'; }
      catch { return 'system'; }
    },
    set(mode) {
      try { mode === 'system' ? localStorage.removeItem(THEME_KEY)
                              : localStorage.setItem(THEME_KEY, mode); } catch {}
      theme.apply(mode);
    },
    apply(mode) {
      const root = document.documentElement;
      if (mode === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', mode);
      document.dispatchEvent(new CustomEvent('cp:theme', { detail: { mode } }));
    },
    resolved() {
      const m = theme.get();
      if (m !== 'system') return m;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    init() { theme.apply(theme.get()); }
  };

  /* ---------------- Tooltip (one node, reused) ---------------- */
  let tipNode = null;
  const tip = {
    node() {
      if (!tipNode) { tipNode = el('div.tip', { role: 'tooltip' }); document.body.appendChild(tipNode); }
      return tipNode;
    },
    show(x, y, title, rows) {
      const n = tip.node();
      mount(n, [
        title ? el('div.tip-t', { text: title }) : null,
        ...(rows || []).map(r => el('div.tip-r', {}, [
          el('span', { text: r[0] }),
          el('span', { text: r[1] })
        ]))
      ]);
      n.setAttribute('data-show', 'true');
      const b = n.getBoundingClientRect();
      const pad = 14;
      let left = x + pad, top = y + pad;
      if (left + b.width  > window.innerWidth  - 8) left = x - b.width  - pad;
      if (top  + b.height > window.innerHeight - 8) top  = y - b.height - pad;
      n.style.left = Math.max(8, left) + 'px';
      n.style.top  = Math.max(8, top) + 'px';
    },
    hide() { if (tipNode) tipNode.setAttribute('data-show', 'false'); }
  };

  /* ---------------- Misc ---------------- */
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  return { $, $$, el, clear, mount, fmt, nf, theme, tip, clamp, debounce, css };
})();
