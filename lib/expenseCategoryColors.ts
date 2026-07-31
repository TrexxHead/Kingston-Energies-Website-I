import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORY_COLORS } from '@/lib/finance'

/**
 * Per-category colors for the expense calendar and legend. Stored as JSON in
 * SiteSetting (key "expense-category-colors") — one small preference, not
 * worth a migration. Defaults (from lib/finance, which is safe to import
 * from client components) cover every category out of the box; an admin only
 * needs to touch this if they want to reassign one.
 */
const KEY = 'expense-category-colors'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export async function getCategoryColors(): Promise<Record<string, string>> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
    const saved = row ? (JSON.parse(row.value) as Record<string, string>) : {}
    const merged = { ...DEFAULT_CATEGORY_COLORS }
    for (const [category, color] of Object.entries(saved)) {
      if (HEX_RE.test(color)) merged[category] = color
    }
    return merged
  } catch {
    return DEFAULT_CATEGORY_COLORS
  }
}

export async function saveCategoryColors(colors: Record<string, string>): Promise<void> {
  const clean: Record<string, string> = {}
  for (const [category, color] of Object.entries(colors)) {
    if (HEX_RE.test(color)) clean[category] = color
  }
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(clean) },
    update: { value: JSON.stringify(clean) },
  })
}
