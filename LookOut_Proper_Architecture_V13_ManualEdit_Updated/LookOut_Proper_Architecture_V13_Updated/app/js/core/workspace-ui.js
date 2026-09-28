/* =====================================================
   LOOKOUT GLOBAL WORKSPACE UI
   Quick Actions + Explore Features are available on
   every workspace page. Home keeps the full panels;
   other pages use compact glass launchers.
   ===================================================== */
(function () {
  "use strict";

  function isHome() {
    return document.body.classList.contains("lookout-home-page");
  }

  function panelMarkup(type) {
    if (type === "quick") {
      return `
        <div class="global-tool-panel lk-glass" data-panel="quick">
          <div class="panel-title">
            <h3>Quick Actions</h3>
            <span>Everything you need</span>
          </div>
          <div class="quick-grid">
            <button class="quick-action" type="button" data-global-action="new"><i class="fa-regular fa-file-circle-plus"></i><span>New Project</span></button>
            <button class="quick-action" type="button" data-global-action="open"><i class="fa-regular fa-folder-open"></i><span>Open File</span></button>
            <button class="quick-action" type="button" data-global-action="saved"><i class="fa-solid fa-database"></i><span>Saved Projects</span></button>
            <button class="quick-action" type="button" data-global-action="mouse"><i class="fa-regular fa-hand-pointer"></i><span>Virtual Mouse</span><span class="toggle-dot"></span></button>
            <button class="quick-action" type="button" data-global-action="voice"><i class="fa-solid fa-wave-square"></i><span>Voice Command</span><span class="toggle-dot"></span></button>
            <button class="quick-action" type="button" data-global-action="store"><i class="fa-solid fa-cart-shopping"></i><span>Feature Store</span></button>
          </div>
        </div>`;
    }

    return `
      <div class="global-tool-panel lk-glass" data-panel="explore">
        <div class="panel-title">
          <h3>Explore Features</h3>
          <span>Resources & updates</span>
        </div>
        <div class="explore-grid">
          <a class="explore-card" href="https://github.com/nikh2951/lookout" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i><strong>Visit Website</strong><small>Go to the official LOOKOUT page</small><span class="arrow">↗</span></a>
          <a class="explore-card" href="javascript:void(0)" data-global-action="saved"><i class="fa-regular fa-book-open"></i><strong>Open Library</strong><small>Access your saved creations</small><span class="arrow">→</span></a>
          <a class="explore-card" href="javascript:void(0)" data-global-action="store"><i class="fa-solid fa-grip"></i><strong>Feature Store</strong><small>Download and install new tools</small><span class="arrow">→</span></a>
        </div>
      </div>`;
  }

  function createDock() {
    if (document.getElementById("lookoutWorkspaceDock")) return;

    const dock = document.createElement("div");
    dock.id = "lookoutWorkspaceDock";
    dock.className = "workspace-dock";
    dock.innerHTML = `
      <div class="workspace-dock-item" data-tool="quick">
        <button class="workspace-dock-launcher" type="button" aria-label="Open Quick Actions" title="Quick Actions"><i class="fa-solid fa-bolt"></i></button>
        <div class="workspace-dock-content"></div>
      </div>
      <div class="workspace-dock-item" data-tool="explore">
        <button class="workspace-dock-launcher" type="button" aria-label="Open Explore Features" title="Explore Features"><i class="fa-solid fa-grip"></i></button>
        <div class="workspace-dock-content"></div>
      </div>`;

    document.body.appendChild(dock);

    dock.querySelectorAll(".workspace-dock-item").forEach(item => {
      const launcher = item.querySelector(".workspace-dock-launcher");
      const content = item.querySelector(".workspace-dock-content");
      const type = item.dataset.tool;
      content.innerHTML = panelMarkup(type);

      launcher.addEventListener("click", event => {
        event.stopPropagation();
        const wasOpen = item.classList.contains("open");
        dock.querySelectorAll(".workspace-dock-item").forEach(other => other.classList.remove("open"));
        if (!wasOpen) item.classList.add("open");
      });
    });

    dock.addEventListener("click", event => {
      const actionTarget = event.target.closest("[data-global-action]");
      if (!actionTarget) return;
      event.preventDefault();
      const action = actionTarget.dataset.globalAction;
      runAction(action);
    });

    document.addEventListener("click", event => {
      if (!event.target.closest("#lookoutWorkspaceDock")) {
        dock.querySelectorAll(".workspace-dock-item").forEach(item => item.classList.remove("open"));
      }
    });
  }

  async function runAction(action) {
    switch (action) {
      case "new":
        window.openGenerator?.();
        break;
      case "open":
        window.LookOutRAG?.open?.("Open a file or help me find a LOOKOUT project.");
        break;
      case "saved":
        window.openSavedProjects?.();
        break;
      case "mouse":
        if (typeof window.toggleVirtualMouse === "function") {
          await window.toggleVirtualMouse();
          document.querySelectorAll('[data-global-action="mouse"]').forEach(el => {
            el.classList.toggle("active", document.body.classList.contains("virtual-cursor-enabled"));
          });
        }
        break;
      case "voice":
        if (window.LookOutRAG?.open) {
          window.LookOutRAG.open();
          setTimeout(() => {
            const question = document.getElementById("ragQuestion");
            const voice = document.getElementById("ragVoiceBtn");
            if (question && voice && window.startVoiceInput) window.startVoiceInput(voice, "ragQuestion");
          }, 180);
        }
        break;
      case "store":
        window.openFeatureStore?.();
        break;
    }
  }

  function setHomeMode(home) {
    document.body.classList.toggle("lookout-home-page", !!home);
    const dock = document.getElementById("lookoutWorkspaceDock");
    if (dock) dock.classList.toggle("home-hidden", !!home);
  }

  window.LookOutWorkspaceUI = {
    init: createDock,
    setHomeMode,
    isHome
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createDock);
  } else {
    createDock();
  }
})();
