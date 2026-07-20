const UNAVAILABLE_STATES = new Set(["unknown", "unavailable"]);
const INACTIVE_CONTROL_STATES = new Set(["off", "uit"]);
const CLIMATE_SUPPORT_TARGET_TEMPERATURE = 1;

export function readEntity(hass, entityId, options = {}) {
  if (!entityId) {
    return unavailableResult("Not configured", "not-configured");
  }

  const stateObj = hass?.states?.[entityId];
  if (!stateObj || UNAVAILABLE_STATES.has(stateObj.state)) {
    return unavailableResult("Unavailable", "unavailable");
  }

  if (options.numeric) {
    const number = Number(stateObj.state);
    if (!Number.isFinite(number)) {
      return unavailableResult("Unavailable", "unavailable");
    }

    return {
      value: new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number),
      unit: stateObj.attributes?.unit_of_measurement ?? "",
      availability: "Available",
      availabilityClass: "available",
      stateObj,
    };
  }

  return {
    value: stateObj.state,
    unit: stateObj.attributes?.unit_of_measurement ?? "",
    availability: "Available",
    availabilityClass: "available",
    stateObj,
  };
}

export function readSwitch(hass, entityId) {
  const result = readEntity(hass, entityId);
  if (result.availabilityClass !== "available") return result;

  if (result.value !== "on" && result.value !== "off") {
    return unavailableResult("Unavailable", "unavailable");
  }

  return { ...result, value: result.value === "on" ? "On" : "Off" };
}

export function readClimate(hass, entityId) {
  const result = readEntity(hass, entityId);
  if (result.availabilityClass !== "available") return result;

  const target = Number(result.stateObj.attributes?.temperature);
  const unit = result.stateObj.attributes?.temperature_unit ?? "";
  const state = titleCase(result.value);
  const targetText = Number.isFinite(target)
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(target)}${unit ? ` ${unit}` : ""}`
    : "Target unavailable";

  return {
    ...result,
    value: `${state} · ${targetText}`,
    targetValue: targetText,
    climateState: result.value,
    unit: "",
  };
}

export function resolveTargetTemperature(hass, entityId) {
  if (!entityId || !entityId.startsWith("climate.")) return undefined;
  const stateObj = hass?.states?.[entityId];
  if (!stateObj || UNAVAILABLE_STATES.has(stateObj.state)) return undefined;
  const attributes = stateObj.attributes ?? {};
  const target = Number(attributes.temperature);
  const supportedFeatures = Number(attributes.supported_features);
  if (!Number.isFinite(target) || !Number.isFinite(supportedFeatures) || !(supportedFeatures & CLIMATE_SUPPORT_TARGET_TEMPERATURE)) return undefined;
  const configuredStep = Number(attributes.target_temp_step);
  const step = Number.isFinite(configuredStep) && configuredStep > 0 ? configuredStep : 1;
  const configuredMin = Number(attributes.min_temp);
  const configuredMax = Number(attributes.max_temp);
  return {
    entityId,
    target,
    step,
    min: Number.isFinite(configuredMin) ? configuredMin : -Infinity,
    max: Number.isFinite(configuredMax) ? configuredMax : Infinity,
    unit: attributes.temperature_unit ?? "",
    stateObj,
  };
}

export function getTargetTemperatureAdjustment(control, direction) {
  if (!control || (direction !== -1 && direction !== 1)) return undefined;
  const unclamped = control.target + direction;
  const temperature = Math.min(control.max, Math.max(control.min, unclamped));
  if (Math.abs(temperature - control.target) < Number.EPSILON) return undefined;
  return { temperature, domain: "climate", service: "set_temperature", data: { entity_id: control.entityId, temperature } };
}

export function formatTargetTemperature(value, unit, step = 1) {
  const decimals = Math.min(3, decimalPlaces(step));
  const formatted = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  return { value: formatted, unit };
}

function roundToStep(value, step) { return Number(value.toFixed(Math.min(6, decimalPlaces(step)))); }
function decimalPlaces(value) { const text = String(value); return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0; }

export function titleCase(value) {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getControlAction(entityId, stateObj, allowSelect = false, allowClimate = false) {
  if (!entityId || !stateObj || UNAVAILABLE_STATES.has(stateObj.state)) return undefined;
  const domain = entityId.split(".", 1)[0];
  if (domain === "switch") {
    return { domain: "switch", service: "toggle", data: { entity_id: entityId } };
  }
  if (allowSelect && domain === "select") {
    return { domain: "select", service: "select_next", data: { entity_id: entityId, cycle: true } };
  }
  if (allowClimate && domain === "climate") {
    const modes = Array.isArray(stateObj.attributes?.hvac_modes) ? stateObj.attributes.hvac_modes : [];
    const currentMode = String(stateObj.state).toLowerCase();
    const hvacMode = currentMode === "off"
      ? modes.find((mode) => String(mode).toLowerCase() === "heat") ?? modes.find((mode) => String(mode).toLowerCase() !== "off")
      : modes.find((mode) => String(mode).toLowerCase() === "off");
    if (hvacMode) return { domain: "climate", service: "set_hvac_mode", data: { entity_id: entityId, hvac_mode: hvacMode } };
  }
  return undefined;
}

export function isControlActive(stateObj) {
  if (!stateObj || UNAVAILABLE_STATES.has(stateObj.state)) return false;
  return !INACTIVE_CONTROL_STATES.has(String(stateObj.state).trim().toLowerCase());
}

function unavailableResult(value, availabilityClass) {
  return {
    value,
    unit: "",
    availability: value,
    availabilityClass,
    stateObj: undefined,
  };
}
