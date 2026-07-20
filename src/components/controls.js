export function renderControls({ mode, hasControls }) {
  if (mode === "hidden" || (mode === "compact" && !hasControls)) return "";
  return `<section class="aquard-component aquard-component--${mode} equipment-section${mode === "compact" ? " equipment-section--compact" : ""}" data-component="controls" aria-label="Equipment status"><div class="equipment-grid"></div></section>`;
}
