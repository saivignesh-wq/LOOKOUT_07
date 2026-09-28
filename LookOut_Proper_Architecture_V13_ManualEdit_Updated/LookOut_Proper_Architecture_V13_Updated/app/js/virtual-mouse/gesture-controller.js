/* =====================================================
   LOOKOUT VIRTUAL MOUSE CONTROLLER
   ===================================================== */

const virtualCursor = document.getElementById("virtualCursor");

window.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("virtual-cursor-enabled") && virtualCursor) {
    virtualCursor.style.left = `${e.clientX}px`;
    virtualCursor.style.top = `${e.clientY}px`;
  }
});

window.addEventListener("mousedown", () => virtualCursor?.classList.add("active"));
window.addEventListener("mouseup", () => virtualCursor?.classList.remove("active"));

let virtualMouseEnabled = false;

window.toggleVirtualMouse = async function(force) {
  const next = typeof force === "boolean" ? force : !virtualMouseEnabled;
  if (next === virtualMouseEnabled) return virtualMouseEnabled;

  if (next) {
    try {
      if (!window.startWebGestureControl) throw new Error("Gesture controller is still loading");
      await window.startWebGestureControl();
      virtualMouseEnabled = true;
      document.body.classList.add("virtual-cursor-enabled");
      return true;
    } catch (error) {
      console.error(error);
      document.body.classList.remove("virtual-cursor-enabled");
      virtualMouseEnabled = false;
      alert("Gesture control needs camera permission and a secure browser context.");
      return false;
    }
  }

  if (window.stopWebGestureControl) window.stopWebGestureControl();
  virtualMouseEnabled = false;
  document.body.classList.remove("virtual-cursor-enabled");
  return false;
};
