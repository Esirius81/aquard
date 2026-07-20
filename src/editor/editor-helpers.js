export function updateConfigProperty(config, path, value) {
  const nextConfig = { ...(config ?? {}) };
  if (path.length === 1) {
    setOrDelete(nextConfig, path[0], value);
    return nextConfig;
  }

  const [parent, property] = path;
  nextConfig[parent] = { ...(config?.[parent] ?? {}) };
  setOrDelete(nextConfig[parent], property, value);
  return nextConfig;
}

export function dispatchConfigChanged(element, config) {
  element.dispatchEvent(new CustomEvent("config-changed", {
    detail: { config },
    bubbles: true,
    composed: true,
  }));
}

export function hasMeaningfulEntities(config) {
  return Boolean(config?.entities && Object.values(config.entities).some((value) => typeof value === "string" && value.trim()));
}

function setOrDelete(target, property, value) {
  if (value === "" || value === undefined || value === null) delete target[property];
  else target[property] = value;
}
