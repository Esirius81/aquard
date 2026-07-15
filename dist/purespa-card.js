// PureSpa Card - generated file, do not edit directly.

function formatEntityState(stateObj) {
  if (!stateObj) {
    return { state: "Not found", unit: "" };
  }

  const state = stateObj.state;
  if (state === "unknown" || state === "unavailable") {
    return { state: state[0].toUpperCase() + state.slice(1), unit: "" };
  }

  return {
    state,
    unit: stateObj.attributes?.unit_of_measurement ?? "",
  };
}

const styles = `
  :host {
    display: block;
  }

  ha-card {
    padding: 20px;
    color: var(--primary-text-color);
    background: var(--ha-card-background, var(--card-background-color));
  }

  .label {
    margin-bottom: 8px;
    color: var(--secondary-text-color);
    font-size: 0.875rem;
  }

  .value {
    font-size: 2rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .unit {
    margin-left: 0.25em;
    color: var(--secondary-text-color);
    font-size: 0.55em;
    font-weight: 400;
  }
`;


class PureSpaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    if (!config?.entity || typeof config.entity !== "string") {
      throw new Error("PureSpa Card requires an entity configuration value");
    }

    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 2;
  }

  _render() {
    if (!this._config || !this.shadowRoot) return;

    const entityId = this._config.entity;
    const stateObj = this._hass?.states?.[entityId];
    const { state, unit } = formatEntityState(stateObj);
    const label = this._config.name ?? stateObj?.attributes?.friendly_name ?? entityId;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <div class="label"></div>
        <div class="value"><span class="state"></span><span class="unit"></span></div>
      </ha-card>
    `;

    this.shadowRoot.querySelector(".label").textContent = label;
    this.shadowRoot.querySelector(".state").textContent = state;
    this.shadowRoot.querySelector(".unit").textContent = unit;
  }
}

if (!customElements.get("purespa-card")) {
  customElements.define("purespa-card", PureSpaCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "purespa-card",
  name: "PureSpa Card",
  description: "A modern spa dashboard card for Home Assistant.",
});
