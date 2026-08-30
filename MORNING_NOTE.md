# What I built while you were asleep

**28 August, overnight.** Everything is in `00 Main Workings/simulation`.
Open `index.html`, or run `python3 -m http.server 8000` in that folder.

---

## Done

**Your three shell changes.**
- The top-bar button now works. On a wide screen it collapses the rail to icons
  (248px → 68px) and remembers the choice; on a phone there is no room for a
  collapsed rail, so it opens and closes the drawer instead. Collapsed links show
  their label as a chip on hover so nothing becomes unfindable.
- The theme control moved to the foot of the rail.
- The Bajaj Finserv lockup is top-right, where the toggle used to be. I rendered
  it as a CSS mask rather than an image, so it takes brand blue on the light
  ground and reverses to white on dark instead of sitting on a hard blue plate.

**All eleven screens are built.** Six in Simulation, five in Demo. Nothing is a
placeholder any more.

**Verified before shipping:** both themes, 1600px and 390px, every screen — no
JavaScript errors, no horizontal overflow, every screen populated. The model
self-check runs 35/35 on your machine after unpacking.

---

## Decisions I made without asking

1. **The demo engine was rebuilt, not ported.** I kept every design constant from
   the old app — fusion weights 30/20/15/25/10, green floor 82, amber floor 55,
   ring floor 0.35 — so nothing you have shown judges before has changed. The code
   around them is new and much shorter.

2. **I fixed two things in the engine that were wrong.** A policy exclusion was
   auto-settling: ClaimPulse now escalates it, because a repudiation carries
   regulatory consequences an engine should not sign. And a Gate 00 hard fail was
   still scoring the five engines it claimed never ran — it now returns
   immediately, and the inspector shows them as NOT RUN with no Trust Score. That
   second one matters: the architecture claim is only true if the code obeys it.

3. **The claim queue is seeded, not random.** Same 64 claims every time. A demo
   that reshuffles between rehearsal and the room will surprise you in the room.

4. **The lane mix lands at 67/22/11 against the book's 65/25/10, and the screen
   says so.** I shaped the evidence distribution, never the lane — every claim is
   still routed by its own score. Sixty-four claims is a small sample and claiming
   an exact match would be the tell that it was faked.

---

## What still needs you

1. **The deck contradicts the workbook.** Slides 8 and 9 lead with ₹43.31 Cr and a
   ₹23.7 Cr labour line. R6 zeroed that line — we do not cut headcount — so the
   honest headline is ₹30.95 Cr, and every rupee figure on slides 8 to 11 needs
   re-reading off R6. This is the biggest open item and it is not a build task.

2. **B-29, the 70% redeployment realisation, is still a placeholder.** It carries
   ₹16.62 Cr of the headline and has no stated basis. It is flagged as a
   placeholder everywhere it appears, including a chip on its own slider. If a
   judge pulls one thread, it will be this one.

3. **Three workbook areas are still on the pre-R6 engine** and I have not touched
   them: Sheet 3 Part L, Sheet 8 Parts C and D, Sheet 12 Parts D to F. Do not
   quote from them. The app recomputes Sheet 12's breakeven live off R6 rather
   than reading the stale cells.

4. **The audit you asked for is parked**, not lost. R6 is staged with a full
   formula dump; the independent recomputation, the internal-consistency sweep and
   the external source checks are still open whenever you want them.

---

## Worth a look first

- **Solution architecture** — the pipeline drawn as a mechanism, and you can run
  any of six claims through it and watch the score assemble.
- **Financial stress test** — the tornado is measured, not asserted. Each bar is
  the model re-run with that lever at its limits.
- **Customer app** — step through it and look for the gallery button. There isn't
  one, which is the whole point.
