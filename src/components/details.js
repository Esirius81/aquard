export function renderDetails({ mode, name, availabilityClass, showAvailability = true }) {
  if (mode === "hidden") return "";
  return `<header class="aquard-component aquard-component--${mode} aquard-header${mode === "compact" ? " aquard-header--compact" : ""}" data-component="details">
    <div class="brand-lockup"><div><div class="brand-name"></div><div class="brand-context"></div></div><span class="brand-mark" aria-hidden="true"><ha-icon icon="mdi:waves"></ha-icon></span></div>
    ${mode === "full" && showAvailability ? `<div class="header-availability ${availabilityClass}"><span class="status-dot"></span><span class="header-availability-text"></span></div>` : ""}
  </header>`;
}
