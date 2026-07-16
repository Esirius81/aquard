# Changelog

## Unreleased

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
