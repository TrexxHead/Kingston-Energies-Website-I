import type { AccountType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { naturalBalance } from './chart'

export interface AccountBalance {
  id: string
  code: string
  name: string
  type: AccountType
  subtype: string | null
  debit: number
  credit: number
  /** Signed in the account's own natural direction. */
  balance: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Sum every journal line per account within an optional date window.
 * This is the single primitive every statement below is built from — which is
 * what guarantees the Trial Balance, Balance Sheet and P&L can never disagree.
 */
export async function accountBalances(opts: { from?: Date | null; to?: Date | null } = {}): Promise<AccountBalance[]> {
  const where =
    opts.from || opts.to
      ? { entry: { date: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } } }
      : {}

  const [accounts, grouped] = await Promise.all([
    prisma.ledgerAccount.findMany({ orderBy: { code: 'asc' } }),
    prisma.journalLine.groupBy({ by: ['accountId'], _sum: { debit: true, credit: true }, where }),
  ])

  const sums = new Map(grouped.map((g) => [g.accountId, { debit: g._sum.debit ?? 0, credit: g._sum.credit ?? 0 }]))

  return accounts.map((a) => {
    const s = sums.get(a.id) ?? { debit: 0, credit: 0 }
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      debit: round2(s.debit),
      credit: round2(s.credit),
      balance: round2(naturalBalance(a.type, s.debit, s.credit)),
    }
  })
}

/** Trial balance: every account with a non-zero movement, plus proof it balances. */
export async function trialBalance(opts: { from?: Date | null; to?: Date | null } = {}) {
  const rows = (await accountBalances(opts)).filter((r) => r.debit !== 0 || r.credit !== 0)
  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0))
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0))
  return {
    rows,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  }
}

/**
 * Profit & loss for a period, straight off the ledger.
 * Revenue is credit-natural, expenses debit-natural, so both read positive.
 */
export async function profitAndLoss(from: Date | null, to: Date | null) {
  const balances = await accountBalances({ from, to })

  const revenue = balances.filter((b) => b.type === 'REVENUE' && b.balance !== 0)
  const expenses = balances.filter((b) => b.type === 'EXPENSE' && b.balance !== 0)

  const costOfSales = expenses.filter((e) => e.subtype === 'Cost of sales')
  const operating = expenses.filter((e) => e.subtype !== 'Cost of sales')

  const totalRevenue = round2(revenue.reduce((s, r) => s + r.balance, 0))
  const totalCostOfSales = round2(costOfSales.reduce((s, r) => s + r.balance, 0))
  const grossProfit = round2(totalRevenue - totalCostOfSales)
  const totalOperating = round2(operating.reduce((s, r) => s + r.balance, 0))
  const netProfit = round2(grossProfit - totalOperating)

  return {
    revenue,
    costOfSales,
    operating,
    totalRevenue,
    totalCostOfSales,
    grossProfit,
    grossMargin: totalRevenue ? Math.round((grossProfit / totalRevenue) * 100) : null,
    totalOperating,
    netProfit,
    netMargin: totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : null,
    /** True when no product costs have been entered — callers must caveat margins. */
    costsMissing: totalCostOfSales === 0,
  }
}

/**
 * Balance sheet as at a date.
 *
 * Current-period earnings (revenue − expenses, which live in nominal accounts
 * until a year-end close) are surfaced as their own equity line so the sheet
 * balances without needing a closing journal to have been run.
 */
