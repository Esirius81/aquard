import { COMPONENT_IDS, COMPONENT_MODES, DEFAULT_COMPONENT_MODES } from "./component-config.js";

const VALID_MODES = new Set(COMPONENT_MODES);

export function normalizeAquardConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Aquard requires a configuration object");
  }

  let entities;
  if (config.entities !== undefined) {
    if (!config.entities || typeof config.entities !== "object" || Array.isArray(config.entities)) {
      throw new Error("Aquard entities must be a YAML mapping");
    }
    entities = { ...config.entities };
  } else if (typeof config.entity === "string" && config.entity.trim()) {
    entities = { water_temperature: config.entity };
  } else {
    throw new Error("Aquard requires an entities mapping");
  }

  const suppliedComponents = config.components && typeof config.components === "object" && !Array.isArray(config.components)
    ? config.components
    : {};
  if (config.components !== undefined && suppliedComponents !== config.components) {
    console.warn("Aquard components must be a YAML mapping; using full component modes.");
  }

  const components = { ...suppliedComponents };
  for (const componentId of COMPONENT_IDS) {
    const suppliedMode = suppliedComponents[componentId];
    if (suppliedMode === undefined) {
      components[componentId] = DEFAULT_COMPONENT_MODES[componentId];
    } else if (VALID_MODES.has(suppliedMode)) {
      components[componentId] = suppliedMode;
    } else {
      console.warn(`Aquard component "${componentId}" has invalid mode "${String(suppliedMode)}"; using "${DEFAULT_COMPONENT_MODES[componentId]}".`);
      components[componentId] = DEFAULT_COMPONENT_MODES[componentId];
    }
  }

  return {
    ...config,
    name: config.name || "Aquard",
    entities,
    components,
  };
}
