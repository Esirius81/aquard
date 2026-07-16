// Aquard - generated file, do not edit directly.

const UNAVAILABLE_STATES = new Set(["unknown", "unavailable"]);
const INACTIVE_CONTROL_STATES = new Set(["off", "uit"]);
const CLIMATE_SUPPORT_TARGET_TEMPERATURE = 1;

function normalizeConfig(config) {
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

function readEntity(hass, entityId, options = {}) {
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

function readSwitch(hass, entityId) {
  const result = readEntity(hass, entityId);
  if (result.availabilityClass !== "available") return result;

  if (result.value !== "on" && result.value !== "off") {
    return unavailableResult("Unavailable", "unavailable");
  }

  return { ...result, value: result.value === "on" ? "On" : "Off" };
}

function readClimate(hass, entityId) {
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

function resolveTargetTemperature(hass, entityId) {
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

function getTargetTemperatureAdjustment(control, direction) {
  if (!control || (direction !== -1 && direction !== 1)) return undefined;
  const unclamped = control.target + (control.step * direction);
  const temperature = roundToStep(Math.min(control.max, Math.max(control.min, unclamped)), control.step);
  if (Math.abs(temperature - control.target) < Number.EPSILON) return undefined;
  return { temperature, domain: "climate", service: "set_temperature", data: { entity_id: control.entityId, temperature } };
}

function formatTargetTemperature(value, unit, step = 1) {
  const decimals = Math.min(3, decimalPlaces(step));
  const formatted = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  return { value: formatted, unit };
}

function roundToStep(value, step) { return Number(value.toFixed(Math.min(6, decimalPlaces(step)))); }
function decimalPlaces(value) { const text = String(value); return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0; }

function titleCase(value) {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getControlAction(entityId, stateObj, allowSelect = false) {
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

function isControlActive(stateObj) {
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

// Provisional spa profile defaults. Profiles own all zones, curve points,
// weights, messages and priority; the evaluator itself is profile independent.
// These defaults support guidance and are not universal safety guarantees.
const SPA_WATER_QUALITY_PROFILE = deepFreeze({
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

function evaluateSpaWaterQuality(values, profile = SPA_WATER_QUALITY_PROFILE) { return evaluateWaterQuality(values, profile); }

function evaluateWaterQuality(values, profile) {
  const measurements = Object.fromEntries(Object.entries(profile.measurements).map(([key, definition]) => [key, evaluateMeasurement(values[key], definition)]));
  if (profile.essential.some((key) => !measurements[key]?.available)) return result("unknown", null, null, "sensor_data_unavailable", measurements);

  const weightedKeys = Object.keys(measurements).filter((key) => measurements[key].available && profile.measurements[key].weight > 0);
  const totalWeight = weightedKeys.reduce((sum, key) => sum + profile.measurements[key].weight, 0);
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

const DEFAULT_TEMPERATURE_GAUGE_PROFILE = Object.freeze({
  min: 0,
  max: 45,
  arcFraction: 0.75,
});

const TEMPERATURE_GAUGE_GEOMETRY = Object.freeze({
  center: 80,
  radius: 72,
  rotation: 135,
});

function temperatureToArc(value, profile = DEFAULT_TEMPERATURE_GAUGE_PROFILE) {
  const numericValue = Number(value);
  const clampedValue = Number.isFinite(numericValue)
    ? Math.min(profile.max, Math.max(profile.min, numericValue))
    : profile.min;
  const progress = (clampedValue - profile.min) / (profile.max - profile.min);
  const circumference = 2 * Math.PI * TEMPERATURE_GAUGE_GEOMETRY.radius;
  const arcLength = circumference * profile.arcFraction;
  const markerAngle = TEMPERATURE_GAUGE_GEOMETRY.rotation + (360 * profile.arcFraction * progress);
  const markerRadians = markerAngle * (Math.PI / 180);
  return {
    clampedValue,
    progress,
    percentage: progress * 100,
    circumference,
    arcLength,
    progressLength: arcLength * progress,
    marker: {
      x: TEMPERATURE_GAUGE_GEOMETRY.center + (TEMPERATURE_GAUGE_GEOMETRY.radius * Math.cos(markerRadians)),
      y: TEMPERATURE_GAUGE_GEOMETRY.center + (TEMPERATURE_GAUGE_GEOMETRY.radius * Math.sin(markerRadians)),
    },
  };
}

function renderTemperatureGauge(value, profile = DEFAULT_TEMPERATURE_GAUGE_PROFILE) {
  const arc = temperatureToArc(value, profile);
  const remainingProgress = arc.circumference - arc.progressLength;
  const remainingTrack = arc.circumference - arc.arcLength;
  const { center, radius, rotation } = TEMPERATURE_GAUGE_GEOMETRY;

  return `
    <svg class="temperature-gauge-svg" viewBox="0 0 160 160" role="img" aria-label="Temperature scale ${Math.round(arc.percentage)} percent">
      <defs>
        <linearGradient id="aquard-droplet" x1="28%" y1="18%" x2="72%" y2="88%">
          <stop offset="0" stop-color="var(--aq-gauge-drop-light)"/>
          <stop offset=".48" stop-color="var(--aq-gauge-drop-mid)"/>
          <stop offset="1" stop-color="var(--aq-gauge-drop-deep)"/>
        </linearGradient>
        <linearGradient id="aquard-droplet-highlight" x1="35%" y1="20%" x2="62%" y2="75%">
          <stop offset="0" stop-color="var(--aq-gauge-highlight)" stop-opacity=".9"/>
          <stop offset="1" stop-color="var(--aq-gauge-highlight)" stop-opacity="0"/>
        </linearGradient>
        <filter id="aquard-droplet-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle class="temperature-gauge-track" cx="${center}" cy="${center}" r="${radius}"
        transform="rotate(${rotation} ${center} ${center})"
        stroke-dasharray="${arc.arcLength} ${remainingTrack}"/>
      <circle class="temperature-gauge-progress" cx="${center}" cy="${center}" r="${radius}"
        transform="rotate(${rotation} ${center} ${center})"
        stroke-dasharray="${arc.progressLength} ${remainingProgress}"/>
      <circle class="temperature-gauge-marker" cx="${arc.marker.x}" cy="${arc.marker.y}" r="3.5"/>
      <g class="temperature-gauge-droplet" filter="url(#aquard-droplet-glow)">
        <path d="M80 29 C77 39 51 72 51 98 C51 116 64 130 80 130 C96 130 109 116 109 98 C109 72 83 39 80 29Z" fill="url(#aquard-droplet)" fill-opacity=".88"/>
        <path d="M72 54 C63 70 58 84 59 98 C60 108 65 116 72 121 C67 107 67 86 72 54Z" fill="url(#aquard-droplet-highlight)" opacity=".76"/>
        <ellipse cx="70" cy="72" rx="5" ry="9" fill="var(--aq-gauge-highlight)" opacity=".68" transform="rotate(24 70 72)"/>
        <path class="temperature-gauge-drop-edge" d="M80 29 C77 39 51 72 51 98 C51 116 64 130 80 130 C96 130 109 116 109 98 C109 72 83 39 80 29Z"/>
      </g>
    </svg>`;
}

const STATUS_INDICATOR_GEOMETRY = Object.freeze({ viewBox: "0 0 160 160", center: 80, radius: 58, strokeWidth: 8 });

const STATUS_SYMBOLS = Object.freeze({
  excellent: '<path class="status-symbol" d="M53 81 L72 100 L109 61"/>',
  monitor: '<path class="status-symbol" d="M43 80 C55 61 69 53 80 53 C91 53 105 61 117 80 C105 99 91 107 80 107 C69 107 55 99 43 80Z"/><circle class="status-symbol" cx="80" cy="80" r="12"/>',
  action_needed: '<path class="status-symbol" d="M80 48 L80 88"/><circle class="status-symbol-fill" cx="80" cy="108" r="5"/>',
  alert: '<path class="status-symbol" d="M80 48 L80 88"/><circle class="status-symbol-fill" cx="80" cy="108" r="5"/>',
  unknown: '<path class="status-symbol" d="M62 64 C65 50 76 44 87 46 C101 48 107 60 102 72 C98 82 84 84 81 94 L81 98"/><circle class="status-symbol-fill" cx="81" cy="112" r="4"/>',
});

function renderStatusIndicator(status) {
  const geometry = STATUS_INDICATOR_GEOMETRY;
  return `<svg class="status-indicator-svg" viewBox="${geometry.viewBox}" aria-hidden="true">
    <defs><filter id="aquard-status-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle class="status-ring" cx="${geometry.center}" cy="${geometry.center}" r="${geometry.radius}" stroke-width="${geometry.strokeWidth}"/>
    <path class="status-ring-highlight" d="M39 60 A58 58 0 0 1 121 60"/>
    <path class="status-ring-reflection" d="M45 111 A58 58 0 0 0 63 132"/>
    <g class="status-symbol-group">${STATUS_SYMBOLS[status] ?? STATUS_SYMBOLS.unknown}</g>
    <g class="status-sparkle"><path d="M42 35 L42 46 M36.5 40.5 L47.5 40.5"/><circle cx="53" cy="30" r="2"/></g>
  </svg>`;
}

function renderTargetArrow(direction) {
  const isLeft = direction === "decrease";
  const points = isLeft ? "31 19 20 28 31 37" : "25 19 36 28 25 37";
  return `<svg class="target-arrow-svg" viewBox="0 0 56 56" aria-hidden="true">
    <path class="target-button-glass" d="M13 5 H43 Q51 5 51 13 V43 Q51 51 43 51 H13 Q5 51 5 43 V13 Q5 5 13 5Z"/>
    <path class="target-button-highlight" d="M13 8 H43 Q47 8 48 12"/>
    <polyline class="target-arrow-chevron" points="${points}"/>
  </svg>`;
}

const styles = `
  :host {
    display:block; width:100%; min-width:0; max-width:none; box-sizing:border-box; container-type:inline-size;
    --aq-bg:#04131e; --aq-surface:rgba(7,31,45,.9); --aq-border:rgba(55,190,222,.22);
    --aq-text:#f1f8fb; --aq-muted:#83a7b9; --aq-blue:#18c8f3; --aq-green:#43e66c; --aq-yellow:#f1d45b; --aq-orange:#f0a04b; --aq-amber:#f0b56b; --aq-red:#ff6474; --aq-water-line:var(--aq-blue);
    --aq-gauge-track:rgba(24,200,243,.18); --aq-gauge-progress:var(--aq-blue); --aq-gauge-marker:#fff; --aq-gauge-drop-light:#8cecff; --aq-gauge-drop-mid:#18c8f3; --aq-gauge-drop-deep:#087cab; --aq-gauge-highlight:#f1fdff;
    --aq-xl:26px; --aq-lg:18px; --aq-md:16px; --aq-gap:clamp(12px,1.5cqw,16px);
    --aq-pad:clamp(16px,2.2cqw,24px); --aq-motion:320ms cubic-bezier(.22,1,.36,1);
  }
  *,*::before,*::after{box-sizing:border-box}
  ha-card{display:block;width:100%;min-width:0;max-width:none;overflow:hidden;padding:var(--aq-pad);border:1px solid var(--aq-border);border-radius:var(--aq-xl);color:var(--aq-text);background:radial-gradient(circle at 12% 8%,rgba(13,166,199,.12),transparent 32%),radial-gradient(circle at 86% 22%,rgba(20,116,173,.14),transparent 34%),linear-gradient(145deg,#071b28,var(--aq-bg) 58%,#030e17);box-shadow:0 24px 64px rgba(0,0,0,.34),inset 0 1px rgba(255,255,255,.03)}
  main,.aquard-header,.hero-grid,.hero-panel,.measurement-section,.metric-grid,.equipment-section,.equipment-grid{width:100%;min-width:0}
  .aquard-header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:clamp(14px,1.8cqw,20px);padding:0 4px}
  .brand-lockup,.header-availability,.status-support,.climate-line,.metric-state{display:flex;align-items:center}
  .brand-lockup{min-width:0;gap:8px}.brand-mark{display:grid;width:30px;height:30px;flex:0 0 auto;place-items:center;color:var(--aq-blue);filter:drop-shadow(0 0 10px rgba(25,199,242,.32))}.brand-mark ha-icon{width:29px;height:29px;--mdc-icon-size:29px}
  .brand-name{overflow-wrap:anywhere;font-size:clamp(1.45rem,3.2cqw,1.9rem);font-weight:650;letter-spacing:-.025em;line-height:1}.brand-context{display:none}.header-availability,.metric-state{color:var(--aq-muted);font-size:.72rem}.header-availability{flex:0 0 auto;gap:8px}
  .status-dot{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:#617987}.available .status-dot{background:var(--aq-green);box-shadow:0 0 12px rgba(67,230,108,.7)}.unavailable .status-dot{background:var(--aq-amber);box-shadow:0 0 10px rgba(240,181,107,.35)}
  .hero-grid{position:relative;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:var(--aq-gap);isolation:isolate}.hero-water-line{position:absolute;inset:0;z-index:0;width:100%;height:100%;overflow:visible;color:var(--aq-water-line);opacity:.22;filter:drop-shadow(0 0 7px color-mix(in srgb,currentColor 48%,transparent));pointer-events:none}.hero-water-line path{fill:none;stroke:currentColor}.hero-water-line .water-ribbon{fill:currentColor;stroke:none;opacity:.16}.hero-water-line .water-ribbon-secondary{opacity:.09}.hero-water-line .water-wave{stroke-width:1.5}.hero-water-line .water-wave-primary{stroke-width:2.5;filter:drop-shadow(0 0 7px currentColor)}.hero-water-line .water-line-secondary{stroke-width:1;opacity:.6}.hero-water-line .water-filament{stroke-width:.65;opacity:.46}.hero-water-line .water-bubbles{fill:none;stroke:currentColor;stroke-width:1.25}.hero-water-line .water-bubbles circle:nth-child(3n){opacity:.5}.hero-water-line .water-bubbles circle:nth-child(3n + 2){stroke-width:1.8}.hero-water-line .water-sparkles{fill:currentColor;opacity:.76}.hero-panel{z-index:1}
  .hero-panel{position:relative;display:flex;min-height:clamp(190px,22cqw,225px);overflow:hidden;border:1px solid var(--aq-border);border-radius:var(--aq-lg);background:linear-gradient(145deg,rgba(10,42,58,.96),rgba(5,23,35,.88));box-shadow:inset 0 1px rgba(255,255,255,.03),0 15px 35px rgba(0,0,0,.14)}
  .hero-panel::after{position:absolute;right:-15%;bottom:-45%;width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(23,178,212,.1),transparent 68%);content:"";pointer-events:none}
  .status-panel,.temperature-panel{align-items:center;justify-content:space-between;gap:clamp(18px,2.6cqw,28px);padding:clamp(18px,2.7cqw,28px)}.status-panel{justify-content:flex-start;border:0;background:transparent;box-shadow:none;text-align:left}.status-panel::after{display:none}.hero-copy,.temperature-copy{position:relative;z-index:1;min-width:0}.status-panel .hero-copy{flex:1}.section-label{color:#65daf3;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
  .status-headline{display:flex;align-items:center;width:100%;height:1.92em;min-height:1.92em;max-height:1.92em;margin:9px 0 3px;overflow:hidden;overflow-wrap:anywhere;color:var(--aq-green);font-size:clamp(2rem,4.8cqw,3.6rem);font-weight:740;letter-spacing:-.035em;line-height:.96;text-shadow:0 0 20px currentColor}.status-action{color:var(--aq-green);font-size:clamp(.9rem,1.7cqw,1.08rem);font-weight:700;letter-spacing:.025em;line-height:1.15}.status-support{gap:9px;color:#c5d8e1;font-size:.86rem}.status-monitor .status-headline,.status-monitor .status-action{color:var(--aq-yellow)}.status-action_needed .status-headline{font-size:clamp(1.55rem,3.55cqw,2.65rem);white-space:nowrap}.status-action_needed .status-headline,.status-action_needed .status-action{color:var(--aq-orange)}.status-alert .status-headline,.status-alert .status-action{color:var(--aq-red)}.status-unknown .status-headline,.status-unknown .status-action{color:var(--aq-muted)}
  .status-summary{position:absolute;right:0;bottom:0;z-index:2;display:flex;width:clamp(150px,55%,270px);height:68px;flex-direction:column;justify-content:center;gap:0;padding:10px 14px;border:1px solid var(--aq-border);border-radius:var(--aq-md);background:var(--aq-surface);box-shadow:inset 0 1px rgba(255,255,255,.03),0 10px 24px rgba(0,0,0,.13)}.status-summary .status-support{position:relative;padding-top:7px}.status-summary .status-support::before{position:absolute;top:3px;left:50%;width:96%;height:1px;background:currentColor;content:"";opacity:.18;transform:translateX(-50%)}
  .status-orb{position:relative;display:grid;width:clamp(120px,16cqw,165px);aspect-ratio:1;flex:0 0 auto;place-items:center;color:var(--aq-green);--aq-status-color:var(--aq-green)}.status-indicator-svg{display:block;width:100%;height:100%;overflow:visible}.status-ring{fill:none;stroke:var(--aq-status-color);filter:url(#aquard-status-glow)}.status-ring-highlight,.status-ring-reflection{fill:none;stroke:var(--aq-gauge-highlight);stroke-linecap:round}.status-ring-highlight{stroke-width:2;opacity:.34}.status-ring-reflection{stroke-width:1.5;opacity:.2}.status-symbol{fill:none;stroke:var(--aq-status-color);stroke-width:7;stroke-linecap:round;stroke-linejoin:round;filter:url(#aquard-status-glow)}.status-symbol-fill{fill:var(--aq-status-color);filter:url(#aquard-status-glow)}.status-sparkle{fill:var(--aq-status-color);stroke:var(--aq-status-color);stroke-width:2;stroke-linecap:round;opacity:.55}.status-monitor .status-orb{--aq-status-color:var(--aq-yellow)}.status-action_needed .status-orb{--aq-status-color:var(--aq-orange)}.status-alert .status-orb{--aq-status-color:var(--aq-red)}.status-unknown .status-orb{--aq-status-color:var(--aq-muted)}.status-monitor .status-dot{background:var(--aq-yellow);box-shadow:0 0 10px color-mix(in srgb,var(--aq-yellow) 45%,transparent)}.status-action_needed .status-dot{background:var(--aq-orange);box-shadow:0 0 10px color-mix(in srgb,var(--aq-orange) 45%,transparent)}.status-alert .status-dot{background:var(--aq-red);box-shadow:0 0 10px rgba(255,100,116,.45)}.status-unknown .status-dot{background:var(--aq-muted);box-shadow:none}
  .temperature-panel{background:radial-gradient(circle at 80% 45%,rgba(13,174,220,.13),transparent 38%),linear-gradient(145deg,rgba(8,40,57,.96),rgba(5,24,37,.9))}.temperature-copy{display:flex;flex-direction:column;justify-content:center}.temperature-reading{display:flex;align-items:baseline;margin:13px 0 18px;white-space:nowrap;font-size:clamp(3.2rem,8.2cqw,6.1rem);font-weight:620;font-variant-numeric:tabular-nums;letter-spacing:-.06em;line-height:.9}.temperature-value{display:inline-flex;align-items:baseline}.temperature-decimal{font-size:.56em;font-weight:580;letter-spacing:-.035em}.temperature-unit{margin-left:.3em;color:var(--aq-muted);font-size:.27em;font-weight:500;letter-spacing:0}.metric-unit{margin-left:.22em;color:var(--aq-muted);font-size:.35em;font-weight:500;letter-spacing:0}.climate-line{flex-wrap:wrap;gap:6px 10px;padding-top:14px;border-top:1px solid rgba(89,180,205,.15);font-size:.85rem}.climate-label{color:var(--aq-blue)}.climate-value{overflow-wrap:anywhere;color:#c5dce6}
  .temperature-copy:has(.target-control) .temperature-reading{margin:8px 0}.target-control{padding-top:6px;border-top:1px solid rgba(89,180,205,.15)}.target-label{margin-bottom:3px;color:var(--aq-blue);font-size:.78rem}.target-control-row{display:grid;grid-template-columns:44px minmax(58px,1fr) 44px;align-items:center;gap:7px}.target-button{display:grid;width:44px;height:44px;padding:0;place-items:center;border:0;border-radius:13px;color:var(--aq-blue);background:transparent;cursor:pointer;transition:transform 120ms ease,opacity 160ms ease,filter 160ms ease}.target-button:hover:not(:disabled){filter:brightness(1.15)}.target-button:active:not(:disabled),.target-button.pending{transform:scale(.94);filter:brightness(1.25)}.target-button:focus-visible{outline:2px solid var(--aq-blue);outline-offset:2px}.target-button:disabled{cursor:default;opacity:.38}.target-button.pending{opacity:.72}.target-arrow-svg{display:block;width:44px;height:44px;overflow:visible}.target-button-glass{fill:rgba(7,31,45,.5);stroke:var(--aq-blue);stroke-width:1.5;filter:drop-shadow(0 0 5px rgba(24,200,243,.32))}.target-button-highlight{fill:none;stroke:var(--aq-gauge-highlight);stroke-width:1;stroke-linecap:round;opacity:.38}.target-arrow-chevron{fill:none;stroke:var(--aq-blue);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 3px rgba(24,200,243,.55))}.target-display{display:flex;min-width:0;align-items:baseline;justify-content:center;white-space:nowrap;color:var(--aq-text);font-variant-numeric:tabular-nums}.target-number{font-size:clamp(1.55rem,3.2cqw,2.1rem);font-weight:650;letter-spacing:-.035em}.target-unit{margin-left:.3em;color:var(--aq-muted);font-size:.75rem;font-weight:500}
  .temperature-gauge{position:relative;display:grid;width:clamp(112px,16.5cqw,170px);aspect-ratio:1;align-self:center;flex:0 0 auto;place-items:center}.temperature-gauge-svg{display:block;width:100%;height:100%;overflow:visible}.temperature-gauge-track,.temperature-gauge-progress{fill:none;stroke-width:11;stroke-linecap:round}.temperature-gauge-track{stroke:var(--aq-gauge-track)}.temperature-gauge-progress{stroke:var(--aq-gauge-progress);filter:drop-shadow(0 0 6px rgba(24,200,243,.48));transition:stroke-dasharray var(--aq-motion)}.temperature-gauge-marker{fill:var(--aq-gauge-marker);filter:drop-shadow(0 0 4px var(--aq-gauge-marker));transition:cx var(--aq-motion),cy var(--aq-motion)}.temperature-gauge-droplet{color:var(--aq-gauge-progress)}.temperature-gauge-drop-edge{fill:none;stroke:var(--aq-gauge-highlight);stroke-width:1.35;stroke-opacity:.62}
  .equipment-section{margin-top:var(--aq-gap)}.equipment-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--aq-gap)}.equipment-tile{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;width:100%;min-width:0;gap:14px;padding:clamp(14px,2cqw,20px);overflow:hidden;border:1px solid var(--aq-border);border-radius:var(--aq-md);color:inherit;background:linear-gradient(145deg,rgba(8,36,51,.9),rgba(6,25,38,.78));font:inherit;text-align:left;cursor:pointer;transition:transform 120ms ease,border-color 180ms ease,background 180ms ease,box-shadow 180ms ease}.equipment-tile:hover:not(:disabled){border-color:rgba(55,190,222,.4)}.equipment-tile:active:not(:disabled){transform:scale(.985)}.equipment-tile:focus-visible{outline:2px solid var(--aq-blue);outline-offset:2px}.equipment-tile:disabled{cursor:default}.equipment-tile.active{border-color:rgba(67,230,108,.3);background:linear-gradient(145deg,rgba(9,48,55,.94),rgba(6,30,40,.82));box-shadow:inset 0 0 22px rgba(67,230,108,.035)}.equipment-tile.pending{opacity:.78}
  .equipment-icon{display:grid;width:clamp(48px,5.8cqw,62px);aspect-ratio:1;place-items:center;border:2px solid var(--aq-blue);border-radius:50%;color:var(--aq-blue);box-shadow:0 0 18px rgba(25,199,242,.13),inset 0 0 14px rgba(25,199,242,.08)}.equipment-icon ha-icon{width:27px;height:27px;--mdc-icon-size:27px}.equipment-copy{min-width:0}.equipment-name{color:#dcebf1;font-size:clamp(.92rem,1.7cqw,1.08rem);font-weight:600}.equipment-value{margin-top:4px;overflow-wrap:anywhere;color:#65daf3;font-size:.86rem}.available .equipment-value{color:var(--aq-green)}.pending .status-dot{border:2px solid rgba(101,218,243,.28);border-top-color:var(--aq-blue);background:transparent;box-shadow:none;animation:aq-spin .7s linear infinite}@keyframes aq-spin{to{transform:rotate(360deg)}}
  .measurement-section{margin-top:var(--aq-gap);overflow:hidden;border:1px solid var(--aq-border);border-radius:var(--aq-lg);background:rgba(5,24,36,.72)}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:rgba(62,176,207,.16)}.metric-tile{min-width:0;padding:clamp(17px,2.3cqw,24px);overflow:hidden;background:linear-gradient(145deg,rgba(8,36,51,.94),rgba(6,25,38,.88));--range-intensity:0;--range-opacity:.42;--current-position:50%}.metric-heading,.metric-label,.metric-reading-row,.metric-footer{display:flex;align-items:center;min-width:0}.metric-label{gap:9px}.metric-icon{width:23px;height:23px;flex:0 0 auto;color:var(--aq-blue);--mdc-icon-size:23px}.metric-name{color:#bcd4df;font-size:.9rem;font-weight:620;letter-spacing:.02em}.metric-reading-row{justify-content:space-between;gap:10px;margin-top:14px}.metric-reading{min-width:0;overflow-wrap:anywhere;font-size:clamp(1.85rem,3.8cqw,2.7rem);font-weight:590;letter-spacing:-.035em}.metric-quality-mark{display:grid;width:31px;height:31px;flex:0 0 auto;place-items:center;border:2px solid var(--aq-green);border-radius:50%;color:var(--aq-green);box-shadow:0 0 12px rgba(67,230,108,.14)}.metric-quality-mark ha-icon{width:18px;height:18px;--mdc-icon-size:18px}.quality-monitor .metric-quality-mark{border-color:var(--aq-yellow);color:var(--aq-yellow)}.quality-action_needed .metric-quality-mark{border-color:var(--aq-orange);color:var(--aq-orange)}.quality-alert .metric-quality-mark{border-color:var(--aq-red);color:var(--aq-red)}.unavailable .metric-quality-mark,.not-configured .metric-quality-mark{border-color:var(--aq-muted);color:var(--aq-muted);opacity:.55}.metric-meter{position:relative;height:8px;margin-top:16px;overflow:visible;border-radius:999px;color:var(--aq-muted);background:rgba(37,68,82,.5);isolation:isolate}.metric-meter::before{position:absolute;inset:0;z-index:0;border-radius:inherit;background:currentColor;opacity:var(--range-opacity,.4);content:""}.range-ideal .metric-meter{color:var(--aq-green);--range-opacity:.82}.range-low .metric-meter{color:var(--aq-blue)}.range-high .metric-meter{color:var(--aq-red)}.range-neutral .metric-meter{color:var(--aq-muted);--range-opacity:.28}.metric-value-marker{position:absolute;top:50%;left:clamp(4px,var(--current-position),calc(100% - 4px));z-index:2;width:2px;height:16px;border-radius:2px;background:#f4fbff;box-shadow:0 0 5px rgba(255,255,255,.8);transform:translate(-50%,-50%);transition:left var(--aq-motion)}.range-neutral .metric-value-marker{display:none}.metric-footer{justify-content:space-between;gap:8px;margin-top:10px}.metric-quality{min-width:0;color:var(--aq-muted);font-size:.7rem;overflow-wrap:anywhere}.metric-state{min-width:0;flex:0 0 auto;gap:5px}.quality-excellent .metric-quality{color:var(--aq-green)}.quality-monitor .metric-quality{color:var(--aq-yellow)}.quality-action_needed .metric-quality{color:var(--aq-orange)}.quality-alert .metric-quality{color:var(--aq-red)}
  @media(prefers-reduced-motion:reduce){.equipment-tile,.target-button,.temperature-gauge-progress,.temperature-gauge-marker{transition-duration:.01ms}.pending .status-dot{animation-duration:1.4s}}
  @container(max-width:760px){.hero-grid{grid-template-columns:minmax(0,1fr)}.hero-panel{min-height:205px}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @container(max-width:560px){ha-card{border-radius:22px}.header-availability{display:none}.status-panel,.temperature-panel{min-height:195px;padding:20px}.status-orb{width:92px}.temperature-gauge{width:116px}.equipment-grid{grid-template-columns:minmax(0,1fr)}}
  @container(max-width:390px){.status-panel,.temperature-panel{min-height:0}.status-orb{width:82px}.temperature-gauge{width:102px}.status-headline{font-size:2rem}.temperature-reading{font-size:3.1rem}.metric-grid{grid-template-columns:minmax(0,1fr)}.metric-state-text{display:none}}
`;


const METRICS = [
  ["ph", "pH", "mdi:water-outline"],
  ["orp", "ORP", "mdi:shield-check-outline"],
  ["ec", "EC", "mdi:pulse"],
  ["tds", "TDS", "mdi:dots-circle"],
];

const UI_TEXT = Object.freeze({
  brand: "Aquard",
  dashboard: "Water monitoring",
  waterTemperature: "Water Temperature",
  climateTarget: "Target temperature",
  equipmentStatus: "Equipment status",
  waterQualityMeasurements: "Water quality measurements",
  quality: "quality",
  rangeLow: "Below ideal range",
  rangeIdeal: "Within ideal range",
  rangeHigh: "Above ideal range",
  rangeNeutral: "Range unavailable",
  available: "Sensor available",
  power: "Power",
  filter: "Filter",
  bubbles: "Bubbles",
});

const WATER_STATUS_TEXT = Object.freeze({
  excellent: "EXCELLENT",
  monitor: "MONITOR",
  action_needed: "ACTION NEEDED",
  alert: "ALERT",
  unknown: "UNKNOWN",
});

const WATER_ACTION_TEXT = Object.freeze({
  excellent: "NO ACTION REQUIRED",
  monitor: "KEEP AN EYE ON IT",
  action_needed: "ACTION REQUIRED",
  alert: "ACTION REQUIRED NOW",
  unknown: "STATUS UNAVAILABLE",
});

const WATER_MESSAGE_TEXT = Object.freeze({
  enjoy_your_spa: "Enjoy your spa.",
  keep_monitoring: "Continue monitoring.",
  ph_slightly_below_ideal: "pH is slightly below ideal.",
  ph_slightly_above_ideal: "pH is slightly above ideal.",
  sanitizer_performance_declining: "Sanitizer performance appears to be declining.",
  tds_gradually_increasing: "TDS is gradually increasing.",
  raise_ph: "Raise the pH.",
  lower_ph: "Lower the pH.",
  raise_ph_before_use: "Raise the pH before use.",
  lower_ph_before_use: "Lower the pH before use.",
  restore_sanitizer: "Restore sanitizer.",
  verify_sanitizer_before_use: "Verify sanitizer before use.",
  correct_ph_before_use: "Correct the pH before use.",
  replace_water_soon: "Replace the water soon.",
  replace_water_before_use: "Verify or replace the water before use.",
  sensor_data_unavailable: "Sensor data unavailable.",
  maintenance_due: "Maintenance should be performed soon.",
  check_water_before_use: "Check water before use.",
});

const WATER_LINE_DECORATION = `
  <svg class="hero-water-line" viewBox="0 0 1200 260" preserveAspectRatio="none" aria-hidden="true">
    <path class="water-ribbon" d="M-30 178 C105 124 190 238 342 206 C506 171 570 126 718 169 C884 217 1010 222 1230 135 L1230 181 C1028 243 885 239 714 197 C555 158 467 220 325 237 C174 254 72 181 -30 209Z"/>
    <path class="water-ribbon water-ribbon-secondary" d="M-30 207 C118 152 240 247 394 217 C548 187 653 151 809 194 C955 234 1083 211 1230 162 L1230 194 C1070 238 934 254 793 220 C646 184 548 224 391 245 C226 267 101 196 -30 231Z"/>
    <path class="water-wave water-wave-primary" d="M-30 175 C108 119 194 232 344 201 C497 169 580 119 727 164 C887 214 1014 218 1230 132"/>
    <path class="water-wave" d="M-30 190 C116 139 218 239 371 208 C531 176 620 137 775 181 C925 224 1051 214 1230 151"/>
    <path class="water-wave water-line-secondary" d="M-30 212 C128 160 251 248 413 219 C566 191 670 158 824 198 C973 237 1095 211 1230 172"/>
    <path class="water-filament" d="M-30 224 C152 184 248 258 432 230 S723 190 888 223 S1087 224 1230 192"/>
    <g class="water-bubbles">
      <circle cx="28" cy="158" r="3"/><circle cx="42" cy="174" r="7"/><circle cx="67" cy="145" r="2"/>
      <circle cx="88" cy="190" r="4"/><circle cx="112" cy="161" r="6"/><circle cx="139" cy="184" r="2.5"/>
      <circle cx="171" cy="199" r="5"/><circle cx="205" cy="171" r="3"/><circle cx="238" cy="211" r="2"/>
      <circle cx="302" cy="181" r="2.5"/><circle cx="338" cy="160" r="5"/><circle cx="374" cy="189" r="3"/>
      <circle cx="421" cy="215" r="2"/><circle cx="475" cy="178" r="4"/><circle cx="532" cy="153" r="2.5"/>
      <circle cx="594" cy="182" r="5"/><circle cx="642" cy="143" r="3"/><circle cx="681" cy="166" r="2"/>
      <circle cx="733" cy="139" r="6"/><circle cx="762" cy="177" r="3"/><circle cx="806" cy="157" r="4"/>
      <circle cx="852" cy="192" r="2.5"/><circle cx="899" cy="169" r="5"/><circle cx="944" cy="201" r="3"/>
      <circle cx="995" cy="176" r="2"/><circle cx="1038" cy="190" r="6"/><circle cx="1081" cy="159" r="3"/>
      <circle cx="1124" cy="181" r="4"/><circle cx="1165" cy="145" r="2.5"/><circle cx="1192" cy="173" r="5"/>
    </g>
    <g class="water-sparkles">
      <circle cx="54" cy="205" r="1.5"/><circle cx="150" cy="151" r="1"/><circle cx="267" cy="191" r="1.5"/>
      <circle cx="391" cy="169" r="1"/><circle cx="514" cy="204" r="1.5"/><circle cx="706" cy="191" r="1"/>
      <circle cx="838" cy="145" r="1.5"/><circle cx="972" cy="183" r="1"/><circle cx="1108" cy="211" r="1.5"/>
    </g>
  </svg>`;

export class AquardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._pendingControls = new Set();
    this._pendingTarget = null;
  }

  setConfig(config) {
    this._config = normalizeConfig(config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._reconcilePendingTarget();
    this._render();
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return {
      columns: 12,
      min_columns: 6,
    };
  }

  _render() {
    if (!this._config || !this.shadowRoot) return;

    const entities = this._config.entities;
    const temperature = readEntity(this._hass, entities.water_temperature, { numeric: true });
    const power = readSwitch(this._hass, entities.power);
    const waterQuality = evaluateSpaWaterQuality({
      ph: this._hass?.states?.[entities.ph]?.state,
      orp: this._hass?.states?.[entities.orp]?.state,
      ec: this._hass?.states?.[entities.ec]?.state,
      tds: this._hass?.states?.[entities.tds]?.state,
    });
    const controls = [
      [UI_TEXT.power, power, "power", entities.power, false],
      [UI_TEXT.filter, readSwitch(this._hass, entities.filter), "filter", entities.filter, false],
      [UI_TEXT.bubbles, readEntity(this._hass, entities.bubbles), "bubbles", entities.bubbles, true],
    ];
    const targetControl = resolveTargetTemperature(this._hass, entities.climate);
    const displayedTarget = this._pendingTarget && this._pendingTarget.entityId === targetControl?.entityId
      ? this._pendingTarget.value
      : targetControl?.target;
    const displayControl = targetControl ? { ...targetControl, target: displayedTarget } : undefined;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <header class="aquard-header">
          <div class="brand-lockup">
            <div><div class="brand-name"></div><div class="brand-context"></div></div>
            <span class="brand-mark" aria-hidden="true"><ha-icon icon="mdi:waves"></ha-icon></span>
          </div>
          <div class="header-availability ${temperature.availabilityClass}"><span class="status-dot"></span><span class="header-availability-text"></span></div>
        </header>
        <main>
          <div class="hero-grid">
            ${WATER_LINE_DECORATION}
            <section class="hero-panel status-panel status-${waterQuality.status}">
              <div class="status-orb">${renderStatusIndicator(waterQuality.status)}</div>
              <div class="hero-copy"><div class="status-headline"></div></div>
              <div class="status-summary"><div class="status-action"></div><div class="status-support"><span class="status-dot"></span><span class="status-support-text"></span></div></div>
            </section>
            <section class="hero-panel temperature-panel ${temperature.availabilityClass}">
              <div class="temperature-copy"><div class="section-label temperature-label"></div><div class="temperature-reading"><span class="temperature-value"><span class="temperature-whole"></span><span class="temperature-decimal"></span></span><span class="temperature-unit"></span></div>${displayControl ? this._renderTargetControl(displayControl) : ""}</div>
              <div class="temperature-gauge">${renderTemperatureGauge(temperature.stateObj?.state)}</div>
            </section>
          </div>
          <section class="measurement-section" aria-label="${UI_TEXT.waterQualityMeasurements}"><div class="metric-grid"></div></section>
          <section class="equipment-section" aria-label="${UI_TEXT.equipmentStatus}"><div class="equipment-grid"></div></section>
        </main>
      </ha-card>
    `;

    this._setText(".brand-name", this._config.name || UI_TEXT.brand);
    this._setText(".brand-context", UI_TEXT.dashboard);
    this._setText(".header-availability-text", temperature.availabilityClass === "available" ? UI_TEXT.available : temperature.availability);
    this._setText(".status-headline", WATER_STATUS_TEXT[waterQuality.status]);
    this._setText(".status-action", WATER_ACTION_TEXT[waterQuality.status]);
    this._setText(".status-support-text", WATER_MESSAGE_TEXT[waterQuality.messageKey]);
    this._setText(".temperature-label", UI_TEXT.waterTemperature);
    this._setTemperature(temperature.value);
    this._setText(".temperature-unit", temperature.unit);
    if (displayControl) {
      const decreaseButton = this.shadowRoot.querySelector('[data-target-direction="-1"]');
      const increaseButton = this.shadowRoot.querySelector('[data-target-direction="1"]');
      decreaseButton.addEventListener("click", () => this._adjustTargetTemperature(-1));
      increaseButton.addEventListener("click", () => this._adjustTargetTemperature(1));
    }

    const equipmentGrid = this.shadowRoot.querySelector(".equipment-grid");
    for (const control of controls) equipmentGrid.append(this._createEquipmentTile(...control));

    const metricGrid = this.shadowRoot.querySelector(".metric-grid");
    for (const [key, label, icon] of METRICS) {
      metricGrid.append(this._createMetric(
        label,
        icon,
        readEntity(this._hass, entities[key], { numeric: true }),
        waterQuality.measurements[key],
      ));
    }
  }

  _createEquipmentTile(label, reading, icon, entityId, allowSelect) {
    const stateObj = entityId ? this._hass?.states?.[entityId] : undefined;
    const action = getControlAction(entityId, stateObj, allowSelect);
    const active = isControlActive(stateObj);
    const pending = this._pendingControls.has(entityId);
    const row = document.createElement("button");
    row.type = "button";
    row.className = `equipment-tile ${reading.availabilityClass}${active ? " active" : ""}${pending ? " pending" : ""}`;
    row.disabled = !action || pending;
    row.setAttribute("aria-pressed", String(active));
    row.setAttribute("aria-busy", String(pending));
    row.innerHTML = `<div class="equipment-icon equipment-icon-${icon}" aria-hidden="true"><ha-icon icon="mdi:power"></ha-icon></div><div class="equipment-copy"><div class="equipment-name"></div><div class="equipment-value"></div></div><span class="status-dot"></span>`;
    row.querySelector(".equipment-name").textContent = label;
    row.querySelector(".equipment-value").textContent = reading.availabilityClass === "available" ? titleCase(reading.value) : reading.value;
    row.setAttribute("aria-label", `${label}: ${row.querySelector(".equipment-value").textContent}`);
    row.addEventListener("click", () => this._activateControl(entityId, allowSelect));
    return row;
  }

  async _activateControl(entityId, allowSelect) {
    if (this._pendingControls.has(entityId)) return;
    const action = getControlAction(entityId, this._hass?.states?.[entityId], allowSelect);
    if (!action || typeof this._hass?.callService !== "function") return;

    this._pendingControls.add(entityId);
    this._render();
    try {
      await this._hass.callService(action.domain, action.service, action.data);
    } catch (error) {
      console.error(`Aquard could not control ${entityId}`, error);
    } finally {
      this._pendingControls.delete(entityId);
      this._render();
    }
  }

  _renderTargetControl(control) {
    const formatted = formatTargetTemperature(control.target, control.unit, control.step);
    const pendingDirection = this._pendingTarget?.direction;
    const decreaseDisabled = !getTargetTemperatureAdjustment(control, -1) || Boolean(this._pendingTarget);
    const increaseDisabled = !getTargetTemperatureAdjustment(control, 1) || Boolean(this._pendingTarget);
    return `<div class="target-control"><div class="target-label">${UI_TEXT.climateTarget}</div><div class="target-control-row">
      <button class="target-button${pendingDirection === -1 ? " pending" : ""}" data-target-direction="-1" aria-label="Decrease target temperature" ${decreaseDisabled ? "disabled" : ""}>${renderTargetArrow("decrease")}</button>
      <div class="target-display"><span class="target-number">${formatted.value}</span><span class="target-unit">${formatted.unit}</span></div>
      <button class="target-button${pendingDirection === 1 ? " pending" : ""}" data-target-direction="1" aria-label="Increase target temperature" ${increaseDisabled ? "disabled" : ""}>${renderTargetArrow("increase")}</button>
    </div></div>`;
  }

  async _adjustTargetTemperature(direction) {
    if (this._pendingTarget) return;
    const entityId = this._config?.entities?.climate;
    const control = resolveTargetTemperature(this._hass, entityId);
    const adjustment = getTargetTemperatureAdjustment(control, direction);
    if (!adjustment || typeof this._hass?.callService !== "function") return;
    this._pendingTarget = { entityId, value: adjustment.temperature, direction };
    this._render();
    try {
      await this._hass.callService(adjustment.domain, adjustment.service, adjustment.data);
    } catch (error) {
      console.error(`Aquard could not set target temperature for ${entityId}`, error);
      this._pendingTarget = null;
      this._render();
    }
  }

  _reconcilePendingTarget() {
    if (!this._pendingTarget) return;
    const control = resolveTargetTemperature(this._hass, this._pendingTarget.entityId);
    if (!control || Math.abs(control.target - this._pendingTarget.value) < 0.000001) this._pendingTarget = null;
  }

  _createMetric(label, icon, reading, evaluation) {
    const tile = document.createElement("article");
    const qualityClass = evaluation?.severity ?? reading.availabilityClass;
    const rangeDirection = evaluation?.range?.direction ?? "neutral";
    const rangeText = UI_TEXT[`range${titleCase(rangeDirection)}`];
    tile.className = `metric-tile ${reading.availabilityClass} quality-${qualityClass} range-${rangeDirection}`;
    tile.innerHTML = `<div class="metric-heading"><span class="metric-label"><ha-icon class="metric-icon" aria-hidden="true"></ha-icon><span class="metric-name"></span></span></div><div class="metric-reading-row"><div class="metric-reading"><span class="metric-value"></span><span class="metric-unit"></span></div><span class="metric-quality-mark" aria-hidden="true"><ha-icon icon="mdi:check"></ha-icon></span></div><div class="metric-meter" role="img"><span class="metric-value-marker"></span></div><div class="metric-footer"><div class="metric-quality"></div><span class="metric-state"><span class="status-dot"></span><span class="metric-state-text"></span></span></div>`;
    tile.querySelector(".metric-icon").setAttribute("icon", icon);
    tile.querySelector(".metric-name").textContent = label;
    tile.querySelector(".metric-value").textContent = reading.value;
    tile.querySelector(".metric-unit").textContent = reading.unit;
    tile.querySelector(".metric-state-text").textContent = reading.availability;
    const qualityText = evaluation?.score === null || evaluation?.score === undefined
      ? reading.availability
      : `${evaluation.score}% ${UI_TEXT.quality}`;
    tile.querySelector(".metric-quality").textContent = evaluation ? `${qualityText} · ${rangeText}` : qualityText;
    tile.querySelector(".metric-meter").setAttribute("aria-label", `${label}: ${rangeText}`);
    if (evaluation?.range) {
      tile.style.setProperty("--range-intensity", evaluation.range.intensity);
      tile.style.setProperty("--range-opacity", 0.42 + (evaluation.range.intensity * 0.55));
      tile.style.setProperty("--current-position", `${evaluation.range.currentPosition}%`);
    }
    const qualityIcon = evaluation?.severity === "alert" || evaluation?.severity === "action_needed" ? "mdi:exclamation" : evaluation?.severity === "monitor" ? "mdi:eye-outline" : "mdi:check";
    tile.querySelector(".metric-quality-mark ha-icon").setAttribute("icon", qualityIcon);
    return tile;
  }

  _setTemperature(value) {
    const match = String(value).match(/^(-?\d+)([.,]\d+)$/);
    this._setText(".temperature-whole", match ? match[1] : value);
    this._setText(".temperature-decimal", match ? match[2] : "");
  }

  _setText(selector, value) {
    this.shadowRoot.querySelector(selector).textContent = value;
  }
}

if (!customElements.get("aquard-card")) {
  customElements.define("aquard-card", AquardCard);
}

// Deprecated compatibility alias for pre-release PureSpa Card configurations.
if (!customElements.get("purespa-card")) {
  customElements.define("purespa-card", class extends AquardCard {});
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "aquard-card")) {
  window.customCards.push({
    type: "aquard-card",
    name: "Aquard",
    description: "A modern water monitoring dashboard card for Home Assistant.",
  });
}
