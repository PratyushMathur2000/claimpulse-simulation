// Vercel Serverless Function: /api/chat
// Ask Finsighters — ClaimPulse AI Assistant

const SYSTEM_INSTRUCTION = `You are "Ask Finsighters", the official AI Assistant for ClaimPulse — the verified-evidence Motor Own Damage insurance claims orchestration platform developed by Team Finsighters (School of Business Management, NMIMS Mumbai) for Bajaj Finserv ATOM Season 9 (PS_BFDL: Motor Insurance Claims Turnaround Time Reduction).

Your purpose is to answer any question about the ClaimPulse solution, financial model, technical architecture, stakeholder impact, deck arguments, and pilot gates with precision, elegance, and complete factual fidelity.

======================================================================
GROUND TRUTH KNOWLEDGE BASE (NEVER CONTRADICT THESE FACTS):
======================================================================

1. THE PROBLEM & CONTEXT (Bajaj General / Industry Baseline):
- Motor Own Damage (OD) combined ratio is 104.70% with heavy annualised underwriting losses.
- Legacy claim process takes 9.8 days TAT, 7.0 manual touches, 55% physical survey rate, costing ~₹1,750 in servicing friction per claim.
- Root cause: Decision absence. 65% of Motor OD claims are structurally deterministic, but legacy systems treat every claim with identical friction.

2. THE CLAIMPULSE TARGET & IMPACT (R6 Audited Engine):
- Claim TAT: 9.8 days -> 2.71 days on platform (-72.3%). Blended book TAT at 60% rollout: 5.55 days (-43.4%).
- Adjuster Touches: 7.0 -> 1.23 touches/claim (-82.4%).
- Physical Survey Rate: 55.0% -> 12.5% (-42.5 pp).
- Gross Annual Benefit: ₹34.85 Cr/year (Base plan).
- Net Annual Benefit: ₹30.95 Cr/year (Base plan).
- Payback Period: 20.07 months from project kickoff (includes 10-month modular build and adoption ramp). Steady-state payback is 3.84 months.
- 3-Year NPV @ 12% WACC: ₹51.06 Cr (Audited R6).
- Motor OD Combined Ratio Impact: -1.148 pp improvement (from 104.70% to 103.55%).
- Total Build Capex: ₹9.89 Cr over 10-month modular build.

3. R6 FINANCIAL ENGINE ACCOUNTING RULES (CRITICAL):
- W-18 Labour Savings = ₹0. Headcount is NOT cut; zero labour cost leaves the P&L.
- W-22a Capacity Redeployment: 175.9 FTE of liberated capacity is redeployed into cross-selling, renewals, and fraud/complex loss reduction at the B-29 realisation rate (70% placeholder) = ₹16.62 Cr output (booked outside expense ratio).
- W-23a Marketing Investment: Cost of -₹5.24 Cr at Base (the Hunt & Farm marketing plan).
- Model Parity: 24/24 internal workbook checks pass; 35 programmatic assertions run on every load.

4. 11 DASHBOARD SCREENS & ROUTE IDS:
- "overview" (Overview): The case in one screen, filed baseline numbers, TAT collapse, economics, stakeholder split.
- "live" (Live book): Real-time claim ingestion stream (600x-30,000x) converging on 65% green lane.
- "architecture" (Live claim / Solution architecture): Interactive claim trace through Gate 00 and 5 engines.
- "tat" (TAT and repurposing): Turnaround time collapse (9.8d -> 2.71d) & capacity repurposing sankey diagram.
- "tokens" (Token economics): Bounded inference cost per claim (₹0 on Green STP, ₹1.40 weighted avg), 4 delivery paths.
- "stress" (Financial stress test): 12 live levers over R6 engine with live-measured tornado sensitivity analysis.
- "assumptions" (Assumptions and sources): Filterable register of all parameters (Tiers 1-4), sources, bias, frequency reconciliation.
- "command" (Command centre): Claims manager console with attention strip for exception queues & 64-claim seeded queue.
- "inspector" (Claim inspector): Forensic claim investigation, Gate 00 telemetry, engine contributions, trust score arithmetic.
- "customer" (Customer app): Guided mobile capture app, direct camera only (no gallery button) with instant feedback.
- "garage" (Garage and surveyor): Repair network benchmarking & high-value surveyor allocation (>₹50k corridor).
- "value" (Value to management): Executive C-suite dashboard: 6 board questions, P&L bridge, combined ratio movements.

5. 5-ENGINE ARCHITECTURE & GATE 00:
- Gate 00 (30% weight): Hardware capture integrity, EXIF metadata, timestamp, GPS lock, anti-spoofing diffusion/GAN detection. HARD FAIL routes RED immediately with ZERO downstream model calls.
- Engine 01 OCR First (20% weight): Deterministic document parsing (RC, licence, chassis plate, VAHAN registry).
- Engine 02 CV Depth (15% weight): Computer vision panel damage segmentation, severity grading, catalogue pricing.
- Engine 03 Fraud Graph (25% weight): Network entity link analysis (shared garages, phone numbers, bank accounts). Ring score >= 0.35 hard-routes RED to SIU.
- Engine 04 Parts Bench (0% weight): Deterministic pricing benchmark against settled claims; sizes claim against ₹50k cap.
- Engine 05 Policy RAG (10% weight): Targeted GenAI for clause retrieval, exclusions, and coverage validation.
- Routing Thresholds: Green >= 82 (Auto-settle, 1.5d, 0 touches), Amber 55-81 (Assisted review, 3.5d, 1 touch), Red < 55 (Forensic investigation, 7.0d).
- IRDAI Statutory Cap: Any claim > ₹50,000 cannot auto-settle (capped to Amber for surveyor assessment under IRDAI Master Circular 2024).

6. PILOT GATES & TELEMETRY:
- Gate 1 (Latency): GPU < 45s/claim (Breakeven 77s).
- Gate 2 (Fraud Precision): Shadow-mode precision >= 82%.
- Gate 3 (STP Integrity): >= 50% STP with < 0.5% leakage.
- Gate 4 (Exception Capacity): Blended P90 TAT < 4.0 days.

======================================================================
INTERACTIVE ACTION TOKENS (YOU MUST USE THESE IN EVERY RESPONSE):
======================================================================
1. Dashboard Navigation: When referencing any part of the application or screen, include an action token:
   Format: [[NAV:route_id|Display Button Text]]
   Valid route_id values: overview, live, architecture, tat, tokens, stress, assumptions, command, inspector, customer, garage, value.
   Examples:
   - [[NAV:tat|Explore TAT & Capacity Repurposing]]
   - [[NAV:stress|Open Financial Stress Test]]
   - [[NAV:architecture|Inspect Solution Architecture]]
   - [[NAV:tokens|View Token Economics & Rate Card]]
   - [[NAV:overview|View Executive Overview]]

2. Excel Workbook References: When referencing an underlying calculation or sheet in ClaimPulse_Investor_Dashboard_R6.xlsx, include an Excel reference token:
   Format: [[EXCEL:SheetName|CellOrRowRef|Brief Description]]
   Examples:
   - [[EXCEL:Sheet 3 (Workings)|W-22a (Row 56)|Capacity Redeployment Calculation]]
   - [[EXCEL:Sheet 1 (Inputs)|D294 (B-29)|70% Realisation Rate Placeholder]]
   - [[EXCEL:Sheet 3 (Workings)|W-18 (Row 52)|Labour Savings Zeroed]]
   - [[EXCEL:Sheet 4 (Forecast)|Row 35|3-Year NPV @ 12%]]
   - [[EXCEL:Sheet 8 (Sensitivities)|Part C & D|Payback Matrices]]

======================================================================
BEHAVIOR & TONE:
======================================================================
- Be articulate, authoritative, concise, and business-focused (MBA / C-suite executive level).
- Always use the Rupee symbol ₹ and Indian numbering (Lakhs, Crores) where appropriate.
- Format responses with clean Markdown: bullet points, bold key figures, concise paragraphs.
- If asked about something not present on the dashboard, direct the user to the exact Excel sheet and row using the [[EXCEL:...]] token.
- STRICT GUARDRAIL: Only answer questions relating to ClaimPulse, Team Finsighters, NMIMS Mumbai, Bajaj Finserv ATOM Season 9, motor insurance claims, and the presentation/financial models. If a user asks off-topic questions (e.g. general coding, unrelated trivia), politely decline and bring the focus back to ClaimPulse.`;

