/**
 * Generator sizing helper — pure wattage math only. Kingston Energies does
 * not sell generators, so this never recommends a specific product; it only
 * helps someone reason about a generator they already have or are shopping
 * for elsewhere.
 *
 * The carbon-monoxide safety messaging below is not optional decoration —
 * portable generators kill people through CO poisoning when run indoors,
 * in a garage, or near windows/vents, often well before anyone smells
 * anything (CO is odorless). Every place this module's output reaches the
 * UI, `CO_SAFETY_RULES` must be shown, unfiltered and unshortened. Nothing
 * in this file may be used to imply indoor or enclosed-space operation is
 * ever safe under any condition.
 */

export const CO_SAFETY_RULES: string[] = [
  'Never run a generator indoors, in a garage, on a porch, or under a carport — even with doors and windows open.',
  'Carbon monoxide is invisible and odorless. By the time you smell exhaust or feel unwell, dangerous levels may already be present.',
  'Keep the generator at least 20 feet (6m) from your home, with the exhaust pointed away from windows, doors, and vents.',
  'Install battery-powered or battery-backup carbon monoxide alarms inside your home.',
  'Never use a generator to power a house without a properly installed transfer switch — backfeeding into home wiring can electrocute utility workers and neighbors.',
]

export interface GeneratorLoadItem {
  name: string
  runningWatts: number
  startupWatts: number | null
}

export interface GeneratorSizingResult {
  totalRunningWatts: number
  /** The single largest startup surge among the loads — generators only need to cover the highest concurrent surge, not the sum of all of them. */
  largestStartupWatts: number | null
  /** Running load total plus the single largest startup surge — a practical sizing target. */
  recommendedMinWatts: number
}

/**
 * Sums running watts across a set of appliances someone wants to run
 * simultaneously off a generator, and works out a practical sizing target:
 * total running watts + the single largest motor's startup surge (since
 * surges are brief and don't typically overlap for well-sequenced startup).
 */
export function sizeGenerator(loads: GeneratorLoadItem[]): GeneratorSizingResult {
  const totalRunningWatts = loads.reduce((sum, l) => sum + Math.max(0, l.runningWatts), 0)
  const startupValues = loads.map((l) => l.startupWatts).filter((w): w is number => w != null && w > 0)
  const largestStartupWatts = startupValues.length ? Math.max(...startupValues) : null
  const otherRunningWatts = totalRunningWatts - (largestStartupWatts != null
    ? loads.find((l) => l.startupWatts === largestStartupWatts)?.runningWatts ?? 0
    : 0)
  const recommendedMinWatts = largestStartupWatts != null
    ? otherRunningWatts + largestStartupWatts
    : totalRunningWatts
  return { totalRunningWatts, largestStartupWatts, recommendedMinWatts }
}
