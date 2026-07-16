# Aquard

Aquard is a framework-free custom Home Assistant card for a modern, read-only spa dashboard. It displays water quality, temperature, and equipment status in one responsive dark interface.

## Build

Node.js 18 or newer is required. The project has no package dependencies.

```sh
npm run build
```

The command creates `dist/aquard-card.js`. Run the build, syntax check, and configuration/state validation together with:

```sh
npm run check
```

## Install in Home Assistant

1. Build the card, then copy `dist/aquard-card.js` to `<config>/www/aquard-card.js` in Home Assistant.
2. In Home Assistant, open **Settings → Dashboards**, select the three-dot menu, and open **Resources**.
3. Add `/local/aquard-card.js` as a **JavaScript module** resource.
4. Refresh the browser. A hard refresh may be needed after replacing the file.

If the Resources menu is unavailable, add the resource under the `lovelace` section of `configuration.yaml` yourself. This project does not modify Home Assistant configuration.

## Card configuration

Add a manual card to a dashboard and replace the example IDs with your own entities:

```yaml
type: custom:aquard-card
name: Aquard

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
