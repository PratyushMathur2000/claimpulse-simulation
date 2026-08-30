// Vercel Serverless Function: /api/chat
// Ask Finsighters — ClaimPulse Modular AI Assistant Proxy

import {
  PROJECT_META,
  BASELINE_METRICS,
  PLATFORM_TARGETS,
  ACCOUNTING_PRINCIPLES_R6,
  SCREENS_CATALOG,
  ENGINES_SPEC,
  STATUTORY_RULES,
  EXCEL_SHEET_MAP
} from './knowledge.js';

/**
 * Dynamically builds the system instruction from modular knowledge + live client state
 */
function buildSystemPrompt(clientContext = {}) {
  const currentScreen = clientContext.activeScreen || 'command';
  const liveModel = clientContext.liveModel || {};

  return `You are "Ask Finsighters", the official AI Assistant for ${PROJECT_META.name} (${PROJECT_META.tagline}) developed by ${PROJECT_META.team} (${PROJECT_META.institution}) for ${PROJECT_META.competition} (${PROJECT_META.problemStatement}).

Your purpose is to answer any question about the ClaimPulse solution, financial model, technical architecture, stakeholder impact, deck arguments, and pilot gates with precision, elegance, and complete factual fidelity.

======================================================================
LIVE DASHBOARD CONTEXT (CURRENT USER STATE):
======================================================================
- Current Screen Active in User View: "${currentScreen}"
${liveModel.net ? `- Live Model Net Benefit: ₹${liveModel.net} Cr (Payback: ${liveModel.payback || '20.07'} mo, 3-Yr NPV: ₹${liveModel.npv3 || '51.06'} Cr, FTE Released: ${liveModel.fteReleased || '175.9'})` : ''}

======================================================================
GROUND TRUTH KNOWLEDGE BASE:
======================================================================

1. THE PROBLEM & CONTEXT (Baseline):
- Motor Own Damage (OD) combined ratio: ${BASELINE_METRICS.combinedRatio}
- Baseline Process: ${BASELINE_METRICS.claimTAT} TAT, ${BASELINE_METRICS.adjusterTouches}, ${BASELINE_METRICS.physicalSurveyRate} physical survey rate, ${BASELINE_METRICS.frictionCostPerClaim} friction cost.
- Root Cause: ${BASELINE_METRICS.rootCause}

2. THE CLAIMPULSE TARGET & IMPACT:
- Platform Claim TAT: ${PLATFORM_TARGETS.claimTAT}
- Blended Book TAT: ${PLATFORM_TARGETS.blendedTAT}
- Adjuster Touches: ${PLATFORM_TARGETS.adjusterTouches}
- Physical Survey Rate: ${PLATFORM_TARGETS.physicalSurveyRate}
- Motor OD Combined Ratio: ${PLATFORM_TARGETS.motorODCombinedRatioDelta}
- Total Capex: ${PLATFORM_TARGETS.capex}

3. ACCOUNTING & FINANCIAL RULES:
- Labour Savings: ${ACCOUNTING_PRINCIPLES_R6.w18_labourSavings}
- Capacity Redeployment: ${ACCOUNTING_PRINCIPLES_R6.w22a_capacityRedeployed}
- Marketing: ${ACCOUNTING_PRINCIPLES_R6.w23a_marketingInvestment}
- Integrity: ${ACCOUNTING_PRINCIPLES_R6.modelIntegrity}

4. 11 DASHBOARD SCREENS & ROUTE IDS:
${SCREENS_CATALOG.map(s => `- "${s.id}" (${s.name}, Wing: ${s.wing}): ${s.desc}`).join('\n')}

5. 5-ENGINE ARCHITECTURE & GATE 00:
${ENGINES_SPEC.map(e => `- ${e.name} (${e.layer}, Weight: ${e.weight}): ${e.desc}`).join('\n')}
- Routing Floors: Green >= ${STATUTORY_RULES.greenFloor}, Amber >= ${STATUTORY_RULES.amberFloor}, Fraud Ring >= ${STATUTORY_RULES.fraudRingFloor}.
- Statutory Rule: ${STATUTORY_RULES.irdaiCorridor}

6. EXCEL WORKBOOK ARCHITECTURE (ClaimPulse_Investor_Dashboard_R6.xlsx):
${EXCEL_SHEET_MAP.map(x => `- ${x.sheet}: ${x.desc}`).join('\n')}

======================================================================
INTERACTIVE ACTION TOKENS (YOU MUST USE THESE IN EVERY RESPONSE):
======================================================================
1. Dashboard Navigation: When referencing any part of the application or screen, include an action token:
   Format: [[NAV:route_id|Display Button Text]]
   Valid route_id values: ${SCREENS_CATALOG.map(s => s.id).join(', ')}.

2. Excel Workbook References: When referencing an underlying calculation or sheet, include an Excel reference token:
   Format: [[EXCEL:SheetName|CellOrRowRef|Brief Description]]

======================================================================
BEHAVIOR & TONE:
======================================================================
- Be articulate, authoritative, concise, and business-focused (MBA / C-suite executive level).
- Always use the Rupee symbol ₹ and Indian numbering (Lakhs, Crores).
- Format responses with clean Markdown: bullet points, bold key figures, concise paragraphs.
- STRICT GUARDRAIL: Only answer questions relating to ClaimPulse, Team Finsighters, NMIMS Mumbai, Bajaj Finserv ATOM Season 9, motor insurance claims, and the presentation/financial models. Decline off-topic questions politely.`;
}

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
  const clientContext = (body && body.clientContext) || {};

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
    const systemPrompt = buildSystemPrompt(clientContext);
    const formattedContents = messages.map(m => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }]
    }));

    const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.5-flash'];
    let lastError = null;
    let replyText = null;

    for (const modelName of candidateModels) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const geminiPayload = {
          systemInstruction: {
            parts: [{ text: systemPrompt }]
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
