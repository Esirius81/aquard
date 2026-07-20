export const AQUARD_PROFILES = Object.freeze([
  { value: "spa", label: "Spa" },
]);

export const DEVICE_FIELDS = Object.freeze([
  { key: "ph", label: "pH sensor", group: "Water monitoring", domains: ["sensor"] },
  { key: "orp", label: "ORP sensor", group: "Water monitoring", domains: ["sensor"] },
  { key: "tds", label: "TDS sensor", group: "Water monitoring", domains: ["sensor"] },
  { key: "ec", label: "EC sensor", group: "Water monitoring", domains: ["sensor"] },
  { key: "climate", label: "Spa climate", group: "Temperature control", domains: ["climate"], description: "Provides the target temperature control." },
  { key: "water_temperature", label: "Water temperature sensor", group: "Temperature control", domains: ["sensor"] },
  { key: "power", label: "Power", group: "Spa equipment", domains: ["switch"] },
  { key: "heater", label: "Heater", group: "Spa equipment", domains: ["climate", "switch"] },
  { key: "filter", label: "Filter", group: "Spa equipment", domains: ["switch"] },
  { key: "bubbles", label: "Bubbles", group: "Spa equipment", domains: ["switch", "select"] },
]);

export const COMPONENT_OPTIONS = Object.freeze([
  { key: "water_status", label: "Water status", description: "Overall water condition and score." },
  { key: "temperature", label: "Temperature", description: "Current and target temperature." },
  { key: "actions", label: "Actions", description: "Water-care guidance and warnings." },
  { key: "measurements", label: "Measurements", description: "pH, ORP, EC, and TDS readings." },
  { key: "controls", label: "Controls", description: "Spa equipment controls." },
  { key: "details", label: "Details", description: "Card title and availability." },
]);

export const MODE_OPTIONS = Object.freeze([
  { value: "full", label: "Full" },
  { value: "compact", label: "Compact" },
  { value: "hidden", label: "Hidden" },
]);
