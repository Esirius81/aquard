export const DEFAULT_PENDING_TIMEOUT_MS = 9000;

export class PendingStateStore {
  constructor({ timeoutMs = DEFAULT_PENDING_TIMEOUT_MS, onChange = () => {} } = {}) {
    this.timeoutMs = timeoutMs;
    this.onChange = onChange;
    this.entries = new Map();
    this.sequence = 0;
  }

  set(key, value, options = {}) {
    this.clear(key, false);
    const entry = {
      key,
      value,
      id: ++this.sequence,
      equals: options.equals ?? Object.is,
      metadata: options.metadata,
      timer: undefined,
    };
    entry.timer = setTimeout(() => {
      if (this.entries.get(key) !== entry) return;
      this.entries.delete(key);
      this.onChange();
    }, options.timeoutMs ?? this.timeoutMs);
    this.entries.set(key, entry);
    this.onChange();
    return entry;
  }

  get(key) {
    return this.entries.get(key);
  }

  resolve(key, confirmedValue) {
    return this.entries.get(key)?.value ?? confirmedValue;
  }

  reconcile(key, confirmedValue) {
    const entry = this.entries.get(key);
    if (!entry || !entry.equals(confirmedValue, entry.value)) return false;
    entry.confirmed = true;
    return true;
  }

  clear(key, notify = true, expectedEntry) {
    const entry = this.entries.get(key);
    if (!entry || (expectedEntry && entry !== expectedEntry)) return false;
    clearTimeout(entry.timer);
    this.entries.delete(key);
    if (notify) this.onChange();
    return true;
  }

  destroy() {
    for (const entry of this.entries.values()) clearTimeout(entry.timer);
    this.entries.clear();
  }
}

export function numericValuesEqual(actual, requested, precision = 0.000001) {
  const left = Number(actual);
  const right = Number(requested);
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= precision;
}
