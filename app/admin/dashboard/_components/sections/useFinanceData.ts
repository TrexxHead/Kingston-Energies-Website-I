'use client'

import { useCallback, useEffect, useState } from 'react'

export interface Kpi {
  value: number
  change: number | null
}

export interface FinanceData {
  kpis: { revenue: Kpi; expenses: Kpi; profit: Kpi; outstanding: Kpi }
  series: { month: string; revenue: number; expenses: number; profit: number }[]
  byCategory: { category: string; amount: number }[]
  budgets: { category: string; budget: number; actual: number }[]
  budgetMap: Record<string, number>
  recentExpenses: { id: string; category: string; description: string | null; amount: number; date: string; documentId: string | null }[]
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
