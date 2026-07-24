import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { periodStart, periodLabel, type Period } from '@/lib/finance'
import { getAccounting } from '@/lib/accounting'

/**
 * Profit & Loss + cash-flow statement for a reporting period. Revenue comes from
 * orders; COGS from product unit costs; operating expenses from the expense log;
 * GCT is backed out of GCT-inclusive sales. Supports ?format=csv for export.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const period = (url.searchParams.get('period') as Period) || 'month'
  const asCsv = url.searchParams.get('format') === 'csv'
  const start = periodStart(period)

  const orderWhere = { status: { not: 'CANCELLED' as const }, ...(start ? { createdAt: { gte: start } } : {}) }
  const expenseWhere = start ? { spentAt: { gte: start } } : {}

  const [orders, expenses, products, accounting] = await Promise.all([
    safe(() => prisma.order.findMany({ where: orderWhere, include: { items: true } })),
    safe(() => prisma.expense.findMany({ where: expenseWhere })),
    safe(() => prisma.product.findMany({ select: { name: true, cost: true } })),
    getAccounting(),
  ])

  const costByName = new Map(products.filter((p) => p.cost != null).map((p) => [p.name.toLowerCase(), p.cost as number]))

  const revenue = orders.reduce((s, o) => s + o.total, 0)
  const paidRevenue = orders.filter((o) => o.paid).reduce((s, o) => s + o.total, 0)

  let cogs = 0
  let costedUnits = 0
  let totalUnits = 0
  for (const o of orders) {
    for (const it of o.items) {
      totalUnits += it.qty
      const c = costByName.get(it.name.toLowerCase())
      if (c != null) {
        cogs += c * it.qty
        costedUnits += it.qty
      }
    }
  }

  const rate = accounting.gctRate / 100
  const gct = accounting.gctInclusive ? revenue - revenue / (1 + rate) : revenue * rate
  const netRevenue = accounting.gctInclusive ? revenue - gct : revenue

  const opexByCategory: Record<string, number> = {}
  for (const e of expenses) opexByCategory[e.category] = (opexByCategory[e.category] ?? 0) + e.amount
  const totalOpex = expenses.reduce((s, e) => s + e.amount, 0)

  const grossProfit = netRevenue - cogs
  const netProfit = grossProfit - totalOpex
  const round = (n: number) => Math.round(n)

  const statement = {
    period,
    periodLabel: periodLabel(period),
    grossSales: round(revenue),
    gct: round(gct),
    gctRate: accounting.gctRate,
    netRevenue: round(netRevenue),
    cogs: round(cogs),
    cogsCoverage: totalUnits ? Math.round((costedUnits / totalUnits) * 100) : 0,
    grossProfit: round(grossProfit),
    grossMargin: netRevenue ? Math.round((grossProfit / netRevenue) * 100) : 0,
    opex: Object.entries(opexByCategory).map(([category, amount]) => ({ category, amount: round(amount) })).sort((a, b) => b.amount - a.amount),
    totalOpex: round(totalOpex),
    netProfit: round(netProfit),
    netMargin: netRevenue ? Math.round((netProfit / netRevenue) * 100) : 0,
    cashIn: round(paidRevenue),
    cashOut: round(totalOpex),
    netCash: round(paidRevenue - totalOpex),
    receivables: round(revenue - paidRevenue),
    orderCount: orders.length,
  }

  if (asCsv) {
    const fmt = (n: number) => n.toString()
    const rows: [string, string][] = [
      ['Kingston Energies — Profit & Loss', statement.periodLabel],
      ['', ''],
      ['Gross sales', fmt(statement.grossSales)],
      [`Less GCT (${statement.gctRate}%)`, fmt(-statement.gct)],
      ['Net revenue', fmt(statement.netRevenue)],
      ['Cost of goods sold', fmt(-statement.cogs)],
      ['Gross profit', fmt(statement.grossProfit)],
      [`Gross margin %`, `${statement.grossMargin}`],
      ['', ''],
      ['Operating expenses', ''],
      ...statement.opex.map((o) => [o.category, fmt(-o.amount)] as [string, string]),
      ['Total operating expenses', fmt(-statement.totalOpex)],
      ['', ''],
      ['Net profit', fmt(statement.netProfit)],
      ['Net margin %', `${statement.netMargin}`],
      ['', ''],
      ['Cash in (paid orders)', fmt(statement.cashIn)],
      ['Cash out (expenses)', fmt(-statement.cashOut)],
      ['Net cash flow', fmt(statement.netCash)],
      ['Receivables (unpaid orders)', fmt(statement.receivables)],
    ]
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kingston-pl-${period}.csv"`,
      },
    })
  }

  return NextResponse.json({ statement })
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}
