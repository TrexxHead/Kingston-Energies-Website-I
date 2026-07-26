import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

/**
 * A unified transaction ledger — paid orders (money in) and logged expenses
 * (money out), merged and sorted by date. Backs the Finance → Transactions tab.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 60))

  const [orders, expenses] = await Promise.all([
    safe(() =>
      prisma.order.findMany({
        where: { paid: true, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, orderNo: true, customerName: true, total: true, paymentMethod: true, createdAt: true },
      }),
    ),
    safe(() =>
      prisma.expense.findMany({
        orderBy: { spentAt: 'desc' },
        take: limit,
        select: { id: true, category: true, description: true, amount: true, spentAt: true },
      }),
    ),
  ])

  const rows = [
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      type: 'in' as const,
      label: `Order ${o.orderNo}`,
      detail: `${o.customerName}${o.paymentMethod ? ` · ${o.paymentMethod}` : ''}`,
      amount: Math.round(o.total),
      date: o.createdAt,
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      type: 'out' as const,
      label: e.category,
      detail: e.description ?? '',
      amount: Math.round(e.amount),
      date: e.spentAt,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
    .map((r) => ({ ...r, date: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }))

  return NextResponse.json({ transactions: rows })
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}
