import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { receivablesAging, payablesAging } from '@/lib/ledger/aging'

/** Aging detail — the buckets, plus every line behind them. */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const which = new URL(request.url).searchParams.get('type') === 'payables' ? 'payables' : 'receivables'
  const report = which === 'payables' ? await payablesAging() : await receivablesAging()

  return NextResponse.json({
    type: which,
    buckets: report.buckets,
    total: report.total,
    oldestDays: report.oldestDays,
    rows: report.rows
      .sort((a, b) => b.ageDays - a.ageDays)
      .map((r) => ({
        id: r.id,
        reference: r.reference,
        party: r.party,
        date: r.date,
        ageDays: r.ageDays,
        amount: Math.round(r.amount),
        bucket: r.bucket,
      })),
    // Stated on the report rather than left to be discovered: supplier bills
    // are not modelled as documents, so payables covers payroll only.
    scope:
      which === 'payables'
        ? 'Approved payroll and the statutory deductions owed against it. Supplier bills are not tracked as separate documents, so they are not included.'
        : 'Orders placed but not yet marked paid. The business sells on immediate payment, so an order is due the day it is placed.',
  })
}
