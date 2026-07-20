export function renderActions({ mode, hasAction, standalone = false }) {
  if (mode === "hidden" || (mode === "compact" && !hasAction)) return "";
  if (mode === "compact") {
    return `<aside class="aquard-component aquard-component--compact status-summary status-summary--compact${standalone ? " actions-standalone" : ""}" data-component="actions"><div class="status-action"></div></aside>`;
  }
  return `<aside class="aquard-component aquard-component--full status-summary${standalone ? " actions-standalone" : ""}" data-component="actions"><div class="status-action"></div><div class="status-support"><span class="status-dot"></span><span class="status-support-text"></span></div></aside>`;
}
