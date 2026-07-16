// PureSpa Card - generated file, do not edit directly.

const UNAVAILABLE_STATES = new Set(["unknown", "unavailable"]);

function normalizeConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error("PureSpa Card requires a configuration object");
  }

  if (config.entities !== undefined) {
    if (!config.entities || typeof config.entities !== "object" || Array.isArray(config.entities)) {
      throw new Error("PureSpa Card entities must be a YAML mapping");
    }

    return { name: config.name || "PureSpa", entities: { ...config.entities } };
  }

  if (typeof config.entity === "string" && config.entity.trim()) {
    return {
      name: config.name || "PureSpa",
      entities: { water_temperature: config.entity },
    };
  }

  throw new Error("PureSpa Card requires an entities mapping");
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

  return { ...result, value: `${state} · ${targetText}`, unit: "" };
}

function titleCase(value) {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

const styles = `
  :host {
    display: block;
    min-width: 0;
    --spa-surface: rgba(20, 31, 41, 0.88);
    --spa-surface-raised: rgba(31, 46, 58, 0.92);
    --spa-border: rgba(255, 255, 255, 0.09);
    --spa-muted: #91a4b4;
    --spa-text: #f4f8fa;
    --spa-accent: #53d5cf;
  }

  * {
    box-sizing: border-box;
  }

  ha-card {
    min-width: 0;
    overflow: hidden;
    padding: clamp(16px, 3vw, 28px);
    border: 1px solid var(--spa-border);
    border-radius: 28px;
    color: var(--spa-text);
    background:
      radial-gradient(circle at 90% 0%, rgba(54, 165, 174, 0.2), transparent 35%),
      linear-gradient(145deg, #101c25, #091219 75%);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    margin-bottom: 22px;
    gap: 20px;
  }

  .eyebrow,
  .section-title,
  .metric-name,
  .control-name {
    color: var(--spa-muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h2 {
    overflow-wrap: anywhere;
    margin: 4px 0 8px;
    font-size: clamp(1.5rem, 4vw, 2.25rem);
    line-height: 1.05;
  }

  .general-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #c2d0d9;
    font-size: 0.85rem;
  }

  .header-temperature {
    flex: 0 0 auto;
    text-align: right;
  }

  .header-temperature .reading {
    font-size: clamp(1.7rem, 5vw, 2.7rem);
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.6fr);
    gap: 16px;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .metric,
  .panel {
    min-width: 0;
    border: 1px solid var(--spa-border);
    border-radius: 20px;
    background: var(--spa-surface);
  }

  .metric {
    padding: 18px;
  }

  .reading {
    min-width: 0;
    margin: 11px 0 14px;
    overflow-wrap: anywhere;
    font-size: clamp(1.45rem, 4vw, 2.1rem);
    font-weight: 650;
    line-height: 1.1;
  }

  .unit {
    margin-left: 0.25em;
    color: var(--spa-muted);
    font-size: 0.55em;
    font-weight: 500;
  }

  .availability {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--spa-muted);
    font-size: 0.76rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #687985;
  }

  .available .dot {
    background: var(--spa-accent);
    box-shadow: 0 0 10px rgba(83, 213, 207, 0.7);
  }

  .unavailable .dot {
    background: #e69a72;
  }

  .side-column {
    display: grid;
    align-content: start;
    gap: 16px;
    min-width: 0;
  }

  .panel {
    padding: 20px;
  }

  .temperature-panel {
    background: linear-gradient(145deg, rgba(35, 79, 88, 0.75), var(--spa-surface-raised));
  }

  .control-list {
    margin-top: 10px;
  }

  .control-row {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 12px 0;
    border-bottom: 1px solid var(--spa-border);
  }

  .control-row:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .control-value {
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: right;
    font-size: 0.9rem;
    font-weight: 600;
  }

  @media (max-width: 620px) {
    ha-card {
      border-radius: 22px;
    }

    .header {
      align-items: flex-start;
    }

    .dashboard-grid,
    .metric-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .header-temperature {
      max-width: 45%;
    }
  }

  @media (max-width: 390px) {
    .header {
      flex-direction: column;
    }

    .header-temperature {
      max-width: none;
      text-align: left;
    }
  }
`;


const METRICS = [
  ["ph", "pH"],
  ["orp", "ORP"],
  ["ec", "EC"],
  ["tds", "TDS"],
];

class PureSpaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = normalizeConfig(config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 6;
  }

  _render() {
    if (!this._config || !this.shadowRoot) return;

    const entities = this._config.entities;
    const temperature = readEntity(this._hass, entities.water_temperature, { numeric: true });
    const power = readSwitch(this._hass, entities.power);
    const controls = {
      power,
      filter: readSwitch(this._hass, entities.filter),
      bubbles: readEntity(this._hass, entities.bubbles),
      climate: readClimate(this._hass, entities.climate),
    };

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <header class="header">
          <div>
            <div class="eyebrow">Spa dashboard</div>
            <h2 data-field="name"></h2>
            <div class="general-status"><span class="dot"></span><span data-field="general-status"></span></div>
          </div>
          <div class="header-temperature">
            <div class="eyebrow">Water now</div>
            <div class="reading"><span data-field="header-temperature"></span><span class="unit" data-field="header-temperature-unit"></span></div>
          </div>
        </header>
        <div class="dashboard-grid">
          <section class="metric-grid" aria-label="Water quality"></section>
          <div class="side-column">
            <section class="panel temperature-panel">
              <div class="section-title">Water temperature</div>
              <div class="reading"><span data-field="water-temperature"></span><span class="unit" data-field="water-temperature-unit"></span></div>
              <div class="availability"><span class="dot"></span><span data-field="water-temperature-availability"></span></div>
            </section>
            <section class="panel">
              <div class="section-title">Equipment status</div>
              <div class="control-list"></div>
            </section>
          </div>
        </div>
      </ha-card>
    `;

    this._setText("name", this._config.name);
    this._setReading("header-temperature", temperature);
    this._setReading("water-temperature", temperature);
    this._setAvailability("water-temperature", temperature);

    const generalStatus = power.availabilityClass === "available"
      ? `Spa ${power.value}`
      : power.availabilityClass === "not-configured" ? "Status unavailable" : "Spa unavailable";
    this._setText("general-status", generalStatus);
    this.shadowRoot.querySelector(".general-status").classList.add(power.availabilityClass);

    const metricGrid = this.shadowRoot.querySelector(".metric-grid");
    for (const [key, label] of METRICS) {
      metricGrid.append(this._createMetric(label, readEntity(this._hass, entities[key], { numeric: true })));
    }

    const controlList = this.shadowRoot.querySelector(".control-list");
    for (const [key, label] of [["power", "Spa power"], ["filter", "Filter"], ["bubbles", "Bubbles"], ["climate", "Climate"]]) {
      controlList.append(this._createControl(label, controls[key]));
    }
  }

  _createMetric(label, reading) {
    const tile = document.createElement("article");
    tile.className = `metric ${reading.availabilityClass}`;
    tile.innerHTML = `
      <div class="metric-name"></div>
      <div class="reading"><span class="metric-value"></span><span class="unit"></span></div>
      <div class="availability"><span class="dot"></span><span class="availability-text"></span></div>
    `;
    tile.querySelector(".metric-name").textContent = label;
    tile.querySelector(".metric-value").textContent = reading.value;
    tile.querySelector(".unit").textContent = reading.unit;
    tile.querySelector(".availability-text").textContent = reading.availability;
    return tile;
  }

  _createControl(label, reading) {
    const row = document.createElement("div");
    row.className = "control-row";
    row.innerHTML = `<div class="control-name"></div><div class="control-value"></div>`;
    row.querySelector(".control-name").textContent = label;
    row.querySelector(".control-value").textContent = reading.availabilityClass === "available"
      ? titleCase(reading.value)
      : reading.value;
    return row;
  }

  _setReading(field, reading) {
    this._setText(field, reading.value);
    this._setText(`${field}-unit`, reading.unit);
  }

  _setAvailability(field, reading) {
    const element = this.shadowRoot.querySelector(`[data-field="${field}-availability"]`);
    element.textContent = reading.availability;
    element.parentElement.classList.add(reading.availabilityClass);
  }

  _setText(field, value) {
    this.shadowRoot.querySelector(`[data-field="${field}"]`).textContent = value;
  }
}

if (!customElements.get("purespa-card")) {
  customElements.define("purespa-card", PureSpaCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "purespa-card")) {
  window.customCards.push({
    type: "purespa-card",
    name: "PureSpa Card",
    description: "A modern spa dashboard card for Home Assistant.",
  });
}
