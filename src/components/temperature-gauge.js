export const DEFAULT_TEMPERATURE_GAUGE_PROFILE = Object.freeze({
  min: 0,
  max: 45,
  arcFraction: 0.75,
});

export const TEMPERATURE_GAUGE_GEOMETRY = Object.freeze({
  center: 80,
  radius: 72,
  rotation: 135,
});

export function temperatureToArc(value, profile = DEFAULT_TEMPERATURE_GAUGE_PROFILE) {
  const numericValue = Number(value);
  const clampedValue = Number.isFinite(numericValue)
    ? Math.min(profile.max, Math.max(profile.min, numericValue))
    : profile.min;
  const progress = (clampedValue - profile.min) / (profile.max - profile.min);
  const circumference = 2 * Math.PI * TEMPERATURE_GAUGE_GEOMETRY.radius;
  const arcLength = circumference * profile.arcFraction;
  const markerAngle = TEMPERATURE_GAUGE_GEOMETRY.rotation + (360 * profile.arcFraction * progress);
  const markerRadians = markerAngle * (Math.PI / 180);
  return {
    clampedValue,
    progress,
    percentage: progress * 100,
    circumference,
    arcLength,
    progressLength: arcLength * progress,
    marker: {
      x: TEMPERATURE_GAUGE_GEOMETRY.center + (TEMPERATURE_GAUGE_GEOMETRY.radius * Math.cos(markerRadians)),
      y: TEMPERATURE_GAUGE_GEOMETRY.center + (TEMPERATURE_GAUGE_GEOMETRY.radius * Math.sin(markerRadians)),
    },
  };
}

export function renderTemperatureGauge(value, profile = DEFAULT_TEMPERATURE_GAUGE_PROFILE) {
  const arc = temperatureToArc(value, profile);
  const remainingProgress = arc.circumference - arc.progressLength;
  const remainingTrack = arc.circumference - arc.arcLength;
  const { center, radius, rotation } = TEMPERATURE_GAUGE_GEOMETRY;

  return `
    <svg class="temperature-gauge-svg" viewBox="0 0 160 160" role="img" aria-label="Temperature scale ${Math.round(arc.percentage)} percent">
      <defs>
        <linearGradient id="aquard-droplet" x1="28%" y1="18%" x2="72%" y2="88%">
          <stop offset="0" stop-color="var(--aq-gauge-drop-light)"/>
          <stop offset=".48" stop-color="var(--aq-gauge-drop-mid)"/>
          <stop offset="1" stop-color="var(--aq-gauge-drop-deep)"/>
        </linearGradient>
        <linearGradient id="aquard-droplet-highlight" x1="35%" y1="20%" x2="62%" y2="75%">
          <stop offset="0" stop-color="var(--aq-gauge-highlight)" stop-opacity=".9"/>
          <stop offset="1" stop-color="var(--aq-gauge-highlight)" stop-opacity="0"/>
        </linearGradient>
        <filter id="aquard-droplet-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle class="temperature-gauge-track" cx="${center}" cy="${center}" r="${radius}"
        transform="rotate(${rotation} ${center} ${center})"
        stroke-dasharray="${arc.arcLength} ${remainingTrack}"/>
      <circle class="temperature-gauge-progress" cx="${center}" cy="${center}" r="${radius}"
        transform="rotate(${rotation} ${center} ${center})"
        stroke-dasharray="${arc.progressLength} ${remainingProgress}"/>
      <circle class="temperature-gauge-marker" cx="${arc.marker.x}" cy="${arc.marker.y}" r="3.5"/>
      <g class="temperature-gauge-droplet" filter="url(#aquard-droplet-glow)">
        <path d="M80 29 C77 39 51 72 51 98 C51 116 64 130 80 130 C96 130 109 116 109 98 C109 72 83 39 80 29Z" fill="url(#aquard-droplet)" fill-opacity=".88"/>
        <path d="M72 54 C63 70 58 84 59 98 C60 108 65 116 72 121 C67 107 67 86 72 54Z" fill="url(#aquard-droplet-highlight)" opacity=".76"/>
        <ellipse cx="70" cy="72" rx="5" ry="9" fill="var(--aq-gauge-highlight)" opacity=".68" transform="rotate(24 70 72)"/>
        <path class="temperature-gauge-drop-edge" d="M80 29 C77 39 51 72 51 98 C51 116 64 130 80 130 C96 130 109 116 109 98 C109 72 83 39 80 29Z"/>
      </g>
    </svg>`;
}
