import { AQUARD_PROFILES, DEVICE_FIELDS } from "./editor-schema.js";
import { dispatchConfigChanged, updateConfigProperty } from "./editor-helpers.js";

export class AquardCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = config && typeof config === "object" ? config : {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._syncHass();
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block}.section{border-top:1px solid var(--divider-color);padding:20px 0 4px}.section:first-of-type{border-top:0;padding-top:4px}
        h3{font-size:16px;font-weight:500;margin:0 0 14px}ha-select,ha-entity-picker,ha-textfield{display:block;margin-bottom:16px;width:100%}
      </style>
      <div class="section profile"><h3>Profile</h3><ha-select label="Profile"></ha-select></div>
      <div class="section devices"><h3>Devices</h3><div class="device-fields"></div></div>
      <div class="section advanced"><h3>Advanced</h3><ha-textfield label="Name"></ha-textfield></div>
    `;

    const profile = this.shadowRoot.querySelector("ha-select");
    profile.value = this._config.profile ?? "spa";
    for (const option of AQUARD_PROFILES) {
      const item = document.createElement("mwc-list-item");
      item.value = option.value;
      item.textContent = option.label;
      profile.append(item);
    }
    profile.addEventListener("selected", (event) => this._change(["profile"], event.target.value));

    const fields = this.shadowRoot.querySelector(".device-fields");
    for (const field of DEVICE_FIELDS) {
      const picker = document.createElement("ha-entity-picker");
      picker.label = field.label;
      picker.value = this._config.entities?.[field.key] ?? "";
      picker.hass = this._hass;
      picker.includeDomains = field.domains;
      picker.allowCustomEntity = true;
      picker.addEventListener("value-changed", (event) => this._change(["entities", field.key], event.detail?.value));
      fields.append(picker);
    }

    const name = this.shadowRoot.querySelector("ha-textfield");
    name.value = this._config.name ?? "";
    name.addEventListener("input", (event) => this._change(["name"], event.target.value));
  }

  _syncHass() {
    if (!this.shadowRoot) return;
    for (const picker of this.shadowRoot.querySelectorAll("ha-entity-picker")) picker.hass = this._hass;
  }

  _change(path, value) {
    const config = updateConfigProperty(this._config, path, value);
    this._config = config;
    dispatchConfigChanged(this, config);
  }
}

if (!customElements.get("aquard-card-editor")) {
  customElements.define("aquard-card-editor", AquardCardEditor);
}

