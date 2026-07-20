export const COMPONENT_IDS = Object.freeze([
  "water_status",
  "temperature",
  "actions",
  "measurements",
  "controls",
  "details",
]);

export const COMPONENT_MODES = Object.freeze(["full", "compact", "hidden"]);

export const DEFAULT_COMPONENT_MODES = Object.freeze(Object.fromEntries(
  COMPONENT_IDS.map((componentId) => [componentId, "full"]),
));

export function getComponentMode(config, componentId) {
  return config?.components?.[componentId] ?? DEFAULT_COMPONENT_MODES[componentId] ?? "full";
}

export function isComponentVisible(config, componentId) {
  return getComponentMode(config, componentId) !== "hidden";
}
