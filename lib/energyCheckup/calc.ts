import type { ApplianceDef, AcType, WaterType, LightType, Category } from './applianceLibrary'
import { contextWatts, ageMultiplier, CATEGORY_META } from './applianceLibrary'

export interface ApplianceRow {
  applianceId: string
  count: number
  hours: number
  /** Days between uses — 1 = every day (the default), 2 = every other day, 7 = weekly, etc. */
  intervalDays?: number
}

export interface HouseholdContext {
  acType?: AcType
  waterType?: WaterType
  lightType?: LightType
  fridgeAgeBand?: '<5' | '5-10' | '10+'
}

/**
 * Every calculation here is a separate, named, re-usable function — never
 * inlined into UI logic — so later versions (multi-month trends, an
 * expanded appliance library, MSME templates) can extend this without a
 * rebuild. See the build spec's "Foundation for Advanced Versions" section.
 */

// --- 4.1 Per-appliance estimate -------------------------------------------

export function applianceKwh(appliance: ApplianceDef, row: ApplianceRow, ctx: HouseholdContext): number {
  const watts = contextWatts(appliance, ctx)
  const mult = ageMultiplier(appliance, ctx.fridgeAgeBand)
  const interval = row.intervalDays && row.intervalDays > 0 ? row.intervalDays : 1
  const avgHoursPerDay = row.hours / interval
  return (watts * avgHoursPerDay * row.count * 30) / 1000 * mult
}

export interface ApplianceResult {
  applianceId: string
  category: Category
  kwh: number
}

export function allApplianceResults(library: ApplianceDef[], rows: Map<string, ApplianceRow>, ctx: HouseholdContext): ApplianceResult[] {
  return library.map((a) => {
    const row = rows.get(a.id) ?? { applianceId: a.id, count: a.defaultCount, hours: a.defaultHoursPerDay }
    return { applianceId: a.id, category: a.category, kwh: applianceKwh(a, row, ctx) }
  })
}

export function totalEstimatedKwh(results: ApplianceResult[]): number {
  return results.reduce((sum, r) => sum + r.kwh, 0)
}

export function byCategory(results: ApplianceResult[]): { category: Category; kwh: number }[] {
  const totals = new Map<Category, number>()
  for (const r of results) totals.set(r.category, (totals.get(r.category) ?? 0) + r.kwh)
  return (Object.keys(CATEGORY_META) as Category[])
    .map((category) => ({ category, kwh: totals.get(category) ?? 0 }))
    .filter((c) => c.kwh > 0.05)
    .sort((a, b) => b.kwh - a.kwh)
}

// --- 4.3 Calibration against the real bill --------------------------------

export interface Calibration {
  variance: number // signed fraction; positive = estimate is over the real bill
  withinBand: boolean
}

const CALIBRATION_BAND = 0.15

export function calibration(estimatedKwh: number, actualBillKwh: number | null | undefined): Calibration | null {
  if (!actualBillKwh || actualBillKwh <= 0) return null
  const variance = (estimatedKwh - actualBillKwh) / actualBillKwh
  return { variance, withinBand: Math.abs(variance) <= CALIBRATION_BAND }
}

// --- 4.4 Effective rate ----------------------------------------------------

// Manually reviewed, dated fallback — never JPS's real (multi-charge) tariff.
export const REFERENCE_RATE = { residential: 52, business: 42, reviewedOn: '2026-07' }

export interface RateResult {
  rate: number
  source: 'bill' | 'reference'
}

export function effectiveRate(billKwh: number | null | undefined, billJmd: number | null | undefined, mode: 'home' | 'biz'): RateResult {
  if (billKwh && billKwh > 0 && billJmd && billJmd > 0) {
    return { rate: billJmd / billKwh, source: 'bill' }
  }
  return { rate: mode === 'home' ? REFERENCE_RATE.residential : REFERENCE_RATE.business, source: 'reference' }
}

// --- 4.5 Savings range ------------------------------------------------------

export interface SavingsRange {
  lowPct: number
  highPct: number
  lowJmd: number
  highJmd: number
}

/** Always a range — never a single false-precise figure. */
export function savingsRange(monthlyBillJmd: number, coolingShare: number): SavingsRange {
  const [lowPct, highPct] = coolingShare > 0.35 ? [0.05, 0.15] : [0.05, 0.1]
  return {
    lowPct: lowPct * 100,
    highPct: highPct * 100,
    lowJmd: Math.round(monthlyBillJmd * lowPct),
    highJmd: Math.round(monthlyBillJmd * highPct),
  }
}

// --- 4.6 Outage cost (business) --------------------------------------------

export interface OutageCost {
  low: number
  high: number
}

export function outageCost(revenuePerHour: number, systemsThatStop: number): OutageCost {
  return {
    low: Math.round(revenuePerHour * (0.35 + 0.08 * systemsThatStop)),
    high: Math.round(revenuePerHour * (0.7 + 0.1 * systemsThatStop)),
  }
}

// --- 4.7 Solar orientation (never a quote or a design) ---------------------

export interface SolarOrientation {
  kw: number
  costLow: number
  costHigh: number
  roofAreaM2: number
  paybackYears: number
  verdict: 'strong' | 'exploring' | 'efficiency-first'
}

const PEAK_SUN_HOURS = 4.2
const COST_PER_KW_LOW = 200_000
const COST_PER_KW_HIGH = 280_000

export function solarOrientation(monthlyKwh: number, monthlyBillJmd: number): SolarOrientation {
  const dailyKwh = monthlyKwh / 30
  const kw = Math.max(1, Math.round((dailyKwh / PEAK_SUN_HOURS) * 2) / 2)
  const costLow = kw * COST_PER_KW_LOW
  const costHigh = kw * COST_PER_KW_HIGH
  const meanCost = (costLow + costHigh) / 2
  const annualOffsetValue = monthlyBillJmd * 0.7 * 12
  const paybackYears = annualOffsetValue > 0 ? meanCost / annualOffsetValue : Infinity

  let verdict: SolarOrientation['verdict'] = 'efficiency-first'
  if (monthlyKwh >= 600 || monthlyBillJmd >= 35_000) verdict = 'strong'
  else if (monthlyKwh >= 300) verdict = 'exploring'

  return { kw, costLow, costHigh, roofAreaM2: Math.round(kw * 3.6), paybackYears: Math.round(paybackYears * 10) / 10, verdict }
}

// --- Benchmark against a typical Jamaican home ------------------------------

export const TYPICAL_JA_HOME_KWH = { low: 250, high: 300 }
export const BENCHMARK_SCALE_MAX = 900

export type BenchmarkVerdict = 'below' | 'at' | 'above' | 'well-above'

export function benchmarkVerdict(kwh: number): BenchmarkVerdict {
  if (kwh < TYPICAL_JA_HOME_KWH.low) return 'below'
  if (kwh <= TYPICAL_JA_HOME_KWH.high) return 'at'
  if (kwh <= 600) return 'above'
  return 'well-above'
}

export function annualCostAtRate(monthlyKwh: number, rate: number): number {
  return Math.round(monthlyKwh * rate * 12)
}
