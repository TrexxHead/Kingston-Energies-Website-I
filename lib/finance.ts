/** Shared finance helpers + the fixed expense categories. */

export const EXPENSE_CATEGORIES = [
  'Inventory / Purchases',
  'Marketing',
  'Salaries',
  'Rent',
  'Utilities',
  'Shipping & Delivery',
  'Software & Fees',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/** Month key like "2026-07" from a date. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Human month label like "Jul 2026" from a "YYYY-MM" key. */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** The last `n` month keys ending with the current month (oldest first). */
export function recentMonthKeys(n: number, now = new Date()): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    keys.push(monthKey(d))
  }
  return keys
}

/** Percentage change from previous to current (null when previous is 0). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

/* ---- Reporting periods ---- */

export type Period = 'month' | 'quarter' | 'year' | 'all'

/** Start of the given reporting period (UTC); null = all time. */
export function periodStart(period: Period, now = new Date()): Date | null {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  if (period === 'month') return new Date(Date.UTC(y, m, 1))
  if (period === 'quarter') return new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1))
  if (period === 'year') return new Date(Date.UTC(y, 0, 1))
  return null
}

export function periodLabel(period: Period, now = new Date()): string {
  const y = now.getUTCFullYear()
  if (period === 'month') return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  if (period === 'quarter') return `Q${Math.floor(now.getUTCMonth() / 3) + 1} ${y}`
  if (period === 'year') return `${y}`
  return 'All time'
}
