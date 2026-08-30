/* =====================================================================
   ClaimPulse · Ask Finsighters Chat Widget
   ---------------------------------------------------------------------
   Interactive AI Project Assistant grounded in ClaimPulse R6 Engine.
   Provides direct dashboard navigation chips and Excel workbook refs.
   ===================================================================== */

const CPChat = (() => {
  const { el, mount, $, $$ } = CP;

  const STORAGE_KEY = 'cp_chat_history_v1';
  let isOpen = false;
  let isLoading = false;
  let messages = [];

  const STARTER_PROMPTS = [
    { label: 'Why is labour saving ₹0 in R6?', query: 'Why is labour saving zero in R6 and how is headcount treated?' },
    { label: 'Where is 175.9 FTE capacity redeployed?', query: 'Where is the 175.9 FTE liberated capacity redeployed and what is its value?' },
    { label: 'How does Gate 00 prevent fraud?', query: 'How does Gate 00 verify hardware evidence and handle fraud?' },
    { label: 'Explain the 5 specialised engines', query: 'Explain the 5 specialised engines, their layers, and their trust weights.' },
    { label: 'What is the IRDAI ₹50,000 corridor?', query: 'What is the IRDAI ₹50,000 corridor and how does ClaimPulse handle it?' }
  ];

  /* -------------------------------------------------------------------
     Markdown & Action Token Parser
     ------------------------------------------------------------------- */
  function parseContent(text) {
    if (!text) return '';
    let out = String(text);

    // Escape basic HTML
    out = out.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 1. Parse Excel Tokens: [[EXCEL:Sheet|Ref|Desc]]
    out = out.replace(/\[\[EXCEL:([^|]+)\|([^|]+)\|([^\]]+)\]\]/g, (m, sheet, ref, desc) => {
      return `<div class="cp-excel-card">
        <div class="cp-excel-head">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 16l-1.5-3.5L6.5 16H5l2.5-5L5 6h1.5l1.5 3.5L9.5 6H11l-2.5 5 2.5 5H9.5z"/></svg>
          <span>Excel Workbook Ref: ${sheet.trim()}</span>
        </div>
        <div class="cp-excel-ref">${ref.trim()}</div>
        <div class="cp-excel-desc">${desc.trim()}</div>
      </div>`;
    });

    // 2. Parse Navigation Tokens: [[NAV:route_id|Label]]
    out = out.replace(/\[\[NAV:([^|]+)\|([^\]]+)\]\]/g, (m, routeId, label) => {
      const rid = routeId.trim().toLowerCase();
      const lbl = label.trim();
      return `<button type="button" class="cp-nav-btn" data-nav="${rid}">
        <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <span>${lbl}</span>
      </button>`;
    });

    // 3. Headings
    out = out.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    out = out.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    out = out.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 4. Bold & Italic
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 5. Code
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 6. Horizontal rule
    out = out.replace(/^---$/gim, '<hr>');

    // 7. Unordered Lists
    out = out.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
    out = out.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
    out = out.replace(/<\/ul>\s*<ul>/gim, '');

    // 8. Paragraphs
    const paras = out.split(/\n\n+/);
    out = paras.map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<ul>') || p.startsWith('<div') || p.startsWith('<hr') || p.startsWith('<button')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return out;
  }

  /* -------------------------------------------------------------------
     UI Construction
     ------------------------------------------------------------------- */
  function buildWidget() {
    const existing = $('#cpChatRoot');
    if (existing) existing.remove();

    const root = el('div', { id: 'cpChatRoot' });

    // 1. Floating Trigger Button
    const trigger = el('button.cp-chat-trigger', {
      type: 'button',
      id: 'cpChatTrigger',
      'aria-label': 'Open Ask Finsighters Assistant',
      'data-open': 'false'
    }, [
      el('div.sparkle', {}, [
        el('svg', { viewBox: '0 0 24 24' }, [
          el('path', { d: 'M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z M19 17L20.2 19.8L23 21L20.2 22.2L19 25L17.8 22.2L15 21L17.8 19.8L19 17Z' })
        ])
      ]),
      el('span', { text: 'Ask Finsighters' }),
      el('div.pulse-dot', { title: 'Online & Grounded' })
    ]);

    // 2. Chat Modal Window
    const modal = el('div.cp-chat-modal', {
      id: 'cpChatModal',
      'data-open': 'false',
      role: 'dialog',
      'aria-label': 'Ask Finsighters AI Chat'
    }, [
      // Header
      el('div.cp-chat-head', {}, [
        el('div.cp-chat-brand', {}, [
          el('div.cp-chat-avatar', {}, [
            el('svg', { viewBox: '0 0 24 24' }, [
              el('path', { d: 'M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5a2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5' })
            ])
          ]),
          el('div.cp-chat-title-wrap', {}, [
            el('div.cp-chat-title', { text: 'Ask Finsighters' }),
            el('div.cp-chat-sub', { text: 'ClaimPulse Intelligence · ATOM 9' })
          ])
        ]),
        el('div.cp-chat-controls', {}, [
          el('button.cp-chat-ctrl-btn', { type: 'button', id: 'cpChatReset', title: 'Clear conversation' }, [
            el('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
              el('path', { d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' })
            ])
          ]),
          el('button.cp-chat-ctrl-btn', { type: 'button', id: 'cpChatClose', title: 'Minimize' }, [
            el('svg', { viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2 }, [
              el('path', { d: 'M18 6L6 18M6 6l12 12' })
            ])
          ])
        ])
      ]),

      // Message Body
      el('div.cp-chat-body', { id: 'cpChatBody' }),

      // Footer Input
      el('div.cp-chat-foot', {}, [
        el('form.cp-chat-form', { id: 'cpChatForm' }, [
          el('textarea.cp-chat-input', {
            id: 'cpChatInput',
            rows: 1,
            placeholder: 'Ask about R6 model, Gate 00, TAT, Excel formulas...',
            'aria-label': 'Chat prompt'
          }),
          el('button.cp-chat-send', { type: 'submit', id: 'cpChatSend', title: 'Send message' }, [
            el('svg', { viewBox: '0 0 24 24' }, [
              el('path', { d: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' })
            ])
          ])
        ]),
        el('div.cp-chat-subnote', { text: 'Grounded in ClaimPulse R6 Audited Model · Auto-Navigates Dashboard' })
      ])
    ]);

    mount(root, [trigger, modal]);
    document.body.appendChild(root);

    // Event Listeners
    trigger.addEventListener('click', toggleChat);
    $('#cpChatClose').addEventListener('click', closeChat);
    $('#cpChatReset').addEventListener('click', resetChat);

    const form = $('#cpChatForm');
    const input = $('#cpChatInput');

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val || isLoading) return;
      input.value = '';
      input.style.height = 'auto';
      sendMessage(val);
    });

    // Delegated click handler for navigation buttons
    $('#cpChatBody').addEventListener('click', e => {
      const navBtn = e.target.closest('.cp-nav-btn[data-nav]');
      if (navBtn) {
        const routeId = navBtn.dataset.nav;
        if (routeId) {
          location.hash = '#/' + routeId;
          // On mobile, collapse modal on navigation
          if (window.innerWidth <= 600) {
            closeChat();
          }
        }
      }
    });

    renderMessages();
  }

  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

  function openChat() {
    isOpen = true;
    $('#cpChatTrigger').setAttribute('data-open', 'true');
    $('#cpChatModal').setAttribute('data-open', 'true');
    setTimeout(() => {
      const input = $('#cpChatInput');
      if (input && window.innerWidth > 600) input.focus();
    }, 150);
  }

  function closeChat() {
    isOpen = false;
    $('#cpChatTrigger').setAttribute('data-open', 'false');
    $('#cpChatModal').setAttribute('data-open', 'false');
  }

  function resetChat() {
    messages = [];
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    renderMessages();
  }

  /* -------------------------------------------------------------------
     Render Messages Stream
     ------------------------------------------------------------------- */
  function renderMessages() {
    const body = $('#cpChatBody');
    if (!body) return;
    body.innerHTML = '';

    if (messages.length === 0) {
      // Welcome block with starter suggestions
      const welcome = el('div.cp-chat-welcome', {}, [
        el('div.cp-chat-welcome-title', { text: '💡 Welcome to Ask Finsighters' }),
        el('div.xsmall.muted', { text: 'Ask me anything about ClaimPulse: R6 financial numbers, Gate 00 architecture, capacity repurposing, or Excel references.' }),
        el('div.cp-starter-chips', {}, STARTER_PROMPTS.map(p => {
          const btn = el('button.cp-starter-chip', { type: 'button' }, [
            el('span', { text: p.label }),
            el('span.arrow', { text: '→' })
          ]);
          btn.addEventListener('click', () => sendMessage(p.query));
          return btn;
        }))
      ]);
      body.appendChild(welcome);
      return;
    }

    messages.forEach(msg => {
      const row = el('div.cp-msg-row', { class: msg.role });
      
      if (msg.role === 'bot') {
        const avatar = el('div.cp-msg-avatar', {}, [
          el('svg', { viewBox: '0 0 24 24' }, [
            el('path', { d: 'M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2' })
          ])
        ]);
        const bubble = el('div.cp-msg-bubble', { html: parseContent(msg.content) });
        mount(row, [avatar, bubble]);
      } else {
        const bubble = el('div.cp-msg-bubble', { text: msg.content });
        mount(row, [bubble]);
      }

      body.appendChild(row);
    });

    if (isLoading) {
      const loadingRow = el('div.cp-msg-row.bot', {}, [
        el('div.cp-msg-avatar', {}, [
          el('svg', { viewBox: '0 0 24 24' }, [
            el('path', { d: 'M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2' })
          ])
        ]),
        el('div.cp-typing-indicator', {}, [
          el('div.cp-typing-dot'),
          el('div.cp-typing-dot'),
          el('div.cp-typing-dot')
        ])
      ]);
      body.appendChild(loadingRow);
    }

    body.scrollTop = body.scrollHeight;
  }

  /* -------------------------------------------------------------------
     Send Message & API Interaction
     ------------------------------------------------------------------- */
  async function sendMessage(text) {
    if (!text || isLoading) return;

    // Add user message
    messages.push({ role: 'user', content: text });
    isLoading = true;
    renderMessages();

    // Extract live runtime context from dashboard & model
    const activeScreen = (location.hash || '').replace(/^#\/?/, '').split('?')[0] || 'command';
    let liveModel = {};
    try {
      if (typeof CPModel !== 'undefined' && CPModel.run) {
        const res = CPModel.run('base');
        liveModel = {
          net: (typeof CP !== 'undefined' && CP.fmt ? CP.fmt.cr(res.net) : res.net?.toFixed(2)),
          gross: (typeof CP !== 'undefined' && CP.fmt ? CP.fmt.cr(res.gross) : res.gross?.toFixed(2)),
          payback: (typeof CP !== 'undefined' && CP.fmt ? CP.fmt.n1(res.paybackKickoff) : res.paybackKickoff?.toFixed(1)),
          npv3: (typeof CP !== 'undefined' && CP.fmt ? CP.fmt.cr(res.npv3) : res.npv3?.toFixed(2)),
          fteReleased: (typeof CP !== 'undefined' && CP.fmt ? CP.fmt.n1(res.fteReleased) : res.fteReleased?.toFixed(1)),
          tatBlended: (typeof CP !== 'undefined' && CP.fmt ? CP.fmt.cr(res.tatBlended) : res.tatBlended?.toFixed(2)),
          combinedPP: (typeof CP !== 'undefined' && CP.fmt ? CP.fmt.cr(res.combinedPP) : res.combinedPP?.toFixed(3))
        };
      }
    } catch (e) {}

    // Prepare history payload for /api/chat
    const apiPayload = {
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content
      })),
      clientContext: {
        activeScreen,
        liveModel
      }
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || 'I received no response from the intelligence engine.';

      messages.push({ role: 'bot', content: reply });
    } catch (err) {
      console.warn('Direct /api/chat unreachable, falling back to local grounded knowledge:', err);
      const fallback = localKnowledgeFallback(text);
      messages.push({ role: 'bot', content: fallback });
    } finally {
      isLoading = false;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
      } catch (e) {}
      renderMessages();
    }
  }

  /* -------------------------------------------------------------------
     Local Knowledge Fallback (For offline file:// or non-serverless dev)
     ------------------------------------------------------------------- */
  function localKnowledgeFallback(query) {
    const q = query.toLowerCase();

    if (q.includes('labour') || q.includes('labor') || q.includes('w-18') || q.includes('headcount') || q.includes('retrench')) {
      return `### Why Labour Saving is ₹0 in R6

In the **R6 Audited Financial Engine**, labour savings are deliberately booked at **₹0** [[EXCEL:Sheet 3 (Workings)|W-18 (Row 52)|Labour Savings Zeroed]].

**Rationale:**
1. **Zero Retrenchments:** We do not lay off claims staff or adjusters.
2. **Capacity Redeployment (W-22a):** Instead of cutting headcount, **175.9 FTE** of liberated claims capacity is redirected into cross-selling, renewals, and high-complexity loss control, generating **₹16.62 Cr** in gross redeployed output.
3. **P&L Integrity:** Claims handling operational expense remains on the P&L rather than claiming an artificial payroll cut.

[[NAV:tat|Explore TAT & Capacity Repurposing]]
[[NAV:value|View Executive P&L Bridge]]`;
    }

    if (q.includes('gate 00') || q.includes('camera') || q.includes('fraud') || q.includes('engine') || q.includes('cv')) {
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

    if (q.includes('corridor') || q.includes('50,000') || q.includes('50000') || q.includes('irdai') || q.includes('surveyor')) {
      return `### The IRDAI ₹50,000 Surveyor Corridor

Under the **IRDAI Master Circular on Protection of Policyholders' Interests (2024)**, insurers are mandated to appoint an independent surveyor for Motor OD claims exceeding ₹50,000.

**ClaimPulse Treatment:**
- Any claim exceeding **₹50,000** is legally capped to **AMBER** for surveyor assessment, even if its Trust Score is 100/100.
- This is a statutory compliance rule, not a tuning parameter.
- Surveyors are redeployed from routine dent inspections to high-value complex losses.

[[NAV:garage|View Garage & Surveyor Console]]
[[EXCEL:Sheet 1 (Inputs)|A-11|IRDAI Surveyor Exemption Corridor]]`;
    }

    if (q.includes('npv') || q.includes('payback') || q.includes('benefit') || q.includes('capex') || q.includes('financial')) {
      return `### Financial Model (R6 Audited Summary)

- **Net Annual Benefit:** **₹30.95 Cr / year** (Base plan)
- **Gross Benefit:** **₹34.85 Cr / year**
- **Payback from Kickoff:** **20.07 months** (includes 10-month build and rollout ramp)
- **Steady-State Payback:** **3.84 months**
- **3-Year NPV @ 12% WACC:** **₹51.06 Cr**
- **Motor OD Combined Ratio Impact:** **−1.148 pp** (104.70% $\\rightarrow$ 103.55%)
- **Total Capex:** **₹9.89 Cr** across 10-month modular build

[[NAV:overview|View Case Overview]]
[[NAV:stress|Explore Financial Stress Test]]
[[EXCEL:Sheet 4 (Forecast)|Row 35|3-Year NPV Calculation]]`;
    }

    return `### ClaimPulse Executive Overview

**ClaimPulse** is the verified-evidence Motor Own Damage insurance orchestration platform built for **Bajaj Finserv ATOM Season 9** by **Team Finsighters (NMIMS Mumbai)**.

**Key Impact:**
- **TAT Collapse:** 9.8 days $\\rightarrow$ **2.71 days** (−72.3%)
- **Touch Reduction:** 7.0 $\\rightarrow$ **1.23 touches** (−82.4%)
- **Capacity Liberated:** **175.9 FTE** repurposed into cross-sell and retention.
- **Audited Net Benefit:** **₹30.95 Cr/yr** with **₹51.06 Cr** 3-year NPV.

[[NAV:overview|View Case Overview]]
[[NAV:tat|Explore TAT & Capacity Repurposing]]
[[NAV:architecture|Inspect Live Solution Architecture]]`;
  }

  function init() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) messages = JSON.parse(saved);
    } catch (e) {}

    buildWidget();
  }

  return { init, open: openChat, close: closeChat, ask: sendMessage };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', CPChat.init);
} else {
  CPChat.init();
}
