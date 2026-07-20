// Provisional spa profile defaults. Profiles own all zones, curve points,
// weights, messages and priority; the evaluator itself is profile independent.
// These defaults support guidance and are not universal safety guarantees.
export const SPA_WATER_QUALITY_PROFILE = deepFreeze({
  essential: ["ph", "orp"],
  criticalOverrides: ["ph", "orp"],
  priority: [
    ["ph", "alert"], ["orp", "alert"], ["tds", "alert"],
    ["ph", "action_needed"], ["orp", "action_needed"], ["tds", "action_needed"],
    ["ph", "monitor"], ["orp", "monitor"], ["tds", "monitor"],
  ],
  measurements: {
    ph: {
      weight: 0.4,
      scoring: { mode: "distance", target: 7.4, curve: [[0, 100], [0.05, 99.2], [0.1, 99], [0.2, 97], [0.3, 94], [0.4, 90], [0.6, 60], [0.8, 20], [1, 0]] },
      zones: { preferred: { min: 7.35, max: 7.6 }, monitor: { min: 7.2, max: 7.8 }, action: { min: 7, max: 8 } },
      display: { min: 6.8, max: 8.2, ideal: 7.4 },
      messages: { monitorLow: "ph_slightly_below_ideal", monitorHigh: "ph_slightly_above_ideal", action_neededLow: "raise_ph", action_neededHigh: "lower_ph", alertLow: "correct_ph_before_use", alertHigh: "correct_ph_before_use" },
    },
    orp: {
      weight: 0.45,
      scoring: { mode: "shortfall", target: 730, curve: [[0, 100], [30, 98], [60, 94], [80, 90], [130, 72], [230, 40], [300, 0]] },
      zones: { preferred: { min: 650 }, monitor: { min: 600 }, action: { min: 500 } },
      display: { min: 450, max: 850, ideal: 730 },
      messages: { monitorLow: "sanitizer_performance_declining", action_neededLow: "restore_sanitizer", alertLow: "verify_sanitizer_before_use" },
    },
    ec: {
      weight: 0,
      scoring: { mode: "distance", target: 1.2, curve: [[0, 100], [0.2, 98], [0.4, 94], [0.8, 82], [1.3, 60], [1.8, 20]] },
      zones: { preferred: { min: 0.8, max: 2 }, monitor: { min: 0.6, max: 2.4 }, action: { min: 0.4, max: 3 } },
      display: { min: 0.3, max: 3.2, ideal: 1.2 }, messages: {},
    },
    tds: {
      weight: 0.15,
      scoring: { mode: "value", curve: [[0, 100], [500, 98], [1000, 94], [1500, 88], [2500, 60], [4000, 20]] },
      zones: { preferred: { max: 1500 }, monitor: { max: 2000 }, action: { max: 2500 } },
      display: { min: 0, max: 3000, ideal: 750 },
      messages: { monitorHigh: "tds_gradually_increasing", action_neededHigh: "replace_water_soon", alertHigh: "replace_water_before_use" },
    },
  },
});

export function evaluateSpaWaterQuality(values, profile = SPA_WATER_QUALITY_PROFILE) { return evaluateWaterQuality(values, profile); }

export function evaluateWaterQuality(values, profile) {
  const measurements = Object.fromEntries(Object.entries(profile.measurements).map(([key, definition]) => [key, evaluateMeasurement(values[key], definition)]));
  const configuredKeys = Object.keys(profile.measurements).filter((key) => Object.hasOwn(values, key));
  if (configuredKeys.some((key) => !measurements[key]?.available)) return result("unknown", null, null, "sensor_data_unavailable", measurements);

  const weightedKeys = configuredKeys.filter((key) => measurements[key].available && profile.measurements[key].weight > 0);
  const totalWeight = weightedKeys.reduce((sum, key) => sum + profile.measurements[key].weight, 0);
  if (!totalWeight) return result("unknown", null, null, "sensor_data_unavailable", measurements);
  const score = Math.round(weightedKeys.reduce((sum, key) => sum + measurements[key].score * profile.measurements[key].weight, 0) / totalWeight);
  const primaryIssue = findPrimaryIssue(measurements, profile.priority);
  const severities = weightedKeys.map((key) => measurements[key].severity);
  const status = ["alert", "action_needed", "monitor"].find((severity) => severities.includes(severity)) ?? "excellent";
  const defaultMessages = { excellent: "enjoy_your_spa", monitor: "keep_monitoring", action_needed: "maintenance_due", alert: "check_water_before_use" };
  return result(status, score, primaryIssue?.measurement ?? null, primaryIssue?.messageKey ?? defaultMessages[status], measurements);
}

