import { formatTargetTemperature, getControlAction, getTargetTemperatureAdjustment, isControlActive, normalizeConfig, readEntity, readSwitch, resolveTargetTemperature, titleCase } from "./helpers.js";
import { evaluateSpaWaterQuality } from "./water-quality.js";
import { renderTemperatureGauge } from "./components/temperature-gauge.js";
import { renderStatusIndicator } from "./components/status-indicator.js";
import { renderTargetArrow } from "./components/target-temperature-control.js";
import { styles } from "./styles.js";

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
      [UI_TEXT.power, power, "power", entities.power, false, false],
      [UI_TEXT.filter, readSwitch(this._hass, entities.filter), "filter", entities.filter, false, false],
      [UI_TEXT.heater, readEntity(this._hass, entities.heater), "heater", entities.heater, false, true],
      [UI_TEXT.bubbles, readEntity(this._hass, entities.bubbles), "bubbles", entities.bubbles, true, false],
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

  _createEquipmentTile(label, reading, icon, entityId, allowSelect, allowClimate) {
    const stateObj = entityId ? this._hass?.states?.[entityId] : undefined;
    const action = getControlAction(entityId, stateObj, allowSelect, allowClimate);
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
    row.addEventListener("click", () => this._activateControl(entityId, allowSelect, allowClimate));
    return row;
  }

  async _activateControl(entityId, allowSelect, allowClimate = false) {
    if (this._pendingControls.has(entityId)) return;
    const action = getControlAction(entityId, this._hass?.states?.[entityId], allowSelect, allowClimate);
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
