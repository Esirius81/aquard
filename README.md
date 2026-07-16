# Aquard

A modern Home Assistant card for monitoring water quality.

Aquard combines multiple water measurements into a single, easy-to-understand dashboard that helps you monitor your water and know when maintenance may be required.

The project is currently focused on **spa monitoring**, but is designed around a **profile-driven architecture** so it can later support pools, aquariums, ponds and other water systems.

> **Current Status:** Active Development

---

# Features

## 🌊 Water Quality

- Intelligent Water Quality evaluation
- Combined Water Quality Score
- Profile-driven evaluation engine
- Individual measurement scoring
- Intelligent maintenance recommendations
- Four-level status system
  - Excellent
  - Monitor
  - Action Needed
  - Alert

---

## 🌡 Temperature

- Current water temperature
- Target temperature
- Premium SVG temperature gauge
- Climate integration

---

## 📊 Water Measurements

Currently supported:

- pH
- ORP
- EC
- TDS

Each measurement includes:

- Current value
- Individual quality evaluation
- Ideal range indicator
- Dynamic range visualization

---

## ⚙ Device Controls

Optional controls:

- Power
- Filter
- Bubbles

Aquard automatically detects the supported entity type where possible.

---

## 🎨 Premium Interface

- Modern dark UI
- SVG graphics
- Premium temperature gauge
- Intelligent Water Status hero
- Responsive layout
- Theme-friendly styling

---

# Installation

## Manual Installation

Copy:

```text
dist/aquard-card.js
```

to:

```text
/config/www/
```

Then add the resource inside Home Assistant.

Settings → Dashboards → Resources

or

```yaml
url: /local/aquard-card.js
type: module
```

Refresh the browser (Ctrl+F5) after installation.

---

# Configuration

Basic example

```yaml
type: custom:aquard-card
name: Aquard

grid_options:
  columns: full
  rows: auto

entities:
  water_temperature: sensor.spa_temperature

  ph: sensor.spa_ph
  orp: sensor.spa_orp
  ec: sensor.spa_ec
  tds: sensor.spa_tds

  climate: climate.easy_spa_thermostat

  power: switch.easy_spa_power
  filter: switch.easy_spa_filter
  bubbles: select.easy_spa_bubbles
```

---

# Supported Entities

| Entity | Required | Description |
|----------|----------|-------------|
| water_temperature | ✔ | Current water temperature |
| ph | ✔ | pH measurement |
| orp | ✔ | ORP measurement |
| ec | Optional | Electrical conductivity |
| tds | Optional | Total dissolved solids |
| climate | Optional | Used for target temperature |
| power | Optional | Power control |
| filter | Optional | Filter control |
| bubbles | Optional | Bubble control |

---

# Bubble Control

Aquard automatically supports two Home Assistant entity types.

## Switch

```yaml
bubbles: switch.easy_spa_bubbles
```

Uses

```text
switch.toggle
```

---

## Select

```yaml
bubbles: select.easy_spa_bubbles
```

Uses

```text
select.select_next
```

No additional configuration is required.

---

# Water Quality Status

Aquard evaluates the available measurements and presents a single overall status.

| Status | Meaning |
|----------|----------|
| 🟢 Excellent | Everything is within the preferred operating range. |
| 🟡 Monitor | Water is still usable, but should be monitored. |
| 🟠 Action Needed | Maintenance is recommended. |
| 🔴 Alert | Water should be corrected or verified before use. |
| ⚪ Unknown | Required measurements are unavailable. |

The Water Quality Score is based on configurable profile thresholds.

EC is evaluated individually but is **not** included in the overall Water Quality calculation.

---

# Philosophy

Aquard is designed around one simple question.

> **Can I enjoy my water right now?**

Instead of only displaying raw sensor values, Aquard evaluates the available measurements and presents a clear overall status together with the most relevant recommendation.

Aquard is intended as a monitoring and guidance tool.

It does **not** replace proper water testing or manufacturer recommendations.

---

# Roadmap

Planned features include:

- Compact dashboard mode
- Multiple responsive layouts
- Pool profile
- Aquarium profile
- Pond profile
- Hydroponics profile
- Theme packs
- Historical graphs
- Maintenance reminders
- Additional SVG icon sets
- HACS support

---

# Development

Aquard is currently under active development.

The interface, evaluation engine and profile system are evolving rapidly.

Breaking changes may occur until the first stable release.

---

# License

AGPL-V3