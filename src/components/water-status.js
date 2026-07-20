import { renderStatusIndicator } from "./status-indicator.js";

export function renderWaterStatus({ status, mode, actions = "" }) {
  if (mode === "hidden") return "";
  if (mode === "compact") {
    return `<section class="aquard-component aquard-component--compact status-panel status-panel--compact status-${status}" data-component="water_status">
      <div class="status-orb">${renderStatusIndicator(status)}</div>
      <div class="hero-copy"><div class="status-headline"></div><div class="status-score"></div></div>
      ${actions}
    </section>`;
  }
  return `<section class="aquard-component aquard-component--full hero-panel status-panel status-${status}" data-component="water_status">
    <div class="status-orb">${renderStatusIndicator(status)}</div>
    <div class="hero-copy"><div class="status-headline"></div></div>
    ${actions}
  </section>`;
}
