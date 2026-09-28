/* =====================================================
   LOOKOUT THEME CONTROLLER
   - Light / Dark: selectedTheme
   - Liquid Glass / Professional: uiStyle
   ===================================================== */

function getSavedTheme() {
    return (window.LookOutStorage && LookOutStorage.get("selectedTheme")) || "light";
}

function getSavedUIStyle() {
    return (window.LookOutStorage && LookOutStorage.get("uiStyle")) || "glass";
}

function applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");
}

function applyUIStyle(style) {
    document.body.classList.toggle("professional-mode", style === "professional");
    document.body.dataset.uiStyle = style;
}

function saveTheme(theme) {
    if (window.LookOutStorage) LookOutStorage.set("selectedTheme", theme);
}

function saveUIStyle(style) {
    if (window.LookOutStorage) LookOutStorage.set("uiStyle", style);
}

function loadSavedTheme() {
    applyTheme(getSavedTheme());
    applyUIStyle(getSavedUIStyle());
}

function toggleTheme() {
    const next = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
}

function toggleUIStyle() {
    const next = document.body.classList.contains("professional-mode")
        ? "glass"
        : "professional";
    applyUIStyle(next);
    saveUIStyle(next);
    updateUIStyleControl();
}

function createUIStyleControl() {
    if (document.getElementById("uiStyleToggle")) return;

    const button = document.createElement("button");
    button.id = "uiStyleToggle";
    button.type = "button";
    button.className = "ui-style-toggle";
    button.setAttribute("aria-label", "Switch LOOKOUT interface style");
    button.setAttribute("title", "Switch interface style");
    button.addEventListener("click", toggleUIStyle);

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle && themeToggle.parentElement) {
        themeToggle.parentElement.appendChild(button);
    } else {
        document.body.appendChild(button);
    }

    updateUIStyleControl();
}

function updateUIStyleControl() {
    const button = document.getElementById("uiStyleToggle");
    if (!button) return;

    const professional = document.body.classList.contains("professional-mode");
    button.innerHTML = professional
        ? '<i class="fa-solid fa-layer-group"></i><span>Glass</span>'
        : '<i class="fa-solid fa-sliders"></i><span>Pro</span>';
    button.dataset.style = professional ? "glass" : "professional";
}

function initializeTheme() {
    loadSavedTheme();

    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
        themeBtn.addEventListener("click", toggleTheme);
    }

    createUIStyleControl();
}
