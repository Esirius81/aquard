import assert from "node:assert/strict";
import { formatTargetTemperature, getControlAction, getTargetTemperatureAdjustment, isControlActive, normalizeConfig, readClimate, readEntity, readSwitch, resolveTargetTemperature } from "../src/helpers.js";
import { evaluateSpaWaterQuality, SPA_WATER_QUALITY_PROFILE } from "../src/water-quality.js";
import { temperatureToArc } from "../src/components/temperature-gauge.js";
import { renderStatusIndicator, STATUS_INDICATOR_GEOMETRY } from "../src/components/status-indicator.js";
import { styles } from "../src/styles.js";

globalThis.HTMLElement = class {};
const registeredElements = new Map();
globalThis.customElements = {
  define: (name, element) => registeredElements.set(name, element),
  get: (name) => registeredElements.get(name),
};
globalThis.window = { customCards: [] };

const { AquardCard } = await import("../src/aquard-card.js");
assert.equal(typeof AquardCard.prototype.getGridOptions, "function");
assert.deepEqual(AquardCard.prototype.getGridOptions(), {
  columns: 12,
  min_columns: 6,
});
assert.equal(customElements.get("aquard-card"), AquardCard);
assert.equal(customElements.get("purespa-card").prototype instanceof AquardCard, true);

const legacy = normalizeConfig({ entity: "sensor.water", name: "Legacy" });
assert.equal(legacy.entities.water_temperature, "sensor.water");

const modern = normalizeConfig({ entities: { ph: "sensor.ph" } });
assert.equal(modern.entities.ph, "sensor.ph");
assert.equal(modern.name, "Aquard");
assert.throws(() => normalizeConfig({ entities: "sensor.invalid" }), /YAML mapping/);
assert.throws(() => normalizeConfig({}), /entities mapping/);

const hass = {
  states: {
    "sensor.ph": { state: "7.25", attributes: { unit_of_measurement: "pH" } },
    "switch.power": { state: "on", attributes: {} },
    "select.bubbles": { state: "High", attributes: { options: ["Off", "Low", "High"] } },
    "select.bubbles_off": { state: "uit", attributes: { options: ["uit", "hoog"] } },
    "climate.spa": { state: "heat", attributes: { temperature: 38, temperature_unit: "°C", supported_features: 1, target_temp_step: 0.5, min_temp: 30, max_temp: 40, hvac_modes: ["off", "heat"] } },
    "climate.spa_off": { state: "off", attributes: { temperature: 38, supported_features: 1, hvac_modes: ["off", "heat"] } },
    "climate.no_target": { state: "heat", attributes: { supported_features: 1 } },
    "climate.unsupported": { state: "heat", attributes: { temperature: 36, supported_features: 0 } },
    "climate.unavailable": { state: "unavailable", attributes: { temperature: 36, supported_features: 1 } },
    "sensor.bad": { state: "unknown", attributes: {} },
  },
};

const ph = readEntity(hass, "sensor.ph", { numeric: true });
assert.equal(ph.availability, "Available");
assert.match(ph.value, /^7[.,]25$/);
assert.equal(readEntity(hass, undefined).value, "Not configured");
assert.equal(readEntity(hass, "sensor.bad").value, "Unavailable");
assert.equal(readSwitch(hass, "switch.power").value, "On");
const climate = readClimate(hass, "climate.spa");
assert.match(climate.value, /^Heat · 38 °C$/);
assert.equal(climate.targetValue, "38 °C");
assert.equal(climate.climateState, "heat");
assert.doesNotMatch(climate.targetValue, /Heat|Heating|Idle|Off/i);
const targetControl = resolveTargetTemperature(hass, "climate.spa");
assert.equal(targetControl.target, 38);
assert.equal(targetControl.step, 0.5);
assert.equal(getTargetTemperatureAdjustment(targetControl, 1).temperature, 39);
assert.equal(getTargetTemperatureAdjustment(targetControl, -1).temperature, 37);
assert.equal(resolveTargetTemperature(hass, undefined), undefined);
assert.equal(resolveTargetTemperature(hass, "climate.unavailable"), undefined);
assert.equal(resolveTargetTemperature(hass, "climate.no_target"), undefined);
assert.equal(resolveTargetTemperature(hass, "climate.unsupported"), undefined);
const noPendingTarget = null;
const unsupportedTarget = resolveTargetTemperature(hass, "climate.unsupported");
assert.equal(noPendingTarget && noPendingTarget.entityId === unsupportedTarget?.entityId ? noPendingTarget.value : unsupportedTarget?.target, undefined);
const fallbackStep = resolveTargetTemperature({ states: { "climate.fallback": { state: "heat", attributes: { temperature: 36, supported_features: 1 } } } }, "climate.fallback");
assert.equal(fallbackStep.step, 1);
assert.equal(getTargetTemperatureAdjustment({ ...targetControl, target: 30 }, -1), undefined);
assert.equal(getTargetTemperatureAdjustment({ ...targetControl, target: 40 }, 1), undefined);
assert.deepEqual(formatTargetTemperature(36.5, "°C", 0.5), { value: new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(36.5), unit: "°C" });
const targetMarkupCard = Object.create(AquardCard.prototype);
targetMarkupCard._pendingTarget = null;
const targetMarkup = targetMarkupCard._renderTargetControl(targetControl);
assert.match(targetMarkup, /class="target-control"/);
assert.match(targetMarkup, /Decrease target temperature/);
assert.match(targetMarkup, /Increase target temperature/);
assert.doesNotMatch(targetMarkup, /Heat|Heating|Idle|Off/i);

