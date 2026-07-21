import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatTargetTemperature, getControlAction, getTargetTemperatureAdjustment, isControlActive, readClimate, readCurrentTemperature, readEntity, readSwitch, resolveTargetTemperature } from "../src/helpers.js";
import { normalizeAquardConfig } from "../src/config/config-normalizer.js";
import { COMPONENT_IDS, getComponentMode, isComponentVisible, shouldShowSensorInformation } from "../src/config/component-config.js";
import { renderWaterStatus } from "../src/components/water-status.js";
import { renderTemperature } from "../src/components/temperature.js";
import { renderActions } from "../src/components/actions.js";
import { renderMeasurements } from "../src/components/measurements.js";
import { renderControls } from "../src/components/controls.js";
import { renderDetails } from "../src/components/details.js";
import { evaluateSpaWaterQuality, SPA_WATER_QUALITY_PROFILE } from "../src/water-quality.js";
import { temperatureToArc } from "../src/components/temperature-gauge.js";
import { renderStatusIndicator, STATUS_INDICATOR_GEOMETRY } from "../src/components/status-indicator.js";
import { styles } from "../src/styles.js";
import { dispatchConfigChanged, hasMeaningfulEntities, updateConfigProperty } from "../src/editor/editor-helpers.js";
import { applyLayoutPreset, deriveLayoutPreset, LAYOUT_PRESETS } from "../src/editor/editor-presets.js";
import { PendingStateStore, numericValuesEqual } from "../src/pending-state.js";

globalThis.HTMLElement = class {};
const registeredElements = new Map();
globalThis.customElements = {
  define: (name, element) => registeredElements.set(name, element),
  get: (name) => registeredElements.get(name),
};
globalThis.window = { customCards: [] };
globalThis.document = { createElement: (name) => ({ localName: name }) };

const { AquardCard } = await import("../src/aquard-card.js");
const { AquardCardEditor } = await import("../src/editor/aquard-card-editor.js");
const distributionSource = await readFile(new URL("../dist/aquard-card.js", import.meta.url), "utf8");
assert.match(distributionSource, /class PendingStateStore/, "the distribution bundle must include the optimistic pending-state implementation");
const { AquardCard: DistributionAquardCard } = await import("../dist/aquard-card.js?validation");
assert.equal(typeof DistributionAquardCard.prototype.setConfig, "function", "the built Home Assistant card must expose setConfig");
assert.equal(AquardCard.getConfigElement().localName, "aquard-card-editor");
assert.deepEqual(AquardCard.getStubConfig(), { profile: "spa", entities: {}, components: LAYOUT_PRESETS.dashboard });
assert.equal(typeof AquardCard.prototype.getGridOptions, "function");
assert.deepEqual(AquardCard.prototype.getGridOptions(), {
  columns: 12,
  min_columns: 6,
});
assert.equal(customElements.get("aquard-card"), AquardCard);
assert.equal(customElements.get("purespa-card").prototype instanceof AquardCard, true);
assert.equal(window.customCards.filter((card) => card.type === "aquard-card").length, 1);
assert.equal(window.customCards[0].preview, true);
assert.equal(hasMeaningfulEntities(AquardCard.getStubConfig()), false);
assert.equal(hasMeaningfulEntities({ entities: { ph: "sensor.ph" } }), true);
const setupCard = Object.create(AquardCard.prototype);
setupCard._config = normalizeAquardConfig(AquardCard.getStubConfig());
setupCard._hass = { callService: () => { throw new Error("setup must not call services"); } };
setupCard.shadowRoot = { innerHTML: "" };
setupCard._render();
assert.match(setupCard.shadowRoot.innerHTML, /Aquard setup/);
assert.doesNotMatch(setupCard.shadowRoot.innerHTML.split("</style>")[1], /EXCELLENT|Not configured|0%/);

const legacy = normalizeAquardConfig({ entity: "sensor.water", name: "Legacy" });
assert.equal(legacy.entities.water_temperature, "sensor.water");

