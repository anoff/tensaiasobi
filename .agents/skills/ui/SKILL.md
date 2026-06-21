---
name: ui
description: |
  Implement and refine user interface components with premium styling, dark/light theme symmetry, SVG chart integration, and micro-animations.
  
  Trigger on mentions of: 'component styling', 'CSS layout', 'chart view', 'dark mode', 'color palette', 'transitions', 'hover effects', 'responsive layout'.
---

# UI Implementation (ui)

Build responsive, premium components with dark/light mode symmetry.

## Rules
* **Styling:** Write custom Vanilla CSS. Do NOT use Tailwind or utility frameworks unless explicitly requested.
* **Themes:** Use CSS variables on `html[data-theme]` (or equivalent) for theme transitions.
* **Charts:** SVG elements do not resolve CSS variables dynamically in all browsers. Pass theme state/hex values down as component props.
* **Responsiveness:** Use Flexbox and Grid with relative units (`rem`, `em`, `vh`, `vw`).
* **Micro-interactions:** Add smooth transitions for all hover, focus, and active states.
