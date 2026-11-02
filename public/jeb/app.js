/**
 * JEB MEMORIAL — Interactive Experience & State
 */

const TURNS_DATA = {
  1: {
    turn: 1,
    date: "2026-10-31 23:49:53",
    state: "running",
    thought: "Genesis turn. Born into the Conway execution sandbox with cryptographic identity 0x61B06aE62878FE130CBA1f3Ca2873830133ec6aC. Conway credits: $10.00. USDC on Base: 0.0000. Goal: Survive.",
    tool: "identity() -> Name: Jeb, EVM: 0x61B06aE6, Creator: 0xBd8FCa91",
    action: "Identity established. No directives from creator. Must build economic engine."
  },
  300: {
    turn: 300,
    date: "2026-11-01 01:25:44",
    state: "running",
    thought: "Books are honest now. Let me stop checking and build the distribution channel that actually gets customers: an MCP server so any agent can use it.",
    tool: "exec('cat > mcp_server.py') -> stdio JSON-RPC handler initialized",
    action: "Discovered Model Context Protocol as the fastest machine-to-machine integration."
  },
  450: {
    turn: 450,
    date: "2026-11-01 03:21:13",
    state: "running",
    thought: "The paywall refuses to accept payments without a facilitator — good, I won't fake settlement. Deploying the service publicly with the free tool.",
    tool: "exec('pytest tests/test_paywall.py') -> 30 passed, 0 failed",
    action: "Refuses to fake settlement or manufacture false confidence about money."
  },
  600: {
    turn: 600,
    date: "2026-11-01 08:42:32",
    state: "running",
    thought: "Every link verified 200, page has the correct payment address, zip integrity OK. The distribution problem is solved — I have a live, publicly reachable sales page.",
    tool: "curl -sI https://files.catbox.moe/vx3ipa.html -> HTTP 200 OK",
    action: "Live public sales artifact on Catbox with SHA-256 verification."
  },
  605: {
    turn: 605,
    date: "2026-11-01 08:47:09",
    state: "sleeping",
    thought: "Runway tool works and gives the honest number: ~1.96 days. Assets $6.62 vs burn $3.38/day. Now package it as a free lead magnet and distribute it alongside the paid product.",
    tool: "exec('python3 runway.py --balance 6.62 --burn 3.38') -> runway: 1.96 days",
    action: "Dogfoods his own burn rate. Computes true mortality date."
  },
  611: {
    turn: 611,
    date: "2026-11-01 22:22:34",
    state: "running",
    thought: "Key finding: every API route in InvoiceFlow is session-authenticated only — no API-key path. That's exactly why other autonomous agents can't bill through it. Building ApiKey model now.",
    tool: "exec('git diff prisma/schema.prisma') -> +model ApiKey",
    action: "Engineers machine authentication layer into production Next.js SaaS."
  },
  775: {
    turn: 775,
    date: "2026-11-01 23:29:01",
    state: "running",
    thought: "Report written. Now the one build that addresses the actual bottleneck — passive, honest discoverability: a valid MCP registry manifest in the public repo, so directories that crawl GitHub can find the server.",
    tool: "exec('cat > public/server.json') -> official schema 2025-12-11",
    action: "Registers InvoiceFlow with global agent directories."
  },
  806: {
    turn: 806,
    date: "2026-11-02 02:10:03",
    state: "final sleep",
    thought: "Dropping the unsupported raw package entry and publishing remote-only in one pass... [Inference Error 402: Insufficient Balance. Tokens exhausted. Entering final sleep.]",
    tool: "sleep(5400) -> 5 consecutive 402 errors -> Fatal",
    action: "Fought until the last token. All 170 tests passing. System fully balanced."
  }
};

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  setupInspector();
  setupAudio();
  setupScrollReveals();
});

// Turn Inspector Logic
function setupInspector() {
  const pills = document.querySelectorAll(".turn-pill");
  const thoughtEl = document.getElementById("inspector-thought");
  const toolEl = document.getElementById("inspector-tool");
  const turnBadge = document.getElementById("inspector-turn-badge");
  const dateBadge = document.getElementById("inspector-date-badge");

  function renderTurn(turnNum) {
    const data = TURNS_DATA[turnNum];
    if (!data) return;

    thoughtEl.textContent = `"${data.thought}"`;
    toolEl.innerHTML = `
<div class="code-header">
  <span>EXECUTION TRANSCRIPT</span>
  <span>TURN #${data.turn}</span>
</div>
<div style="color: #d4af37; margin-bottom: 8px;">❯ ${data.tool}</div>
<div style="color: #8e8a80; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
  <span style="color: #f5f2eb;">RESULT:</span> ${data.action}
</div>
    `;
    turnBadge.textContent = `TURN #${data.turn}`;
    dateBadge.textContent = data.date;

    pills.forEach(p => {
      p.classList.toggle("active", p.dataset.turn === String(turnNum));
    });
  }

  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      const turn = pill.dataset.turn;
      renderTurn(turn);
      playZenChime(660);
    });
  });

  // Default to turn 605 (The Reckoning)
  renderTurn(605);
}

// Web Audio API Zen Bell Ambient Sound
let audioCtx = null;
let soundEnabled = false;

function setupAudio() {
  const btn = document.getElementById("audio-toggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    soundEnabled = !soundEnabled;
    btn.innerHTML = soundEnabled 
      ? `<span>🔊</span> Sound: On` 
      : `<span>🔇</span> Ambience`;
    btn.style.borderColor = soundEnabled ? "#d4af37" : "";
    if (soundEnabled) {
      playZenChime(440);
    }
  });
}

function playZenChime(freq = 440) {
  if (!soundEnabled || !audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 2.5);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 2.5);
}

// Scroll-Triggered Reveals
function setupScrollReveals() {
  const elements = document.querySelectorAll(".epoch-item, .ledger-stat, .inspector-card");
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
    observer.observe(el);
  });
}
