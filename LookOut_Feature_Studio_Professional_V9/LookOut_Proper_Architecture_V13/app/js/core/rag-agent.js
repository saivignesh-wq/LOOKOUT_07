/* =========================================================
   LOOKOUT - BOTTOM RAG ASSISTANT
   The home search hands questions to this assistant.
   ========================================================= */
(function () {
  "use strict";

  const RAG_API_BASE = window.LOOKOUT_RAG_API_BASE || "/api/rag";

  function currentPage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("gen")) return "AI Generator";
    if (path.includes("ai-edit")) return "AI Edit";
    if (path.includes("manual")) return "Manual Edit";
    if (path.includes("saved")) return "Saved Works";
    if (path.includes("main") || path === "/" || path === "") return "Home";
    return "LookOut";
  }

  function createAssistant() {
    if (document.getElementById("ragAssistant")) return;

    const assistant = document.createElement("section");
    assistant.id = "ragAssistant";
    assistant.className = "rag-assistant";
    assistant.setAttribute("aria-hidden", "true");

    assistant.innerHTML = `
      <div class="rag-header">
        <div class="rag-title-area">
          <div class="rag-avatar">✦</div>
          <div>
            <div class="rag-title">AI Assistant</div>
            <div class="rag-status">Ask anything about LOOKOUT, tools, features, or workflows</div>
          </div>
        </div>
        <button class="rag-close-btn" id="ragCloseBtn" type="button" aria-label="Close assistant">×</button>
      </div>

      <div class="rag-messages" id="ragMessages">
        <div class="rag-message assistant">
          <div class="rag-message-avatar">✦</div>
          <div class="rag-message-content">
            Hi! Ask me anything about LOOKOUT.
          </div>
        </div>
      </div>

      <div class="rag-input-area">
        <textarea id="ragQuestion" class="rag-input"
          placeholder="Ask LOOKOUT anything..." rows="1"></textarea>
        <button type="button" class="rag-voice-btn voice-input-btn"
          id="ragVoiceBtn" aria-label="Voice input" title="Voice input"><i class="fa-solid fa-microphone" aria-hidden="true"></i></button>
        <button type="button" class="rag-send-btn"
          id="ragSendBtn" aria-label="Send question" title="Send">➤</button>
      </div>
    `;

    document.body.appendChild(assistant);

    const closeBtn = assistant.querySelector("#ragCloseBtn");
    const question = assistant.querySelector("#ragQuestion");
    const sendBtn = assistant.querySelector("#ragSendBtn");
    const voiceBtn = assistant.querySelector("#ragVoiceBtn");

    function openAssistant(prefill = "") {
      assistant.classList.add("open");
      assistant.setAttribute("aria-hidden", "false");

      if (prefill) {
        question.value = prefill;
      }

      setTimeout(() => {
        question.focus();
        question.setSelectionRange(question.value.length, question.value.length);
      }, 80);
    }

    function closeAssistant() {
      assistant.classList.remove("open");
      assistant.setAttribute("aria-hidden", "true");
    }

    function addMessage(message, type) {
      const messages = assistant.querySelector("#ragMessages");
      const row = document.createElement("div");
      row.className = `rag-message ${type}`;

      const avatar = document.createElement("div");
      avatar.className = "rag-message-avatar";
      avatar.textContent = type === "assistant" ? "✦" : "You";

      const content = document.createElement("div");
      content.className = "rag-message-content";
      content.textContent = message;

      row.append(avatar, content);
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
    }

    async function askRAG(prefill) {
      const text = (prefill || question.value || "").trim();
      if (!text) return;

      if (prefill) question.value = prefill;
      addMessage(text, "user");
      question.value = "";

      try {
        const email = localStorage.getItem("userEmail") || "";
        const response = await fetch(`${RAG_API_BASE}/ask`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            question: text,
            email,
            page: currentPage(),
            application: "LookOut"
          })
        });

        if (!response.ok) throw new Error(`RAG request failed: ${response.status}`);
        const data = await response.json();

        addMessage(
          data.answer || data.response || data.message || data.result ||
          "I couldn't find an answer to that.",
          "assistant"
        );
      } catch (error) {
        console.error("LookOut RAG error:", error);
        addMessage(
          "The LOOKOUT Assistant is currently unavailable. Please check the RAG backend connection.",
          "assistant"
        );
      }
    }

    closeBtn.addEventListener("click", closeAssistant);
    sendBtn.addEventListener("click", () => {
      if (document.body.classList.contains("lookout-home-page") && !assistant.classList.contains("open")) openAssistant();
      askRAG();
    });

    question.addEventListener("focus", () => {
      if (document.body.classList.contains("lookout-home-page") && !assistant.classList.contains("open")) openAssistant();
    });
    question.addEventListener("click", () => {
      if (document.body.classList.contains("lookout-home-page") && !assistant.classList.contains("open")) openAssistant();
    });

    question.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        askRAG();
      }
    });

    voiceBtn.addEventListener("click", function () {
      if (!document.body.classList.contains("lookout-home-page") && !assistant.classList.contains("open")) {
        openAssistant();
        return;
      }
      if (typeof window.startVoiceInput === "function") {
        window.startVoiceInput(this, "ragQuestion");
      } else {
        alert("Voice input is not loaded yet.");
      }
    });

    function setHomeMode(home) {
      document.body.classList.toggle("lookout-home-page", !!home);
      if (home) {
        assistant.classList.remove("open");
      } else {
        assistant.classList.remove("open");
      }
    }

    window.LookOutRAG = {
      open: openAssistant,
      close: closeAssistant,
      ask: askRAG,
      setHomeMode,
      askPrefilled: text => {
        openAssistant(text);
        if (text) setTimeout(() => askRAG(text), 120);
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createAssistant);
  } else {
    createAssistant();
  }
})();
