# LOOKOUT UI redesign

## Visual system
- Antarctica palette: ice, slate, deep arctic blue, cyan and restrained aurora accents.
- Default UI style: Liquid Glass.
- Alternate UI style: Professional (`body.professional-mode`).
- Light/dark remains independent from the UI style.
- Liquid Glass uses spectral edge refraction and white perimeter reflections, not inset white shadows.
- Professional mode removes spectral edges, reduces blur, reduces motion and uses technical surfaces.

## Files changed
- `app/css/desktop/lookout-design-system.css` — new visual system loaded last.
- `app/home.html` — loads the new design system after the existing stylesheets.
- `app/js/core/theme.js` — adds persistent Liquid Glass / Professional style switching while retaining Light / Dark switching.

## Feature installation readiness
Generic classes such as `.feature-slot`, `.feature-card`, `.feature-install`, `.feature-status`, `.installed-feature`, and `.feature-chip` are provided so future dynamically downloaded tools can be inserted into existing tool areas without changing the visual language.

## Theme persistence
- `selectedTheme`: `light` or `dark`
- `uiStyle`: `glass` or `professional`
