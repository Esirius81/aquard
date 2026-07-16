A modern Home Assistant card for monitoring water quality.

Aquard combines multiple water measurements into a single, easy-to-understand dashboard that helps you monitor your water and know when maintenance may be required.

The project is currently focused on spa monitoring, but is being designed around a generic profile-driven architecture so it can later support pools, aquariums and other water systems.

Current Features

✅ Water quality evaluation

Combined Water Quality score
Intelligent status evaluation
Profile-driven thresholds
Context-aware recommendations

✅ Temperature monitoring

Current water temperature
Target temperature
Premium SVG temperature gauge

✅ Water measurements

Currently supported:

pH
ORP
EC
TDS

Each measurement includes:

Current value
Individual quality evaluation
Ideal range visualization
Status indication

✅ Device controls

Power
Filter
Bubbles
Design goals

Aquard is designed around one simple question:

Can I use my water right now?

Instead of showing only raw sensor values, Aquard evaluates the available measurements and presents a clear overall status together with the most relevant recommendation.

Current status

Aquard is under active development.

The interface, evaluation engine and profile system are evolving rapidly and may change between releases.

Planned Features
Multiple water profiles
Spa
Swimming Pool
Aquarium
Pond
Compact dashboard mode
Historical trends
Maintenance reminders
HACS support
Additional themes
More configurable profile thresholds
Supported entities
Type	Required
Temperature	✔
pH	Optional
ORP	Optional
EC	Optional
TDS	Optional
Climate	Optional
Switches	Optional

(Pas deze tabel later aan zodra de exacte vereisten vastliggen.)

Philosophy

Aquard is not intended to replace proper water testing.

It is designed to help visualize available measurements and provide guidance based on the configured profile.

## Install in Home Assistant

Build the card, then copy dist/aquard-card.js to <config>/www/aquard-card.js in Home Assistant.
In Home Assistant, open Settings → Dashboards, select the three-dot menu, and open Resources.
Add /local/aquard-card.js as a JavaScript module resource.
Refresh the browser. A hard refresh may be needed after replacing the file.
If the Resources menu is unavailable, add the resource under the lovelace section of configuration.yaml yourself. This project does not modify Home Assistant configuration.



## Card configuration

Add a manual card to a dashboard and replace the example IDs with your own entities:

```yaml
type: custom:aquard-card
name: Aquard

grid_options:
  columns: full
  rows: auto

entities:
  water_temperature: sensor.example
  ph: sensor.example
  orp: sensor.example
  ec: sensor.example
  tds: sensor.example

  power: switch.example
  filter: switch.example
  bubbles: select.example
  climate: climate.example
```

`entities` must be a YAML mapping, but every individual entity is optional. Missing keys display `Not configured`; missing, unknown, and unavailable Home Assistant states display `Unavailable` without affecting the rest of the card.

The earlier top-level `entity` format remains supported and maps its entity to water temperature:

```yaml
type: custom:aquard-card
entity: sensor.example_temperature
name: Aquard
```

The deprecated `custom:purespa-card` type remains registered as a compatibility alias. New dashboards should use `custom:aquard-card`.

Aquard is read-only. Equipment rows show current status but do not call services or respond to clicks.
