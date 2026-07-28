import { prisma } from '@/lib/prisma'
import { accountBalances, profitAndLoss, balanceSheet } from './reports'
import { ACC } from './chart'
import { receivablesAging, payablesAging } from './aging'

/**
 * The executive KPI set, all derived from the one ledger.
 *
 * Every figure here comes from `accountBalances` or a report built on it, which
 * is what stops the dashboard disagreeing with the balance sheet. Where a ratio
 * cannot honestly be computed — no liabilities to divide by, no prior month to
 * compare against — it returns null with a reason rather than a zero that reads
 * like a real measurement.
 */

const round2 = (n: number) => Math.round(n * 100) / 100

export interface Kpi {
  value: number
  change: number | null
  /** Set when the figure cannot be computed; the tile says so instead of showing 0. */
  unavailable?: string
}

function changeBetween(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

function monthWindow(offset = 0): { from: Date; to: Date; label: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  const to = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999)
  return { from, to, label: from.toLocaleDateString('en-JM', { month: 'short', year: 'numeric' }) }
}

export async function financialHealth() {
  const thisMonth = monthWindow(0)
  const lastMonth = monthWindow(1)

  const [current, previous, sheet, balances, ar, ap] = await Promise.all([
    profitAndLoss(thisMonth.from, thisMonth.to),
    profitAndLoss(lastMonth.from, lastMonth.to),
    balanceSheet(new Date()),
    accountBalances({}),
    receivablesAging(),
    payablesAging(),
  ])

  const byCode = new Map(balances.map((b) => [b.code, b.balance]))
  const cash = round2(byCode.get(ACC.CASH) ?? 0)
  const bank = round2(byCode.get(ACC.BANK) ?? 0)
  const inventoryValue = round2(byCode.get(ACC.INVENTORY) ?? 0)

  const currentAssets = round2(
    sheet.assets.filter((a) => a.subtype === 'Current asset').reduce((s, a) => s + a.balance, 0),
  )
  const currentLiabilities = round2(
    sheet.liabilities.filter((l) => l.subtype === 'Current liability' || l.subtype === 'Payroll liability').reduce((s, l) => s + l.balance, 0),
  )

  // Quick ratio strips inventory out of current assets: it asks whether the
  // business could settle what's due without having to sell stock first.
  const quickAssets = round2(currentAssets - inventoryValue)

  const kpi = (value: number, prev: number, unavailable?: string): Kpi => ({
    value: round2(value),
    change: changeBetween(value, prev),
    ...(unavailable ? { unavailable } : {}),
  })

  return {
    period: thisMonth.label,
    kpis: {
      cash: { value: cash, change: null } as Kpi,
      bank: { value: bank, change: null } as Kpi,
      revenue: kpi(current.totalRevenue, previous.totalRevenue),
      grossProfit: kpi(current.grossProfit, previous.grossProfit),
      netProfit: kpi(current.netProfit, previous.netProfit),
      expenses: kpi(current.totalOperating + current.totalCostOfSales, previous.totalOperating + previous.totalCostOfSales),
      receivables: { value: ar.total, change: null } as Kpi,
      payables: { value: ap.total, change: null } as Kpi,
      inventoryValue: { value: inventoryValue, change: null } as Kpi,
      workingCapital: { value: sheet.workingCapital, change: null } as Kpi,
    },
    ratios: {
      currentRatio: currentLiabilities > 0 ? round2(currentAssets / currentLiabilities) : null,
      quickRatio: currentLiabilities > 0 ? round2(quickAssets / currentLiabilities) : null,
      grossMargin: current.grossMargin,
      netMargin: current.netMargin,
      /** Margins are meaningless until unit costs exist — the UI must say so. */
      costsMissing: current.costsMissing,
      /** Stated rather than assumed: with nothing owed, a liquidity ratio has no denominator. */
      ratiosUnavailable: currentLiabilities > 0 ? null : 'No current liabilities on the books, so there is nothing to measure liquidity against.',
    },
    aging: {
      receivables: ar.buckets,
      payables: ap.buckets,
      receivablesTotal: ar.total,
      payablesTotal: ap.total,
      oldestReceivableDays: ar.oldestDays,
    },
  }
}

/**
 * Revenue, expenses and profit month by month, straight from the ledger.
 *
 * Returns only months that have actually elapsed — padding the series forward
 * with zeroes would draw a cliff that looks like a collapse in trading.
 */
export async function monthlySeries(months = 6) {
  const out: { month: string; revenue: number; expenses: number; profit: number; from: string }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const w = monthWindow(i)
    const pl = await profitAndLoss(w.from, w.to)
    out.push({
      month: w.from.toLocaleDateString('en-JM', { month: 'short' }),
      from: w.from.toISOString(),
      revenue: Math.round(pl.totalRevenue),
      expenses: Math.round(pl.totalOperating + pl.totalCostOfSales),
      profit: Math.round(pl.netProfit),
    })
  }

  return out
}

/** The P&L as a walk from revenue down to what's left. */
export async function profitBridge(from: Date, to: Date) {
  const pl = await profitAndLoss(from, to)
  const steps: { label: string; value: number; total?: boolean }[] = [{ label: 'Revenue', value: pl.totalRevenue }]

  if (pl.totalCostOfSales > 0) {
    steps.push({ label: 'Cost of sales', value: -pl.totalCostOfSales })
    steps.push({ label: 'Gross profit', value: 0, total: true })
  }

  // Only the operating lines that actually moved — a zero step is a bar that
  // isn't there, and the reader spends time working out why.
  for (const e of pl.operating.filter((x) => x.balance !== 0).sort((a, b) => b.balance - a.balance).slice(0, 6)) {
    steps.push({ label: e.name, value: -e.balance })
  }

  steps.push({ label: 'Net profit', value: 0, total: true })
  return { steps, costsMissing: pl.costsMissing }
}

/** Cash held right now across every bank and cash account. */
export async function cashPosition() {
  const accounts = await prisma.ledgerAccount.findMany({ where: { isBank: true, archived: false }, orderBy: { code: 'asc' } })
  const balances = await accountBalances({})
  const byId = new Map(balances.map((b) => [b.id, b]))
  return accounts.map((a) => ({
    code: a.code,
    name: a.name,
    balance: Math.round(byId.get(a.id)?.balance ?? 0),
  }))
}
