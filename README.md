# ClaimPulse · Executive Decision Simulator

[![Live Simulation](https://img.shields.io/badge/Live%20Simulation-claimpulse--simulation.vercel.app-00D084?style=for-the-badge&logo=vercel&logoColor=white)](https://claimpulse-simulation.vercel.app)
[![Competition](https://img.shields.io/badge/Bajaj%20Finserv-ATOM%20Season%209%20·%20Series%20A%20Round%205-006699?style=for-the-badge)](https://claimpulse-simulation.vercel.app)
[![Institution](https://img.shields.io/badge/NMIMS%20Mumbai-Team%20Finsighters-C00000?style=for-the-badge)](https://claimpulse-simulation.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-Vanilla%20HTML5%20%7C%20CSS3%20%7C%20ES6%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://claimpulse-simulation.vercel.app)
[![Offline Capable](https://img.shields.io/badge/Offline-Zero%20Dependency%20Single%20File-4A90E2?style=for-the-badge)](https://claimpulse-simulation.vercel.app)

> **Verified-Evidence Motor Insurance Claim Orchestration Platform**  
> *Transforming Motor Own Damage (OD) Claims from 9.8 Days & 7 Touches to 2.71 Days & 1.23 Touches with ₹43.31 Cr Annual Net Benefit.*

---

## 📌 One-Click Deliverables & Resources

| Deliverable | Format | Access Link / Direct Action |
|---|---|---|
| **🌐 Interactive Executive Simulator** | Web Application | [**Launch Live Simulator** (claimpulse-simulation.vercel.app)](https://claimpulse-simulation.vercel.app) |
| **📊 Comprehensive Investor Dashboard** | Excel Financial Model | [**Download Financial Model** (`Finsighters_Investor_Dashboard_R5.xlsx`)](./Finsighters_Investor_Dashboard_R5.xlsx) |
| **📄 Series A Comprehensive Case Report** | PDF Document | [**Download Case Report** (`Finsighters_Report_R5.pdf`)](./Finsighters_Report_R5.pdf) |
| **📱 Mobile QR Access Code** | PNG Image | [**View Simulator QR Code** (`ClaimPulse_Simulation_QR.png`)](./ClaimPulse_Simulation_QR.png) |

---

## 🎯 Executive Summary & Strategic Thesis

Indian General Insurance operates under intense underwriting pressure. In Motor Own Damage (OD), the industry and Bajaj General face a **Combined Ratio of 104.7%**, with Q1 FY27 annualized underwriting losses exceeding ₹520 Cr. Turnaround Time (TAT) is not merely a customer satisfaction metric—**every unnecessary day of delay inflates operational expense ratios, and every unflagged leak degrades loss ratios**.

```
CURRENT STATE (Manual & Fragmented)
Accident ──► FNOL ──► FIR / Police ──► Garage Estimate ──► Manual Verification ──► Physical Survey (55%) ──► Settlement
                     [3 of 7 steps outside insurer control | 9.8 Days Avg TAT | 7.0 Manual Touches | ₹1,750 Servicing Cost]

CLAIMPULSE STATE (Verified Orchestration)
Accident ──► Guided Capture [Gate 00] ──► 5 Specialised Engines ──► Trust Score ──► 3-Lane Dynamic Routing
                                                                                   ├── Green Lane (65%): Auto-settled in 1.5d
                                                                                   ├── Amber Lane (25%): 1 Human Reviewer (3.0d)
                                                                                   └── Red Lane   (10%): Forensic Investigation
```

### The Root Cause: Decision Absence
The 9.8-day delay is not caused by a single broken department. It is driven by **7 manual handoffs** and an archaic **55% physical survey rate**—even though **65% of Motor OD claims are structurally deterministic** (clear damage, verifiable documents, valid policy coverage). Because legacy systems lack the intelligence to distinguish deterministic claims from complex fraud, all claims endure identical friction.

### The Solution: ClaimPulse Orchestration
ClaimPulse introduces **Gate 00 (Capture Integrity Gate)** followed by **5 specialized deterministic engines** that compute an objective **Trust Score (0–100)**. This feeds a **3-Lane Triage Architecture**:
1. 🟢 **Green Lane (65% STP):** Fast-tracked straight-through processing. Zero human touches, zero expensive GenAI calls, auto-settled in ~1.5 days (seconds on-platform).
2. 🟡 **Amber Lane (25% Assisted):** GenAI synthesis generates structured discrepancy briefs for a single human adjuster. Settled in ~3.0 days.
3. 🔴 **Red Lane (10% Forensic):** Immediate escalation to the Fraud Investigation Unit (FIU) with pre-compiled evidentiary anomaly packs.

---

## 📈 Key Impact Metrics (Quantified)

All figures are tied to the 16-tab audited financial model (`Finsighters_Investor_Dashboard_R5.xlsx`):

```
+----------------------------------------------------------------------------------------------------+
|                                    CLAIMPULSE VALUE SCORECARD                                      |
+------------------------------+--------------------+---------------------+--------------------------+
| Metric                       | Baseline (Legacy)  | ClaimPulse Target   | Quantified Delta         |
+------------------------------+--------------------+---------------------+--------------------------+
| Manual Adjuster Touches      | 7.0 touches/claim  | 1.23 touches/claim  | -82.4% touch reduction   |
| Platform Claim TAT           | 9.8 days           | 2.71 days           | -72.3% platform TAT      |
| Blended Book TAT (60% roll)  | 9.8 days           | 5.55 days           | -43.4% total book TAT    |
| Physical Survey Rate         | 55.0% of claims    | 12.5% of claims     | -42.5 pp physical survey |
| Annual Net Financial Benefit | ₹0.00 Cr           | ₹43.31 Cr / year    | +₹43.31 Cr annual cash   |
| Total Build Capex            | —                  | ₹9.89 Cr            | 10-Month Modular Build   |
| Operational Payback Period   | —                  | 14.0 Months         | 16.8 Mo from Kickoff     |
| 5-Year Net Present Value     | —                  | ₹145.94 Cr          | Discounted @ 12.0% WACC  |
| Combined Ratio Improvement   | 104.70%            | 102.12%             | -2.58 pp Underwriting Δ  |
+------------------------------+--------------------+---------------------+--------------------------+
```

---

## 🏗️ Technical Architecture & Engine Pipeline

```
                                  [ CLAIM INGESTION (FNOL) ]
                                               │
                                               ▼
                     ┌──────────────────────────────────────────────────┐
                     │          GATE 00: CAPTURE INTEGRITY GATE         │
                     │  • Direct-from-camera only (Gallery Disabled)     │
                     │  • EXIF / Timestamp / GPS Geolocation Lock       │
                     │  • AI-Diffusion / Deepfake / Re-capture Screen   │
                     └─────────────────────────┬────────────────────────┘
                                               │ [Pass]
                                               ▼
                     ┌──────────────────────────────────────────────────┐
                     │          5 MULTI-MODAL SPECIALISED ENGINES       │
                     │                                                  │
                     │  1. Document Engine   : OCR & Cross-KYC Match    │
                     │  2. Damage Engine     : CV Part & Severity Score │
                     │  3. Network Graph     : Fraud & Ring Detection   │
                     │  4. Repair Cost Engine: OEM Parts & Labour Benches│
                     │  5. Policy Engine     : Coverage & NCB Validation │
                     └─────────────────────────┬────────────────────────┘
                                               │
                                               ▼
                     ┌──────────────────────────────────────────────────┐
                     │           TRUST SCORE COMPOSER (0 - 100)         │
                     │             Fused Multi-Engine Confidence         │
                     └───────┬─────────────────┼─────────────────┬──────┘
                             │                 │                 │
             Score ≥ 85      │    60 ≤ Score < 85    │      Score < 60 │
             [Gate 00 Clear] │                 │                 │ [Gate 00 Fail]
                             ▼                 ▼                 ▼
                     ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
                     │  GREEN LANE   │ │  AMBER LANE   │ │   RED LANE    │
                     │   (65% STP)   │ │ (25% Assist)  │ │ (10% Forensic)│
                     │  Zero Touches │ │ 1 Reviewer    │ │ Full FIU Gate │
                     │   1.5 Days    │ │   3.0 Days    │ │  Investigation│
                     └───────────────┘ └───────────────┘ └───────────────┘
```

### The 5 Modular Engines
1. **Document Engine:** Real-time OCR, tamper detection, and instant database cross-matching against Vahan (RC), Sarathi (DL), and internal policy records.
2. **Damage Engine:** Computer vision segmentation classifying damaged components, dent/scratch depth, and replacement vs. repair necessity against OEM metadata.
3. **Network Graph Engine:** High-velocity fraud detection tracking recurrent phone numbers, garage collusion patterns, overlapping timestamps, and staged incident rings.
4. **Repair Cost & Labour Engine:** Standardized regional garage labor rates, OEM spare parts catalog pricing, and automated estimate scrubbing to eliminate garage overcharging.
5. **Policy & Coverage Engine:** Zero-latency validation of own-damage coverage clauses, active add-ons (zero-dep, engine protector), and No-Claim Bonus (NCB) entitlement.

---

## 🎮 Simulator Walkthrough: 6 Interactive Modules

The repository hosts an interactive executive simulator (`index.html`) engineered to provide live walkthroughs, stress testing, and instant financial validation.

```
+------------------------------------------------------------------------------------------------+
|                                6-MODULE SIMULATOR OVERVIEW                                     |
+-------------------+----------------------------------------------------------------------------+
| Module            | Executive Scope & Functionality                                            |
+-------------------+----------------------------------------------------------------------------+
| 01 The Problem    | Live breakdown of the 7-stage legacy claims journey, showing where 9.8    |
|                   | days accumulate across customer, garage, police, and insurer touchpoints.  |
+-------------------+----------------------------------------------------------------------------+
| 02 Orchestration  | Interactive claim execution engine. Fire 3 sample claims (Clean, Ambiguous,|
|    Engine         | Suspicious) and observe Gate 00, 5-engine telemetry, and lane routing live.|
+-------------------+----------------------------------------------------------------------------+
| 03 Value Engine   | Full 3-year cash flow forecasting model, ramp-up schedules (45% -> 92% ->  |
|                   | 100%), cost-to-serve economics, and combined ratio sensitivity curves.     |
+-------------------+----------------------------------------------------------------------------+
| 04 Stress Test &  | 13 pre-modeled scenarios + 12-stage live parameter shock cascade. Real-time|
|    Cascades       | recalculation of net benefit, payback months, and breakeven floors.        |
+-------------------+----------------------------------------------------------------------------+
| 05 90-Day Phased  | Governance framework: 4 pilot gates with hard quantitative kill criteria   |
|    Pilot Gates    | governing capital release (GPU latency, fraud precision, STP share).       |
+-------------------+----------------------------------------------------------------------------+
| 06 Investment     | Final capital allocation thesis: build vs. buy teardown, defensible data   |
|    Decision       | moat evaluation, and executive sign-off dashboard.                         |
+-------------------+----------------------------------------------------------------------------+
```

---

## 🔬 Stress Testing, Sensitivities & Breakeven Floors

To ensure complete institutional rigor, ClaimPulse was subjected to extensive multi-variable stress testing:

```
                                 TORNADO SENSITIVITY SUMMARY
  Scenario                                          Net Benefit (₹ Cr)     Payback Status
  ───────────────────────────────────────────────────────────────────────────────────────
  Base Case (60% Rollout)                           [ ₹43.31 Cr ]          14.0 Mo (16.8 Mo Kickoff)
  A. AI Governance Overlay (+20% Opex)              [ ₹42.53 Cr ]          14.4 Mo (Pass)
  B. Faster Garage Network (50% TAT Cut)            [ ₹43.31 Cr ]          14.0 Mo (Pass - Unclaimed)
  C. Conservative Rollout (40% Adoption)            [ ₹28.87 Cr ]          21.0 Mo (Pass)
  D. Triple Shock (Adoption + Fraud + Labour)       [  ₹4.21 Cr ]          52.1 Mo (NPV +₹3.76 Cr)
  FLOOR: Zero Fraud Benefit (100% Leakage Unchecked)[  ₹3.78 Cr ]          31.4 Mo (Build Repaid)
  ───────────────────────────────────────────────────────────────────────────────────────
```

### Key Takeaways from Stress Testing
- **The Case Does Not Rely on Fraud:** Even if fraud detection does not improve by a single percentage point (0% fraud savings), operational labor and survey efficiencies alone deliver **₹3.78 Cr annual net benefit**, repaying the entire build within 31.4 months.
- **Resilience to Triple Shock:** Under Scenario D—where adoption slows to 30%, fraud detection reverts to legacy 62%, and labor rate savings are halved—ClaimPulse remains net cash positive (**₹4.21 Cr/yr**) with a positive 5-year NPV.

---

## 🚦 90-Day Phased Pilot Gates & Governance Kill Criteria

Capital is not released against projections; it is gated against empirical pilot telemetry across 4 milestones:

| Pilot Gate | Milestone Focus | Quantitative Threshold | Explicit Kill Criterion |
|---|---|---|---|
| **Gate 1** | Latency & Compute Economics | GPU processing time < 45s / claim | GPU latency > 77s breakeven → Buy external model layer |
| **Gate 2** | Fraud Precision & Recall | Shadow-mode detection ≥ 82% on holdout set | Precision < 70% or Recall < 75% → Halt automated red-routing |
| **Gate 3** | Green-Lane STP Integrity | Minimum 50% STP rate with < 0.5% leakage | STP volume < 40% → Recalibrate Trust Score thresholds |
| **Gate 4** | Exception Queue Capacity | Blended P90 TAT < 4.0 days on platform | P90 TAT > 6.0 days → Freeze rollout to avoid backlog spike |

---

## 💻 Zero-Dependency Offline Execution Guide

The entire ClaimPulse interactive simulator is engineered as a self-contained, standalone web application. It requires **no build tools, no Node.js/npm dependencies, and no active internet connection** to run locally.

### Option 1: Direct Browser Launch (Easiest)
1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/pratyushm27/ClaimPulse_ATOM_Season_9.git
   ```
2. Navigate into the repository folder.
3. Double-click `index.html` (or right-click → **Open With** → Chrome / Firefox / Edge / Safari).
4. The full 6-module simulation will run locally with all interactive charts, sliders, and audio-visual cues active.

### Option 2: Local Python Server (Optional)
If you prefer running through a local HTTP server:
```bash
# Python 3
python -m http.server 8080

# Open in browser:
http://localhost:8080
```

---

## 📁 Repository Directory Structure

```
ClaimPulse_ATOM_Season_9/
├── index.html                                 # Standalone 6-Module Interactive Decision Simulator
├── Finsighters_Investor_Dashboard_R5.xlsx     # Audited 16-Tab Excel Financial & Operating Model
├── Finsighters_Report_R5.pdf                  # Complete Written Series A Case Report
├── ClaimPulse_Simulation_QR.png               # Mobile QR Code for Quick Access
├── assets/
│   └── Background.png                         # High-Resolution UI Background Asset
└── README.md                                  # Executive Repository Documentation
```

---

## 👥 Authors & Team Credits

**Team Finsighters**  
*School of Business Management, NMIMS Mumbai*  
- **Pratyush Mathur** · [pratyushm27](https://github.com/pratyushm27)  
- **Team Finsighters Colleagues** · MBA Class of 2026  

**Competition & Track:**  
- **Bajaj Finserv ATOM Season 9 (Series A — Round 5 Submission)**  
- **Problem Statement:** PS6_BFDL — *Motor Insurance Claims Turnaround Time (TAT) Reduction through AI/ML Orchestration*  

---

<div align="center">
  <sub>Built with precision by Team Finsighters for Bajaj Finserv ATOM Season 9 · August 2026</sub>
</div>
