/* =====================================================
   LOOKOUT SIDEBAR
   ===================================================== */

const activeIndicator =
    document.getElementById("activeIndicator");

function moveIndicator(element) {

    if (!element || !activeIndicator) return;

    const menu = element.closest(".menu");
    if (!menu) return;

    // Calculate the selected item position from the actual rendered boxes.
    // This avoids offsetTop problems caused by flex gaps and absolutely
    // positioned indicator elements.
    const itemRect = element.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const indicatorHeight = activeIndicator.getBoundingClientRect().height || 58;
    const top = itemRect.top - menuRect.top + (itemRect.height - indicatorHeight) / 2;

    // !important is intentional: the design-system CSS contains a legacy
    // top:0 rule. The navigation state must always win over that rule.
    activeIndicator.style.setProperty("top", `${top}px`, "important");
    activeIndicator.style.setProperty("transform", "translateX(-50%)", "important");

    document
        .querySelectorAll(".menu-item")
        .forEach(item => {
            item.classList.remove("selected");
        });

    element.classList.add("selected");
}

/* Workspace/mobile menu */

document.addEventListener(
    "click",
    function (e) {

        const menuBtn =
            e.target.closest(
                ".workspace-menu-btn, .mobile-menu-btn"
            );

        if (!menuBtn) return;

        const sidebar =
            document.querySelector(".sidebar");

        const main =
            document.querySelector(".main");

        if (!sidebar) return;

        if (window.innerWidth <= 768) {

            sidebar.classList.remove("hidden");
            sidebar.classList.toggle("active");

            return;
        }

        sidebar.classList.toggle("hidden");

        if (main) {
            main.classList.toggle("fullscreen");
        }
    }
);
