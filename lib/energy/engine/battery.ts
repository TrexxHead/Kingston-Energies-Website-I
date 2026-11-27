import { type Evidenced, type Range, type EvidenceBasis, weakestBasis } from './basis'
import { type CalcResult, type Assumption, refuse, isPositive, isNonNegative } from './result'

/**
 * Battery energy and power are separate questions:
 * - energy (Wh) decides how LONG a load can run;
 * - continuous output (W) decides whether it can run AT ALL;
 * - surge output (W for a duration) decides whether a motor can START.
 * A large battery with a small inverter fails the second check, and the
 * engine never lets the first answer stand in for the other two.
 */

/**
 * What the capacity figure represents. Losses are applied only where the
 * figure doesn't already include them:
 * - nominal:               the cell rating on the box — apply usable fraction AND (for AC) inverter loss.
 * - usable_dc:             manufacturer's usable DC energy — apply inverter loss for AC only.
 * - delivered_ac_measured: energy actually delivered at the AC outlet in a test — apply neither.
 */
export type CapacityBasis = 'nominal' | 'usable_dc' | 'delivered_ac_measured'

export interface BatterySource {
  capacityWh: Evidenced
  capacityBasis: CapacityBasis
  /** For 'nominal' capacity: share of nominal energy the BMS lets you draw. */
  usableFraction?: Evidenced
  /** DC→AC conversion efficiency at a typical (not peak) load. */
  inverterEfficiency?: Evidenced
  /** Power the inverter draws just by being on. */
  idleWatts?: Evidenced
  continuousWatts?: Evidenced
  surgeWatts?: Evidenced
  surgeDurationMs?: Evidenced
}

export interface RuntimeInput {
  source: BatterySource
  outputPath: 'ac' | 'dc'
  /** Average load while the backup runs (from a scenario) — a range, not a point. */
  averageLoadWatts: Range
  loadBasis: EvidenceBasis
  /** Share of capacity the customer wants left in reserve, 0–0.9. */
  reserveFraction?: number
  /** Optional derates where supported by evidence (heat, cell ageing), each 0–1. */
  temperatureDerate?: Evidenced
  ageDerate?: Evidenced
}

export interface RuntimeResult {
  deliverableWh: Range
  hours: Range
  includesIdle: boolean
}

export const ASSUMED_USABLE_FRACTION = { low: 0.8, base: 0.85, high: 0.9 }
export const ASSUMED_INVERTER_EFFICIENCY = { low: 0.8, base: 0.85, high: 0.9 }

export function runtime(input: RuntimeInput): CalcResult<RuntimeResult> {
  const { source, outputPath } = input
  const assumptions: Assumption[] = []
  const warnings: string[] = []
  const bases: EvidenceBasis[] = [source.capacityWh.basis, input.loadBasis]

  if (!isPositive(source.capacityWh.value)) return refuse('missing_input', ['capacityWh'], 'Battery capacity is unknown, so runtime cannot be estimated.')
  if (!isPositive(input.averageLoadWatts.low) || input.averageLoadWatts.high < input.averageLoadWatts.low)
    return refuse('invalid_input', ['averageLoadWatts'], 'The load must be above zero watts.')
  const reserve = input.reserveFraction ?? 0
  if (!isNonNegative(reserve) || reserve > 0.9) return refuse('invalid_input', ['reserveFraction'], 'Reserve must be between 0% and 90%.')

  // Usable share of the stated capacity.
  let usable = { low: 1, base: 1, high: 1 }
  if (source.capacityBasis === 'nominal') {
    if (source.usableFraction && isPositive(source.usableFraction.value) && source.usableFraction.value <= 1) {
      const f = source.usableFraction.value
      usable = { low: f, base: f, high: f }
      bases.push(source.usableFraction.basis)
    } else {
      usable = ASSUMED_USABLE_FRACTION
      bases.push('assumed')
      assumptions.push({ id: 'battery.usable_fraction', description: 'Share of the nominal capacity the battery lets you draw before it protects itself.', value: '0.80 / 0.85 / 0.90' })
    }
  }

  // Inverter conversion loss — only on the AC path, and only if the capacity doesn't already include it.
  let conv = { low: 1, base: 1, high: 1 }
  if (outputPath === 'ac' && source.capacityBasis !== 'delivered_ac_measured') {
    if (source.inverterEfficiency && isPositive(source.inverterEfficiency.value) && source.inverterEfficiency.value <= 1) {
      const e = source.inverterEfficiency.value
      conv = { low: e, base: e, high: e }
      bases.push(source.inverterEfficiency.basis)
    } else {
      conv = ASSUMED_INVERTER_EFFICIENCY
      bases.push('assumed')
      assumptions.push({ id: 'battery.inverter_efficiency', description: 'Energy lost converting battery DC to household AC at a typical load.', value: '0.80 / 0.85 / 0.90' })
    }
  }
  if (outputPath === 'dc' && source.capacityBasis === 'delivered_ac_measured') {
    warnings.push('Capacity was measured at the AC outlet; DC output may deliver somewhat more. Using the AC figure as a conservative estimate.')
  }

  let derate = 1
  for (const d of [input.temperatureDerate, input.ageDerate]) {
    if (d && isPositive(d.value) && d.value <= 1) {
      derate *= d.value
      bases.push(d.basis)
    }
  }

  const cap = source.capacityWh.value
  const keep = 1 - reserve
  const deliverableWh: Range = {
    low: cap * usable.low * conv.low * derate * keep,
    base: cap * usable.base * conv.base * derate * keep,
    high: cap * usable.high * conv.high * derate * keep,
  }

  let includesIdle = false
  let idle = 0
  if (outputPath === 'ac') {
    if (source.idleWatts && isNonNegative(source.idleWatts.value)) {
      idle = source.idleWatts.value
      includesIdle = true
      bases.push(source.idleWatts.basis)
    } else {
      warnings.push('Inverter idle consumption is unknown and not included — real runtime on AC may be shorter, especially at light loads.')
    }
  }

  const load = input.averageLoadWatts
  const hours: Range = {
    low: deliverableWh.low / (load.high + idle),
    base: deliverableWh.base / (load.base + idle),
    high: deliverableWh.high / (load.low + idle),
  }
  return { ok: true, value: { deliverableWh, hours, includesIdle }, basis: weakestBasis(bases), assumptions, warnings }
}

