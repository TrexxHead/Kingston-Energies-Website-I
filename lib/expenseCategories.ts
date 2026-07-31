import { prisma } from '@/lib/prisma'
import { EXPENSE_CATEGORIES } from '@/lib/finance'

/**
 * Admin-added expense categories, on top of the built-in EXPENSE_CATEGORIES.
 * Stored as a JSON string[] in SiteSetting (key "custom-expense-categories")
 * — a curated list of names offered in pickers, not a constraint: the
 * `category` field on Expense/DocumentScan has always been free text, so
 * removing a name from this list never touches expenses already logged
 * under it.
 */
const KEY = 'custom-expense-categories'
const MAX_NAME_LENGTH = 60

export async function getCustomCategories(): Promise<string[]> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
    if (!row) return []
    const parsed = JSON.parse(row.value) as unknown
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : []
  } catch {
    return []
  }
}

/** Every category a picker should offer: built-ins first, then custom ones, alphabetical. */
export async function getAllCategories(): Promise<string[]> {
  const custom = await getCustomCategories()
  return [...EXPENSE_CATEGORIES, ...custom.sort((a, b) => a.localeCompare(b))]
}

export async function addCustomCategory(name: string): Promise<string[]> {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH)
  if (!trimmed) throw new Error('Category name cannot be empty.')

  const existing = await getCustomCategories()
  const allLower = [...EXPENSE_CATEGORIES, ...existing].map((c) => c.toLowerCase())
  if (allLower.includes(trimmed.toLowerCase())) {
    // Already exists (built-in or custom) — nothing to add, just hand back the list.
    return getAllCategories()
  }

  const next = [...existing, trimmed]
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  })
  return [...EXPENSE_CATEGORIES, ...next.sort((a, b) => a.localeCompare(b))]
}

export async function removeCustomCategory(name: string): Promise<string[]> {
  const existing = await getCustomCategories()
  const next = existing.filter((c) => c.toLowerCase() !== name.trim().toLowerCase())
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  })
  return [...EXPENSE_CATEGORIES, ...next.sort((a, b) => a.localeCompare(b))]
}
