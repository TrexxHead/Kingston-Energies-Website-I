import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { periodStart, type Period } from '@/lib/finance'
import { ensureChartOfAccounts } from '@/lib/ledger/post'
import { balanceSheet, cashFlow, profitAndLoss, trialBalance } from '@/lib/ledger/reports'

/**
 * Ledger-derived statements. `?report=` selects one of:
 *   trial-balance | balance-sheet | profit-loss | cash-flow
 * All four read from the same journal lines, so they can never disagree.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  await ensureChartOfAccounts()

  const url = new URL(request.url)
  const report = url.searchParams.get('report') ?? 'trial-balance'
  const period = (url.searchParams.get('period') as Period) || 'month'
  const from = periodStart(period)
  const to = url.searchParams.get('asOf') ? new Date(url.searchParams.get('asOf') as string) : new Date()

  switch (report) {
    case 'balance-sheet':
      return NextResponse.json(await balanceSheet(to))
    case 'profit-loss':
      return NextResponse.json({ period, ...(await profitAndLoss(from, to)) })
    case 'cash-flow':
      return NextResponse.json({ period, ...(await cashFlow(from, to)) })
    case 'trial-balance':
    default:
      return NextResponse.json({ period, ...(await trialBalance({ from, to })) })
  }
}
