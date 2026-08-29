# ClaimPulse — Working Demo

**Team Finsighters · NMIMS Mumbai · ATOM Season 9 · PS_BFDL — Motor Insurance Claims TAT Reduction**

The investor model set out the economics. This is the thing itself: a working
claims-orchestration platform, running against that same model, that a judge can open on
their own phone.

**Live:** https://claimpulse-simulation.vercel.app/app/
**Executive simulator:** https://claimpulse-simulation.vercel.app/simulator
**Android:** `www/ClaimPulse-demo.apk` — served at `/app/ClaimPulse-demo.apk`

This demo is one half of the [ClaimPulse repository](../README.md). The simulator makes the
business case; this makes it run.

---

## The stage moment

Put the **Command Center** on the projector. Hand the judges the QR from the sync pill in the
top-right. When they file a claim on their own handset it appears in the projected queue
**while it is still being assessed** — you watch it cross Gate 00, the engines and routing,
land in a lane, and either pay out on its own or drop into the "awaiting assistance" count.

Then click it. The Claim Inspector shows where the claim is, why it went where it went in
plain English, what every engine found, and — if it needs one — a surveyor roster you can
dispatch from. Assign a surveyor and the appointment appears on the judge's phone.

If the venue wifi fails, the app drops to local-only on its own and every surface still
works end to end. The demo cannot hard-fail on stage.

---

## Six tabs

One word each. A tab whose label needs two words is usually two ideas, and this product had
eight of them competing for the same rail.

| Tab | What it shows | Stakeholder |
|---|---|---|
| **Command** | The morning screen. Three lead figures over eight supporting tiles: what is in flight, what is waiting on a person, the live lane split against the modelled 65/25/10, and the three-layer automation panel | Claims manager |
| **Claims** | The full-width claim queue with eleven filters and free-text search, and — opening below it, also full width — the Claim Inspector: one claim in full, its eight-step journey, **why it went where it went in plain English**, Gate 00, all five engines with expandable evidence, Trust Score fusion, the settlement working, surveyor dispatch and the human override | Claims officer |
| **Garages** | Who repairs the vehicle. The indicative repair band arriving at FNOL (4 days down to 1) and the partner network behind it | Garage network |
| **Surveyors** | Who verifies the damage. The IRDAI ₹50,000 corridor deciding who needs a physical survey, and the dispatchable panel ranked by availability and distance | Survey operations |
| **Customer** | The claimant journey end to end: login → vehicle → what happened → where and when → guided live capture (gallery disabled) → Gate 00 and five engines running → lane-specific outcome → proactive tracker | Policyholder |
| **Decision** | Four sections behind one tab, because they answer one question — *should we do this, and how would we know*. **Business case** (benefit bridge, combined ratio, payback on all six bases), **Scenarios** (live levers over the real model), **Pilot** (the controlled-pilot workspace), **Audit** (every decision replayed in order, with CSV export) | Investment committee, programme owner, IRDAI |

Keyboard on stage: `1`–`4` pick a demo claim, `Q W E R T Y` switch tab, `Esc` closes a sheet.

---

## The model is the workbook

`www/assets/js/model.js` is a re-implementation of Sheet 1 (inputs) and Sheet 3 (Workings)
of `SaiMahimaK_Finsighters_NMIMS_PS6_BFDL_InvestorDashboard.xlsx`, carrying the `W-nn`
reference on every line.

It asserts itself against the workbook's own computed values on **60 checks** — Parts A, B,
C, E, F, G, I, J and L, plus the Sheet 4 forecast, NPV, payback-from-kickoff and the
realistic-downside case. If a formula here ever drifts from the Excel, the check fails:

```bash
node www/assets/js/model.js -v      # headless
```
```js
CPModel.selfCheck(true)             // in the browser console
```

The same discipline as the workbook holds in the code: `INPUTS` is the only place a number
is typed. `data.js` reads its lane shares, lane TAT and corridor from it, and every surface
derives from `CPModel.run()`.

Base plan, 60% rollout: **₹43.31 Cr** net a year · **₹145.94 Cr** five-year NPV ·
**2.58 pp** Motor OD combined ratio · **5.55-day** whole-book TAT.

