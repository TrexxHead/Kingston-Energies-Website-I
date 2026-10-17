import { type CalcResult, type Assumption, refuse, isPositive, isNonNegative } from './result'
import { daysBetween } from './units'

/**
 * Bill period comparison. Explains what changed between two bills by
 * splitting the change in CURRENT charges into four effects that sum
 * exactly to the total change:
 *
 *   period      — more or fewer billing days at the old daily use and price
 *   consumption — a change in kWh per day, at the old price
 *   price       — a change in the average variable price per kWh
 *   fixed       — a change in fixed (customer) charges
 *
 * Arrears and credits are carried separately: they change the amount due,
 * never the consumption story. Estimated readings are flagged — a large
 * swing after an estimate is often a catch-up, not new consumption.
 * Nothing here concludes that a meter or a bill is wrong.
 */

export type ReadingType = 'actual' | 'estimated' | 'unknown'

export interface BillInput {
  /** ISO date the period starts (inclusive). */
  periodStart: string
  /** ISO date the period ends (exclusive — the next period's start). */
  periodEnd: string
  kwh: number
  readingType: ReadingType
  /** Charges for THIS period only — excludes arrears, credits and payments. */
  currentCharges: number
  /** Fixed charges inside currentCharges (customer charge), if itemised. */
  fixedCharges?: number
  arrears?: number
  credits?: number
}

export interface BillComparison {
  previous: BillSummary
  current: BillSummary
  currentChargesChange: number
  effects: { period: number; consumption: number; price: number; fixed: number }
  amountDueChange: { currentCharges: number; arrears: number; credits: number; total: number }
  kwhPerDayChangePct: number | null
  flags: string[]
}

export interface BillSummary {
  days: number
  kwh: number
  kwhPerDay: number
  variableCharges: number
  averageVariablePrice: number | null
  fixedCharges: number
  fixedKnown: boolean
  amountDue: number
}

export function summariseBill(b: BillInput): CalcResult<BillSummary> {
  const days = daysBetween(b.periodStart, b.periodEnd)
  if (!Number.isFinite(days) || days <= 0) return refuse('invalid_input', ['periodStart', 'periodEnd'], 'The billing period end must be after its start.')
  if (days > 62) return refuse('invalid_input', ['periodEnd'], 'A billing period over 62 days needs to be split before comparison.')
  if (!isNonNegative(b.kwh)) return refuse('missing_input', ['kwh'], 'Enter the kWh billed for this period.')
  if (!isNonNegative(b.currentCharges)) return refuse('missing_input', ['currentCharges'], 'Enter the current charges for this period.')
  const fixedKnown = isNonNegative(b.fixedCharges)
  const fixed = fixedKnown ? (b.fixedCharges as number) : 0
  if (fixed > b.currentCharges) return refuse('invalid_input', ['fixedCharges'], 'Fixed charges cannot exceed the current charges.')
  const variable = b.currentCharges - fixed
  return {
    ok: true,
    value: {
      days,
      kwh: b.kwh,
      kwhPerDay: b.kwh / days,
      variableCharges: variable,
      averageVariablePrice: b.kwh > 0 ? variable / b.kwh : null,
      fixedCharges: fixed,
      fixedKnown,
      amountDue: b.currentCharges + (b.arrears ?? 0) - (b.credits ?? 0),
    },
    basis: b.readingType === 'actual' ? 'manufacturer' : 'customer_entered',
    assumptions: [],
    warnings: [],
  }
}

export function compareBills(previous: BillInput, current: BillInput): CalcResult<BillComparison> {
  const p = summariseBill(previous)
  if (!p.ok) return { ...p, fields: p.fields.map((f) => `previous.${f}`) }
  const c = summariseBill(current)
  if (!c.ok) return { ...c, fields: c.fields.map((f) => `current.${f}`) }
  const P = p.value
  const C = c.value
  if (P.averageVariablePrice == null || !isPositive(P.kwh)) {
    return refuse('invalid_input', ['previous.kwh'], 'The earlier bill has no kWh, so a price-versus-use split is not possible.')
  }

  const assumptions: Assumption[] = []
  const flags: string[] = []
  const priceP = P.averageVariablePrice
  const priceC = C.averageVariablePrice ?? priceP

  const period = (C.days - P.days) * P.kwhPerDay * priceP
  const consumption = C.days * (C.kwhPerDay - P.kwhPerDay) * priceP
  const price = C.kwh * (priceC - priceP)
  const fixed = C.fixedCharges - P.fixedCharges

  if (!P.fixedKnown || !C.fixedKnown) {
    flags.push('Fixed charges are not itemised on both bills, so any change in them is included in the price effect.')
  }
  if (previous.readingType !== 'actual' || current.readingType !== 'actual') {
    flags.push('At least one reading is estimated or unconfirmed. A swing after an estimated reading is often a catch-up to an actual reading rather than new usage.')
  }
  if (previous.periodEnd !== current.periodStart) {
    flags.push('The two billing periods are not back-to-back, so seasonal differences may contribute.')
  }
  const arrearsChange = (current.arrears ?? 0) - (previous.arrears ?? 0)
  const creditsChange = (current.credits ?? 0) - (previous.credits ?? 0)
  if ((current.arrears ?? 0) > 0) {
    flags.push('This bill includes an unpaid balance from earlier. It raises the amount due but is not new consumption.')
  }
  if (Math.abs(C.days - P.days) >= 3) {
    flags.push(`This period is ${C.days} days versus ${P.days} — compare kWh per day, not the monthly total.`)
  }

  return {
    ok: true,
    value: {
      previous: P,
      current: C,
      currentChargesChange: current.currentCharges - previous.currentCharges,
      effects: { period, consumption, price, fixed },
      amountDueChange: {
        currentCharges: current.currentCharges - previous.currentCharges,
        arrears: arrearsChange,
        credits: -creditsChange,
        total: C.amountDue - P.amountDue,
      },
      kwhPerDayChangePct: P.kwhPerDay > 0 ? ((C.kwhPerDay - P.kwhPerDay) / P.kwhPerDay) * 100 : null,
      flags,
    },
    basis: previous.readingType === 'actual' && current.readingType === 'actual' ? 'manufacturer' : 'customer_entered',
    assumptions,
    warnings: [],
  }
}

/**
 * Reconcile a modelled daily energy figure with a bill. The unexplained
 * difference is reported as such — never assigned to an appliance.
 */
export function reconcileWithBill(modelledKwhPerDay: { low: number; base: number; high: number }, bill: BillInput): CalcResult<{
  billedKwhPerDay: number
  unexplainedKwhPerDay: number
  withinModelRange: boolean
}> {
  const s = summariseBill(bill)
  if (!s.ok) return s
  const billed = s.value.kwhPerDay
  return {
    ok: true,
    value: {
      billedKwhPerDay: billed,
      unexplainedKwhPerDay: billed - modelledKwhPerDay.base,
      withinModelRange: billed >= modelledKwhPerDay.low && billed <= modelledKwhPerDay.high,
    },
    basis: s.basis,
    assumptions: [],
    warnings: bill.readingType === 'actual' ? [] : ['The bill reading is estimated, so the comparison is approximate.'],
  }
}
