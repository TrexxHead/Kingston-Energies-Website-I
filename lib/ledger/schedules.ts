import type { ScheduleKind } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { postEntry } from './post'

const round2 = (n: number) => Math.round(n * 100) / 100

/** First day of the month a date falls in, in UTC. */
export function periodOf(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

/** Add n whole months to a period start. */
export function addMonths(period: Date, n: number): Date {
  return new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + n, 1))
}

export interface SchedulePeriod {
  index: number
  periodDate: Date
  amount: number
}

/**
 * Straight-line split of `total` across `months`, starting at `startDate`.
 *
 * Rounding drift is pushed into the final period so the schedule always sums to
 * exactly the total — you can never depreciate 99.97% of an asset and leave a
 * few cents stranded on the balance sheet forever.
 */
export function straightLine(total: number, months: number, startDate: Date): SchedulePeriod[] {
  if (months <= 0 || total <= 0) return []
  const per = round2(total / months)
  const start = periodOf(startDate)
  const rows: SchedulePeriod[] = []
  let allocated = 0
  for (let i = 0; i < months; i++) {
    const isLast = i === months - 1
    const amount = isLast ? round2(total - allocated) : per
    allocated = round2(allocated + amount)
    rows.push({ index: i, periodDate: addMonths(start, i), amount })
  }
  return rows
}

/** Periods that are due (period start on or before `asOf`) and not yet posted. */
export async function duePeriods(
  kind: ScheduleKind,
  refId: string,
  schedule: SchedulePeriod[],
  asOf: Date = new Date(),
): Promise<SchedulePeriod[]> {
  const posted = await prisma.scheduleRun.findMany({ where: { kind, refId }, select: { periodDate: true } })
  const postedKeys = new Set(posted.map((p) => p.periodDate.toISOString()))
  const cutoff = periodOf(asOf)
  return schedule.filter((s) => s.periodDate <= cutoff && !postedKeys.has(s.periodDate.toISOString()))
}

/** Total already posted for a schedule. */
export async function postedTotal(kind: ScheduleKind, refId: string): Promise<number> {
  const agg = await prisma.scheduleRun.aggregate({ _sum: { amount: true }, where: { kind, refId } })
  return round2(agg._sum.amount ?? 0)
}

/**
 * Post one period of a schedule: debit one account, credit another, and record
 * the run. The unique (kind, refId, periodDate) constraint makes this safe to
 * call repeatedly — a duplicate period is skipped rather than double-posted.
 */
export async function postSchedulePeriod(opts: {
  kind: ScheduleKind
  refId: string
  period: SchedulePeriod
  debitCode: string
  creditCode: string
  memo: string
  createdBy?: string | null
}): Promise<boolean> {
  const { kind, refId, period, debitCode, creditCode, memo, createdBy } = opts
  if (period.amount <= 0) return false

  const existing = await prisma.scheduleRun.findUnique({
    where: { kind_refId_periodDate: { kind, refId, periodDate: period.periodDate } },
  })
  if (existing) return false

  // Date the entry at month end so it lands in the period it relates to.
  const entryDate = new Date(Date.UTC(period.periodDate.getUTCFullYear(), period.periodDate.getUTCMonth() + 1, 0))

  const entry = await postEntry({
    date: entryDate,
    source: 'MANUAL',
    memo,
    createdBy,
    lines: [
      { code: debitCode, debit: period.amount },
      { code: creditCode, credit: period.amount },
    ],
  })

  try {
    await prisma.scheduleRun.create({
      data: { kind, refId, periodDate: period.periodDate, amount: period.amount, entryId: entry?.id ?? null },
    })
  } catch (err) {
    // Lost a race — another run posted this period first.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') return false
    throw err
  }
  return true
}

const MONTH_LABEL = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

// ---------------------------------------------------------------------------
// Fixed assets — straight-line depreciation
// ---------------------------------------------------------------------------

export interface AssetView {
  id: string
  name: string
  cost: number
  salvageValue: number
  usefulLifeMonths: number
  acquiredAt: string
  /** Cost less salvage — the amount actually written off over the asset's life. */
  depreciableBase: number
  monthlyDepreciation: number
  accumulatedDepreciation: number
  netBookValue: number
  periodsPosted: number
  periodsDue: number
  fullyDepreciated: boolean
  disposedAt: string | null
  nextPeriodLabel: string | null
}