Payback is reported as a **range, not a number** — the model carries six bases and the
Business case section shows all six with what each assumes: 2.7 months steady state,
16.8 from kickoff on the base plan, 13.8 aggressive, 27.2 conservative, 7.4 on the realistic
downside, and 52.1 under the correlated triple shock. Every basis repays the build; that is
the claim, not that payback is fast.

---

## The decision logic

`www/assets/js/engine.js`. Gate 00 runs **before** any engine — a hard fail there routes RED
without a single model call, which is the architectural claim, so the code and the on-screen
animation both honour the ordering.

**Trust Score** is a weighted sum, and the contribution column on screen always reconciles to
the headline figure:

| Signal | Weight |
|---|---|
| Gate 00 · Capture Integrity | 30% |
| Engine 01 · Document AI + OCR / VAHAN | 20% |
| Engine 02 · CV Damage Assessment | 15% |
| Engine 03 · Fraud + Duplicate Graph | 25% |
| Engine 05 · Policy Validation RAG | 10% |

**Routing**

- ≥ **82** → GREEN, auto-settle · **55–82** → AMBER, one reviewer · < **55** → RED, investigate
- Any Gate 00 hard fail, or a fraud ring score ≥ **0.35**, routes RED regardless of score
- A green claim payable above **₹50,000** is capped to AMBER — the IRDAI surveyor-exemption
  corridor (Master Circular on Protection of Policyholders' Interests, 2024)

Settlement is assessed at the parts-catalogue band, not at whatever the garage asked for,
then depreciation and the compulsory deductible are applied.

## Can we pilot this?

Yes — with configuration and a data-integration step, not a rebuild. The **Pilot** surface is
the answer to that question made operable rather than asserted.

### Shadow mode is the whole design

For a 15–20 day pilot ClaimPulse runs **beside** the existing Bajaj claims process. It scores
every cohort claim and recommends. It settles nothing, pays nothing and notifies no customer.

The claims officer records what the team actually decided, and the difference between the two
is the measurement. One invariant makes that meaningful:

> **Recording a human decision never changes the claim's lane.**

`CPPilot.decide()` writes `pilotDecision` *beside* the recommendation — it deliberately does not
touch `lane`, `laneTat`, `laneTouches` or the Trust Score. This is why the pilot has its own
decision path instead of reusing the production override in `CPOps`, and why both controls sit
on the inspector at once: they mean different things. If the recommendation could be rewritten
by the person judging it, the pilot would be measuring ClaimPulse against ClaimPulse.

`verify.js` asserts the invariant directly — record a GREEN decision on the AMBER demo claim and
the lane must still read AMBER afterwards.

### Cohort, not rollout

A controlled pilot is defined by what it excludes. The scope panel filters on claim amount,
geography, vehicle type, policy type and garage, and reports the cohort as *n of N claims*.
Anything outside it is still scored — the prototype scores everything — but says **Not part of
this pilot** on the inspector and counts toward nothing.

### Data sources

| Source | State | What it would actually need |
|---|---|---|
| Demo data | **In use** | Nothing; this is what ships |
| CSV upload | Mapping only | A column mapping and a path to capture media |
| Pilot data feed | Integration needed | A scheduled one-way extract of the cohort into a Bajaj-controlled store. No write-back |
| API integration | Integration needed | Authenticated claims API, VAHAN, parts catalogue, policy corpus — the *post*-pilot shape |

Only the first is built. The others declare the contract each would have to satisfy, so the
integration cost is visible rather than glossed over.

### Measurement, not results

The success criteria table shows the target beside what has been observed so far, with the
sample size, and marks each row `NOT YET MEASURED`, `SAMPLE TOO SMALL` or `MEASURING`. **No row
can ever read PASSED** — `verify.js` greps for it. A pilot that reports its own success before
it has run is why pilots stop being believed.

Claims nobody has judged are excluded from the accuracy figures rather than counted as
agreement, which is the easiest way to make a pilot report a number it has not earned.

### Positioning

What this is: a working interactive prototype, a pilot-ready front end and orchestration layer,
human-in-the-loop throughout, every recommendation explainable and audited.

What it is not, and is not claimed to be: production-ready, a replacement for the Bajaj claims
system, autonomous settlement, integrated with Bajaj systems, or security- and load-hardened.

**Competition prototype → controlled pilot → validated product → production rollout.** The
workspace exists to get from the first arrow to the second.

---

### The five engines

| # | Engine | Layer | What it does |
|---|---|---|---|
| 01 | **OCR First** | 1 · deterministic | Reads the RC, chassis plate, licence and odometer; cross-checks the policy record and VAHAN |
| 02 | **CV Depth** | 2 · specialised ML | Segments damaged panels, grades severity, prices parts against the catalogue |
| 03 | **Fraud Graph** | 2 · specialised ML | Scores the *network* around the claim — shared garages, payout accounts, vehicles, people |
| 04 | **Parts Bench** | 1 · deterministic | Benchmarks the garage estimate against settled claims for the same model and city |
| 05 | **Policy RAG** | 3 · targeted GenAI | Retrieves governing clauses and reasons about coverage, deductibles and exclusions |

Engine 04 carries **no weight in the Trust Score**. It sizes the claim, which is what triggers
the IRDAI corridor test. The fusion weights are Gate 00 30%, OCR First 20%, CV Depth 15%,
Fraud Graph 25%, Policy RAG 10%.

GenAI is Layer 3 only, and only on what Layers 1 and 2 could not resolve. A green claim makes
**zero** GenAI calls. The Command Center's automation panel counts this per claim.

---

### The three primary demo claims

| Ref | Vehicle | Claimed | Trust | Lane | Why |
|---|---|---|---|---|---|
| **CLM-20481** | Honda City VX CVT | ₹18,500 | **94** | GREEN | Every engine agrees, estimate inside the band, payable inside the ₹50,000 corridor |
| **CLM-20482** | Hyundai Creta SX | ₹32,400 | **72** | AMBER | Nothing failed, nothing cleared — and the estimate is 18% above benchmark |
| **CLM-20483** | Mahindra XUV700 AX7 | ₹47,800 | **38** | RED | Capture metadata inconsistency **and** a fraud-graph ring at 0.81 |

A fourth, **CLM-20484** (synthetic evidence), hard-fails Gate 00 — the engines never run.

These scores are **computed, not typed**. The contribution column on screen sums to the
headline figure on every claim, and `verify.js` asserts it.

The claim amount is what the garage is claiming. **Net payable** — after the band cap,
depreciation and the compulsory deductible — is a different number and lives in the
settlement working. Conflating the two is how a settlement stops reconciling.

---

### Surveyor dispatch

A red claim, or any claim above the IRDAI ₹50,000 corridor, needs a registered surveyor.
The inspector ranks the panel by who can go first and then by real great-circle distance from
the incident city, showing licence, speciality, current workload against capacity, average
completion time, rating and completed jobs. Surveyors beyond 120 km are excluded as not
dispatchable.

Assigning writes to the shared claim, so three things happen at once: the queue status moves
to **Survey Scheduled**, the surveyor's workload increments, and **the appointment appears on
the customer's phone**.

---

### The claim lifecycle

The board is built around where a claim *is*, not what it saved. Eight stages, four buckets:

| Stage | Bucket | Waiting on |
|---|---|---|
| `gate` · Capture Integrity Gate | being assessed | the system |
| `engines` · five engines in parallel | being assessed | the system |
| `routing` · Trust Score fusion | being assessed | the system |
| `assist` · amber lane | **awaiting assistance** | a claims reviewer |
| `investigate` · red lane | **awaiting assistance** | the investigation desk |
| `settling` · green lane paying out | releasing payment | the bank |
| `settled` / `closed` | closed | nobody |

Until routing is reached, the console shows **no lane and no score** — the dossier stays shut,
because showing a verdict the pipeline has not produced yet would be the console lying.

Stage is **derived** from the claim's own timestamp (`CPEngine.stageOf`), never stored. That
means no device has to write progress, every device shows the same thing at the same moment,
and a dozen open tabs do not turn into a write storm against one document. The machine timings
match the pipeline animation on the handset, so the phone and the projector stay in step.

Amber and red claims sit in `assist`/`investigate` until a named adjuster acts. The override
buttons are in the inspector — the desk is somewhere you *work*, not just watch.

The **status** vocabulary the dashboard filters on is derived from the stage plus the survey
position: New, Processing, Awaiting Review, Survey Required, Survey Scheduled, Investigation,
Approved, Settled.

---

### What is seeded and what is computed

The four demo claims are **fixed profiles** — Gate 00 findings and engine sub-scores live in
`data.js` so the same claim behaves identically every run on stage. The eighteen background
claims scale the exposure and jitter the sub-scores off those profiles, so the queue reads
like a desk rather than four records copied five times. Everything downstream is
computed live: the fusion arithmetic, the routing, the corridor cap, the settlement working,
the surveyor decision and the audit trail. Live device signals (GPS fix, capture timestamp,
frame count) are read from the actual device and shown inline marked `live:`.

In production the sub-scores stop being seeded and start coming from the models. The fusion,
routing, settlement and audit layers you are looking at are the ones that would ship.

---

## Sync

`www/assets/js/sync.js`. One store, two backends:

- **live** — Firestore. Claims appear on every device open on the same room.
- **local** — localStorage + BroadcastChannel. Same API, works across tabs, zero network.

The app never chooses. It tries Firestore and falls back silently on any failure — no config,
no network, blocked venue wifi, a rejected write. The pill in the top-right says which is
running.

Rooms keep parallel demos apart: add `?room=yourname` to the URL. The printed QR opens the
default room (`atom9`).

The Firestore project holds **demo claims only** — synthetic policyholders, synthetic damage,
synthetic payouts. Rules confine all access to `rooms/{room}/claims` and nothing else is
reachable. It is disposable.

---

## Run it

```bash
npm start                 # http://localhost:5173
npm run verify            # headless: 112 checks, drives the real app in a browser
npm run tokens            # design-token audit against the simulator, exits non-zero on drift
```

There is no build step. `www/` is the whole site — plain HTML, CSS and JavaScript, no
bundler, no dependencies on the web path. Any static host serves it as-is.

## Deploying

This is **not its own deployment**. It ships as `/app/` inside the parent ClaimPulse repo, and
the routing lives in the repo root's `vercel.json`:

```
/app      -> redirect to /app/          (relative asset paths need a directory URL)
/app/     -> /app/www/index.html
/app/*    -> /app/www/*
```

Push to `main` and Vercel redeploys the whole site. Two things that config handles:

- `/app/assets/js` and `/app/assets/css` are sent with `must-revalidate`, so a redeploy is
  picked up immediately rather than served stale from a judge's phone cache.
- `ClaimPulse-demo.apk` is served with the Android package content type, so opening
  `/app/ClaimPulse-demo.apk` on a phone downloads and installs it. The in-app share sheet
  detects this and offers an install button when it is reachable.

Firestore is not tied to the host — sync works unchanged from any origin, so a local server
and the deployed site share the same live claim queue.

**If the host ever changes, repoint the QR.** The QR in the share sheet is a static PNG, so it
still encodes whatever host it was built for:

```bash
npm run qr                                          # shows what it currently points at
node make-qr.js https://claimpulse-simulation.vercel.app/app
```

The script decodes its own output before writing it, so it cannot silently leave the old host
in place — which it did once. Commit `www/assets/qr.png` and `www/assets/qr.url.txt`. Use the
bare origin: the script rejects a trailing slash or a `?room=`, because either would send
judges to a different queue from the one on the projector.

`npm run verify` asserts the things that would embarrass us on stage: the model still ties to
the workbook, every surface renders with no console error, all four demo claims land in their
expected lane, the Trust Score contributions sum to the displayed score, a filed claim reaches
the queue, an ops override reaches the claimant's tracker, the fraud graph survives the sync
round trip, and **a claim filed on one device arrives on a second, independent device**.

> Camera: browsers only allow `getUserMedia` on `https://` or `localhost`. Over plain
> `http://` on a LAN the app falls back to simulated frames and the demo still runs end to end.

---

## Android

A signed-for-debug APK is already built: **`www/ClaimPulse-demo.apk`** (7.3 MB,
`in.nmims.finsighters.claimpulse`, targetSdk 35).

Getting it onto a phone, easiest first:

1. **From the Vercel URL** — open `your-app.vercel.app/ClaimPulse-demo.apk` on the phone,
   or tap the install button in the app's share sheet
2. **Add to Home Screen** — not the APK at all, but the web app installs as a full-screen
   PWA on both iPhone and Android and is the better demo path anyway
3. **USB or Drive** — copy the file across and open it from the phone's Downloads

Android will warn about installing from an unknown source the first time; allow it for the
browser doing the download.

To rebuild:

```bash
npm run android:apk
```

Capacitor's Gradle needs **JDK 17–21**. Android Studio now bundles JDK 25, which Gradle 8.11
refuses — `build-apk.js` finds a usable JDK and tells you exactly what to do if there isn't
one. Alternatively open `android/` in Android Studio, set Gradle JDK to 21, and
**Build → Build Bundle(s)/APK(s)**.

---

## Design

**Type is shared verbatim with the [ClaimPulse executive simulator](https://claimpulse-simulation.vercel.app/)** —
same two families, same weight set, same variable names (`--f-head`, `--f-body`, `--f-sub`), so
the deck and the product read as one thing.

- **Plus Jakarta Sans** 300–800 for headings, prose and names.
- **JetBrains Mono** 500–800 for **every headline figure**, plus labels, eyebrows and
  references. This is the simulator's signature and it is functional as well as cosmetic:
  tabular mono means a column of rupee amounts or trust scores aligns on the decimal with no
  per-cell alignment. Mono sets optically larger than the sans at the same pixel size, so the
  figure sizes are corrected at the foot of `app.css`, after the component rules they adjust.

**Colour** — the simulator's palette, token for token. Brand `#258cfb` on the `#040812`
ground, cards at `rgba(9,19,37,0.78)`. Green, amber and red are never
decorative: they mean GREEN / AMBER / RED lane. The lifecycle buckets deliberately use a
*different* palette (blue = the machine has it, amber = a person must act, green = money moving,
grey = finished) so "waiting on you" is distinguishable from "amber lane" at three metres.

**Scale** — the golden ratio, φ = 1.618, and it is *checked*, not asserted.

- **Type** steps by `15 × φ^(n/4)`. Quarter steps, not half: half steps leave a hole between
  11.8px and 15px, and that gap is most of a dense operations UI — which is exactly where the
  original ladder had to fudge a value. Any two steps four apart are still exactly φ.
- **Space** runs the Fibonacci ladder — 5·8·13·21·34·55·89·144·233 — whose successive ratios
  converge on φ: 1.600, 1.625, 1.615, 1.619, 1.618.
- **Layout** splits 61.8 / 38.2, and the phone is a 382 × 618 rectangle.

```
npm run tokens
```

reads every `font-size`, `padding`, `margin`, `gap`, `width`, `height` and `border-radius` in
`app.css` and checks it against the **simulator's own scale**, not an abstract ladder — the
simulator is the source of truth, so drift from it is the thing worth catching. It prints
anything off with the step it should snap to and **exits non-zero**. Border radii get their own
four-step scale (4 · 8 · 10 · 12 px, plus the pill), because collapsing a radius onto a spacing
step is what made the card corners visibly wrong. Hairlines, letter-spacing and shadows are
exempt — optical corrections, not scale decisions.

The suite currently reports **0 off-scale of 556 values**.

This exists because the claim had stopped being true. The Command Center rebuild put 118
off-ladder values into the file while the docblock still promised there were none. A design
system nobody can check is a comment, not a system.

The Command Center runs tighter than the rest of the app on purpose. A claims manager reads it
for eight hours, and whitespace they have to scroll past is whitespace that costs them. It is
also where the queue *used* to live: picking a claim and reading a claim are the same job, so
the queue and the inspector now sit together on **Claims**, and the dashboard is left to do the
one thing a dashboard is for — the shape of the day.


## Files

```
www/
  index.html                  shell and the six surface mounts
  manifest.webmanifest        installable as a PWA
  assets/css/app.css          the design system
  assets/js/
    model.js                  the workbook, in JS, with its 60 self-checks
    data.js                   the four demo claims, policy master, network partners
    engine.js                 Gate 00, engines 01-05, fusion, routing, settlement, audit
    sync.js                   Firestore live sync with local fallback
    ui.js                     formatting and shared render primitives
    ops.js                    Command Center, the filter rail and the claim queue
    inspector.js              the Claim Inspector and surveyor dispatch
    claimant.js               the customer mobile app
    network.js                garages and surveyors
    decision.js               the Decision tab shell over the four sections below
    impact.js  sim.js  pilot.js  audit.js
    app.js                    routing, sync boot, share sheet, stage shortcuts
www/ClaimPulse-demo.apk       the built Android app, served as a download
verify.js                     headless verification, 112 checks
token-audit.py                design-token audit against the simulator
build-apk.js                  APK build with JDK discovery
make-qr.js                    repoint the share QR after a host change, decodes it back to prove it
firestore.rules               demo claims only, one path open, everything else closed
```