export type CheckStatus = 'pass' | 'marginal' | 'fail' | 'unknown'

export interface PowerCheck {
  status: CheckStatus
  rule: string
  detail: string
}

/** Continuous loading above this share of the rating is treated as marginal (design margin, engine policy). */
export const CONTINUOUS_MARGIN = 0.8

/** Can the source carry everything that runs at the same time? Unknown rating is never a pass. */
export function checkContinuousOutput(source: Pick<BatterySource, 'continuousWatts'>, simultaneousWatts: number): PowerCheck {
  const rule = 'continuous_output'
  if (!source.continuousWatts || !isPositive(source.continuousWatts.value)) {
    return { status: 'unknown', rule, detail: 'Continuous output rating is not on record.' }
  }
  const rating = source.continuousWatts.value
  if (simultaneousWatts > rating) {
    return { status: 'fail', rule, detail: `Simultaneous load ${Math.round(simultaneousWatts)} W exceeds the ${rating} W continuous rating.` }
  }
  if (simultaneousWatts > rating * CONTINUOUS_MARGIN) {
    return { status: 'marginal', rule, detail: `Simultaneous load ${Math.round(simultaneousWatts)} W is above ${CONTINUOUS_MARGIN * 100}% of the ${rating} W rating.` }
  }
  return { status: 'pass', rule, detail: `Simultaneous load ${Math.round(simultaneousWatts)} W is within the ${rating} W continuous rating.` }
}

/**
 * Can the source start the largest motor while everything else runs?
 * Needs both a surge rating and the load's startup demand; a surge rating
 * without a duration can't confirm a compressor start and is marginal.
 */
export function checkSurge(
  source: Pick<BatterySource, 'surgeWatts' | 'surgeDurationMs'>,
  startupPeakWatts: number | null,
  requiredDurationMs?: number,
): PowerCheck {
  const rule = 'surge_output'
  if (startupPeakWatts == null) return { status: 'unknown', rule, detail: 'Startup demand of one or more motor loads is unknown.' }
  if (startupPeakWatts <= 0) return { status: 'pass', rule, detail: 'No startup surge to support.' }
  if (!source.surgeWatts || !isPositive(source.surgeWatts.value)) return { status: 'unknown', rule, detail: 'Surge rating is not on record.' }
  if (source.surgeWatts.value < startupPeakWatts) {
    return { status: 'fail', rule, detail: `Startup peak ${Math.round(startupPeakWatts)} W exceeds the ${source.surgeWatts.value} W surge rating.` }
  }
  if (requiredDurationMs != null) {
    if (!source.surgeDurationMs || !isPositive(source.surgeDurationMs.value)) {
      return { status: 'marginal', rule, detail: 'Surge rating is sufficient but its duration is not documented.' }
    }
    if (source.surgeDurationMs.value < requiredDurationMs) {
      return { status: 'fail', rule, detail: `Surge is held for ${source.surgeDurationMs.value} ms; this start needs about ${requiredDurationMs} ms.` }
    }
  }
  return { status: 'pass', rule, detail: `Surge rating ${source.surgeWatts.value} W covers the ${Math.round(startupPeakWatts)} W startup peak.` }
}

/** Hours to recharge from a source of known average charging power (e.g. a wall charger or solar panel). */
export function rechargeHours(capacityWhToRefill: number, chargeWatts: Evidenced, chargeEfficiency = 0.85): CalcResult<number> {
  if (!isPositive(capacityWhToRefill)) return refuse('missing_input', ['capacityWh'], 'Nothing to recharge.')
  if (!isPositive(chargeWatts.value)) return refuse('missing_input', ['chargeWatts'], 'Charging power is unknown.')
  return {
    ok: true,
    value: capacityWhToRefill / (chargeWatts.value * chargeEfficiency),
    basis: weakestBasis([chargeWatts.basis, 'assumed']),
    assumptions: [{ id: 'battery.charge_efficiency', description: 'Share of charging power that ends up stored in the battery.', value: chargeEfficiency }],
    warnings: [],
  }
}
