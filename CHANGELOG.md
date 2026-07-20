# Changelog

## Unreleased

### Sprint 2 — Modular card architecture

- Added six canonical runtime components: water status, temperature, actions, measurements, controls, and details.
- Added optional `full`, `compact`, and `hidden` component display modes with backward-compatible full defaults.
- Added centralized, non-mutating configuration normalization with safe invalid-mode fallback and preservation of unknown properties.
- Added focused-card composition, capability-aware compact rendering, and visibility-aware card-size estimates.
- Preserved existing service calls, optimistic temperature behavior, visual editor configuration round-tripping, and the single Aquard card registration.

- Rename PureSpa Card to Aquard, including the custom element and distributable module.
- Retain `custom:purespa-card` as a deprecated compatibility alias.
- Make the card fill the width allocated by Home Assistant and improve wide dashboard grid sizing.
- Allow internal grid children to shrink safely without horizontal overflow.
- Add official Home Assistant Sections sizing with a 12-column default and 6-column minimum.

## 0.2.0

- Replace the test display with a responsive read-only spa dashboard.
- Add pH, ORP, EC, TDS, and water-temperature readings with availability indicators.
- Add read-only power, filter, bubbles, and climate status.
- Support the new `entities` mapping while retaining the Phase 1 `entity` format.
- Add configuration and state-format validation.

## 0.1.0

- Add the initial custom card registration.
- Support one configurable test entity with state and unit display.
- Add a zero-dependency build and syntax validation workflow.
- Document Home Assistant installation and basic YAML configuration.