assert.deepEqual(getControlAction("switch.power", hass.states["switch.power"]), {
  domain: "switch", service: "toggle", data: { entity_id: "switch.power" },
});
assert.deepEqual(getControlAction("select.bubbles", hass.states["select.bubbles"], true), {
  domain: "select", service: "select_next", data: { entity_id: "select.bubbles", cycle: true },
});
assert.equal(getControlAction("select.bubbles", hass.states["select.bubbles"], false), undefined);
assert.equal(getControlAction("sensor.ph", hass.states["sensor.ph"]), undefined);
assert.deepEqual(getControlAction("climate.spa", hass.states["climate.spa"], false, true), {
  domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.spa", hvac_mode: "off" },
});
assert.deepEqual(getControlAction("climate.spa_off", hass.states["climate.spa_off"], false, true), {
  domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.spa_off", hvac_mode: "heat" },
});
assert.equal(getControlAction("climate.spa", hass.states["climate.spa"], false, false), undefined);
assert.equal(isControlActive(hass.states["climate.spa"]), true);
assert.equal(isControlActive(hass.states["climate.spa_off"]), false);
assert.equal(isControlActive(hass.states["select.bubbles"]), true);
assert.equal(isControlActive(hass.states["select.bubbles_off"]), false);

assert.equal(temperatureToArc(0).percentage, 0);
assert.equal(temperatureToArc(22.5).percentage, 50);
assert.equal(temperatureToArc(45).percentage, 100);
assert.equal(temperatureToArc(-10).percentage, 0);
assert.equal(temperatureToArc(60).percentage, 100);
const startArc = temperatureToArc(0);
const middleArc = temperatureToArc(22.5);
const endArc = temperatureToArc(45);
assert.ok(startArc.marker.x < middleArc.marker.x && startArc.marker.y > middleArc.marker.y);
assert.ok(Math.abs(middleArc.marker.x - 80) < 0.0001 && middleArc.marker.y < 80);
assert.ok(endArc.marker.x > middleArc.marker.x && endArc.marker.y > middleArc.marker.y);
assert.deepEqual(temperatureToArc(-10).marker, startArc.marker);
assert.deepEqual(temperatureToArc(60).marker, endArc.marker);

assert.deepEqual(Object.fromEntries(Object.entries(SPA_WATER_QUALITY_PROFILE.measurements).map(
  ([key, measurement]) => [key, measurement.weight],
)), { ph: 0.4, orp: 0.45, ec: 0, tds: 0.15 });
const base = { ph: 7.4, orp: 700, ec: 1.2, tds: 1000 };
const excellentWater = evaluateSpaWaterQuality(base);
assert.equal(excellentWater.status, "excellent");
assert.equal(excellentWater.canUse, true);
assert.equal(excellentWater.messageKey, "enjoy_your_spa");

for (const [value, severity] of [[7.4, "excellent"], [7.55, "excellent"], [7.62, "monitor"], [7.78, "monitor"], [7.82, "action_needed"], [8.01, "alert"]]) {
  assert.equal(evaluateSpaWaterQuality({ ...base, ph: value }).measurements.ph.severity, severity);
}
for (const [value, severity] of [[650, "excellent"], [600, "monitor"], [500, "action_needed"], [499, "alert"]]) {
  assert.equal(evaluateSpaWaterQuality({ ...base, orp: value }).measurements.orp.severity, severity);
}

