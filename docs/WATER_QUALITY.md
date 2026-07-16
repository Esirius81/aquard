# Water Quality Engine V3

Aquard's Water Quality Engine answers how closely the configured measurements match the active profile's ideal condition. The UI receives a structured evaluation and contains no ranges, weights, curves, or status rules.

## Profile-driven scoring

`evaluateWaterQuality` is profile independent. A profile supplies:

- essential measurements
- measurement weights
- ideal targets and progressive scoring curves
- preferred, monitor, action, and alert zones
- critical overrides
- maintenance-message keys
- issue priority
- status score thresholds

The spa wrapper evaluates pH, ORP, EC, and TDS. EC has a zero weight: its individual score and range status support the measurement card, but it cannot affect the combined Water Quality percentage, status, safety overrides, or action priority because TDS is commonly derived from conductivity.

## Initial spa profile defaults

### pH

- Ideal target: 7.4
- Acceptable zone: 7.2–7.8
- Critical override: below 6.8 or above 8.2
- Weight: 40%

The pH score falls progressively with distance from 7.4. Status follows the profile zones independently of the percentage; crossing an alert boundary always forces `ALERT`.

### ORP

- Ideal target: 730 mV or higher
- Acceptable minimum: 650 mV
- Critical override: below 500 mV
- Weight: 45%

The ORP curve progressively reduces the score as ORP falls below its ideal target. The configured values are provisional spa profile defaults, not universal sanitizer or safety limits.

### TDS

- Fresh-water end of curve: highest score
- Acceptable maximum: 1500 ppm
- High-maintenance zone: above 2500 ppm
- Weight: 15%

TDS progressively lowers the quality score as water accumulates dissolved solids. TDS alone can request maintenance or recommend checking/replacing the water, but it never triggers a microbiological safety claim or `ALERT` override.

### EC

- Ideal target: 1.2 mS/cm
- Acceptable zone: 0.8–2.0 mS/cm
- Display evaluation limits: 0.4–3.0 mS/cm
- Weight: 0%

EC receives a progressive individual score for display consistency. These are provisional spa profile defaults for sensors reporting mS/cm. EC never contributes to combined Water Quality or status decisions, avoiding double-counting with TDS.

## Status behavior

- `EXCELLENT`: every contributing measurement is within its preferred profile zone.
- `MONITOR`: at least one contributing measurement has moved outside the preferred zone, but no correction is recommended yet.
- `ACTION NEEDED`: at least one contributing measurement has reached its maintenance zone.
- `ALERT`: at least one contributing measurement has crossed its profile alert boundary. Critical pH and ORP overrides always win.
- `UNKNOWN`: essential pH or ORP data is missing, unknown, unavailable, or nonnumeric. No percentage is returned.

Status resolution follows severity priority (`ALERT` → `ACTION NEEDED` → `MONITOR` → `EXCELLENT`). The weighted percentage describes proximity to ideal but cannot escalate the status by itself.

Available measurement scores are combined using pH 40%, ORP 45%, and TDS 15%. If optional TDS is unavailable, the remaining weights are normalized rather than treating missing data as zero.

### V3 spa zones

- pH preferred: 7.35–7.60; monitor: 7.20–7.34 and 7.61–7.80; action: 7.00–7.19 and 7.81–8.00; alert outside 7.00–8.00.
- ORP preferred: 650 mV or higher; monitor: 600–649 mV; action: 500–599 mV; alert below 500 mV.
- TDS retains its progressive curve and uses profile-defined preferred, monitor, action, and alert zones.
- EC receives the same four-level individual presentation but remains weight 0 and cannot affect overall score or status.

## Safety context

These centralized values are configurable profile defaults for future profile support. They are not universal safety limits or guarantees. Sensor quality, sanitizer type, water chemistry, pH, temperature, local guidance, and equipment characteristics can change interpretation.

The result is guidance based on configured measurements, not an absolute declaration that water is safe.