export async function assetView(asset: {
  id: string
  name: string
  cost: number
  salvageValue: number
  usefulLifeMonths: number
  acquiredAt: Date
  disposedAt: Date | null
}): Promise<AssetView> {
  const base = round2(asset.cost - asset.salvageValue)
  const schedule = straightLine(base, asset.usefulLifeMonths, asset.acquiredAt)
  const [accumulated, postedCount, due] = await Promise.all([
    postedTotal('DEPRECIATION', asset.id),
    prisma.scheduleRun.count({ where: { kind: 'DEPRECIATION', refId: asset.id } }),
    asset.disposedAt ? Promise.resolve([]) : duePeriods('DEPRECIATION', asset.id, schedule),
  ])

  return {
    id: asset.id,
    name: asset.name,
    cost: asset.cost,
    salvageValue: asset.salvageValue,
    usefulLifeMonths: asset.usefulLifeMonths,
    acquiredAt: asset.acquiredAt.toISOString(),
    depreciableBase: base,
    monthlyDepreciation: schedule[0]?.amount ?? 0,
    accumulatedDepreciation: accumulated,
    netBookValue: round2(asset.cost - accumulated),
    periodsPosted: postedCount,
    periodsDue: due.length,
    fullyDepreciated: accumulated >= base - 0.01,
    disposedAt: asset.disposedAt?.toISOString() ?? null,
    nextPeriodLabel: due[0] ? MONTH_LABEL(due[0].periodDate) : null,
  }
}

/** Post every depreciation period now due for one asset. */
export async function runAssetDepreciation(assetId: string, createdBy?: string | null): Promise<number> {
  const asset = await prisma.fixedAsset.findUnique({ where: { id: assetId } })
  if (!asset || asset.disposedAt) return 0

  const base = round2(asset.cost - asset.salvageValue)
  const schedule = straightLine(base, asset.usefulLifeMonths, asset.acquiredAt)
  const due = await duePeriods('DEPRECIATION', asset.id, schedule)

  let posted = 0
  for (const period of due) {
    const ok = await postSchedulePeriod({
      kind: 'DEPRECIATION',
      refId: asset.id,
      period,
      debitCode: asset.depreciationExpenseCode,
      creditCode: asset.accumDepAccountCode,
      memo: `Depreciation: ${asset.name} (${MONTH_LABEL(period.periodDate)})`,
      createdBy,
    })
    if (ok) posted++
  }
  return posted
}

// ---------------------------------------------------------------------------
// Prepaid expenses — straight-line amortization
// ---------------------------------------------------------------------------

export async function runPrepaidAmortization(prepaidId: string, createdBy?: string | null): Promise<number> {
  const prepaid = await prisma.prepaidExpense.findUnique({ where: { id: prepaidId } })
  if (!prepaid) return 0

  const schedule = straightLine(prepaid.totalAmount, prepaid.months, prepaid.startDate)
  const due = await duePeriods('AMORTIZATION', prepaid.id, schedule)

  let posted = 0
  for (const period of due) {
    const ok = await postSchedulePeriod({
      kind: 'AMORTIZATION',
      refId: prepaid.id,
      period,
      // Expense goes up, the prepaid asset comes down.
      debitCode: prepaid.expenseAccountCode,
      creditCode: prepaid.prepaidAccountCode,
      memo: `Prepaid amortization: ${prepaid.description} (${MONTH_LABEL(period.periodDate)})`,
      createdBy,
    })
    if (ok) posted++
  }
  return posted
}

// ---------------------------------------------------------------------------
// Revenue recognition — deferred revenue released to income
// ---------------------------------------------------------------------------

export async function runRevenueRecognition(scheduleId: string, createdBy?: string | null): Promise<number> {
  const sched = await prisma.revenueSchedule.findUnique({ where: { id: scheduleId } })
  if (!sched) return 0

  const schedule = straightLine(sched.totalAmount, sched.months, sched.startDate)
  const due = await duePeriods('REVENUE_RECOGNITION', sched.id, schedule)

  let posted = 0
  for (const period of due) {
    const ok = await postSchedulePeriod({
      kind: 'REVENUE_RECOGNITION',
      refId: sched.id,
      period,
      // Release the liability into earned revenue.
      debitCode: sched.deferredAccountCode,
      creditCode: sched.revenueAccountCode,
      memo: `Revenue recognised: ${sched.description} (${MONTH_LABEL(period.periodDate)})`,
      createdBy,
    })
    if (ok) posted++
  }
  return posted
}

/** Shared progress summary for a prepaid / revenue schedule. */
export async function scheduleProgress(kind: ScheduleKind, refId: string, total: number, months: number, startDate: Date) {
  const schedule = straightLine(total, months, startDate)
  const recognised = await postedTotal(kind, refId)
  const due = await duePeriods(kind, refId, schedule)
  return {
    monthly: schedule[0]?.amount ?? 0,
    recognised,
    remaining: round2(total - recognised),
    periodsDue: due.length,
    complete: recognised >= total - 0.01,
    nextPeriodLabel: due[0] ? MONTH_LABEL(due[0].periodDate) : null,
    schedule: schedule.map((s) => ({ periodLabel: MONTH_LABEL(s.periodDate), amount: s.amount })),
  }
}
