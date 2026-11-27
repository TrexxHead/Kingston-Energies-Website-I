import { type Evidenced, type Range, type EvidenceBasis, addRanges, weakestBasis } from './basis'
import { type CalcResult, type Assumption, type CalcRefusal, isPositive } from './result'
import { type LoadModel, dailyEnergyForQuantity } from './loads'

/**
 * A scenario is a named selection of the customer's devices (workday,
 * overnight, storm…) with how each is used in it. Three different numbers
 * come out, because they answer different questions:
 *
 * - nameplateSumWatts      — everything on at once at full rating (rarely real)
 * - simultaneousWatts      — what's actually on together at the scenario's peak
 *                            → continuous-output check
 * - startupPeakWatts       — simultaneous running load plus the single largest
 *                            motor start → surge check
 * - kwhPerDay              — energy over the day → runtime / cost
 *
 * Devices the engine can't estimate are kept in `unresolved`, visible and
 * excluded from totals — never silently zeroed or guessed.
 */

export interface ScenarioDevice {
  /** Stable device id from the energy profile — the same device may appear in many scenarios. */
  deviceId: string
  name: string
  quantity: number
  load: LoadModel
  /** True for compressors/pumps/motors that draw a startup surge. */
  motorLoad?: boolean
  /** Per-unit startup demand, if known. */
  startupWatts?: Evidenced
  /** On at the same time as the others during this scenario's peak. */
  simultaneous: boolean
  essential: boolean
}

export interface ScenarioDeviceResult {
  deviceId: string
  name: string
  essential: boolean
  kwhPerDay: Range | null
  runningWatts: number | null
  basis: EvidenceBasis | null
  refusal: CalcRefusal | null
  warnings: string[]
}

export interface ScenarioTotals {
  devices: ScenarioDeviceResult[]
  unresolved: { deviceId: string; name: string; message: string; fields: string[] }[]
  kwhPerDay: Range
  averageWatts: Range
  nameplateSumWatts: number
  simultaneousWatts: number
  startupPeakWatts: number | null
  startupUnknown: string[]
  essentialKwhPerDay: Range
}

export function evaluateScenario(devices: ScenarioDevice[]): CalcResult<ScenarioTotals> {
  const warnings: string[] = []
  const assumptions: Assumption[] = [
    {
      id: 'scenario.even_spread',
      description: 'Average load is daily energy spread over 24 hours. Runtime for a load used only at certain times can differ.',
    },
    {
      id: 'scenario.one_start_at_a_time',
      description: 'Startup peak assumes one motor starts at a time while everything else marked simultaneous is already running.',
    },
  ]

  // A device counted twice in one scenario would double its energy.
  const seen = new Set<string>()
  const unique: ScenarioDevice[] = []
  for (const d of devices) {
    if (seen.has(d.deviceId)) {
      warnings.push(`"${d.name}" was listed more than once in this scenario and is counted once. Change its quantity instead.`)
      continue
    }
    seen.add(d.deviceId)
    unique.push(d)
  }

  const results: ScenarioDeviceResult[] = []
  const unresolved: ScenarioTotals['unresolved'] = []
  const bases: EvidenceBasis[] = []
  let nameplate = 0
  let simultaneous = 0
  let largestStartupDelta = 0
  const startupUnknown: string[] = []

  for (const d of unique) {
    const r = dailyEnergyForQuantity(d.load, d.quantity)
    if (!r.ok) {
      results.push({ deviceId: d.deviceId, name: d.name, essential: d.essential, kwhPerDay: null, runningWatts: null, basis: null, refusal: r, warnings: [] })
      unresolved.push({ deviceId: d.deviceId, name: d.name, message: r.message, fields: r.fields })
      // Its running power is unknown, so a simultaneous motor here makes the startup peak unknown too.
      if (d.simultaneous && d.quantity > 0 && d.motorLoad) startupUnknown.push(d.name)
      continue
    }
    bases.push(r.basis)
    for (const a of r.assumptions) if (!assumptions.some((x) => x.id === a.id)) assumptions.push(a)
    results.push({
      deviceId: d.deviceId,
      name: d.name,
      essential: d.essential,
      kwhPerDay: r.value.kwhPerDay,
      runningWatts: r.value.runningWatts,
      basis: r.basis,
      refusal: null,
      warnings: r.warnings,
    })

    const running = r.value.runningWatts
    if (running != null) nameplate += running
    if (d.simultaneous && d.quantity > 0) {
      if (running == null) {
        unresolved.push({ deviceId: d.deviceId, name: d.name, message: 'Running power is unknown, so it cannot be included in the simultaneous load.', fields: ['runningWatts'] })
      } else {
        simultaneous += running
      }
      if (d.motorLoad) {
        const perUnitRunning = running != null && d.quantity > 0 ? running / d.quantity : null
        if (d.startupWatts && isPositive(d.startupWatts.value) && perUnitRunning != null) {
          bases.push(d.startupWatts.basis)
          largestStartupDelta = Math.max(largestStartupDelta, d.startupWatts.value - perUnitRunning)
        } else {
          startupUnknown.push(d.name)
        }
      }
    }
  }

  const resolved = results.filter((r) => r.kwhPerDay)
  const kwhPerDay = addRanges(resolved.map((r) => r.kwhPerDay as Range))
  const essentialKwhPerDay = addRanges(resolved.filter((r) => r.essential).map((r) => r.kwhPerDay as Range))
  const toW = (kwh: number) => (kwh * 1000) / 24

  if (unresolved.length) warnings.push(`${unresolved.length} device(s) need more information and are not in the totals.`)

  return {
    ok: true,
    value: {
      devices: results,
      unresolved,
      kwhPerDay,
      averageWatts: { low: toW(kwhPerDay.low), base: toW(kwhPerDay.base), high: toW(kwhPerDay.high) },
      nameplateSumWatts: nameplate,
      simultaneousWatts: simultaneous,
      startupPeakWatts: startupUnknown.length ? null : simultaneous + largestStartupDelta,
      startupUnknown,
      essentialKwhPerDay,
    },
    basis: weakestBasis(bases),
    assumptions,
    warnings,
  }
}