const monitorWater = evaluateSpaWaterQuality({ ...base, ph: 7.62 });
assert.equal(monitorWater.status, "monitor");
assert.equal(monitorWater.messageKey, "ph_slightly_above_ideal");
assert.ok(monitorWater.score < 100);
const actionWater = evaluateSpaWaterQuality({ ...base, orp: 550 });
assert.equal(actionWater.status, "action_needed");
assert.equal(actionWater.messageKey, "restore_sanitizer");
const alertWater = evaluateSpaWaterQuality({ ...base, ph: 8.01, orp: 550 });
assert.equal(alertWater.status, "alert");
assert.equal(alertWater.primaryIssue, "ph");
assert.equal(alertWater.messageKey, "correct_ph_before_use");

const lowScoreMonitor = evaluateSpaWaterQuality({ ...base, ph: 7.78, orp: 600, tds: 1900 });
assert.equal(lowScoreMonitor.status, "monitor", "percentage alone must not escalate beyond measurement severity");

const unknownWater = evaluateSpaWaterQuality({ ...base, orp: "unavailable" });
assert.equal(unknownWater.status, "unknown");
assert.equal(unknownWater.score, null);
assert.equal(unknownWater.canUse, null);
assert.equal(unknownWater.measurements.orp.range, undefined);

const abnormalEc = evaluateSpaWaterQuality({ ...base, ec: 3.5 });
assert.equal(abnormalEc.measurements.ec.severity, "alert");
assert.equal(abnormalEc.status, excellentWater.status);
assert.equal(abnormalEc.score, excellentWater.score);

assert.deepEqual(STATUS_INDICATOR_GEOMETRY, { viewBox: "0 0 160 160", center: 80, radius: 58, strokeWidth: 8 });
for (const status of ["excellent", "monitor", "action_needed", "alert", "unknown"]) {
  const svg = renderStatusIndicator(status);
  assert.match(svg, /viewBox="0 0 160 160"/);
  assert.match(svg, /class="status-ring" cx="80" cy="80" r="58"/);
}
assert.match(styles, /\.hero-panel\{[^}]*min-height:clamp\(190px,22cqw,225px\)/);
assert.match(styles, /\.status-orb\{[^}]*width:clamp\(120px,16cqw,165px\)/);

let serviceCalls = 0;
let lastServiceCall;
const pendingCard = Object.create(AquardCard.prototype);
pendingCard._config = { entities: { climate: "climate.spa" } };
pendingCard._hass = { ...hass, callService: async (domain, service, data) => { serviceCalls += 1; lastServiceCall = { domain, service, data }; } };
pendingCard._pendingTarget = null;
pendingCard._targetDebounceTimer = null;
pendingCard._targetConfirmationTimer = null;
pendingCard._render = () => {};
pendingCard._adjustTargetTemperature(-1);
pendingCard._adjustTargetTemperature(-1);
pendingCard._adjustTargetTemperature(-1);
assert.equal(serviceCalls, 0, "target changes must be debounced");
assert.equal(pendingCard._pendingTarget.value, 35);
pendingCard._reconcilePendingTarget();
assert.equal(pendingCard._pendingTarget.value, 35, "stale Home Assistant state must not replace the optimistic value");
await pendingCard._flushTargetTemperature();
assert.equal(serviceCalls, 1, "debounced target changes must produce one service call");
assert.deepEqual(lastServiceCall, { domain: "climate", service: "set_temperature", data: { entity_id: "climate.spa", temperature: 35 } });
pendingCard._hass = { ...pendingCard._hass, states: { ...hass.states, "climate.spa": { ...hass.states["climate.spa"], attributes: { ...hass.states["climate.spa"].attributes, temperature: 35 } } } };
pendingCard._reconcilePendingTarget();
assert.equal(pendingCard._pendingTarget, null);

const failingCard = Object.create(AquardCard.prototype);
failingCard._config = { entities: { climate: "climate.spa" } };
failingCard._hass = { ...hass, callService: async () => { throw new Error("test failure"); } };
failingCard._pendingTarget = null;
failingCard._targetDebounceTimer = null;
failingCard._targetConfirmationTimer = null;
failingCard._render = () => {};
const originalError = console.error;
console.error = () => {};
failingCard._adjustTargetTemperature(-1);
await failingCard._flushTargetTemperature();
console.error = originalError;
assert.equal(failingCard._pendingTarget, null, "failed calls must restore the actual Home Assistant target");

console.log("Configuration, state, grid, control, and water-quality validation passed");