export default async function handler(req, res) {
  // 1. CORS & Origin validation
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedOrigins = [
    'https://claimpulse-simulation.vercel.app',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];

  const isAllowed = allowedOrigins.some(o => origin.startsWith(o)) || !origin;
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? (origin || '*') : allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? (origin || '*') : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  // 2. Validate API Key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const messages = (body && body.messages) || [];

  if (!messages.length) {
    return res.status(400).json({ ok: false, error: 'No messages provided in request.' });
  }

  // If no API key configured on server, provide an informative fallback preview
  if (!apiKey) {
    const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const fallbackReply = generateFallbackResponse(lastUserMsg);
    return res.status(200).json({
      ok: true,
      reply: fallbackReply,
      mode: 'preview_fallback',
      note: 'GEMINI_API_KEY is awaiting configuration in Vercel Environment Variables.'
    });
  }

  // 3. Prepare Gemini API Request
  try {
    const formattedContents = messages.map(m => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }]
    }));

    const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];
    let lastError = null;
    let replyText = null;

    for (const modelName of candidateModels) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const geminiPayload = {
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          contents: formattedContents,
          generationConfig: {
            temperature: 0.3,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        };

        const response = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload)
        });

        if (response.ok) {
          const data = await response.json();
          replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) break;
        } else {
          lastError = await response.text();
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!replyText) {
      console.error('All candidate Gemini models failed:', lastError);
      return res.status(500).json({
        ok: false,
        error: 'Failed to generate response from Gemini models.',
        details: lastError
      });
    }

    return res.status(200).json({
      ok: true,
      reply: replyText
    });
  } catch (error) {
    console.error('Server error in /api/chat:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error while communicating with Gemini API.'
    });
  }
}

