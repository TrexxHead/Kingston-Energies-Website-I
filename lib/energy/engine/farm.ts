import { type CalcResult, type Assumption, refuse, isPositive, isNonNegative } from './result'
import type { Range } from './basis'

/**
 * Business & farm tools (roadmap W3).
 *
 * Generator fuel: from the fuel-use figures in the generator's own manual
 * (litres per hour at given loads). Between two figures fuel use is taken as
 * linear in load; below the lowest figure we use that figure (so runtime is
 * never overstated); above the highest we extend the line up to full load.
 * With a single figure we only answer near that load — we don't invent a curve.
 *
 * Solar water pump: hydraulic energy = ρ·g·V·H, divided by the pump-and-motor
 * ("wire-to-water") efficiency, against the solar yield of the WORST month
 * from PVGIS, so the pump meets the target all year.
 */

export interface FuelPoint {
  /** Share of rated output, 0–1 (e.g. 0.5 for "50% load"). */
  loadFraction: number
  litresPerHour: number
}

export interface GeneratorInput {
  ratedKw: number
  points: FuelPoint[]
  averageLoadKw: number
  tankLitres?: number
  fuelPricePerL?: number
}

export interface GeneratorResult {
  loadFraction: number
  litresPerHour: number
  hoursPerTank: number | null
  costPerHour: number | null
  costPerKwh: number | null
  /** True when the load is below the lowest manual figure, so fuel use is an upper bound. */
  atLeast: boolean
}

/** Single-figure tolerance: answer only within ±10 percentage points of the stated load. */
export const SINGLE_POINT_TOLERANCE = 0.1

export function generatorFuel(i: GeneratorInput): CalcResult<GeneratorResult> {
  if (!isPositive(i.ratedKw)) return refuse('missing_input', ['ratedKw'], 'Enter the generator’s rated output (kW) from its label.')
  if (!isPositive(i.averageLoadKw)) return refuse('missing_input', ['averageLoadKw'], 'Enter the average load you’ll run (kW).')
  const pts = i.points.filter((p) => p.loadFraction > 0 && p.loadFraction <= 1.1 && isPositive(p.litresPerHour)).sort((a, b) => a.loadFraction - b.loadFraction)
  if (!pts.length) return refuse('missing_input', ['points'], 'Enter at least one fuel-use figure from the manual (litres per hour at a given load).')
  const f = i.averageLoadKw / i.ratedKw
  if (f > 1) return refuse('invalid_input', ['averageLoadKw'], `That load is ${Math.round(f * 100)}% of the rated output — the generator can’t run it continuously.`)
  const warnings: string[] = []
  const assumptions: Assumption[] = []
  if (f > 0.8) warnings.push('Running above about 80% of rated output for long periods shortens a generator’s life; check the manual’s continuous (prime) rating.')

  let lph: number
  let atLeast = false
  if (pts.length === 1) {
    if (Math.abs(pts[0].loadFraction - f) > SINGLE_POINT_TOLERANCE)
      return refuse('missing_input', ['points'], `The manual figure is for ${Math.round(pts[0].loadFraction * 100)}% load; your load is ${Math.round(f * 100)}%. Add a second figure (most manuals give ½ and full load) to estimate in between.`)
    lph = pts[0].litresPerHour
    assumptions.push({ id: 'gen.single_point', description: `Fuel use taken from the manual figure at ${Math.round(pts[0].loadFraction * 100)}% load.` })
  } else if (f <= pts[0].loadFraction) {
    lph = pts[0].litresPerHour
    atLeast = f < pts[0].loadFraction
    if (atLeast) assumptions.push({ id: 'gen.floor', description: `Below the lowest manual figure (${Math.round(pts[0].loadFraction * 100)}% load) we use that figure, so fuel use may be a little lower and runtime a little longer.` })
  } else {
    let a = pts[pts.length - 2]
    let b = pts[pts.length - 1]
    for (let k = 0; k < pts.length - 1; k++) if (f <= pts[k + 1].loadFraction) {
      a = pts[k]
      b = pts[k + 1]
      break
    }
    lph = a.litresPerHour + ((b.litresPerHour - a.litresPerHour) * (f - a.loadFraction)) / (b.loadFraction - a.loadFraction)
    assumptions.push({ id: 'gen.linear', description: 'Fuel use is taken as a straight line between the manual’s figures.' })
  }

  const tank = isPositive(i.tankLitres) ? i.tankLitres : null
  const price = isNonNegative(i.fuelPricePerL) && i.fuelPricePerL > 0 ? i.fuelPricePerL : null
  return {
    ok: true,
    value: {
      loadFraction: f,
      litresPerHour: lph,
      hoursPerTank: tank ? tank / lph : null,
      costPerHour: price ? lph * price : null,
      costPerKwh: price ? (lph * price) / i.averageLoadKw : null,
      atLeast,
    },
    basis: 'manufacturer',
    assumptions,
    warnings,
  }
}