const modern = normalizeAquardConfig({ entities: { ph: "sensor.ph" } });
assert.equal(modern.entities.ph, "sensor.ph");
assert.equal(modern.name, "Aquard");
const yamlConfig = { name: "Backyard spa", entities: { ph: "sensor.ph", climate: "climate.spa" }, future_option: { enabled: true } };
const loadedEditor = Object.create(AquardCardEditor.prototype);
loadedEditor._render = () => {};
loadedEditor.setConfig(yamlConfig);
assert.equal(loadedEditor._config, yamlConfig, "the editor must load the original YAML configuration");

const editedConfig = updateConfigProperty(yamlConfig, ["entities", "ph"], "sensor.new_ph");
assert.equal(editedConfig.entities.ph, "sensor.new_ph");
assert.equal(editedConfig.entities.climate, "climate.spa");
assert.deepEqual(editedConfig.future_option, { enabled: true });
assert.notEqual(editedConfig, yamlConfig);
assert.notEqual(editedConfig.entities, yamlConfig.entities);
const componentEditorConfig = { ...yamlConfig, components: { temperature: "compact", custom: "future" } };
const unrelatedEdit = updateConfigProperty(componentEditorConfig, ["name"], "Edited");
assert.deepEqual(unrelatedEdit.components, componentEditorConfig.components);
const componentEdit = updateConfigProperty(componentEditorConfig, ["components", "temperature"], "hidden");
assert.equal(componentEdit.components.temperature, "hidden");
assert.equal(componentEdit.components.custom, "future");
assert.deepEqual(componentEdit.future_option, { enabled: true });

let configEvent;
dispatchConfigChanged({ dispatchEvent: (event) => { configEvent = event; } }, editedConfig);
assert.equal(configEvent.type, "config-changed");
assert.equal(configEvent.detail.config, editedConfig);
assert.equal(configEvent.bubbles, true);
assert.equal(configEvent.composed, true);

const missingEntityEditor = Object.create(AquardCardEditor.prototype);
missingEntityEditor.shadowRoot = { querySelectorAll: () => [] };
assert.doesNotThrow(() => { missingEntityEditor.hass = { states: {} }; });
const editorSource = await readFile(new URL("../src/editor/aquard-card-editor.js", import.meta.url), "utf8");
assert.doesNotMatch(editorSource, /Layout preset|Components<|component-name|preset-select/);
assert.match(editorSource, /Show sensor information/);
assert.match(editorSource, /show_sensor_information/);
assert.throws(() => normalizeAquardConfig({ entities: "sensor.invalid" }), /YAML mapping/);
assert.throws(() => normalizeAquardConfig({}), /entities mapping/);
assert.throws(() => normalizeAquardConfig({ profile: "pool", entities: {} }), /does not support profile/);

const presetSource = { entities: {}, components: { future_component: "future" }, future_option: true };
const dashboardPreset = applyLayoutPreset(presetSource, "dashboard");
assert.equal(deriveLayoutPreset(dashboardPreset), "dashboard");
assert.equal(dashboardPreset.components.future_component, "future");
const compactPreset = applyLayoutPreset(dashboardPreset, "compact");
assert.equal(deriveLayoutPreset(compactPreset), "compact");
assert.deepEqual(Object.fromEntries(COMPONENT_IDS.map((id) => [id, compactPreset.components[id]])), LAYOUT_PRESETS.compact);
assert.equal(applyLayoutPreset(compactPreset, "custom"), compactPreset);
assert.equal(deriveLayoutPreset(updateConfigProperty(compactPreset, ["components", "controls"], "full")), "custom");

