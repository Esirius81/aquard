export const styles = `
  :host {
    display: block;
  }

  ha-card {
    padding: 20px;
    color: var(--primary-text-color);
    background: var(--ha-card-background, var(--card-background-color));
  }

  .label {
    margin-bottom: 8px;
    color: var(--secondary-text-color);
    font-size: 0.875rem;
  }

  .value {
    font-size: 2rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .unit {
    margin-left: 0.25em;
    color: var(--secondary-text-color);
    font-size: 0.55em;
    font-weight: 400;
  }
`;
