/**
 * Solar recharge estimator — how much energy a panel can realistically put
 * back into a battery during storm-season daylight.
 *
 * This is deliberately a RANGE, not a point figure. A panel's rated wattage
 * (e.g. "100W") is measured under lab standard-test conditions — full sun,
 * a fixed panel temperature, and a perfectly perpendicular angle to the
 * sun. None of that holds outdoors: cloud cover, haze, a panel that isn't
 * re-aimed through the day, heat derating, and charge-controller losses all
 * cut into it. We model that as a conservative-to-optimistic derate band
 * per weather condition rather than pretending to know the exact number —
 * anything more precise than a range would be fabricating precision this
 * page doesn't have.
 */

export type SkyCondition = 'sunny' | 'partly-cloudy' | 'overcast'

export interface SkyConditionMeta {
  label: string
  description: string
  /** Fraction of the panel's rated watts realistically averaged over daylight hours, [low, high]. */
  derate: [number, number]
}

export const SKY_CONDITION_META: Record<SkyCondition, SkyConditionMeta> = {
  sunny: {
    label: 'Sunny / clear',
    description: 'Little to no cloud cover, panel gets direct sun most of the day.',
    derate: [0.5, 0.7],
  },
  'partly-cloudy': {
    label: 'Partly cloudy',
    description: 'Mixed sun and cloud — typical for the outer bands of a storm system.',
    derate: [0.25, 0.4],
  },
  overcast: {
    label: 'Overcast / storm bands',
    description: 'Heavy, persistent cloud cover — expect the low end, if anything.',
    derate: [0.1, 0.2],
  },
}

export interface SolarRechargeEstimate {
  lowWh: number
  highWh: number
  sunHours: number
  panelRatedWatts: number
  condition: SkyCondition
}

/**
 * Estimated Wh a panel puts into a battery over a given number of daylight
 * hours, under a given sky condition. Returns null if either input isn't
 * a real positive number — never guesses a wattage or condition.
 */
export function estimateSolarRecharge(
  panelRatedWatts: number | null | undefined,
  sunHours: number,
  condition: SkyCondition,
): SolarRechargeEstimate | null {
  if (panelRatedWatts == null || panelRatedWatts <= 0 || sunHours <= 0) return null
  const [lowDerate, highDerate] = SKY_CONDITION_META[condition].derate
  return {
    lowWh: panelRatedWatts * lowDerate * sunHours,
    highWh: panelRatedWatts * highDerate * sunHours,
    sunHours,
    panelRatedWatts,
    condition,
  }
}

/**
 * How many daylight hours (at this panel/condition) it would take to put a
 * target amount of energy back into a battery. Returns a [low, high] range
 * of hours (low derate takes longer, high derate takes less time) — or null
 * if the panel has no rated watts on record.
 */
export function hoursToRecharge(
  panelRatedWatts: number | null | undefined,
  targetWh: number,
  condition: SkyCondition,
): [number, number] | null {
  if (panelRatedWatts == null || panelRatedWatts <= 0 || targetWh <= 0) return null
  const [lowDerate, highDerate] = SKY_CONDITION_META[condition].derate
  const hoursAtHighDerate = targetWh / (panelRatedWatts * highDerate)
  const hoursAtLowDerate = targetWh / (panelRatedWatts * lowDerate)
  return [hoursAtHighDerate, hoursAtLowDerate]
}
