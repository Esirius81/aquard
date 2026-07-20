import { renderTemperatureGauge } from "./temperature-gauge.js";

export function renderTemperature({ mode, reading, targetControl = "", configured = true }) {
  if (mode === "hidden" || !configured) return "";
  if (mode === "compact") {
    return `<section class="aquard-component aquard-component--compact temperature-panel temperature-panel--compact ${reading.availabilityClass}" data-component="temperature">
      <div class="temperature-copy"><div class="section-label temperature-label"></div><div class="temperature-reading"><span class="temperature-value"><span class="temperature-whole"></span><span class="temperature-decimal"></span></span><span class="temperature-unit"></span></div>${targetControl}</div>
    </section>`;
  }
  return `<section class="aquard-component aquard-component--full hero-panel temperature-panel ${reading.availabilityClass}" data-component="temperature">
    <div class="temperature-copy"><div class="section-label temperature-label"></div><div class="temperature-reading"><span class="temperature-value"><span class="temperature-whole"></span><span class="temperature-decimal"></span></span><span class="temperature-unit"></span></div>${targetControl}</div>
    <div class="temperature-gauge">${renderTemperatureGauge(reading.stateObj?.state)}</div>
  </section>`;
}
