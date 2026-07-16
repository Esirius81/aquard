export const STATUS_INDICATOR_GEOMETRY = Object.freeze({ viewBox: "0 0 160 160", center: 80, radius: 58, strokeWidth: 8 });

const STATUS_SYMBOLS = Object.freeze({
  excellent: '<path class="status-symbol" d="M53 81 L72 100 L109 61"/>',
  monitor: '<path class="status-symbol" d="M43 80 C55 61 69 53 80 53 C91 53 105 61 117 80 C105 99 91 107 80 107 C69 107 55 99 43 80Z"/><circle class="status-symbol" cx="80" cy="80" r="12"/>',
  action_needed: '<path class="status-symbol" d="M80 48 L80 88"/><circle class="status-symbol-fill" cx="80" cy="108" r="5"/>',
  alert: '<path class="status-symbol" d="M80 48 L80 88"/><circle class="status-symbol-fill" cx="80" cy="108" r="5"/>',
  unknown: '<path class="status-symbol" d="M62 64 C65 50 76 44 87 46 C101 48 107 60 102 72 C98 82 84 84 81 94 L81 98"/><circle class="status-symbol-fill" cx="81" cy="112" r="4"/>',
});

export function renderStatusIndicator(status) {
  const geometry = STATUS_INDICATOR_GEOMETRY;
  return `<svg class="status-indicator-svg" viewBox="${geometry.viewBox}" aria-hidden="true">
    <defs><filter id="aquard-status-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle class="status-ring" cx="${geometry.center}" cy="${geometry.center}" r="${geometry.radius}" stroke-width="${geometry.strokeWidth}"/>
    <path class="status-ring-highlight" d="M39 60 A58 58 0 0 1 121 60"/>
    <path class="status-ring-reflection" d="M45 111 A58 58 0 0 0 63 132"/>
    <g class="status-symbol-group">${STATUS_SYMBOLS[status] ?? STATUS_SYMBOLS.unknown}</g>
    <g class="status-sparkle"><path d="M42 35 L42 46 M36.5 40.5 L47.5 40.5"/><circle cx="53" cy="30" r="2"/></g>
  </svg>`;
}
