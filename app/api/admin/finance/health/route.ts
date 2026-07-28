import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts } from '@/lib/ledger/post'
import { financialHealth, monthlySeries, profitBridge, cashPosition } from '@/lib/ledger/health'
import { accountBalances } from '@/lib/ledger/reports'

/**
 * Everything the finance dashboard needs, in one call.
 *
 * Assembled server-side from the ledger so every tile and chart on the screen
 * is derived from the same balances — the alternative, each widget fetching and
 * re-summing for itself, is exactly what made the old dashboard contradict
 * itself.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  await ensureChartOfAccounts()

  const months = Math.min(24, Math.max(3, Number(new URL(request.url).searchParams.get('months')) || 6))

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [health, series, bridge, cash, balances] = await Promise.all([
    financialHealth(),
    monthlySeries(months),
    profitBridge(monthStart, now),
    cashPosition(),
    accountBalances({ from: monthStart, to: now }),
  ])

  // Expense composition for the month, from the ledger rather than the Expense
  // table, so it agrees with the P&L on the same screen.
  const expenseMix = balances
    .filter((b) => b.type === 'EXPENSE' && b.balance > 0)
    .map((b) => ({ label: b.name, value: Math.round(b.balance) }))
    .sort((a, b) => b.value - a.value)

  const revenueMix = balances
    .filter((b) => b.type === 'REVENUE' && b.balance > 0 && b.subtype !== 'Contra revenue')
    .map((b) => ({ label: b.name, value: Math.round(b.balance) }))
    .sort((a, b) => b.value - a.value)

  return NextResponse.json({ ...health, series, bridge, cash, expenseMix, revenueMix })
}
