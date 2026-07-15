import { formatEntityState } from "./helpers.js";
import { styles } from "./styles.js";

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
