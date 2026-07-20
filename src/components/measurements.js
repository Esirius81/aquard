export function renderMeasurements({ mode, hasMeasurements }) {
  if (mode === "hidden" || (mode === "compact" && !hasMeasurements)) return "";
  return `<section class="aquard-component aquard-component--${mode} measurement-section${mode === "compact" ? " measurement-section--compact" : ""}" data-component="measurements" aria-label="Water quality measurements"><div class="metric-grid"></div></section>`;
}
