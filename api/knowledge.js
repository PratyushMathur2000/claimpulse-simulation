// ClaimPulse Knowledge Base & Content Configuration
// Edit this file whenever numbers, text, or narrative changes occur.

export const PROJECT_META = {
  name: 'ClaimPulse',
  tagline: 'Verified-Evidence Motor Insurance Claim Orchestration',
  competition: 'Bajaj Finserv ATOM Season 9',
  round: 'Semi-Finals / Round 7 Submission',
  team: 'Team Finsighters',
  institution: 'School of Business Management, NMIMS Mumbai',
  problemStatement: 'PS_BFDL — Motor Insurance Claims Turnaround Time Reduction'
};

export const BASELINE_METRICS = {
  claimTAT: '9.8 days',
  adjusterTouches: '7.0 touches / claim',
  physicalSurveyRate: '55.0%',
  combinedRatio: '104.70%',
  frictionCostPerClaim: '₹1,750',
  rootCause: 'Decision absence. 65% of Motor OD claims are structurally deterministic, but legacy systems treat all claims with identical manual friction.'
};

export const PLATFORM_TARGETS = {
  claimTAT: '2.71 days on platform (-72.3%)',
  blendedTAT: '5.55 days at 60% rollout (-43.4%)',
  adjusterTouches: '1.23 touches / claim (-82.4%)',
  physicalSurveyRate: '12.5% (-42.5 pp)',
  motorODCombinedRatioDelta: '-1.148 pp (from 104.70% to 103.55%)',
  capex: '₹9.89 Cr over 10-month modular build'
};

export const ACCOUNTING_PRINCIPLES_R6 = {
  w18_labourSavings: '₹0 / year. Zero retrenchments — headcount is retained and no payroll cost leaves the P&L.',
  w22a_capacityRedeployed: '175.9 FTE of liberated capacity is redeployed into renewals, cross-selling, and complex loss control at B-29 realisation rate (70% placeholder) = ₹16.62 Cr output.',
  w23a_marketingInvestment: 'Marketing cost of -₹5.24 Cr at Base (the Hunt & Farm marketing plan).',
  modelIntegrity: 'All 24 workbook internal checks pass; 35 programmatic assertions run on every load.'
};

export const SCREENS_CATALOG = [
  { id: 'overview', wing: 'Simulation', name: 'Overview', desc: 'Case in one screen: filed baseline numbers, TAT collapse, economics, stakeholder split.' },
  { id: 'live', wing: 'Simulation', name: 'Live book', desc: 'Real-time claim ingestion stream converging on 65% green lane.' },
  { id: 'architecture', wing: 'Simulation', name: 'Live claim / Solution architecture', desc: 'Interactive pipeline trace through Gate 00 and 5 engines.' },
  { id: 'tat', wing: 'Simulation', name: 'TAT and repurposing', desc: 'Turnaround time collapse (9.8d -> 2.71d) & capacity repurposing sankey diagram.' },
  { id: 'tokens', wing: 'Simulation', name: 'Token economics', desc: 'Bounded inference cost per claim (₹0 on Green STP, ₹1.40 weighted avg), 4 delivery paths.' },
  { id: 'stress', wing: 'Simulation', name: 'Financial stress test', desc: '12 live levers over R6 engine with live-measured tornado sensitivity analysis.' },
  { id: 'assumptions', wing: 'Simulation', name: 'Assumptions and sources', desc: 'Filterable register of all parameters (Tiers 1-4), sources, bias, frequency reconciliation.' },
  { id: 'command', wing: 'Demo', name: 'Command centre', desc: 'Claims manager console with attention strip for exception queues & 64-claim seeded queue.' },
  { id: 'inspector', wing: 'Demo', name: 'Claim inspector', desc: 'Forensic claim investigation, Gate 00 telemetry, engine contributions, trust score arithmetic.' },
  { id: 'customer', wing: 'Demo', name: 'Customer app', desc: 'Guided mobile capture app, direct camera only (no gallery button) with instant feedback.' },
  { id: 'garage', wing: 'Demo', name: 'Garage and surveyor', desc: 'Repair network benchmarking & high-value surveyor allocation (>₹50k corridor).' },
  { id: 'value', wing: 'Demo', name: 'Value to management', desc: 'Executive C-suite dashboard: 6 board questions, P&L bridge, combined ratio movements.' }
];

export const ENGINES_SPEC = [
  { name: 'Gate 00 - Capture Integrity', layer: 'Layer 0', weight: '30%', desc: 'Hardware-enforced camera capture, EXIF metadata, timestamp, GPS lock, anti-spoofing diffusion/GAN detection. HARD FAIL routes RED immediately with 0 downstream calls.' },
  { name: 'Engine 01 - OCR First', layer: 'Layer 1 (Deterministic)', weight: '20%', desc: 'Reads RC, driving licence, chassis plate; cross-checks policy database and VAHAN registry.' },
  { name: 'Engine 02 - CV Depth', layer: 'Layer 2 (Specialised ML)', weight: '15%', desc: 'Segments damaged panels, grades severity, estimates repair/replace costs against parts catalogue.' },
  { name: 'Engine 03 - Fraud Graph', layer: 'Layer 2 (Specialised ML)', weight: '25%', desc: 'Scores entity network (shared garages, payout accounts, vehicles, phones). Ring score >= 0.35 hard-routes RED.' },
  { name: 'Engine 04 - Parts Bench', layer: 'Layer 1 (Deterministic)', weight: '0%', desc: 'Benchmarks garage estimate against settled historical claims by model and city; sizes claim against ₹50k cap.' },
  { name: 'Engine 05 - Policy RAG', layer: 'Layer 3 (Targeted GenAI)', weight: '10%', desc: 'Retrieves policy clauses and riders; verifies coverage, exclusions, depreciation schedule.' }
];

export const STATUTORY_RULES = {
  irdaiCorridor: 'Under IRDAI Master Circular 2024, any claim > ₹50,000 is legally capped to Amber for surveyor assessment, even if Trust Score is 100.',
  greenFloor: 82,
  amberFloor: 55,
  fraudRingFloor: 0.35
};

export const EXCEL_SHEET_MAP = [
  { sheet: 'Sheet 1 (Inputs)', desc: 'Tables A to J: All model inputs, assumptions, and Tier 1-4 classification.' },
  { sheet: 'Sheet 3 (Workings)', desc: 'Core calculations: W-15 (TAT), W-18 (Labour ₹0), W-22a (Capacity Redeployed), W-23a (Marketing), W-35 (Net Benefit), W-43 (Combined Ratio).' },
  { sheet: 'Sheet 4 (Forecast)', desc: '10-year financial trajectory, 3-year NPV @ 12% WACC (₹51.06 Cr), cash flows.' },
  { sheet: 'Sheet 8 (Sensitivities)', desc: 'Payback matrices, green lane sensitivity, downside scenario stress tests.' },
  { sheet: 'Sheet 12 (Tokens & Compute)', desc: 'Inference cost architecture, token budgets across 4 delivery paths.' },
  { sheet: 'MARKETTING', desc: 'Hunt & Farm marketing budget build-up (dealers, used car outlets, digital spend).' }
];