function evaluateMeasurement(input, definition) {
  const value = finiteNumber(input);
  if (value === undefined) return unavailableMeasurement();
  const classification = classify(value, definition.zones);
  const score = interpolateCurve(scoringInput(value, definition.scoring), definition.scoring.curve);
  return { available: true, value, score: Math.round(score), severity: classification.severity, messageKey: classification.severity === "excellent" ? null : definition.messages[`${classification.severity}${classification.side}`] ?? null, range: rangePresentation(value, classification, definition) };
}

function classify(value, zones) {
  if (outside(value, zones.action)) return { severity: "alert", side: side(value, zones.action) };
  if (outside(value, zones.monitor)) return { severity: "action_needed", side: side(value, zones.monitor) };
  if (outside(value, zones.preferred)) return { severity: "monitor", side: side(value, zones.preferred) };
  return { severity: "excellent", side: "" };
}
function outside(value, zone) { return (zone.min !== undefined && value < zone.min) || (zone.max !== undefined && value > zone.max); }
function side(value, zone) { return zone.min !== undefined && value < zone.min ? "Low" : "High"; }

function rangePresentation(value, classification, definition) {
  const { display, zones } = definition;
  const currentPosition = percentage(value, display.min, display.max);
  const idealPosition = percentage(display.ideal, display.min, display.max);
  if (classification.severity === "excellent") return { direction: "ideal", intensity: 0, currentPosition, idealPosition };
  const isLow = classification.side === "Low";
  const boundary = isLow ? zones.preferred.min : zones.preferred.max;
  const extreme = isLow ? zones.action.min ?? display.min : zones.action.max ?? display.max;
  const intensity = Math.min(1, Math.abs(value - boundary) / Math.max(Math.abs(extreme - boundary), Number.EPSILON));
  return { direction: isLow ? "low" : "high", intensity, currentPosition, idealPosition };
}
function percentage(value, min, max) { return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)); }
function scoringInput(value, scoring) { if (scoring.mode === "distance") return Math.abs(value - scoring.target); if (scoring.mode === "shortfall") return Math.max(0, scoring.target - value); return value; }
function interpolateCurve(value, curve) { if (value <= curve[0][0]) return curve[0][1]; for (let index = 1; index < curve.length; index += 1) { const [endValue, endScore] = curve[index]; if (value <= endValue) { const [startValue, startScore] = curve[index - 1]; return startScore + ((value - startValue) / (endValue - startValue)) * (endScore - startScore); } } return curve[curve.length - 1][1]; }
function findPrimaryIssue(measurements, priority) { for (const [key, severity] of priority) if (measurements[key]?.severity === severity) return { measurement: key, messageKey: measurements[key].messageKey }; return null; }
function result(status, score, primaryIssue, messageKey, measurements) { return { status, canUse: status === "excellent" || status === "monitor" ? true : status === "unknown" ? null : false, score, primaryIssue, messageKey, measurements }; }
function unavailableMeasurement() { return { available: false, value: null, score: null, severity: "unknown", messageKey: "sensor_data_unavailable" }; }
function finiteNumber(value) { if (value === null || value === undefined || value === "" || value === "unknown" || value === "unavailable") return undefined; const number = Number(value); return Number.isFinite(number) ? number : undefined; }
function deepFreeze(value) { Object.freeze(value); for (const child of Object.values(value)) if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child); return value; }
