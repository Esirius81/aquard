# ARCHITECTURE.md

# Aquard Architecture

## Philosophy

Aquard is built around separation of responsibilities.

Every part of the application should have a single responsibility.

A component should never perform work that belongs somewhere else.

---

# High Level Architecture

Home Assistant

↓

Configuration

↓

Profile

↓

Water Logic

↓

UI Components

↓

Theme

↓

Rendered Interface

---

# Responsibilities

## Home Assistant

Responsible for:

- entity states
- service calls
- configuration
- updates

Aquard never owns the data.

Aquard only consumes Home Assistant entities.

---

## Configuration

Responsible for:

- profile selection
- entity mapping
- theme selection
- language selection
- user preferences

Configuration should never contain business logic.

---

## Profiles

Profiles define water behaviour.

Examples:

- Spa
- Pool
- Pond
- Aquarium
- Custom

Profiles are responsible for:

- ideal ranges
- warning ranges
- recommendations
- terminology
- available measurements

The UI should not know profile-specific values.

---

## Water Logic

Water Logic transforms raw sensor values into meaningful information.

Examples:

Raw:

pH = 7.46

Result:

Healthy

Examples:

ORP = 450

Result:

Needs chlorine

The UI should consume results, not calculate them.

The initial implementation lives in `src/water-quality.js`. It accepts raw
measurement values and returns a structured evaluation containing status,
score, primary issue, message key and individual measurement results.

---

## Components

Components display information.

Components should never perform calculations.

Examples:

Status Card

Metric Card

Controls

Temperature Card

Expandable Details

Buttons

The reusable premium status SVG lives in `src/components/status-indicator.js`. It accepts an evaluated status only and contains no profile thresholds or water-quality decisions.

Target-temperature capability, step, bounds, and service payload resolution live in `src/helpers.js`. The reusable premium arrow artwork lives in `src/components/target-temperature-control.js`; the card only coordinates interaction and pending state.

### Runtime component registry

Aquard remains a single registered card composed from six canonical internal component IDs: `water_status`, `temperature`, `actions`, `measurements`, `controls`, and `details`. Each render module receives derived display data and a canonical `full`, `compact`, or `hidden` mode. Hidden renderers return no wrapper; compact renderers omit secondary information rather than scaling the full UI.

`src/config/component-config.js` is the single source of component IDs, valid modes, and default modes. `src/config/config-normalizer.js` clones and normalizes user configuration, merges defaults, validates known component modes, and preserves unknown top-level and component properties. Render modules do not contain fallback mode values.

Shared state derivation remains in the parent card and its helpers. Water-quality thresholds and scoring stay in `src/water-quality.js`; entity availability, service actions, target-temperature capability, and optimistic state coordination stay outside the component renderers.

Interactive controls share the generic keyed pending-state store in `src/pending-state.js`. A requested boolean, string, or numeric value temporarily takes precedence over the confirmed Home Assistant value. Normal state updates confirm only the latest request; the confirmed value remains as a quiet race guard until its request-scoped nine-second timer expires, preventing a later out-of-order update from making the control jump back. No visual waiting or error state is added. Service invocation, entity parsing, reconciliation, and rendering remain separate.

The existing status summary is assigned to `actions` while remaining visually nested in `water_status` in full mode. The existing brand and sensor-availability header is assigned to `details`, because the current card has no separate expanded-detail area.

---

## Theme System

Themes define presentation only.

Themes may change:

- colors
- typography
- spacing
- corner radius
- shadows
- icons
- images
- backgrounds
- animations

Themes should never change behaviour.

---

## Language System

Language files provide all user-facing text.

No UI text should be hardcoded.

Future translations should not require JavaScript changes.

---

## Assets

Assets belong to themes.

Examples:

- icons
- illustrations
- backgrounds
- logos

Components should request assets through the active theme.

---

# Design Rules

Business logic must never exist inside UI components.

Themes must never contain logic.

Profiles must never contain rendering code.

Components must never hardcode profile values.

Configuration must never duplicate business logic.

---

# Dependency Direction

Configuration

↓

Profile

↓

Logic

↓

Components

↓

Theme

Never the opposite.

---

# Scalability

Adding a new profile should not require changes to the UI.

Adding a new language should not require JavaScript changes.

Adding a new theme should not require JavaScript changes.

Adding a new asset pack should not require JavaScript changes.

---

# Goal

Aquard should remain easy to extend without becoming more difficult to understand.

Every new feature should fit naturally into this architecture.
