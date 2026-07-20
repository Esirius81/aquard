import { AQUARD_PROFILES, COMPONENT_OPTIONS, DEVICE_FIELDS, MODE_OPTIONS } from "./editor-schema.js";
import { applyLayoutPreset, deriveLayoutPreset } from "./editor-presets.js";
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
    const preset = deriveLayoutPreset(this._config);
    const groups = [...new Set(DEVICE_FIELDS.map((field) => field.group))];
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;color:var(--primary-text-color)}*{box-sizing:border-box}.intro{margin:0 0 16px;color:var(--secondary-text-color);line-height:1.45}.notice{display:flex;gap:10px;margin:0 0 16px;padding:12px 14px;border-radius:10px;background:var(--secondary-background-color);line-height:1.4}.notice ha-icon{flex:0 0 auto;color:var(--primary-color)}details{border-top:1px solid var(--divider-color)}details:first-of-type{border-top:0}summary{padding:18px 2px;font-size:16px;font-weight:500;cursor:pointer;list-style-position:inside}.section-body{padding:0 2px 18px}.section-copy,.field-copy{margin:-4px 0 16px;color:var(--secondary-text-color);font-size:13px;line-height:1.4}.group{margin-top:20px}.group:first-child{margin-top:0}.group-title{margin:0 0 12px;font-size:14px;font-weight:600}ha-select,ha-entity-picker,ha-textfield{display:block;width:100%;margin-bottom:16px}.component{display:grid;grid-template-columns:minmax(0,1fr) minmax(130px,180px);align-items:center;gap:16px;margin-bottom:12px}.component ha-select{margin:0}.component-name{font-weight:500}.component-description{margin-top:3px;color:var(--secondary-text-color);font-size:12px}.error{color:var(--error-color)}@media(max-width:430px){.component{grid-template-columns:1fr;gap:8px}.component ha-select{margin-bottom:8px}}
      </style>
      ${!hasMeaningfulEntities(this._config) ? `<div class="notice" role="status"><ha-icon icon="mdi:information-outline"></ha-icon><span>Select one or more Spa entities below. You can save now and finish setup later.</span></div>` : ""}
      <details open><summary>Profile</summary><div class="section-body"><p class="section-copy">Choose the water profile this card represents.</p><ha-select class="profile-select" label="Profile">${selectMarkup(AQUARD_PROFILES)}</ha-select>${AQUARD_PROFILES.some((item) => item.value === profile) ? "" : `<p class="field-copy error" role="alert">The configured profile is not supported. Select Spa to continue.</p>`}</div></details>
      <details open><summary>Devices</summary><div class="section-body"><p class="section-copy">All entities are optional. Aquard keeps missing or unavailable entity IDs so they can reconnect later.</p>${groups.map((group) => `<section class="group"><h4 class="group-title">${group}</h4><div data-device-group="${group}"></div></section>`).join("")}</div></details>
      <details open><summary>Appearance</summary><div class="section-body"><p class="section-copy">Layout presets update the display mode of all components.</p><ha-select class="preset-select" label="Layout preset"><mwc-list-item value="dashboard">Dashboard</mwc-list-item><mwc-list-item value="compact">Compact</mwc-list-item><mwc-list-item value="custom">Custom</mwc-list-item></ha-select></div></details>
      <details ${preset === "custom" ? "open" : ""}><summary>Components</summary><div class="section-body"><p class="section-copy">Choose how much space each part uses. Changing a mode makes the layout Custom.</p><div class="components"></div></div></details>
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

    const presetSelect = this.shadowRoot.querySelector(".preset-select");
    presetSelect.value = preset;
    presetSelect.addEventListener("selected", (event) => this._applyPreset(event.target.value));

    const components = this.shadowRoot.querySelector(".components");
    for (const component of COMPONENT_OPTIONS) {
      const row = document.createElement("div");
      row.className = "component";
      row.innerHTML = `<div><div class="component-name">${component.label}</div><div class="component-description">${component.description}</div></div><ha-select label="${component.label} mode">${selectMarkup(MODE_OPTIONS)}</ha-select>`;
      const select = row.querySelector("ha-select");
      select.value = this._config.components?.[component.key] ?? "full";
      select.addEventListener("selected", (event) => this._change(["components", component.key], event.target.value));
      components.append(row);
    }

    const name = this.shadowRoot.querySelector(".name-field");
    name.value = this._config.name ?? "";
    name.addEventListener("input", (event) => this._change(["name"], event.target.value));
  }

  _syncHass() {
    if (!this.shadowRoot) return;
    for (const picker of this.shadowRoot.querySelectorAll("ha-entity-picker")) picker.hass = this._hass;
  }

  _applyPreset(preset) {
    const config = applyLayoutPreset(this._config, preset);
    if (config === this._config) return;
    this._config = config;
    dispatchConfigChanged(this, config);
  }

  _change(path, value) {
    const config = updateConfigProperty(this._config, path, value);
    this._config = config;
    dispatchConfigChanged(this, config);
  }
}

if (!customElements.get("aquard-card-editor")) customElements.define("aquard-card-editor", AquardCardEditor);
