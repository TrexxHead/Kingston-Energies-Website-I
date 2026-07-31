import { NextResponse } from 'next/server'
import { prisma, isMissingSchemaError } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { migrationPendingResponse } from '@/lib/apiErrors'

/** "YYYY-MM-DD" in UTC, matching how the grid keys its days. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * One month of money in vs money out, by day — backs the Finance → Calendar
 * view. Same definition of income/expense as the Transactions tab (paid,
 * non-cancelled orders in; logged expenses out), just grouped by day instead
 * of listed chronologically, so a day can be judged at a glance before
 * drilling into what actually happened on it.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const monthParam = url.searchParams.get('month') // "YYYY-MM"
  const now = new Date()
  const [y, m] = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam.split('-').map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1]

  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1)) // exclusive

  let orders: { id: string; orderNo: string; customerName: string; total: number; paymentMethod: string | null; createdAt: Date }[]
  let expenses: { id: string; category: string; description: string | null; amount: number; spentAt: Date }[]
  try {
    ;[orders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: { paid: true, status: { not: 'CANCELLED' }, createdAt: { gte: start, lt: end } },
        select: { id: true, orderNo: true, customerName: true, total: true, paymentMethod: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: { spentAt: { gte: start, lt: end } },
        select: { id: true, category: true, description: true, amount: true, spentAt: true },
      }),
    ])
  } catch (err) {
    if (isMissingSchemaError(err)) return migrationPendingResponse()
    throw err
  }

  const days: Record<string, { income: number; expense: number }> = {}
  const bump = (key: string, field: 'income' | 'expense', amount: number) => {
    if (!days[key]) days[key] = { income: 0, expense: 0 }
    days[key][field] += amount
  }

  const transactions = [
    ...orders.map((o) => {
      const key = dayKey(o.createdAt)
      bump(key, 'income', o.total)
      return {
        id: `order-${o.id}`,
        type: 'in' as const,
        label: `Order ${o.orderNo}`,
        detail: `${o.customerName}${o.paymentMethod ? ` · ${o.paymentMethod}` : ''}`,
        amount: Math.round(o.total),
        date: key,
      }
    }),
    ...expenses.map((e) => {
      const key = dayKey(e.spentAt)
      bump(key, 'expense', e.amount)
      return {
        id: `expense-${e.id}`,
        type: 'out' as const,
        label: e.category,
        detail: e.description ?? '',
        amount: Math.round(e.amount),
        date: key,
      }
    }),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const totals = Object.values(days).reduce(
    (acc, d) => ({ income: acc.income + d.income, expense: acc.expense + d.expense }),
    { income: 0, expense: 0 },
  )

  return NextResponse.json({
    month: `${y}-${String(m).padStart(2, '0')}`,
    monthLabel: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    days: Object.fromEntries(
      Object.entries(days).map(([k, v]) => [k, { income: Math.round(v.income), expense: Math.round(v.expense) }]),
    ),
    totals: {
      income: Math.round(totals.income),
      expense: Math.round(totals.expense),
      balance: Math.round(totals.income - totals.expense),
    },
    transactions,
  })
}
