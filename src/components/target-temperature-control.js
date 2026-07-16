export function renderTargetArrow(direction) {
  const isLeft = direction === "decrease";
  const points = isLeft ? "31 19 20 28 31 37" : "25 19 36 28 25 37";
  return `<svg class="target-arrow-svg" viewBox="0 0 56 56" aria-hidden="true">
    <path class="target-button-glass" d="M13 5 H43 Q51 5 51 13 V43 Q51 51 43 51 H13 Q5 51 5 43 V13 Q5 5 13 5Z"/>
    <path class="target-button-highlight" d="M13 8 H43 Q47 8 48 12"/>
    <polyline class="target-arrow-chevron" points="${points}"/>
  </svg>`;
}
