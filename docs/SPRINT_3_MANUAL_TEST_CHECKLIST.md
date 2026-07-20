# Sprint 3 manual Home Assistant verification

## Card picker and initial setup

- Aquard appears once in **Edit dashboard → Add card**, with the correct name and description.
- Selecting Aquard opens the visual editor immediately.
- The new card contains no fake entities; its preview shows **Aquard setup**, with no generic error or console error.

## Editor

- Spa is selected and no unsupported profiles are offered.
- Entity pickers load, allow selection and clearing, and all fields may remain blank.
- A stored unavailable entity remains configured.
- The editor does not show layout presets or component-mode controls.
- Blank measurement and equipment fields produce no placeholder tile or empty section.
- Configured but unavailable entities remain visible as unavailable.

## Compatibility and presentation

- An existing YAML card opens without changing its appearance or configuration.
- Unknown fields and legacy visibility settings survive an editor change and dashboard reload.
- Advanced YAML Full, Compact, and Hidden component modes still work and survive visual edits.
- The editor works on desktop, a narrow editor panel, and mobile.
- Labels, focus indicators, spacing, and guidance remain readable in Home Assistant light and dark themes.
