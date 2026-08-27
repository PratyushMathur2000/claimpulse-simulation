# -*- coding: utf-8 -*-
"""ClaimPulse Live Operations - design-token audit.

assets/css/theme.css is the source of truth for the design system across all
three surfaces. This checks two things: that this workspace does not invent
values theme.css does not define, and that the two copies of theme.css - the
canonical one at the repo root and the one inside www/ - have not drifted.

It replaces an earlier golden-ratio audit. That audit was internally
consistent and checked the wrong thing: a phi ladder the parent product did
not share is not a design system, it is a second product. What matters is
agreement with the parent, so that is what is measured.

  npm run tokens
"""
import io, re, sys, collections

CSS = sys.argv[1]
SIM = sys.argv[2] if len(sys.argv) > 2 else None

# ---- the simulator's scale, read from its own :root where possible --------
SCALE = {11.5, 12.5, 13.5, 15.5, 18.5, 21.0, 25.0}          # --s-xs .. --s-2xl
# sizes and gaps the simulator uses literally in its component rules
LITERAL = {2, 3, 4, 6, 7, 8, 9.5, 10, 10.5, 11, 12, 14, 16, 18, 19, 20, 22,
           24, 30, 32, 40, 48, 56, 80, 100, 120, 233, 380, 560, 1200, 1560,
           8.5,                       # the simulator's own .sidebar-logo sub-label
           382, 618}                  # the phone mock-up: a device shape, not a grid step
ALLOWED = SCALE | LITERAL

if SIM:
    try:
        sim = io.open(SIM, encoding='utf-8').read()
        root = sim[sim.index(':root{'):sim.index('\n}', sim.index(':root{'))]
        for v in re.findall(r'(\d+(?:\.\d+)?)px', root):
            ALLOWED.add(float(v))
    except Exception as e:
        print('  (could not read the simulator root: %s)' % e)

LADDER_PROPS = ('font-size', 'padding', 'margin', 'gap', 'width', 'height',
                'max-width', 'min-width', 'max-height', 'min-height',
                'border-radius', 'grid-template-columns', 'flex-basis')
EXEMPT = {'border', 'border-width', 'border-top', 'border-bottom', 'border-left',
          'border-right', 'letter-spacing', 'outline', 'box-shadow', 'text-shadow',
          'stroke-width', 'transform', 'top', 'left', 'right', 'bottom', 'inset',
          'flex', 'background', 'animation', 'transition', 'font', 'backdrop-filter'}

s = io.open(CSS, encoding='utf-8').read()
body = re.sub(r'/\*.*?\*/', '', s, flags=re.S)          # ignore prose
body = body[body.index('\n}', body.index(':root{')):]   # ignore the token block itself

off = collections.Counter()
total = 0
for m in re.finditer(r'([a-z-]+)\s*:\s*([^;{}]*?)[;}]', body):
    prop, val = m.group(1), m.group(2)
    if prop in EXEMPT or not any(prop == q or prop.startswith(q) for q in LADDER_PROPS):
        continue
    for raw in re.findall(r'(-?\d+(?:\.\d+)?)px', val):
        n = abs(float(raw))
        if n in (0, 1):
            continue
        total += 1
        if n not in ALLOWED:
            off[(prop, n)] += 1

print('ClaimPulse Live Operations vs the Executive Simulator\n')
print('hard px values on scale-governed properties: %d' % total)
print('not on the parent\'s scale: %d  (%.0f%%)\n' % (sum(off.values()),
      100.0 * sum(off.values()) / max(total, 1)))
if off:
    print('%-22s %9s %6s' % ('property', 'value', 'uses'))
    print('-' * 40)
    for (prop, n), c in off.most_common(30):
        near = min(ALLOWED, key=lambda a: abs(a - n))
        print('%-22s %9s %6d   -> %gpx' % (prop, ('%g' % n) + 'px', c, near))

# ---- theme.css copy drift -------------------------------------------------
# www/ is the document root for `npm start`, verify.js and the Capacitor APK,
# so a ../ path out of it would 404 in all three. The file is copied instead,
# which means it can drift, which means it has to be checked.
CANON = '../assets/css/theme.css'
COPY  = 'www/assets/css/theme.css'
drift = None
try:
    a = io.open(CANON, encoding='utf-8').read()
    b = io.open(COPY,  encoding='utf-8').read()
    if a != b:
        drift = 'contents differ (%d vs %d bytes)' % (len(a), len(b))
except Exception as e:
    drift = 'could not compare: %s' % e

print()
if drift:
    print('theme.css SYNC: FAIL - %s' % drift)
    print('  fix with:  cp %s %s' % (CANON, COPY))
else:
    print('theme.css SYNC: ok - root and www/ copies are identical')

sys.exit(1 if (off or drift) else 0)
