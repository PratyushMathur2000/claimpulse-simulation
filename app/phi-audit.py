# -*- coding: utf-8 -*-
"""ClaimPulse - golden ratio audit.

The design system claims every font-size, spacing, size and radius sits on
one of two ladders:

  TYPE   15 x phi^(n/4)   quarter steps of the golden ratio from a 15px base
  SPACE  Fibonacci        5 8 13 21 34 55 89 144 233 ... (ratios -> phi)

A comment that says so is worth nothing. This checks it, prints anything
off-ladder with the step it should snap to, and exits non-zero so the claim
cannot quietly stop being true.

  npm run phi
"""
import io, re, sys, collections

p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()

PHI = 1.6180339887
ROOT = 15.0

# The declared type ladder: 15 * phi^(n/4)
type_ladder = {}
for n in range(-6, 13):
    v = ROOT * (PHI ** (n / 4.0))
    type_ladder[round(v, 1)] = "15 x phi^(%s/4)" % n

# The declared space ladder: Fibonacci
fib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]
space_ladder = set(fib)

# Hairlines and optical values that are not ladder decisions.
EXEMPT_PROPS = {'border', 'border-width', 'border-top', 'border-bottom',
                'border-left', 'border-right', 'letter-spacing', 'outline',
                'box-shadow', 'text-shadow', 'stroke-width', 'transform',
                'top', 'left', 'right', 'bottom', 'flex', 'inset'}

LADDER_PROPS = ('font-size', 'padding', 'margin', 'gap', 'width', 'height',
                'max-width', 'min-width', 'max-height', 'min-height',
                'border-radius', 'grid-template-columns')

decl = re.compile(r'([a-z-]+)\s*:\s*([^;{}]+)[;}]')
pxval = re.compile(r'(-?\d+(?:\.\d+)?)px')

offenders = collections.Counter()
detail = collections.defaultdict(list)
total = 0

# Strip comments so prose examples are not scanned.
body = re.sub(r'/\*.*?\*/', '', s, flags=re.S)

for m in decl.finditer(body):
    prop, val = m.group(1), m.group(2)
    if prop in EXEMPT_PROPS:
        continue
    if not any(prop == q or prop.startswith(q) for q in LADDER_PROPS):
        continue
    for raw in pxval.findall(val):
        n = abs(float(raw))
        if n == 0 or n == 1:
            continue
        total += 1
        if prop == 'font-size':
            ok = round(n, 1) in type_ladder
        else:
            ok = (n in space_ladder) or n in (382, 618, 1000)
        if not ok:
            offenders[(prop, n)] += 1
            # nearest ladder value, for the fix
            cand = sorted(type_ladder) if prop == 'font-size' else sorted(space_ladder)
            near = min(cand, key=lambda c: abs(c - n))
            detail[(prop, n)] = near

print("hard px values on ladder-governed properties: %d" % total)
print("off-ladder: %d  (%.0f%%)\n" % (sum(offenders.values()),
                                      100.0 * sum(offenders.values()) / max(total, 1)))
print("%-22s %8s %5s  %s" % ("property", "value", "uses", "nearest ladder step"))
print("-" * 62)
for (prop, n), c in offenders.most_common(40):
    print("%-22s %8s %5d  -> %s" % (prop, ("%g" % n) + "px", c, ("%g" % detail[(prop, n)]) + "px"))

sys.exit(1 if offenders else 0)