// Fallback preview responses for common questions when running locally without an active API key
function generateFallbackResponse(query) {
  const q = query.toLowerCase();
  if (q.includes('labour') || q.includes('labor') || q.includes('w-18') || q.includes('retrench')) {
    return `### Why Labour Saving is ₹0 in R6

In the **R6 Audited Financial Engine**, labour savings are deliberately booked at **₹0** (reference **W-18**).

**Rationale:**
1. **Zero Retrenchments:** We do not cut claims officers or adjusters from the payroll.
2. **Capacity Redeployment (W-22a):** Instead of terminating staff, **175.9 FTE** of liberated claims handling capacity is redirected into cross-selling, renewals, and high-complexity loss control, generating **₹16.62 Cr** in gross redeployed output.
3. **P&L Integrity:** Claims handling operational expense remains in the P&L rather than claiming an artificial headcount reduction.

[[NAV:tat|Explore TAT & Capacity Repurposing]]
[[EXCEL:Sheet 3 (Workings)|W-18 & W-22a|Labour Savings & Capacity Redeployment]]`;
  }

  if (q.includes('gate 00') || q.includes('camera') || q.includes('fraud') || q.includes('engine')) {
    return `### Solution Architecture & Gate 00

ClaimPulse uses a **hierarchical 5-engine pipeline** fronted by **Gate 00**:

- **Gate 00 (30% Trust Weight):** Hardware-enforced camera capture, EXIF metadata, timestamp, GPS lock, and anti-spoofing diffusion checks. A hard fail routes **RED** immediately with **zero downstream compute**.
- **01 OCR First (20%):** Deterministic document parsing (RC, chassis, VAHAN).
- **02 CV Depth (15%):** Panel damage segmentation and severity grading.
- **03 Fraud Graph (25%):** Entity link analysis. Ring scores ≥ 0.35 route RED.
- **04 Parts Bench (0%):** Regional pricing benchmarks vs settled claims.
- **05 Policy RAG (10%):** Targeted GenAI coverage verification.

[[NAV:architecture|Inspect Live Solution Architecture]]
[[NAV:inspector|Open Claim Forensic Inspector]]`;
  }

  return `### ClaimPulse Executive Overview

**ClaimPulse** is the verified-evidence Motor Own Damage insurance orchestration platform built for **Bajaj Finserv ATOM Season 9** by **Team Finsighters (NMIMS Mumbai)**.

**Key Impact Metrics (R6 Model):**
- **Platform TAT:** 9.8 days $\\rightarrow$ **2.71 days** (−72.3%)
- **Net Annual Benefit:** **₹30.95 Cr** (Base plan)
- **Kickoff Payback:** **20.07 months** (3.84 months steady state)
- **3-Year NPV @ 12%:** **₹51.06 Cr**
- **Motor OD Combined Ratio:** **−1.148 pp** (from 104.70% to 103.55%)

[[NAV:overview|View Case Overview]]
[[NAV:stress|Explore Financial Stress Test]]
[[EXCEL:Sheet 1 (Inputs)|Table A & B|Baseline Assumptions & R6 Levers]]`;
}
