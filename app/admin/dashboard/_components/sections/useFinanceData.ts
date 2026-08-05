'use client'

import { useCallback, useEffect, useState } from 'react'

export interface Kpi {
  value: number
  change: number | null
}

export interface FinanceExpenseRow {
  id: string
  category: string
  description: string | null
  amount: number
  date: string
  spentAtIso: string
  documentId: string | null
  editCount: number
}

export interface FinanceData {
  kpis: { revenue: Kpi; expenses: Kpi; profit: Kpi; outstanding: Kpi }
  series: { month: string; revenue: number; expenses: number; profit: number }[]
  byCategory: { category: string; amount: number }[]
  budgets: { category: string; budget: number; actual: number }[]
  budgetMap: Record<string, number>
  recentExpenses: FinanceExpenseRow[]
  currentMonth: string
}

/**
 * The finance summary, shared by the Overview and Expenses pages.
 *
 * Both read the same endpoint, so pulling the fetch out here is what stops the
 * two screens quoting different figures for the same month — the failure that
 * made the old dashboard contradict itself.
 */
export function useFinanceData() {
  const [data, setData] = useState<FinanceData | null>(null)

  const reload = useCallback(async () => {
    const res = await fetch('/api/admin/finance')
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, reload }
}

/**
 * The expense category list — the built-in set plus whatever an admin has
 * added. Shared by every screen with a category picker (expense log,
 * budgets, receipts, the calendar's legend) so adding one in any of them
 * makes it available everywhere else immediately.
 */
export function useExpenseCategories() {
  const [categories, setCategories] = useState<string[]>([])

  const reload = useCallback(async () => {
    const res = await fetch('/api/admin/finance/categories')
    if (res.ok) setCategories((await res.json()).categories)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const addCategory = useCallback(async (name: string): Promise<string[] | null> => {
    const res = await fetch('/api/admin/finance/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return null
    const { categories: next } = await res.json()
    setCategories(next)
    return next
  }, [])

  return { categories, addCategory, reload }
}
