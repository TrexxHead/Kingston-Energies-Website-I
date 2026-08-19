/**
 * Outage simulation — projects a battery reserve's depletion hour by hour
 * under a given average load, and compares that across named scenarios
 * (e.g. "Current" vs "Energy Saver"). This is a straight-line projection:
 * reserve minus (load × hours elapsed), capped at zero. It does not model
 * solar recharge, load variability, or battery self-discharge — those
 * would need real per-hour data this build doesn't have, so the
 * projection is presented as a planning tool, not a guarantee.
 */

export interface DepletionPoint {
  hour: number
  remainingWh: number
}

/** Hour-by-hour reserve remaining until it hits zero (or maxHours is reached). */
export function simulateDepletion(reserveWh: number, avgLoadWatts: number, maxHours = 96): DepletionPoint[] {
  if (reserveWh <= 0 || avgLoadWatts <= 0) return []
  const points: DepletionPoint[] = [{ hour: 0, remainingWh: reserveWh }]
  let remaining = reserveWh
  let hour = 0
  while (remaining > 0 && hour < maxHours) {
    hour += 1
    remaining = Math.max(0, remaining - avgLoadWatts)
    points.push({ hour, remainingWh: remaining })
  }
  return points
}

export interface ScenarioInput {
  label: string
  avgLoadWatts: number
}

export interface ScenarioResult extends ScenarioInput {
  runtimeHours: number | null
  depletion: DepletionPoint[]
}

/** Runs simulateDepletion for each named scenario against the same reserve, for side-by-side comparison. */
export function compareScenarios(reserveWh: number, scenarios: ScenarioInput[]): ScenarioResult[] {
  return scenarios.map((s) => ({
    ...s,
    runtimeHours: s.avgLoadWatts > 0 ? reserveWh / s.avgLoadWatts : null,
    depletion: simulateDepletion(reserveWh, s.avgLoadWatts),
  }))
}