export interface PumpInput {
  /** Water needed per day, cubic metres (1 m³ = 1,000 L). */
  dailyWaterM3: number
  /** Total dynamic head: lift from water level to outlet plus pipe friction, metres. */
  totalHeadM: number
  /** Wire-to-water efficiency of the pump + motor (+ controller), 0–1, from its datasheet; assumed range if omitted. */
  pumpEfficiency?: number
  /** PVGIS monthly kWh for 1 kWp at the site (12 values, Jan–Dec). */
  monthlyKwhPerKwp: number[]
}

export interface PumpResult {
  hydraulicKwhPerDay: number
  electricalKwhPerDay: Range
  worstMonth: number
  worstDailyKwhPerKwp: number
  pvKwp: Range
}

/** Typical small solar pump wire-to-water efficiency — engine policy, used only without a datasheet figure. */
export const ASSUMED_PUMP_EFFICIENCY = { low: 0.3, base: 0.4, high: 0.5 }
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function solarPumpSize(i: PumpInput): CalcResult<PumpResult> {
  if (!isPositive(i.dailyWaterM3)) return refuse('missing_input', ['dailyWaterM3'], 'Enter how much water you need a day.')
  if (!isPositive(i.totalHeadM) || i.totalHeadM > 500) return refuse('missing_input', ['totalHeadM'], 'Enter the total head (lift plus pipe friction) in metres.')
  if (i.monthlyKwhPerKwp.length !== 12 || !i.monthlyKwhPerKwp.every((v) => isPositive(v))) return refuse('missing_input', ['monthlyKwhPerKwp'], 'Solar data for the site is needed.')
  const assumptions: Assumption[] = []
  let eff = ASSUMED_PUMP_EFFICIENCY
  if (isPositive(i.pumpEfficiency) && i.pumpEfficiency <= 1) eff = { low: i.pumpEfficiency, base: i.pumpEfficiency, high: i.pumpEfficiency }
  else assumptions.push({ id: 'pump.efficiency', description: 'Pump + motor (wire-to-water) efficiency, typical for small solar pumps — use your pump’s datasheet figure if you have it.', value: '30% / 40% / 50%' })

  // ρ·g·V·H in joules → kWh: 1000 kg/m³ × 9.81 m/s² ÷ 3.6e6 J/kWh.
  const hydraulic = (1000 * 9.81 * i.dailyWaterM3 * i.totalHeadM) / 3.6e6
  const daily = i.monthlyKwhPerKwp.map((m, k) => m / DAYS[k])
  const worst = daily.indexOf(Math.min(...daily))
  const y = daily[worst]
  const elec = { low: hydraulic / eff.high, base: hydraulic / eff.base, high: hydraulic / eff.low }
  assumptions.push({ id: 'pump.worst_month', description: 'Sized for the month with the least sun, so the target is met all year.' })
  assumptions.push({ id: 'pump.pvgis_losses', description: 'Solar yield includes PVGIS’s 14% system losses; a direct-drive pump controller’s losses may differ.' })
  return {
    ok: true,
    value: { hydraulicKwhPerDay: hydraulic, electricalKwhPerDay: elec, worstMonth: worst, worstDailyKwhPerKwp: y, pvKwp: { low: elec.low / y, base: elec.base / y, high: elec.high / y } },
    basis: isPositive(i.pumpEfficiency) ? 'customer_entered' : 'assumed',
    assumptions,
    warnings: ['Water needs, borehole drawdown and pipe friction change the head — confirm with your pump supplier before buying.'],
  }
}
