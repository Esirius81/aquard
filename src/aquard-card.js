import { formatTargetTemperature, getControlAction, getTargetTemperatureAdjustment, isControlActive, readCurrentTemperature, readEntity, readSwitch, resolveTargetTemperature, titleCase } from "./helpers.js";
import { evaluateSpaWaterQuality } from "./water-quality.js";
import { renderTargetArrow } from "./components/target-temperature-control.js";
import { normalizeAquardConfig } from "./config/config-normalizer.js";
import { getComponentMode, isComponentVisible, shouldShowSensorInformation } from "./config/component-config.js";
import { renderWaterStatus } from "./components/water-status.js";
import { renderTemperature } from "./components/temperature.js";
import { renderActions } from "./components/actions.js";
import { renderMeasurements } from "./components/measurements.js";
import { renderControls } from "./components/controls.js";
import { renderDetails } from "./components/details.js";
import { styles } from "./styles.js";
import "./editor/aquard-card-editor.js";
import { hasMeaningfulEntities } from "./editor/editor-helpers.js";
import { PendingStateStore, numericValuesEqual } from "./pending-state.js";

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
  heater: "Heater",
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

const TARGET_DEBOUNCE_MS = 400;

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
  static getConfigElement() {
    return document.createElement("aquard-card-editor");
  }

  static getStubConfig() {
    return {
      profile: "spa",
      entities: {},
      components: {
        water_status: "full",
        temperature: "full",
        actions: "full",
        measurements: "full",
        controls: "full",
        details: "full",
      },
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._pendingState = new PendingStateStore({ onChange: () => this._render() });
    this._targetDebounceTimer = null;
  }

  setConfig(config) {
    this._config = normalizeAquardConfig(config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._reconcilePendingState();
    this._render();
  }

  getCardSize() {
    if (!this._config) return 1;
    const weights = { water_status: [2, 1], temperature: [2, 1], actions: [1, 1], measurements: [2, 1], controls: [1, 1], details: [1, 1] };
    return Math.max(1, Object.entries(weights).reduce((size, [componentId, [full, compact]]) => {
      const mode = getComponentMode(this._config, componentId);
      return size + (mode === "full" ? full : mode === "compact" ? compact : 0);
    }, 0));
  }

  getGridOptions() {
    return {
      columns: 12,
      min_columns: 6,
    };
  }

  _render() {
    if (!this._config || !this.shadowRoot) return;

    if (!hasMeaningfulEntities(this._config)) {
      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <ha-card class="setup-card">
          <div class="setup-state" role="status">
            <ha-icon icon="mdi:water-cog-outline" aria-hidden="true"></ha-icon>
            <div><h2>Aquard setup</h2><p>Select your Spa entities in the card configuration to begin.</p></div>
          </div>
        </ha-card>`;
      return;
    }

    const entities = this._config.entities;
    const hasTemperatureSource = Boolean(entities.water_temperature || entities.climate);
    const temperature = readCurrentTemperature(this._hass, entities);
    const power = readSwitch(this._hass, entities.power);
    const configuredMeasurements = Object.fromEntries(METRICS
      .filter(([key]) => Boolean(entities[key]))
      .map(([key]) => [key, this._hass?.states?.[entities[key]]?.state]));
    const waterQuality = evaluateSpaWaterQuality(configuredMeasurements);
    const controls = [
      [UI_TEXT.power, power, "power", entities.power, false, false],
      [UI_TEXT.filter, readSwitch(this._hass, entities.filter), "filter", entities.filter, false, false],
      [UI_TEXT.heater, readEntity(this._hass, entities.heater), "heater", entities.heater, false, true],
      [UI_TEXT.bubbles, readEntity(this._hass, entities.bubbles), "bubbles", entities.bubbles, true, false],
    ];
    const targetControl = resolveTargetTemperature(this._hass, entities.climate);
    const displayedTarget = targetControl ? this._pendingState.resolve(this._targetPendingKey(targetControl.entityId), targetControl.target) : undefined;
    const displayControl = targetControl ? { ...targetControl, target: displayedTarget } : undefined;
    const modes = Object.fromEntries(["water_status", "temperature", "actions", "measurements", "controls", "details"].map((id) => [id, getComponentMode(this._config, id)]));
    const waterVisible = isComponentVisible(this._config, "water_status");
    const hasMeasurements = METRICS.some(([key]) => Boolean(entities[key]));
    const hasWaterStatus = hasMeasurements && waterQuality.score !== null;
    const hasControls = controls.some((control) => Boolean(control[3]));
    const actionsMarkup = renderActions({ mode: modes.actions, hasStatus: hasWaterStatus, standalone: !waterVisible });
    const waterStatusMarkup = hasWaterStatus ? renderWaterStatus({ status: waterQuality.status, mode: modes.water_status, actions: waterVisible ? actionsMarkup : "" }) : "";
    const temperatureMarkup = renderTemperature({ mode: modes.temperature, reading: temperature, configured: hasTemperatureSource, targetControl: displayControl ? this._renderTargetControl(displayControl) : "" });
    const heroMarkup = waterStatusMarkup || temperatureMarkup || (!waterVisible ? actionsMarkup : "")
      ? `<div class="hero-grid${waterStatusMarkup && temperatureMarkup ? "" : " hero-grid--focused"}">${(waterStatusMarkup || temperatureMarkup) ? WATER_LINE_DECORATION : ""}${waterStatusMarkup}${temperatureMarkup}${!waterVisible ? actionsMarkup : ""}</div>`
      : "";

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
          ${renderDetails({ mode: modes.details, name: this._config.name, availabilityClass: temperature.availabilityClass, showAvailability: hasTemperatureSource })}
        <main>
          ${heroMarkup}
          ${renderMeasurements({ mode: modes.measurements, hasMeasurements: hasMeasurements && shouldShowSensorInformation(this._config) })}
          ${renderControls({ mode: modes.controls, hasControls })}
        </main>
      </ha-card>
    `;

    this._setText(".brand-name", this._config.name || UI_TEXT.brand);
    this._setText(".brand-context", UI_TEXT.dashboard);
    this._setText(".header-availability-text", temperature.availabilityClass === "available" ? UI_TEXT.available : temperature.availability);
    this._setText(".status-headline", WATER_STATUS_TEXT[waterQuality.status]);
    this._setText(".status-score", waterQuality.score === null ? "" : `${waterQuality.score}% ${UI_TEXT.quality}`);
    this._setText(".status-action", WATER_ACTION_TEXT[waterQuality.status]);
    this._setText(".status-support-text", WATER_MESSAGE_TEXT[waterQuality.messageKey]);
    this._setText(".temperature-label", UI_TEXT.waterTemperature);
    this._setTemperature(temperature.value);
    this._setText(".temperature-unit", temperature.unit);
    if (displayControl && temperatureMarkup) {
      const decreaseButton = this.shadowRoot.querySelector('[data-target-direction="-1"]');
      const increaseButton = this.shadowRoot.querySelector('[data-target-direction="1"]');
      decreaseButton.addEventListener("click", () => this._adjustTargetTemperature(-1));
      increaseButton.addEventListener("click", () => this._adjustTargetTemperature(1));
    }

    const equipmentGrid = this.shadowRoot.querySelector(".equipment-grid");
    if (equipmentGrid) for (const control of controls) if (control[3]) equipmentGrid.append(this._createEquipmentTile(...control));
    if (equipmentGrid) equipmentGrid.dataset.count = String(equipmentGrid.childElementCount);

    const metricGrid = this.shadowRoot.querySelector(".metric-grid");
    if (metricGrid) for (const [key, label, icon] of METRICS) {
      if (!entities[key]) continue;
      metricGrid.append(this._createMetric(
        label,
        icon,
        readEntity(this._hass, entities[key], { numeric: true }),
        waterQuality.measurements[key],
      ));
    }
    if (metricGrid) metricGrid.dataset.count = String(metricGrid.childElementCount);
  }

  _createEquipmentTile(label, reading, icon, entityId, allowSelect, allowClimate) {
    const confirmedStateObj = entityId ? this._hass?.states?.[entityId] : undefined;
    const pending = this._pendingState.get(entityId);
    const displayedStateObj = pending && reading.availabilityClass === "available" && confirmedStateObj
      ? { ...confirmedStateObj, state: pending.value }
      : confirmedStateObj;
    const action = getControlAction(entityId, displayedStateObj, allowSelect, allowClimate);
    const active = isControlActive(displayedStateObj);
    const row = document.createElement("button");
    row.type = "button";
    row.className = `equipment-tile ${reading.availabilityClass}${active ? " active" : ""}`;
    row.disabled = !action;
    row.setAttribute("aria-pressed", String(active));
    row.innerHTML = `<div class="equipment-icon equipment-icon-${icon}" aria-hidden="true"><ha-icon icon="mdi:power"></ha-icon></div><div class="equipment-copy"><div class="equipment-name"></div><div class="equipment-value"></div></div><span class="status-dot"></span>`;
    row.querySelector(".equipment-name").textContent = label;
    row.querySelector(".equipment-value").textContent = reading.availabilityClass === "available" ? titleCase(displayedStateObj?.state ?? reading.value) : reading.value;
    row.setAttribute("aria-label", `${label}: ${row.querySelector(".equipment-value").textContent}`);
    row.addEventListener("click", () => this._activateControl(entityId, allowSelect, allowClimate));
    return row;
  }

  async _activateControl(entityId, allowSelect, allowClimate = false) {
    const confirmedStateObj = this._hass?.states?.[entityId];
    const pending = this._pendingState.get(entityId);
    const displayedStateObj = pending && confirmedStateObj ? { ...confirmedStateObj, state: pending.value } : confirmedStateObj;
    const action = getControlAction(entityId, displayedStateObj, allowSelect, allowClimate);
    if (!action || typeof this._hass?.callService !== "function") return;
    if (pending?.value === action.requestedValue) return;
    const request = this._pendingState.set(entityId, action.requestedValue);
    try {
      await this._hass.callService(action.domain, action.service, action.data);
    } catch (error) {
      console.error(`Aquard could not control ${entityId}`, error);
      this._pendingState.clear(entityId, true, request);
    }
  }

  _renderTargetControl(control) {
    const formatted = formatTargetTemperature(control.target, control.unit, control.step);
    const decreaseDisabled = !getTargetTemperatureAdjustment(control, -1);
    const increaseDisabled = !getTargetTemperatureAdjustment(control, 1);
    return `<div class="target-control"><div class="target-label">${UI_TEXT.climateTarget}</div><div class="target-control-row">
      <button class="target-button" data-target-direction="-1" aria-label="Decrease target temperature" ${decreaseDisabled ? "disabled" : ""}>${renderTargetArrow("decrease")}</button>
      <div class="target-display"><span class="target-number">${formatted.value}</span><span class="target-unit">${formatted.unit}</span></div>
      <button class="target-button" data-target-direction="1" aria-label="Increase target temperature" ${increaseDisabled ? "disabled" : ""}>${renderTargetArrow("increase")}</button>
    </div></div>`;
  }

  _adjustTargetTemperature(direction) {
    const entityId = this._config?.entities?.climate;
    const control = resolveTargetTemperature(this._hass, entityId);
    if (!control || typeof this._hass?.callService !== "function") return;
    const key = this._targetPendingKey(entityId);
    const localControl = { ...control, target: this._pendingState.resolve(key, control.target) };
    const adjustment = getTargetTemperatureAdjustment(localControl, direction);
    if (!adjustment) return;

    this._pendingState.set(key, adjustment.temperature, {
      equals: (actual, requested) => numericValuesEqual(actual, requested, Math.max(0.000001, control.step / 1000)),
      metadata: { entityId, direction, phase: "debounce" },
    });

    clearTimeout(this._targetDebounceTimer);
    this._targetDebounceTimer = setTimeout(() => this._flushTargetTemperature(), TARGET_DEBOUNCE_MS);
  }

  async _flushTargetTemperature() {
    clearTimeout(this._targetDebounceTimer);
    this._targetDebounceTimer = null;
    const entityId = this._config?.entities?.climate;
    const key = this._targetPendingKey(entityId);
    const request = this._pendingState.get(key);
    if (!request || request.metadata?.phase !== "debounce" || typeof this._hass?.callService !== "function") return;
    request.metadata.phase = "confirming";
    this._render();
    try {
      await this._hass.callService("climate", "set_temperature", {
        entity_id: entityId,
        temperature: request.value,
      });
    } catch (error) {
      console.error(`Aquard could not set target temperature for ${entityId}`, error);
      this._pendingState.clear(key, true, request);
    }
  }

  _reconcilePendingState() {
    for (const [entityId, stateObj] of Object.entries(this._hass?.states ?? {})) this._pendingState.reconcile(entityId, stateObj.state);
    const entityId = this._config?.entities?.climate;
    const target = resolveTargetTemperature(this._hass, entityId);
    if (target) this._pendingState.reconcile(this._targetPendingKey(entityId), target.target);
  }

  _targetPendingKey(entityId) {
    return `target:${entityId}`;
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
    const element = this.shadowRoot.querySelector(selector);
    if (element) element.textContent = value ?? "";
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
    description: "Premium water monitoring and control for spas and future water profiles.",
    preview: true,
  });
}
