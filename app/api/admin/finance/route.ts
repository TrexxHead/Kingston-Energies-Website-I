import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { monthKey, monthLabel, recentMonthKeys, pctChange } from '@/lib/finance'

/**
 * The Finance dashboard's data: revenue comes automatically from orders,
 * expenses/budgets from the admin's manual entries. Returns KPIs (this month
 * vs last), a 6-month trend, expense-by-category and budget-vs-actual.
 */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const [orders, expenses, budgets] = await Promise.all([
    safe(() => prisma.order.findMany({ select: { total: true, createdAt: true, status: true, paid: true } })),
    safe(() => prisma.expense.findMany({ orderBy: { spentAt: 'desc' } })),
    safe(() => prisma.budget.findMany()),
  ])

  const months = recentMonthKeys(6)
  const revByMonth: Record<string, number> = {}
  const expByMonth: Record<string, number> = {}
  for (const m of months) {
    revByMonth[m] = 0
    expByMonth[m] = 0
  }

  for (const o of orders) {
    if (o.status === 'CANCELLED') continue
    const k = monthKey(new Date(o.createdAt))
    if (k in revByMonth) revByMonth[k] += o.total
  }
  for (const e of expenses) {
    const k = monthKey(new Date(e.spentAt))
    if (k in expByMonth) expByMonth[k] += e.amount
  }

  const series = months.map((m) => ({
    month: monthLabel(m),
    revenue: Math.round(revByMonth[m]),
    expenses: Math.round(expByMonth[m]),
    profit: Math.round(revByMonth[m] - expByMonth[m]),
  }))

  const cur = months[months.length - 1]
  const prev = months[months.length - 2]
  const curRev = revByMonth[cur]
  const prevRev = revByMonth[prev]
  const curExp = expByMonth[cur]
  const prevExp = expByMonth[prev]

  const kpis = {
    revenue: { value: Math.round(curRev), change: pctChange(curRev, prevRev) },
    expenses: { value: Math.round(curExp), change: pctChange(curExp, prevExp) },
    profit: { value: Math.round(curRev - curExp), change: pctChange(curRev - curExp, prevRev - prevExp) },
    outstanding: {
      value: Math.round(orders.filter((o) => !o.paid && o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)),
      change: null,
    },
  }

  // Expenses by category, current month.
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    if (monthKey(new Date(e.spentAt)) !== cur) continue
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
  }

  const budgetVsActual = budgets
    .map((b) => ({ category: b.category, budget: Math.round(b.monthlyAmount), actual: Math.round(byCategory[b.category] ?? 0) }))
    .sort((a, b) => b.budget - a.budget)

  const recentExpenses = expenses.slice(0, 12).map((e) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: Math.round(e.amount),
    date: new Date(e.spentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  }))

  return NextResponse.json({
    kpis,
    series,
    byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount),
    budgets: budgetVsActual,
    budgetMap: Object.fromEntries(budgets.map((b) => [b.category, Math.round(b.monthlyAmount)])),
    recentExpenses,
    currentMonth: monthLabel(cur),
  })
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}
