import { COMPONENT_IDS, DEFAULT_COMPONENT_MODES } from "../config/component-config.js";

export const LAYOUT_PRESETS = Object.freeze({
  dashboard: Object.freeze({ ...DEFAULT_COMPONENT_MODES }),
  compact: Object.freeze({
    water_status: "compact",
    temperature: "compact",
    actions: "hidden",
    measurements: "compact",
    controls: "hidden",
    details: "hidden",
  }),
});

export function getEffectiveComponents(config) {
  return Object.fromEntries(COMPONENT_IDS.map((id) => [id, config?.components?.[id] ?? DEFAULT_COMPONENT_MODES[id]]));
}

export function deriveLayoutPreset(config) {
  const modes = getEffectiveComponents(config);
  for (const [preset, mapping] of Object.entries(LAYOUT_PRESETS)) {
    if (COMPONENT_IDS.every((id) => modes[id] === mapping[id])) return preset;
  }
  return "custom";
}

export function applyLayoutPreset(config, preset) {
  if (preset === "custom" || !LAYOUT_PRESETS[preset]) return config;
  return { ...config, components: { ...(config?.components ?? {}), ...LAYOUT_PRESETS[preset] } };
}
