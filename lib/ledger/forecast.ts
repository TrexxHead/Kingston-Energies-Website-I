import { prisma } from '@/lib/prisma'
import { periodOf, addMonths } from './schedules'

const round2 = (n: number) => Math.round(n * 100) / 100
const MONTH_LABEL = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export interface MonthPoint {
  periodLabel: string
  periodDate: string
  revenue: number
  expenses: number
  net: number
  cashIn: number
  cashOut: number
}

export type Confidence = 'none' | 'indicative' | 'low' | 'moderate' | 'good'

export interface ForecastPoint {
  periodLabel: string
  periodDate: string
  projected: number
  /** Bounds widen when history is thin — they encode how much to trust the line. */
  low: number
  high: number
}

export interface ForecastResult {
  history: MonthPoint[]
  forecast: ForecastPoint[]
  confidence: Confidence
  monthsOfHistory: number
  /** Plain-language explanation of exactly how much this projection is worth. */
  basis: string
  /** How many more months of trading before confidence improves. */
  monthsUntilNextTier: number | null
  method: 'none' | 'average' | 'trend'
  projectedCashPosition: number | null
  cashRunwayMonths: number | null
}

/**
 * Confidence is a function of how much real trading history exists — not a
 * decorative badge. With a handful of months a projection is directional at
 * best, and the UI is expected to say so rather than draw a confident line
 * through noise.
 */
function confidenceFor(months: number): { level: Confidence; nextTierAt: number | null } {
  if (months < 2) return { level: 'none', nextTierAt: 2 }
  if (months < 4) return { level: 'indicative', nextTierAt: 4 }
  if (months < 7) return { level: 'low', nextTierAt: 7 }
  if (months < 13) return { level: 'moderate', nextTierAt: 13 }
  return { level: 'good', nextTierAt: null }
}

const BASIS: Record<Confidence, string> = {
  none: 'Not enough trading history to project anything yet. At least two months of activity are needed.',
  indicative:
    'Based on very little history. Treat this as a rough indication of direction, not a number to plan against.',
  low: 'Based on a few months of trading. Useful for spotting direction; the range is wide because the sample is small.',
  moderate: 'Based on several months of trading, including some month-to-month variation. Reasonable for short-range planning.',
  good: 'Based on a year or more of trading, so seasonality and normal variation are reflected in the range.',
}

/** How wide the band should be, given how little we actually know. */
const SPREAD: Record<Confidence, number> = { none: 0, indicative: 0.6, low: 0.4, moderate: 0.25, good: 0.15 }

/**
 * Monthly revenue / expense / cash history straight from the ledger, plus a
 * forward projection whose method and error bars adapt to the data available.
 *
 * With almost no history it returns an empty forecast and says why. As months
 * of real trading accumulate it moves from a flat average to a trend line and
 * the bands tighten — no code change needed, it strengthens on its own.
 */
export async function cashForecast(monthsAhead = 6): Promise<ForecastResult> {
  const lines = await prisma.journalLine.findMany({
    include: {
      entry: { select: { date: true } },
      account: { select: { type: true, isBank: true } },
    },
  })

  // Bucket every posting into its month.
  const buckets = new Map<string, MonthPoint>()
  for (const l of lines) {
    const p = periodOf(l.entry.date)
    const key = p.toISOString()
    const row =
      buckets.get(key) ??
      ({ periodLabel: MONTH_LABEL(p), periodDate: key, revenue: 0, expenses: 0, net: 0, cashIn: 0, cashOut: 0 } as MonthPoint)

    if (l.account.type === 'REVENUE') row.revenue += l.credit - l.debit
    if (l.account.type === 'EXPENSE') row.expenses += l.debit - l.credit
    if (l.account.isBank) {
      row.cashIn += l.debit
      row.cashOut += l.credit
    }
    buckets.set(key, row)
  }

  const history = [...buckets.values()]
    .map((r) => ({
      ...r,
      revenue: round2(r.revenue),
      expenses: round2(r.expenses),
      net: round2(r.revenue - r.expenses),
      cashIn: round2(r.cashIn),
      cashOut: round2(r.cashOut),
    }))
    .sort((a, b) => a.periodDate.localeCompare(b.periodDate))

  const monthsOfHistory = history.length
  const { level, nextTierAt } = confidenceFor(monthsOfHistory)

  // Current cash position across all bank/cash accounts.
  const cashNow = round2(history.reduce((s, h) => s + h.cashIn - h.cashOut, 0))

  if (level === 'none') {
    return {
      history,
      forecast: [],
      confidence: level,
      monthsOfHistory,
      basis: BASIS.none,
      monthsUntilNextTier: nextTierAt ? nextTierAt - monthsOfHistory : null,
      method: 'none',
      projectedCashPosition: cashNow || null,
      cashRunwayMonths: null,
    }
  }

  // Net cash movement per month is what actually drives the runway.
  const netCash = history.map((h) => h.cashIn - h.cashOut)

  // With enough points, fit a least-squares trend; otherwise use a flat mean.
  // Fitting a trend to two or three points reads as false precision.
  const useTrend = monthsOfHistory >= 4
  const n = netCash.length
  const mean = netCash.reduce((s, v) => s + v, 0) / n

  let slope = 0
  let intercept = mean
  if (useTrend) {
    const xMean = (n - 1) / 2
    let num = 0
    let den = 0
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (netCash[i] - mean)
      den += (i - xMean) ** 2
    }
    slope = den === 0 ? 0 : num / den
    intercept = mean - slope * xMean
  }

  const lastPeriod = history.length ? new Date(history[history.length - 1].periodDate) : periodOf(new Date())
  const spread = SPREAD[level]

  const forecast: ForecastPoint[] = []
  let runningCash = cashNow
  let runwayMonths: number | null = null

  for (let i = 1; i <= monthsAhead; i++) {
    const period = addMonths(lastPeriod, i)
    const projected = round2(useTrend ? intercept + slope * (n - 1 + i) : mean)
    const magnitude = Math.abs(projected)
    forecast.push({
      periodLabel: MONTH_LABEL(period),
      periodDate: period.toISOString(),
      projected,
      low: round2(projected - magnitude * spread),
      high: round2(projected + magnitude * spread),
    })
    runningCash = round2(runningCash + projected)
    if (runwayMonths === null && runningCash < 0) runwayMonths = i
  }

  return {
    history,
    forecast,
    confidence: level,
    monthsOfHistory,
    basis: BASIS[level],
    monthsUntilNextTier: nextTierAt ? nextTierAt - monthsOfHistory : null,
    method: useTrend ? 'trend' : 'average',
    projectedCashPosition: runningCash,
    cashRunwayMonths: runwayMonths,
  }
}
