import { type CalcResult, refuse, isNonNegative } from './result'

/**
 * Tariff records and cost functions.
 *
 * A tariff is data with provenance, not a constant: geography, customer
 * class, effective dates, source and review status. The engine refuses to
 * price with a tariff that isn't approved and in effect on the date asked.
 *
 * NO real JPS rates are hard-coded here. Approved tariff versions must be
 * entered from the published Office of Utilities Regulation / JPS schedule
 * by a reviewer (see docs/platform/IMPLEMENTATION_CHECKLIST.md, F04).
 *
 * Average cost (total ÷ kWh) is NOT the saving from using one kWh less —
 * fixed charges don't fall and block rates differ. Use marginalSaving().
 */

export type TariffComponent =
  | { kind: 'fixed'; label: string; amountPerPeriod: number }
  /** Consecutive blocks; `upToKwh: null` is the final open-ended block. */
  | { kind: 'energy_blocks'; label: string; blocks: { upToKwh: number | null; ratePerKwh: number }[] }
  /** Applies to every kWh (e.g. fuel and IPP charge). */
  | { kind: 'per_kwh'; label: string; ratePerKwh: number }
  /** Percentage of the running subtotal of the components listed before it (e.g. a tax). */
  | { kind: 'percent'; label: string; percent: number }

export interface TariffVersion {
  id: string
  name: string
  geography: string
  customerClass: string
  effectiveFrom: string
  effectiveTo: string | null
  source: { title: string; url?: string; retrievedAt: string }
  reviewStatus: 'draft' | 'approved' | 'retired'
  reviewedBy?: string
  reviewedAt?: string
  currency: 'JMD'
  components: TariffComponent[]
}

export interface PeriodCost {
  lines: { label: string; amount: number }[]
  total: number
  averagePerKwh: number | null
}

export function tariffUsable(t: TariffVersion, onDate: string): { usable: boolean; reason?: string } {
  if (t.reviewStatus !== 'approved') return { usable: false, reason: `Tariff "${t.name}" is ${t.reviewStatus}, not approved.` }
  if (onDate < t.effectiveFrom) return { usable: false, reason: `Tariff "${t.name}" takes effect ${t.effectiveFrom}.` }
  if (t.effectiveTo && onDate >= t.effectiveTo) return { usable: false, reason: `Tariff "${t.name}" ended ${t.effectiveTo}.` }
  return { usable: true }
}

function blocksCost(blocks: { upToKwh: number | null; ratePerKwh: number }[], kwh: number): number {
  let remaining = kwh
  let prevCap = 0
  let cost = 0
  for (const b of blocks) {
    if (remaining <= 0) break
    const size = b.upToKwh == null ? remaining : Math.max(0, b.upToKwh - prevCap)
    const used = Math.min(remaining, size)
    cost += used * b.ratePerKwh
    remaining -= used
    if (b.upToKwh != null) prevCap = b.upToKwh
  }
  return cost
}

/** Pure arithmetic over the components — callers check tariffUsable() first. */
export function periodCostUnchecked(t: TariffVersion, kwh: number): PeriodCost {
  const lines: { label: string; amount: number }[] = []
  let subtotal = 0
  for (const c of t.components) {
    let amount = 0
    if (c.kind === 'fixed') amount = c.amountPerPeriod
    else if (c.kind === 'energy_blocks') amount = blocksCost(c.blocks, kwh)
    else if (c.kind === 'per_kwh') amount = kwh * c.ratePerKwh
    else if (c.kind === 'percent') amount = subtotal * (c.percent / 100)
    lines.push({ label: c.label, amount })
    subtotal += amount
  }
  return { lines, total: subtotal, averagePerKwh: kwh > 0 ? subtotal / kwh : null }
}

export function periodCost(t: TariffVersion, kwh: number, onDate: string): CalcResult<PeriodCost> {
  const u = tariffUsable(t, onDate)
  if (!u.usable) return refuse('not_applicable', ['tariff'], u.reason ?? 'Tariff not usable.')
  if (!isNonNegative(kwh)) return refuse('invalid_input', ['kwh'], 'kWh must be zero or more.')
  return {
    ok: true,
    value: periodCostUnchecked(t, kwh),
    basis: 'manufacturer',
    assumptions: [{ id: 'tariff.version', description: `Priced with ${t.name} (${t.id}), source: ${t.source.title}.` }],
    warnings: [],
  }
}

/**
 * Saving in one billing period from using `reduceKwh` less, at a given
 * period consumption. Fixed charges stay; the highest block falls first.
 */
export function marginalSaving(t: TariffVersion, periodKwh: number, reduceKwh: number, onDate: string): CalcResult<{ saving: number; perKwh: number }> {
  const before = periodCost(t, periodKwh, onDate)
  if (!before.ok) return before
  if (!isNonNegative(reduceKwh)) return refuse('invalid_input', ['reduceKwh'], 'Reduction must be zero or more.')
  const afterKwh = Math.max(0, periodKwh - reduceKwh)
  const after = periodCostUnchecked(t, afterKwh)
  const saving = before.value.total - after.total
  const actual = periodKwh - afterKwh
  return { ...before, value: { saving, perKwh: actual > 0 ? saving / actual : 0 } }
}
