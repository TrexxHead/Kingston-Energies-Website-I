import { type Evidenced, type Range, rangeFor, scaleRange, weakestBasis, type EvidenceBasis } from './basis'
import { type CalcResult, type Assumption, refuse, isPositive, isNonNegative } from './result'
import { WH_PER_KWH } from './units'

/**
 * How a device draws energy. Each model answers "kWh per day" from the
 * evidence that model needs — and refuses when that evidence is missing,
 * rather than borrowing a number from a different model.
 *
 * - steady:          a load that draws roughly the same power while on.
 *                    kWh/day = W × h ÷ 1000.
 * - cycling:         a compressor/thermostat load. kWh/day = running W × 24 ×
 *                    duty cycle. Hours-on-at-nameplate is NOT used.
 * - measured_energy: an energy meter reading over a known duration. The
 *                    strongest evidence, but a short reading is flagged as
 *                    not representative.
 * - cooling:         an air conditioner. Electrical input comes from a
 *                    measured/label input wattage or capacity ÷ EER — never
 *                    from the BTU/h rating alone, which is cooling OUTPUT.
 */
export type LoadModel =
  | {
      kind: 'steady'
      watts: Evidenced
      /** 'nameplate_max' marks a label maximum, which overstates typical use for variable loads. */
      wattsKind?: 'average' | 'nameplate_max'
      hoursPerDay: Evidenced
      daysPerWeek?: number
    }
  | {
      kind: 'cycling'
      runningWatts: Evidenced
      dutyCyclePct: Evidenced
    }
  | {
      kind: 'measured_energy'
      kwh: number
      overHours: number
      /** Running power observed while on, if measured — feeds simultaneous-peak checks. */
      runningWatts?: Evidenced
    }
  | {
      kind: 'cooling'
      /** Electrical input in watts, from a meter (measured) or the label's input rating (manufacturer). */
      inputWatts?: Evidenced
      /** Cooling output — only usable together with an EER. */
      capacityBtuh?: Evidenced
      /** Energy efficiency ratio: BTU/h of cooling per watt of electrical input. */
      eer?: Evidenced
      hoursPerDay: Evidenced
      /** Average fraction of rated input drawn while running (inverter modulation / compressor cycling). */
      averageLoadFraction?: Evidenced
      daysPerWeek?: number
    }

export interface DailyEnergy {
  kwhPerDay: Range
  /** Power drawn while running — the figure simultaneous-load checks need (not average over 24h). */
  runningWatts: number | null
}

/** Measured readings shorter than this are flagged as not a dependable daily figure. */
export const MIN_REPRESENTATIVE_HOURS = 24
/** Readings shorter than this are flagged as not a seasonal baseline. */
export const SEASONAL_BASELINE_HOURS = 24 * 28

const ASSUMED_COOLING_LOAD_FRACTION = { low: 0.5, base: 0.75, high: 1.0 }

function daysFactor(daysPerWeek: number | undefined): number {
  if (daysPerWeek == null) return 1
  return Math.min(7, Math.max(0, daysPerWeek)) / 7
}

