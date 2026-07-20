export const AQUARD_PROFILES = Object.freeze([
  { value: "spa", label: "Spa" },
]);

export const DEVICE_FIELDS = Object.freeze([
  { key: "climate", label: "Climate", domains: ["climate"] },
  { key: "water_temperature", label: "Temperature sensor", domains: ["sensor"] },
  { key: "ph", label: "pH sensor", domains: ["sensor"] },
  { key: "orp", label: "ORP sensor", domains: ["sensor"] },
  { key: "tds", label: "TDS sensor", domains: ["sensor"] },
  { key: "ec", label: "EC sensor", domains: ["sensor"] },
  { key: "power", label: "Power", domains: ["switch"] },
  { key: "heater", label: "Heater", domains: ["climate", "switch"] },
  { key: "filter", label: "Filter", domains: ["switch"] },
  { key: "bubbles", label: "Bubbles", domains: ["switch", "select"] },
]);

