# PureSpa Card

PureSpa Card is a custom Home Assistant card for a modern spa dashboard. This first-phase version displays the state and unit of one configured entity.

## Build

Node.js 18 or newer is required. The project has no package dependencies.

```sh
npm run build
```

The command creates `dist/purespa-card.js`. Run the build and syntax validation together with:

```sh
npm run check
```

## Install in Home Assistant

1. Build the card, then copy `dist/purespa-card.js` to `<config>/www/purespa-card.js` in Home Assistant.
2. In Home Assistant, open **Settings → Dashboards**, select the three-dot menu, and open **Resources**.
3. Add `/local/purespa-card.js` as a **JavaScript module** resource.
4. Refresh the browser. A hard refresh may be needed after replacing the file.

If the Resources menu is unavailable, add the resource under the `lovelace` section of `configuration.yaml` yourself. This project does not modify Home Assistant configuration.

## Card configuration

Add a manual card to a dashboard:

```yaml
type: custom:purespa-card
entity: sensor.example_temperature
name: Test measurement # Optional
```

`entity` is required. The card reads the unit from the entity's `unit_of_measurement` attribute and safely shows missing, unknown, or unavailable states.
