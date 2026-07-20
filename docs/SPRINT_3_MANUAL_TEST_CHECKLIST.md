# Sprint 3 manual Home Assistant verification

## Card picker and initial setup

- Aquard appears once in **Edit dashboard → Add card**, with the correct name and description.
- Selecting Aquard opens the visual editor immediately.
- The new card contains no fake entities; its preview shows **Aquard setup**, with no generic error or console error.

## Editor

- Spa is selected and no unsupported profiles are offered.
- Entity pickers load, allow selection and clearing, and all fields may remain blank.
- A stored unavailable entity remains configured.
- Dashboard and Compact apply their documented modes; Custom preserves current modes.
- Changing one component after a preset makes the effective layout Custom.
- Every component supports Full, Compact, and Hidden; hidden components leave no gap.

## Compatibility and presentation

- An existing YAML card opens without changing its appearance or configuration.
- Unknown fields and legacy visibility settings survive an editor change and dashboard reload.
- The editor works on desktop, a narrow editor panel, and mobile.
- Labels, focus indicators, spacing, and guidance remain readable in Home Assistant light and dark themes.
