export function formatEntityState(stateObj) {
  if (!stateObj) {
    return { state: "Not found", unit: "" };
  }

  const state = stateObj.state;
  if (state === "unknown" || state === "unavailable") {
    return { state: state[0].toUpperCase() + state.slice(1), unit: "" };
  }

  return {
    state,
    unit: stateObj.attributes?.unit_of_measurement ?? "",
  };
}
