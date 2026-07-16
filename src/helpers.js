const UNAVAILABLE_STATES = new Set(["unknown", "unavailable"]);
const INACTIVE_CONTROL_STATES = new Set(["off", "uit"]);

export function normalizeConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error("Aquard requires a configuration object");
  }

  if (config.entities !== undefined) {
    if (!config.entities || typeof config.entities !== "object" || Array.isArray(config.entities)) {
      throw new Error("Aquard entities must be a YAML mapping");
    }

    return { name: config.name || "Aquard", entities: { ...config.entities } };
  }

  if (typeof config.entity === "string" && config.entity.trim()) {
    return {
      name: config.name || "Aquard",
      entities: { water_temperature: config.entity },
    };
  }

  throw new Error("Aquard requires an entities mapping");
}

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

export function titleCase(value) {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getControlAction(entityId, stateObj, allowSelect = false) {
  if (!entityId || !stateObj || UNAVAILABLE_STATES.has(stateObj.state)) return undefined;
  const domain = entityId.split(".", 1)[0];
  if (domain === "switch") {
    return { domain: "switch", service: "toggle", data: { entity_id: entityId } };
  }
  if (allowSelect && domain === "select") {
    return { domain: "select", service: "select_next", data: { entity_id: entityId, cycle: true } };
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