const originalConfig = { entities: { ph: "sensor.ph" }, components: { temperature: "compact", future_component: "future" }, future_option: { enabled: true } };
const normalizedComponents = normalizeAquardConfig(originalConfig);
assert.deepEqual(Object.fromEntries(COMPONENT_IDS.map((id) => [id, getComponentMode(normalizedComponents, id)])), {
  water_status: "full", temperature: "compact", actions: "full", measurements: "full", controls: "full", details: "full",
});
assert.equal(normalizedComponents.components.future_component, "future");
assert.deepEqual(normalizedComponents.future_option, { enabled: true });
assert.notEqual(normalizedComponents, originalConfig);
assert.notEqual(normalizedComponents.entities, originalConfig.entities);
assert.notEqual(normalizedComponents.components, originalConfig.components);
assert.deepEqual(originalConfig.components, { temperature: "compact", future_component: "future" });
for (const mode of ["full", "compact", "hidden"]) assert.equal(getComponentMode(normalizeAquardConfig({ entities: {}, components: { controls: mode } }), "controls"), mode);
const originalWarn = console.warn;
console.warn = () => {};
assert.equal(getComponentMode(normalizeAquardConfig({ entities: {}, components: { controls: "invalid" } }), "controls"), "full");
console.warn = originalWarn;
assert.equal(isComponentVisible(normalizedComponents, "temperature"), true);
assert.equal(isComponentVisible(normalizeAquardConfig({ entities: {}, components: { temperature: "hidden" } }), "temperature"), false);
assert.equal(shouldShowSensorInformation({}), true);
assert.equal(shouldShowSensorInformation({ show_sensor_information: true }), true);
assert.equal(shouldShowSensorInformation({ show_sensor_information: false }), false);
assert.match(renderMeasurements({ mode: "full", hasMeasurements: shouldShowSensorInformation({}) }), /measurement-section/);
assert.equal(renderMeasurements({ mode: "full", hasMeasurements: shouldShowSensorInformation({ show_sensor_information: false }) }), "", "disabled sensor information must leave no wrapper or layout gap");

const availableReading = { stateObj: { state: "38" }, availabilityClass: "available" };
assert.match(renderWaterStatus({ status: "excellent", mode: "full", actions: renderActions({ mode: "full", hasStatus: true }) }), /data-component="water_status"/);
assert.equal(renderWaterStatus({ status: "excellent", mode: "hidden" }), "");
assert.match(renderWaterStatus({ status: "excellent", mode: "compact" }), /aquard-component--compact/);
assert.equal(renderTemperature({ mode: "hidden", reading: availableReading }), "");
assert.match(renderTemperature({ mode: "compact", reading: availableReading }), /temperature-panel--compact/);
assert.equal(renderMeasurements({ mode: "hidden", hasMeasurements: true }), "");
assert.equal(renderMeasurements({ mode: "compact", hasMeasurements: false }), "");
assert.equal(renderMeasurements({ mode: "full", hasMeasurements: false }), "");
assert.match(renderControls({ mode: "compact", hasControls: true }), /equipment-section--compact/);
assert.equal(renderControls({ mode: "full", hasControls: false }), "");
assert.equal(renderActions({ mode: "full", hasStatus: false }), "");
assert.match(renderActions({ mode: "full", hasStatus: true }), /status-action/);
assert.equal(renderActions({ mode: "hidden", hasStatus: true }), "");
assert.equal(renderTemperature({ mode: "full", reading: availableReading, configured: false }), "");
assert.equal(renderDetails({ mode: "hidden", name: "Aquard", availabilityClass: "available" }), "");
assert.doesNotMatch(renderDetails({ mode: "full", name: "Aquard", availabilityClass: "not-configured", showAvailability: false }), /header-availability/);
const fullSizeCard = Object.create(AquardCard.prototype);
fullSizeCard._config = normalizeAquardConfig({ entities: {} });
const focusedSizeCard = Object.create(AquardCard.prototype);
focusedSizeCard._config = normalizeAquardConfig({ entities: {}, components: { temperature: "hidden", actions: "hidden", measurements: "hidden", controls: "hidden", details: "hidden" } });
const hiddenSizeCard = Object.create(AquardCard.prototype);
hiddenSizeCard._config = normalizeAquardConfig({ entities: {}, components: Object.fromEntries(COMPONENT_IDS.map((id) => [id, "hidden"])) });
assert.ok(fullSizeCard.getCardSize() > focusedSizeCard.getCardSize());
assert.equal(focusedSizeCard.getCardSize(), 2);
assert.equal(hiddenSizeCard.getCardSize(), 1);

