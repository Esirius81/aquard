# Sprint 2 manual Home Assistant checklist

- [ ] Load an existing YAML card without `components`; compare it with the previous release.
- [ ] Create a new card through the visual editor, save it, and reopen it.
- [ ] Verify explicit all-`full`, status-only, temperature-only, compact-monitoring, controls-only, and mixed-mode configurations.
- [ ] Set all six components to `hidden`; confirm the card stays stable and contains no empty section gaps.
- [ ] Remove optional pH, ORP, EC, TDS, heater, and bubbles entities; confirm no invalid compact tiles or controls appear.
- [ ] Mark a configured sensor unavailable; confirm safe unavailable text and no console exception.
- [ ] Test a climate entity with target-temperature support; confirm both target buttons, debouncing, and the optimistic target display.
- [ ] Test a temperature sensor without a climate entity; confirm current temperature appears without thermostat controls.
- [ ] Make heater and bubbles entities unavailable; confirm their controls are safely disabled.
- [ ] Toggle power, heater, filter, and bubbles; confirm active, pending, unavailable, and duplicate-click behavior.
- [ ] Check desktop, tablet landscape, and mobile widths for natural reflow and touch targets.
- [ ] Reload the card configuration and refresh the Home Assistant dashboard; confirm modes persist.
- [ ] Change an unrelated visual-editor field; confirm `components` and unknown keys remain in YAML.
- [ ] Inspect the browser console for exceptions, invalid-mode warnings, and duplicate custom-element registration errors.
