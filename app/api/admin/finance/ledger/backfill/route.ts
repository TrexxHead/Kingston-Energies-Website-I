import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { backfillLedger } from '@/lib/ledger/backfill'
import { trialBalance } from '@/lib/ledger/reports'

/** How much of the business is currently journalled. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const [accounts, entries, orders, postedOrders, expenses, postedExpenses] = await Promise.all([
    prisma.ledgerAccount.count(),
    prisma.journalEntry.count(),
    prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
    prisma.journalEntry.count({ where: { source: 'ORDER' } }),
    prisma.expense.count(),
    prisma.journalEntry.count({ where: { source: 'EXPENSE' } }),
  ])

  const tb = entries > 0 ? await trialBalance() : null

  return NextResponse.json({
    accounts,
    entries,
    orders,
    postedOrders,
    expenses,
    postedExpenses,
    upToDate: postedOrders >= orders && postedExpenses >= expenses,
    balanced: tb?.balanced ?? true,
    totalDebit: tb?.totalDebit ?? 0,
    totalCredit: tb?.totalCredit ?? 0,
  })
}

/** Post all historical orders, payments, expenses and stock adjustments. Idempotent. */
export async function POST() {
  const denied = await guardAdmin()
  if (denied) return denied

  try {
    const result = await backfillLedger()
    const tb = await trialBalance()
    return NextResponse.json({ ...result, balanced: tb.balanced, totalDebit: tb.totalDebit, totalCredit: tb.totalCredit })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Backfill failed' }, { status: 500 })
  }
}
