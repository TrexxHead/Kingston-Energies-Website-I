import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { periodStart, periodLabel, type Period } from '@/lib/finance'

/**
 * Sales breakdown for a reporting period — total, order count, average order
 * value, and top products by revenue. Backs the Finance → Sales tab.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const period = (url.searchParams.get('period') as Period) || 'month'
  const start = periodStart(period)

  const orders = await safe(() =>
    prisma.order.findMany({
      where: { status: { not: 'CANCELLED' }, ...(start ? { createdAt: { gte: start } } : {}) },
      include: { items: true },
    }),
  )

  // Gross sales includes unpaid orders — it is not cash in hand. Split it so
  // this tab never has to be cross-referenced against Cash Flow to know how
  // much of it is real.
  const grossSales = orders.reduce((s, o) => s + o.total, 0)
  const collected = orders.filter((o) => o.paid).reduce((s, o) => s + o.total, 0)
  const outstanding = grossSales - collected
  const orderCount = orders.length
  const avgOrderValue = orderCount ? Math.round(grossSales / orderCount) : 0

  const byProduct = new Map<string, { qty: number; revenue: number }>()
  for (const o of orders) {
    for (const it of o.items) {
      // Delivery line items are a shipping charge, not a product sale.
      if (it.name.startsWith('Delivery — ')) continue
      const row = byProduct.get(it.name) ?? { qty: 0, revenue: 0 }
      row.qty += it.qty
      row.revenue += it.price * it.qty
      byProduct.set(it.name, row)
    }
  }

  const topProducts = Array.from(byProduct.entries())
    .map(([name, v]) => ({ name, qty: v.qty, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // Sales by payment method — which channels actually bring in the money.
  const byMethod = new Map<string, number>()
  for (const o of orders) {
    const key = o.paymentMethod ?? 'Unspecified'
    byMethod.set(key, (byMethod.get(key) ?? 0) + o.total)
  }
  const byPaymentMethod = Array.from(byMethod.entries())
    .map(([method, amount]) => ({ method, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)

  return NextResponse.json({
    period,
    periodLabel: periodLabel(period),
    grossSales: Math.round(grossSales),
    collected: Math.round(collected),
    outstanding: Math.round(outstanding),
    orderCount,
    avgOrderValue,
    topProducts,
    byPaymentMethod,
  })
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}
