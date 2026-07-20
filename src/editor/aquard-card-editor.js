import { AQUARD_PROFILES, DEVICE_FIELDS } from "./editor-schema.js";
import { dispatchConfigChanged, hasMeaningfulEntities, updateConfigProperty } from "./editor-helpers.js";

const selectMarkup = (options) => options.map(({ value, label }) => `<mwc-list-item value="${value}">${label}</mwc-list-item>`).join("");

export class AquardCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = config && typeof config === "object" && !Array.isArray(config) ? config : {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._syncHass();
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const profile = this._config.profile ?? "spa";
    const groups = [...new Set(DEVICE_FIELDS.map((field) => field.group))];
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;color:var(--primary-text-color)}*{box-sizing:border-box}.notice{display:flex;gap:10px;margin:0 0 16px;padding:12px 14px;border-radius:10px;background:var(--secondary-background-color);line-height:1.4}.notice ha-icon{flex:0 0 auto;color:var(--primary-color)}details{border-top:1px solid var(--divider-color)}details:first-of-type{border-top:0}summary{padding:18px 2px;font-size:16px;font-weight:500;cursor:pointer;list-style-position:inside}.section-body{padding:0 2px 18px}.section-copy,.field-copy{margin:-4px 0 16px;color:var(--secondary-text-color);font-size:13px;line-height:1.4}.group{margin-top:20px}.group:first-child{margin-top:0}.group-title{margin:0 0 12px;font-size:14px;font-weight:600}ha-select,ha-entity-picker,ha-textfield{display:block;width:100%;margin-bottom:16px}.switch-row{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.switch-label{font-weight:500}.switch-description{margin:4px 0 0}.sensor-information-toggle{flex:0 0 auto}.error{color:var(--error-color)}
      </style>
      ${!hasMeaningfulEntities(this._config) ? `<div class="notice" role="status"><ha-icon icon="mdi:information-outline"></ha-icon><span>Select one or more Spa entities below. You can save now and finish setup later.</span></div>` : ""}
      <details open><summary>Profile</summary><div class="section-body"><p class="section-copy">Choose the water profile this card represents.</p><ha-select class="profile-select" label="Profile">${selectMarkup(AQUARD_PROFILES)}</ha-select>${AQUARD_PROFILES.some((item) => item.value === profile) ? "" : `<p class="field-copy error" role="alert">The configured profile is not supported. Select Spa to continue.</p>`}</div></details>
      <details open><summary>Devices</summary><div class="section-body"><p class="section-copy">All entities are optional. Aquard keeps missing or unavailable entity IDs so they can reconnect later.</p>${groups.map((group) => `<section class="group"><h4 class="group-title">${group}</h4><div data-device-group="${group}"></div></section>`).join("")}</div></details>
      <details open><summary>Options</summary><div class="section-body"><div class="switch-row"><div><div class="switch-label">Show sensor information</div><div class="field-copy switch-description" id="sensor-information-description">Display the pH, ORP, EC and TDS sensor cards when configured.</div></div><ha-switch class="sensor-information-toggle" aria-label="Show sensor information" aria-describedby="sensor-information-description"></ha-switch></div></div></details>
      <details><summary>Advanced</summary><div class="section-body"><p class="section-copy">Optional card settings.</p><ha-textfield class="name-field" label="Card name"></ha-textfield></div></details>`;

    const profileSelect = this.shadowRoot.querySelector(".profile-select");
    profileSelect.value = profile;
    profileSelect.addEventListener("selected", (event) => this._change(["profile"], event.target.value));

    for (const field of DEVICE_FIELDS) {
      const picker = document.createElement("ha-entity-picker");
      picker.label = field.label;
      picker.value = this._config.entities?.[field.key] ?? "";
      picker.hass = this._hass;
      picker.includeDomains = field.domains;
      picker.allowCustomEntity = true;
      picker.helper = field.description ?? "Optional";
      picker.addEventListener("value-changed", (event) => this._change(["entities", field.key], event.detail?.value));
      this.shadowRoot.querySelector(`[data-device-group="${field.group}"]`).append(picker);
    }

    const sensorInformationToggle = this.shadowRoot.querySelector(".sensor-information-toggle");
    sensorInformationToggle.checked = this._config.show_sensor_information !== false;
    sensorInformationToggle.addEventListener("change", (event) => this._change(["show_sensor_information"], event.target.checked));

    const name = this.shadowRoot.querySelector(".name-field");
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

if (!customElements.get("aquard-card-editor")) customElements.define("aquard-card-editor", AquardCardEditor);
