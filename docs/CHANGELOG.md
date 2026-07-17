# Changelog

All notable changes to Aquard will be documented in this file.

The format is inspired by Keep a Changelog and follows Semantic Versioning where practical.

---

## [Unreleased]

### Added

- Configurable Heater tile matching the existing control row, including climate HVAC-mode toggling and the shared pending/error interaction pattern.
- Premium interactive target-temperature controls using climate capability detection, optimistic updates, bounds enforcement, and inline SVG arrow buttons.
- Water Quality Engine V3 with profile-driven Excellent, Monitor, Action Needed, Alert, and Unknown states plus reusable premium SVG status indicators.
- Responsive inline SVG water-temperature gauge with a glass-like droplet and clamped 0–45 °C progress arc.
- Initial spa Water Quality Engine using weighted pH, ORP, and TDS evaluation.
- Combined score, prioritized action message, and critical pH/ORP safety overrides.
- Interactive Power and Filter controls using `switch.toggle`.
- Interactive Bubbles control supporting switches and cycling select entities.
- Pending, duplicate-call prevention, error recovery, and keyboard feedback for controls.
- Expandable Water Details section for pH, ORP, EC, and TDS measurements.

### Changed

- Replaced the read-only target line with a conditional two-row `Target temperature` control.
- Enriched the hero background SVG with more vivid layered water ribbons, luminous wave contours, and denser irregular bubble clusters inspired by the approved concept.
- Expanded the temperature-gauge ring and responsive footprint so the scale has stronger visual presence around the central droplet.
- Enlarged and refined the SVG temperature gauge with a taller glass droplet, a synchronized white endpoint marker, and target-only climate text.
- Removed the redundant Water Status heading and bottom-aligned the compact action card with the Water Temperature panel using a subtle internal divider.
- Refined the Water Status hero with the positive `EXCELLENT` label and stable action-focused summary content while retaining the calculated score internally.
- Integrated the Water Status hero into the page background, moved its score and message into a compact summary card, and added a subtle theme-ready SVG water line behind the hero area.
- Simplified measurement range bars to one moving vertical value marker and added zero-weight profile evaluation for EC.
- Replaced progress-style measurement bars with profile-driven semantic range indicators.
- Refined dashboard density, status composition, measurement instruments, and control scale to more closely match the approved Aquard Home reference.
- Restored the approved dashboard composition with pH, ORP, EC, and TDS visible on the main card.
- Connected visible measurement quality indicators to existing Water Quality Engine results.
- Redesigned Water Quality scoring around smooth profile-defined curves and ideal targets.
- Limited `ALERT` to configured critical pH and ORP overrides; acceptable deviations remain `READY`.
- Connected the Water Status tile to structured water-quality evaluation results.
- Replaced temporary header, temperature, and quick-control glyphs with Home Assistant MDI icons.
- Reduced the primary and equipment panel heights for a more horizontal tablet layout.
- Refined water-temperature typography with smaller decimal and unit sizing.
- Rebuilt the Aquard Home layout around primary Water Status and Water Temperature panels.
- Moved Power, Filter, and Bubbles into a unified read-only control status area.
- Renamed `DESIGN_GUIDLINES.md` to `DESIGN_GUIDELINES.md`.

### Fixed

- Prevented a card-rendering error when a configured climate entity does not expose a supported numeric target temperature.
- Reduced the `ACTION NEEDED` hero title size so it remains on one line without shifting the layout.
- Reserved a stable Water Status title area so one-line and two-line states do not shift the score or message.

### Removed

- Collapsed Water Details disclosure in favor of the approved always-visible measurement strip.

### Notes

-

---

## [0.1.0] - YYYY-MM-DD

### Added

- Initial project structure.
- Framework-free Home Assistant custom card.
- Custom card registration (`aquard-card`).
- Basic entity configuration.
- Live entity state display.
- Zero-dependency build process.
- Initial documentation.
- Git project initialization.

### Changed

-

### Fixed

-

### Removed

-

### Notes

- First public development milestone.

---

## Versioning

Aquard follows Semantic Versioning.

Major releases
- Breaking changes
- Large architectural changes

Minor releases
- New features
- New profiles
- New themes
- New components

Patch releases
- Bug fixes
- Performance improvements
- Documentation updates
- Minor UI improvements
