# ClaimPulse

[![Live](https://img.shields.io/badge/Live-claimpulse--simulation.vercel.app-00D084?style=for-the-badge&logo=vercel&logoColor=white)](https://claimpulse-simulation.vercel.app)
[![Simulator](https://img.shields.io/badge/Executive%20Simulator-%2Fsimulator-258CFB?style=for-the-badge)](https://claimpulse-simulation.vercel.app/simulator)
[![Product](https://img.shields.io/badge/Live%20Product-%2Fapp-7C4DFF?style=for-the-badge)](https://claimpulse-simulation.vercel.app/app/)
[![Competition](https://img.shields.io/badge/Bajaj%20Finserv-ATOM%20Season%209%20%C2%B7%20Semi--Finals-006699?style=for-the-badge)](https://claimpulse-simulation.vercel.app)
[![Institution](https://img.shields.io/badge/NMIMS%20Mumbai-Team%20Finsighters-C00000?style=for-the-badge)](https://claimpulse-simulation.vercel.app)
[![Stack](https://img.shields.io/badge/Stack-Vanilla%20HTML5%20%7C%20CSS3%20%7C%20ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://claimpulse-simulation.vercel.app)

> **Verified-Evidence Motor Insurance Claim Orchestration**
> *Motor Own Damage claims from 9.8 days and 7.0 touches to 2.71 days and 1.23 touches, for ₹43.31 Cr annual net benefit.*

---

## Three surfaces, one repository

| | Path | What it is |
|---|---|---|
| **Home** | [`/`](https://claimpulse-simulation.vercel.app) | The landing page. Pick a surface, or download the workbook, report and deck. |
| **Executive Decision Simulator** | [`/simulator`](https://claimpulse-simulation.vercel.app/simulator) | The business case. Live levers over the investment model, stress cases, the benefit bridge. |
| **Live Operations** | [`/app/`](https://claimpulse-simulation.vercel.app/app/) | The product itself, running. Command Center, Claims, Garages, Surveyors, the customer mobile app, and the controlled-pilot workspace. |

The simulator makes the argument; `/app/` is that argument running on live claims. Both carry
the same top bar, the same design tokens and a breadcrumb back to home, so crossing between
them does not feel like crossing between two products.

Full product documentation — architecture, the six tabs, the claim lifecycle, shadow-mode
pilot design — is in [`app/README.md`](./app/README.md).

---

## 📌 Deliverables

| Deliverable | Format | Link |
|---|---|---|
| **🌐 Executive Decision Simulator** | Web app | [Launch](https://claimpulse-simulation.vercel.app/simulator) |
| **🧭 Live Product Demo** | Web + Android | [Launch](https://claimpulse-simulation.vercel.app/app/) |
| **📊 Investor Dashboard** | Excel model, 16 tabs | [Download](./SaiMahimaK_Finsighters_NMIMS_PS6_BFDL_InvestorDashboard.xlsx) |
| **📄 Series A Investors Report** | PDF | [Download](./SaiMahimaK_Finsighters_NMIMS_PS6_BFDL_Report.pdf) |
| **📽️ Presentation Deck** | PPTX | [Download](./SaiMahimaK_Finsighters_NMIMS_PS6_BFDL.pptx) |
| **📱 QR Access Code** | PNG | [View](./ClaimPulse_Simulation_QR.png) |

---

## 🎯 The thesis

Indian General Insurance operates under intense underwriting pressure. In Motor Own Damage,
Bajaj General faces a **combined ratio of 104.7%**, with Q1 FY27 annualised underwriting
losses above ₹520 Cr. TAT is not a satisfaction metric — every unnecessary day inflates the
expense ratio, and every unflagged leak degrades the loss ratio.

```
CURRENT STATE (manual, fragmented)
Accident -> FNOL -> FIR / Police -> Garage estimate -> Manual verification -> Physical survey (55%) -> Settlement
           [3 of 7 steps outside insurer control | 9.8 days | 7.0 touches | Rs 1,750 servicing cost]

CLAIMPULSE STATE (verified orchestration)
Accident -> Guided capture [Gate 00] -> 5 engines -> Trust Score -> 3-lane routing
                                                                   |- GREEN (65%) auto-settled, 1.5d
                                                                   |- AMBER (25%) one reviewer, 3.5d
                                                                   |- RED   (10%) forensic investigation, 7.0d
```

**The root cause is decision absence.** The 9.8-day delay is 7 manual handoffs and a 55%
physical survey rate, even though ~65% of Motor OD claims are structurally deterministic.
Legacy systems cannot tell a deterministic claim from a complex one, so all claims endure
identical friction.

---

## 📈 Key impact metrics

All figures tie to the 16-tab audited model (`...InvestorDashboard.xlsx`). The app
re-implements Sheets 1, 3 and 4 in JavaScript and asserts itself against the workbook's own
computed values on **60 checks** — if a formula drifts, the check fails.

| Metric | Baseline (legacy) | ClaimPulse target | Delta |
|---|---|---|---|
| Manual adjuster touches | 7.0 / claim | 1.23 / claim | −82.4% |
| Platform claim TAT | 9.8 days | 2.71 days | −72.3% |
| Blended book TAT (60% rollout) | 9.8 days | 5.55 days | −43.4% |
| Physical survey rate | 55.0% | 12.5% | −42.5 pp |
| Annual net financial benefit | — | ₹43.31 Cr / year | +₹43.31 Cr |
| Total build capex | — | ₹9.89 Cr | 10-month modular build |
| 5-year net present value | — | ₹145.94 Cr | discounted @ 12.0% WACC |
| Combined ratio | 104.70% | 102.12% | −2.58 pp |

### Payback is a range, not a number

A single payback figure is the fastest way to lose a CFO. The model carries **six bases**, and
the Decision tab shows all six side by side with what each one assumes:

| Basis | Payback | What it assumes |
|---|---|---|
| Steady state, base plan | **2.7 months** | The run-rate year, build already sunk |
| From project kickoff, base plan | **16.8 months** | Ramp-up included — the honest headline |
| Aggressive plan, from kickoff | **13.8 months** | Faster adoption |
| Conservative plan, from kickoff | **27.2 months** | 40% adoption |
| Realistic downside, steady state | **7.4 months** | Higher touch cost, no synthetic-data or renewal upside |
| Correlated triple shock, from kickoff | **52.1 months** | Adoption, fraud and labour all move against us at once |

**Every basis repays the build.** That is the claim — not that payback is fast.

---

## 🏗️ Architecture

```
                          [ CLAIM INGESTION (FNOL) ]
                                      |
                    +-----------------v-----------------+
                    |   GATE 00 - CAPTURE INTEGRITY     |
                    |   - Direct-from-camera only       |
                    |   - EXIF / timestamp / GPS lock   |
                    |   - Diffusion / re-capture screen |
                    +-----------------+-----------------+
                                      | pass  (a hard fail routes RED with zero model calls)
                    +-----------------v-----------------+
                    |        5 SPECIALISED ENGINES      |
                    |   01 OCR First    deterministic   |
                    |   02 CV Depth     specialised ML  |
                    |   03 Fraud Graph  specialised ML  |
                    |   04 Parts Bench  deterministic   |
                    |   05 Policy RAG   targeted GenAI  |
                    +-----------------+-----------------+
                    +-----------------v-----------------+
                    |     TRUST SCORE FUSION (0-100)    |
                    +--+--------------+--------------+--+
            score >= 82 |    55 <= score < 82        | score < 55
                        v              v             v
                 +------------+ +------------+ +------------+
                 | GREEN  65% | | AMBER  25% | |  RED   10% |
                 | 0 touches  | | 1 reviewer | | full SIU   |
                 |  1.5 days  | |  3.5 days  | |  7.0 days  |
                 +------------+ +------------+ +------------+
```

**Two hard overrides sit above the score.** A Gate 00 hard fail or a fraud-ring score ≥ 0.35
routes RED regardless. And a green claim payable above **₹50,000** is capped to AMBER — the
IRDAI surveyor-exemption corridor (Master Circular on Protection of Policyholders' Interests,
2024). The corridor is a legal cap, not a tuning parameter.

### The five engines

| # | Engine | Layer | What it does | Trust weight |
|---|---|---|---|---|
| 01 | **OCR First** | 1 · deterministic | Reads RC, chassis plate, licence, odometer; cross-checks policy and VAHAN | 20% |
| 02 | **CV Depth** | 2 · specialised ML | Segments damaged panels, grades severity, prices against the catalogue | 15% |
| 03 | **Fraud Graph** | 2 · specialised ML | Scores the *network* — shared garages, payout accounts, vehicles, people | 25% |
| 04 | **Parts Bench** | 1 · deterministic | Benchmarks the garage estimate against settled claims, same model and city | — |
| 05 | **Policy RAG** | 3 · targeted GenAI | Retrieves governing clauses, reasons about coverage and exclusions | 10% |

Gate 00 itself carries the remaining **30%**. Engine 04 carries no weight — it *sizes* the
claim, which is what triggers the corridor test.

**GenAI is Layer 3 only**, and only on what Layers 1 and 2 could not resolve. A green claim
makes **zero** GenAI calls.

---

## 🔬 Stress testing

| Scenario | Net benefit | Payback |
|---|---|---|
| Base case, 60% rollout | ₹43.31 Cr | 16.8 mo from kickoff |
| A · AI governance overlay, +20% opex | ₹42.53 Cr | 14.4 mo |
| B · Faster garage network, 50% TAT cut | ₹43.31 Cr | 14.0 mo (benefit deliberately unclaimed) |
| C · Conservative rollout, 40% adoption | ₹28.87 Cr | 27.2 mo |
| D · Triple shock — adoption + fraud + labour | ₹4.21 Cr | 52.1 mo (NPV +₹3.76 Cr) |
| FLOOR · zero fraud benefit | ₹3.78 Cr | 31.4 mo — build still repaid |

- **The case does not rely on fraud.** With zero fraud improvement, labour and survey
  efficiencies alone deliver ₹3.78 Cr a year and repay the build in 31.4 months.
- **It survives a correlated shock.** Under D — adoption to 30%, fraud back to legacy 62%,
  labour savings halved — it stays net cash positive with a positive 5-year NPV.

---

## 🚦 Pilot gates

Capital is released against telemetry, not projections:

| Gate | Focus | Threshold | Kill criterion |
|---|---|---|---|
| **1** | Latency and compute economics | GPU < 45s / claim | > 77s breakeven → buy the model layer |
| **2** | Fraud precision and recall | Shadow-mode detection ≥ 82% on holdout | Precision < 70% or recall < 75% → halt automated red-routing |
| **3** | Green-lane STP integrity | ≥ 50% STP with < 0.5% leakage | STP < 40% → recalibrate Trust Score thresholds |
| **4** | Exception queue capacity | Blended P90 TAT < 4.0 days | P90 > 6.0 days → freeze rollout |

The **Decision → Pilot** tab in `/app/` is this made operable: cohort scope, data-source
contracts, the 15–20 day journey, and shadow-mode measurement. Shadow mode means ClaimPulse
scores and recommends but settles nothing — and recording a human decision **never** changes
the claim's lane, or the pilot would be measuring ClaimPulse against itself.

---

## 💻 Running it locally

No build tools, no bundler, no internet needed.

```bash
git clone https://github.com/PratyushMathur2000/claimpulse-simulation.git
cd claimpulse-simulation
python -m http.server 8080     # then open http://localhost:8080
```

Serve it rather than double-clicking `index.html`: the home page links to `/simulator` and
`/app/`, which need a server to resolve.

### The product demo

```bash
cd app
npm install
npm start          # http://localhost:5173
npm run verify     # 112 headless checks driving the real app in a browser
npm run tokens     # design-token audit of the stylesheet, exits non-zero on drift
```

### How the routes work

`vercel.json` does three things. `/simulator` rewrites to `simulator.html` **without** a
trailing slash, so the simulator's relative `assets/` still resolve against the site root.
`/app` redirects to `/app/`, then `/app/*` rewrites onto `/app/www/*` — the demo uses relative
asset paths so it can also be wrapped as an Android app, which means it must be served from a
directory URL.

> Vercel serves a real file before it consults a rewrite. That is why the home page is
> `index.html` and the simulator is `simulator.html`, rather than a rewrite from `/`.

### A note on the Firebase config

`app/www/assets/js/sync.js` contains a Firebase **web** config, including an `apiKey`. This is
public by design — it is a project identifier, not a credential, and Google documents it as
safe to ship in client code. Security is enforced by `app/firestore.rules`, which confine all
access to `rooms/{room}/claims`, cap document size, and close everything else. The project
holds **synthetic demo claims only** and is disposable. GitHub's secret scanner flags any
`AIza…` string generically, which is why this repository is private.

---

## 📁 Repository structure

```
claimpulse-simulation/
├── index.html                                    Home - pick a surface, download the deliverables
├── simulator.html                                Executive Decision Simulator, single file
├── vercel.json                                   Routing: /simulator, /app/ -> app/www/
├── assets/Background.png
├── ClaimPulse_Simulation_QR.png
├── SaiMahimaK_..._InvestorDashboard.xlsx         16-tab audited financial model
├── SaiMahimaK_..._Report.pdf                     Series A investors report
├── SaiMahimaK_Finsighters_NMIMS_PS6_BFDL.pptx    Presentation deck
└── app/                                          The live product demo - see app/README.md
    ├── www/                                      The whole site: HTML, CSS, ES6. No build step.
    ├── verify.js                                 112 headless checks in a real browser
    ├── token-audit.py                            Design-token audit against the simulator
    └── firestore.rules  vercel.json  package.json
```

---

## 👥 Team

**Team Finsighters** · School of Business Management, NMIMS Mumbai

- **Pratyush Mathur** · https://github.com/PratyushMathur2000/
- Team Finsighters colleagues · MBA Class of 2026

**Bajaj Finserv ATOM Season 9 — Semi-Finals**
**PS6_BFDL** — *Motor Insurance Claims Turnaround Time reduction through AI/ML orchestration*

---

<div align="center">
  <sub>Built by Team Finsighters for Bajaj Finserv ATOM Season 9 · 2026</sub>
</div>