const hass = {
  states: {
    "sensor.ph": { state: "7.25", attributes: { unit_of_measurement: "pH" } },
    "switch.power": { state: "on", attributes: {} },
    "select.bubbles": { state: "High", attributes: { options: ["Off", "Low", "High"] } },
    "select.bubbles_off": { state: "uit", attributes: { options: ["uit", "hoog"] } },
    "climate.spa": { state: "heat", attributes: { current_temperature: 36.5, temperature: 38, temperature_unit: "°C", supported_features: 1, target_temp_step: 0.5, min_temp: 30, max_temp: 40, hvac_modes: ["off", "heat"] } },
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
assert.match(readCurrentTemperature(hass, { climate: "climate.spa" }).value, /^36[.,]5$/);
assert.equal(readCurrentTemperature(hass, { water_temperature: "sensor.ph", climate: "climate.spa" }).value, ph.value, "a separate temperature sensor takes precedence over climate");
assert.equal(readCurrentTemperature(hass, { climate: "climate.unavailable" }).availabilityClass, "unavailable");
const climate = readClimate(hass, "climate.spa");
assert.match(climate.value, /^Heat · 38 °C$/);
assert.equal(climate.targetValue, "38 °C");
assert.equal(climate.climateState, "heat");
assert.doesNotMatch(climate.targetValue, /Heat|Heating|Idle|Off/i);
const targetControl = resolveTargetTemperature(hass, "climate.spa");
assert.equal(targetControl.target, 38);
assert.equal(targetControl.step, 0.5);
assert.equal(getTargetTemperatureAdjustment(targetControl, 1).temperature, 38.5);
assert.equal(getTargetTemperatureAdjustment(targetControl, -1).temperature, 37.5);
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
targetMarkupCard._pendingState = new PendingStateStore();
const targetMarkup = targetMarkupCard._renderTargetControl(targetControl);
assert.match(targetMarkup, /class="target-control"/);
assert.match(targetMarkup, /Decrease target temperature/);
assert.match(targetMarkup, /Increase target temperature/);
assert.doesNotMatch(targetMarkup, /Heat|Heating|Idle|Off/i);
assert.doesNotMatch(targetMarkup, /pending|spinner|loading|aria-busy/i);

assert.deepEqual(getControlAction("switch.power", hass.states["switch.power"]), {
  domain: "switch", service: "toggle", data: { entity_id: "switch.power" }, requestedValue: "off",
});
assert.deepEqual(getControlAction("select.bubbles", hass.states["select.bubbles"], true), {
  domain: "select", service: "select_next", data: { entity_id: "select.bubbles", cycle: true }, requestedValue: "Off",
});
assert.equal(getControlAction("select.bubbles", hass.states["select.bubbles"], false), undefined);
assert.equal(getControlAction("sensor.ph", hass.states["sensor.ph"]), undefined);
assert.deepEqual(getControlAction("climate.spa", hass.states["climate.spa"], false, true), {
  domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.spa", hvac_mode: "off" }, requestedValue: "off",
});
assert.deepEqual(getControlAction("climate.spa_off", hass.states["climate.spa_off"], false, true), {
  domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.spa_off", hvac_mode: "heat" }, requestedValue: "heat",
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
const hiddenSensorInformationWater = evaluateSpaWaterQuality(base);
assert.deepEqual(hiddenSensorInformationWater, excellentWater, "sensor-section visibility must not affect water-quality calculations or actions");
const hiddenSensorInformationAction = evaluateSpaWaterQuality({ ...base, orp: 550 });
assert.equal(hiddenSensorInformationAction.status, "action_needed");
assert.match(renderActions({ mode: "full", hasStatus: true }), /data-component="actions"/);
assert.equal(evaluateSpaWaterQuality({ ph: 7.4 }).status, "excellent", "an absent optional measurement must not lower status");
assert.equal(evaluateSpaWaterQuality({}).status, "unknown");
assert.equal(evaluateSpaWaterQuality({}).score, null);

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

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const quietStore = (timeoutMs = 9000) => new PendingStateStore({ timeoutMs, onChange: () => {} });

const pendingStore = quietStore(20);
const powerRequest = pendingStore.set("switch.power", "on");
assert.equal(pendingStore.resolve("switch.power", "off"), "on", "Power must stay visually On while Home Assistant still reports Off");
assert.equal(pendingStore.reconcile("switch.power", "off"), false);
assert.equal(pendingStore.get("switch.power"), powerRequest);
assert.equal(pendingStore.reconcile("switch.power", "on"), true);
assert.equal(pendingStore.get("switch.power").confirmed, true, "confirmed Power must retain a quiet race guard");
assert.equal(pendingStore.resolve("switch.power", "on"), "on", "confirmed Power must render without a visible jump");
assert.equal(pendingStore.resolve("switch.power", "off"), "on", "a stale update after confirmation must not make Power jump back");
pendingStore.clear("switch.power");
pendingStore.set("switch.power", "on");
await delay(30);
assert.equal(pendingStore.get("switch.power"), undefined, "unconfirmed Power must expire");
assert.equal(pendingStore.resolve("switch.power", "off"), "off", "actual Power must render after timeout");

for (const [entityId, requested] of [["switch.filter", "on"], ["climate.heater", "heat"], ["select.bubbles", "High"]]) {
  const store = quietStore();
  store.set(entityId, requested);
  assert.equal(store.resolve(entityId, "off"), requested, `${entityId} must use optimistic pending state`);
  store.destroy();
}

const replacedStore = quietStore();
replacedStore.set("target:climate.spa", 37, { equals: numericValuesEqual });
replacedStore.set("target:climate.spa", 39, { equals: numericValuesEqual });
assert.equal(replacedStore.reconcile("target:climate.spa", 37), false, "intermediate temperature must not confirm the latest target");
assert.equal(replacedStore.resolve("target:climate.spa", 37), 39);
assert.equal(replacedStore.reconcile("target:climate.spa", 39), true);
assert.equal(replacedStore.get("target:climate.spa").confirmed, true);
replacedStore.clear("target:climate.spa");
assert.equal(numericValuesEqual(36.5000001, 36.5, 0.0005), true, "decimal targets must confirm within supported precision");

const raceStore = quietStore();
raceStore.set("target", 37, { timeoutMs: 10 });
await delay(5);
raceStore.set("target", 39, { timeoutMs: 40 });
await delay(15);
assert.equal(raceStore.get("target").value, 39, "an older timeout must not clear a newer request");
raceStore.destroy();

let serviceCalls = 0;
let lastServiceCall;
const pendingCard = Object.create(AquardCard.prototype);
pendingCard._config = { entities: { climate: "climate.spa" } };
pendingCard._hass = { ...hass, callService: async (domain, service, data) => { serviceCalls += 1; lastServiceCall = { domain, service, data }; } };
pendingCard._pendingState = quietStore();
pendingCard._targetDebounceTimer = null;
pendingCard._render = () => {};
pendingCard._adjustTargetTemperature(-1);
pendingCard._adjustTargetTemperature(-1);
pendingCard._adjustTargetTemperature(-1);
assert.equal(serviceCalls, 0, "target changes must be debounced");
assert.equal(pendingCard._pendingState.get("target:climate.spa").value, 36.5, "consecutive decreases must calculate from the pending target and respect target_temp_step");
pendingCard._reconcilePendingState();
assert.equal(pendingCard._pendingState.get("target:climate.spa").value, 36.5, "stale Home Assistant state must not replace the optimistic value");
await pendingCard._flushTargetTemperature();
assert.equal(serviceCalls, 1, "debounced target changes must produce one service call");
assert.deepEqual(lastServiceCall, { domain: "climate", service: "set_temperature", data: { entity_id: "climate.spa", temperature: 36.5 } });
pendingCard._hass = { ...pendingCard._hass, states: { ...hass.states, "climate.spa": { ...hass.states["climate.spa"], attributes: { ...hass.states["climate.spa"].attributes, temperature: 36.5 } } } };
pendingCard._reconcilePendingState();
assert.equal(pendingCard._pendingState.get("target:climate.spa").confirmed, true);
assert.equal(pendingCard._pendingState.resolve("target:climate.spa", 35), 36.5, "an older target update after confirmation must remain hidden");
pendingCard._pendingState.destroy();

const increasingCard = Object.create(AquardCard.prototype);
increasingCard._config = { entities: { climate: "climate.spa" } };
increasingCard._hass = { ...hass, callService: async () => {} };
increasingCard._pendingState = quietStore();
increasingCard._render = () => {};
increasingCard._adjustTargetTemperature(1);
increasingCard._adjustTargetTemperature(1);
assert.equal(increasingCard._pendingState.get("target:climate.spa").value, 39, "consecutive increases must calculate from the pending target");
increasingCard._pendingState.destroy();
clearTimeout(increasingCard._targetDebounceTimer);

const controlCalls = [];
const controlCard = Object.create(AquardCard.prototype);
controlCard._hass = { states: { "switch.power": { state: "off", attributes: {} } }, callService: async (...args) => { controlCalls.push(args); } };
controlCard._pendingState = quietStore();
controlCard._render = () => {};
await controlCard._activateControl("switch.power", false, false);
assert.equal(controlCard._pendingState.resolve("switch.power", "off"), "on");
assert.equal(controlCalls.length, 1);
const identicalAction = getControlAction("switch.power", { state: "off", attributes: {} });
assert.equal(controlCard._pendingState.get("switch.power").value, identicalAction.requestedValue, "the pending destination is stored explicitly");
controlCard._pendingState.destroy();

const duplicateCard = Object.create(AquardCard.prototype);
duplicateCard._hass = { states: { "select.mode": { state: "Only", attributes: { options: ["Only"] } } }, callService: async () => { throw new Error("an identical request must not be sent"); } };
duplicateCard._pendingState = quietStore();
duplicateCard._pendingState.set("select.mode", "Only");
duplicateCard._render = () => {};
await duplicateCard._activateControl("select.mode", true, false);
duplicateCard._pendingState.destroy();

const originalError = console.error;
const failingControlCard = Object.create(AquardCard.prototype);
failingControlCard._hass = { states: { "switch.power": { state: "off", attributes: {} } }, callService: async () => { throw new Error("test failure"); } };
failingControlCard._pendingState = quietStore();
failingControlCard._render = () => {};
console.error = () => {};
await failingControlCard._activateControl("switch.power", false, false);
console.error = originalError;
assert.equal(failingControlCard._pendingState.get("switch.power"), undefined, "a rejected control call must restore the confirmed state");

const failingCard = Object.create(AquardCard.prototype);
failingCard._config = { entities: { climate: "climate.spa" } };
failingCard._hass = { ...hass, callService: async () => { throw new Error("test failure"); } };
failingCard._pendingState = quietStore();
failingCard._targetDebounceTimer = null;
failingCard._render = () => {};
console.error = () => {};
failingCard._adjustTargetTemperature(-1);
await failingCard._flushTargetTemperature();
console.error = originalError;
assert.equal(failingCard._pendingState.get("target:climate.spa"), undefined, "failed calls must restore the actual Home Assistant target");
assert.doesNotMatch(styles, /aq-spin|\.pending \.status-dot|loading|spinner/i, "pending state must have no visual indicator");

console.log("Configuration, state, grid, control, and water-quality validation passed");