export async function balanceSheet(asOf: Date) {
  const balances = await accountBalances({ to: asOf })

  const assets = balances.filter((b) => b.type === 'ASSET' && b.balance !== 0)
  const liabilities = balances.filter((b) => b.type === 'LIABILITY' && b.balance !== 0)
  const equityAccounts = balances.filter((b) => b.type === 'EQUITY' && b.balance !== 0)

  const totalRevenue = round2(balances.filter((b) => b.type === 'REVENUE').reduce((s, r) => s + r.balance, 0))
  const totalExpense = round2(balances.filter((b) => b.type === 'EXPENSE').reduce((s, r) => s + r.balance, 0))
  const currentEarnings = round2(totalRevenue - totalExpense)

  const totalAssets = round2(assets.reduce((s, r) => s + r.balance, 0))
  const totalLiabilities = round2(liabilities.reduce((s, r) => s + r.balance, 0))
  const totalEquity = round2(equityAccounts.reduce((s, r) => s + r.balance, 0) + currentEarnings)

  const currentAssets = assets.filter((a) => a.subtype === 'Current asset')
  const currentLiabilities = liabilities.filter((l) => l.subtype === 'Current liability')
  const totalCurrentAssets = round2(currentAssets.reduce((s, r) => s + r.balance, 0))
  const totalCurrentLiabilities = round2(currentLiabilities.reduce((s, r) => s + r.balance, 0))

  return {
    asOf: asOf.toISOString(),
    assets,
    liabilities,
    equityAccounts,
    currentEarnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    /** Assets − (Liabilities + Equity). Non-zero means something is wrong. */
    outOfBalance: round2(totalAssets - (totalLiabilities + totalEquity)),
    workingCapital: round2(totalCurrentAssets - totalCurrentLiabilities),
    currentRatio: totalCurrentLiabilities ? Math.round((totalCurrentAssets / totalCurrentLiabilities) * 100) / 100 : null,
  }
}

/** Ledger detail for one account, with a running balance. */
export async function generalLedger(accountId: string, opts: { from?: Date | null; to?: Date | null } = {}) {
  const account = await prisma.ledgerAccount.findUnique({ where: { id: accountId } })
  if (!account) return null

  // Everything before the window forms the opening balance.
  const opening = opts.from
    ? await prisma.journalLine.aggregate({
        _sum: { debit: true, credit: true },
        where: { accountId, entry: { date: { lt: opts.from } } },
      })
    : null
  let running = opening ? naturalBalance(account.type, opening._sum.debit ?? 0, opening._sum.credit ?? 0) : 0
  const openingBalance = round2(running)

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      entry: { date: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } },
    },
    include: { entry: { select: { entryNo: true, date: true, memo: true, source: true } } },
    orderBy: [{ entry: { date: 'asc' } }, { id: 'asc' }],
  })

  const rows = lines.map((l) => {
    running += naturalBalance(account.type, l.debit, l.credit)
    return {
      id: l.id,
      entryNo: l.entry.entryNo,
      date: l.entry.date.toISOString(),
      memo: l.memo ?? l.entry.memo,
      source: l.entry.source,
      debit: round2(l.debit),
      credit: round2(l.credit),
      balance: round2(running),
    }
  })

  return {
    account: { id: account.id, code: account.code, name: account.name, type: account.type, subtype: account.subtype },
    openingBalance,
    closingBalance: round2(running),
    rows,
  }
}

/** Cash movement over a period, split by bank/cash account. */
export async function cashFlow(from: Date | null, to: Date | null) {
  const bankAccounts = await prisma.ledgerAccount.findMany({ where: { isBank: true }, select: { id: true, code: true, name: true } })
  const ids = bankAccounts.map((a) => a.id)
  if (ids.length === 0) return { accounts: [], totalIn: 0, totalOut: 0, net: 0 }

  const grouped = await prisma.journalLine.groupBy({
    by: ['accountId'],
    _sum: { debit: true, credit: true },
    where: {
      accountId: { in: ids },
      entry: { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } },
    },
  })
  const sums = new Map(grouped.map((g) => [g.accountId, { debit: g._sum.debit ?? 0, credit: g._sum.credit ?? 0 }]))

  const accounts = bankAccounts.map((a) => {
    const s = sums.get(a.id) ?? { debit: 0, credit: 0 }
    return { code: a.code, name: a.name, in: round2(s.debit), out: round2(s.credit), net: round2(s.debit - s.credit) }
  })

  return {
    accounts,
    totalIn: round2(accounts.reduce((s, a) => s + a.in, 0)),
    totalOut: round2(accounts.reduce((s, a) => s + a.out, 0)),
    net: round2(accounts.reduce((s, a) => s + a.net, 0)),
  }
}