export function dailyEnergy(model: LoadModel): CalcResult<DailyEnergy> {
  const assumptions: Assumption[] = []
  const warnings: string[] = []

  switch (model.kind) {
    case 'steady': {
      if (!isNonNegative(model.watts.value)) return refuse('missing_input', ['watts'], 'Enter the power this device draws in watts.')
      if (!isNonNegative(model.hoursPerDay.value) || model.hoursPerDay.value > 24)
        return refuse('invalid_input', ['hoursPerDay'], 'Hours per day must be between 0 and 24.')
      const basis = weakestBasis([model.watts.basis, model.hoursPerDay.basis])
      const df = daysFactor(model.daysPerWeek)
      const baseKwh = (model.watts.value * model.hoursPerDay.value * df) / WH_PER_KWH
      let kwhPerDay = rangeFor(baseKwh, basis)
      if (model.wattsKind === 'nameplate_max') {
        // A label maximum is an upper bound, not typical use. Keep it as the
        // high (conservative) figure and widen the range downward.
        kwhPerDay = { low: baseKwh * 0.5, base: baseKwh, high: baseKwh }
        warnings.push('Uses the nameplate maximum, which can overstate typical use. A plug-in meter reading would narrow this.')
      }
      return { ok: true, value: { kwhPerDay, runningWatts: model.watts.value }, basis, assumptions, warnings }
    }

    case 'cycling': {
      if (!isPositive(model.runningWatts.value)) return refuse('missing_input', ['runningWatts'], 'Enter the running wattage of the compressor.')
      if (!isNonNegative(model.dutyCyclePct.value) || model.dutyCyclePct.value > 100)
        return refuse('invalid_input', ['dutyCyclePct'], 'Duty cycle must be between 0% and 100%.')
      const basis = weakestBasis([model.runningWatts.basis, model.dutyCyclePct.basis])
      const baseKwh = (model.runningWatts.value * 24 * (model.dutyCyclePct.value / 100)) / WH_PER_KWH
      return { ok: true, value: { kwhPerDay: rangeFor(baseKwh, basis), runningWatts: model.runningWatts.value }, basis, assumptions, warnings }
    }

    case 'measured_energy': {
      if (!isNonNegative(model.kwh)) return refuse('missing_input', ['kwh'], 'Enter the energy reading in kWh.')
      if (!isPositive(model.overHours)) return refuse('missing_input', ['overHours'], 'Enter how many hours the reading covered.')
      const baseKwh = (model.kwh * 24) / model.overHours
      if (model.overHours < MIN_REPRESENTATIVE_HOURS) {
        warnings.push(`This reading covers ${model.overHours} h — less than a full day, so it may not reflect a typical day.`)
      } else if (model.overHours < SEASONAL_BASELINE_HOURS) {
        warnings.push('This reading is shorter than four weeks, so it is not a seasonal baseline.')
      }
      // A short reading is measured, but extrapolating it is not — widen accordingly.
      const basis: EvidenceBasis = model.overHours < MIN_REPRESENTATIVE_HOURS ? 'customer_entered' : 'measured'
      return {
        ok: true,
        value: { kwhPerDay: rangeFor(baseKwh, basis), runningWatts: model.runningWatts?.value ?? null },
        basis,
        assumptions,
        warnings,
      }
    }

    case 'cooling': {
      if (!isNonNegative(model.hoursPerDay.value) || model.hoursPerDay.value > 24)
        return refuse('invalid_input', ['hoursPerDay'], 'Hours per day must be between 0 and 24.')
      const input = coolingInputWatts(model)
      if (!input.ok) return input
      const bases: EvidenceBasis[] = [input.basis, model.hoursPerDay.basis]
      let fraction = ASSUMED_COOLING_LOAD_FRACTION
      if (model.averageLoadFraction && isPositive(model.averageLoadFraction.value) && model.averageLoadFraction.value <= 1) {
        const f = model.averageLoadFraction.value
        fraction = { low: f, base: f, high: f }
        bases.push(model.averageLoadFraction.basis)
      } else {
        bases.push('assumed')
        assumptions.push({
          id: 'cooling.average_load_fraction',
          description: 'A running AC rarely draws its full rated input the whole time. Without a meter reading we use 75% of rated input (range 50–100%).',
          value: '0.5 / 0.75 / 1.0',
        })
      }
      const basis = weakestBasis(bases)
      const df = daysFactor(model.daysPerWeek)
      const kwhAt = (f: number) => (input.value * f * model.hoursPerDay.value * df) / WH_PER_KWH
      const inner = { low: kwhAt(fraction.low), base: kwhAt(fraction.base), high: kwhAt(fraction.high) }
      const u = rangeFor(1, basis)
      const kwhPerDay = { low: inner.low * u.low, base: inner.base, high: inner.high * u.high }
      return {
        ok: true,
        value: { kwhPerDay, runningWatts: input.value },
        basis,
        assumptions: [...input.assumptions, ...assumptions],
        warnings: [...input.warnings, ...warnings],
      }
    }
  }
}

/**
 * Electrical input of a cooling unit. BTU/h alone is refused: it measures
 * heat moved, and two 12,000 BTU/h units can draw very different power.
 */
export function coolingInputWatts(model: Extract<LoadModel, { kind: 'cooling' }>): CalcResult<number> {
  if (model.inputWatts && isPositive(model.inputWatts.value)) {
    return { ok: true, value: model.inputWatts.value, basis: model.inputWatts.basis, assumptions: [], warnings: [] }
  }
  if (model.capacityBtuh && isPositive(model.capacityBtuh.value) && model.eer && isPositive(model.eer.value)) {
    return {
      ok: true,
      value: model.capacityBtuh.value / model.eer.value,
      basis: weakestBasis([model.capacityBtuh.basis, model.eer.basis]),
      assumptions: [],
      warnings: [],
    }
  }
  if (model.capacityBtuh && isPositive(model.capacityBtuh.value)) {
    return refuse(
      'missing_input',
      ['inputWatts', 'eer'],
      'BTU/h is cooling output, not electricity used. Add the input watts from the label, or the EER, to estimate energy.',
    )
  }
  return refuse('missing_input', ['inputWatts'], 'Add the input watts from the unit’s label.')
}

/** kWh/day for a quantity of identical devices. */
export function dailyEnergyForQuantity(model: LoadModel, quantity: number): CalcResult<DailyEnergy> {
  if (!isNonNegative(quantity)) return refuse('invalid_input', ['quantity'], 'Quantity must be zero or more.')
  const r = dailyEnergy(model)
  if (!r.ok) return r
  return {
    ...r,
    value: {
      kwhPerDay: scaleRange(r.value.kwhPerDay, quantity),
      runningWatts: r.value.runningWatts == null ? null : r.value.runningWatts * quantity,
    },
  }
}
