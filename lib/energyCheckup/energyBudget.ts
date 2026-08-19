/**
 * "I need this to last until 7am" — the survive-until-a-target-time planner
 * from the platform spec's Energy Budget Mode. Deliberately simple: it
 * divides stored energy by however long it needs to last, and gives
 * generic (not per-appliance) conservation guidance — real per-device
 * personalization needs live monitoring this build doesn't have, so it
 * isn't faked here.
 */

/** Recommended average draw to make a reserve last the target duration. Null for a non-positive target. */
export function recommendedAverageWatts(reserveWh: number, targetHours: number): number | null {
  if (targetHours <= 0) return null
  return reserveWh / targetHours
}

export interface ConservationTip {
  text: string
  /** Lower = suggest first — roughly biggest-runtime-win-for-least-sacrifice first. */
  priority: number
}

export const CONSERVATION_TIPS: ConservationTip[] = [
  { text: 'Charge phones and essential devices now, then unplug them — don\'t leave them topping off all night.', priority: 1 },
  { text: 'Turn off any AC or electric water heating — these are consistently the biggest draws in a Jamaican home.', priority: 2 },
  { text: 'Run one fan instead of two or three where you can.', priority: 3 },
  { text: 'Avoid the microwave, kettle, iron, or anything with a heating element — they draw far more than they seem to.', priority: 4 },
  { text: 'Keep the fridge/freezer door closed as much as possible — every open lets cold out and makes the compressor work harder.', priority: 5 },
  { text: 'Keep the router on if you need connectivity — it\'s a small, steady draw, not a big one.', priority: 6 },
  { text: 'Turn off decorative or non-essential lighting; keep only what you need to see safely.', priority: 7 },
  { text: 'Skip the TV/entertainment system unless it matters for information or morale — it adds up over hours.', priority: 8 },
]

/** A budget summary — never a false-precise single number, always paired with what it assumes. */
export interface EnergyBudget {
  reserveWh: number
  targetHours: number
  recommendedAverageW: number | null
  tips: ConservationTip[]
}

export function buildEnergyBudget(reserveWh: number, targetHours: number): EnergyBudget {
  return {
    reserveWh,
    targetHours,
    recommendedAverageW: recommendedAverageWatts(reserveWh, targetHours),
    tips: [...CONSERVATION_TIPS].sort((a, b) => a.priority - b.priority),
  }
}
