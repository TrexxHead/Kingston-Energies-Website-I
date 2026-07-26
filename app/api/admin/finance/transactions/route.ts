import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

/**
 * A unified transaction ledger — paid orders (money in) and logged expenses
 * (money out), merged and sorted by date. Backs the Finance → Transactions tab.
 * Supports search, a date range, and offset pagination over the full history.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20))
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from') as string) : null
  const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to') as string) : null

  const [orders, expenses] = await Promise.all([
    safe(() =>
      prisma.order.findMany({
        where: { paid: true, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNo: true, customerName: true, total: true, paymentMethod: true, createdAt: true },
      }),
    ),
    safe(() =>
      prisma.expense.findMany({
        orderBy: { spentAt: 'desc' },
        select: { id: true, category: true, description: true, amount: true, spentAt: true },
      }),
    ),
  ])

  let rows = [
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
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (from) rows = rows.filter((r) => new Date(r.date) >= from)
  if (to) rows = rows.filter((r) => new Date(r.date) <= to)
  if (q) rows = rows.filter((r) => `${r.label} ${r.detail}`.toLowerCase().includes(q))

  const total = rows.length
  const page = rows
    .slice(offset, offset + pageSize)
    .map((r) => ({ ...r, date: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }))

  return NextResponse.json({ transactions: page, total, offset, pageSize })
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}
