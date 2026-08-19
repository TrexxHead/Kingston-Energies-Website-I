import { prisma } from '@/lib/prisma'
import { DEFAULT_STORM_PREP_CONTENT, type StormPrepContent } from '@/lib/stormPrepDefaults'

export type { StormPrepContent }

/**
 * Storm prep's checklist and storm-kit product picks, admin-editable via
 * /admin → Marketing → Storm prep, stored as JSON in SiteSetting (same
 * pattern as the site announcement). Falls back to the shipped defaults —
 * not an empty list — when nothing has been saved yet or the DB is
 * unreachable, so the public page never regresses to blank.
 */
const KEY = 'storm_prep_content'

export async function getStormPrepContent(): Promise<StormPrepContent> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
    if (!row) return DEFAULT_STORM_PREP_CONTENT
    const parsed = JSON.parse(row.value) as Partial<StormPrepContent>
    return {
      checklist: parsed.checklist?.length ? parsed.checklist : DEFAULT_STORM_PREP_CONTENT.checklist,
      kitProductIds: parsed.kitProductIds?.length ? parsed.kitProductIds : DEFAULT_STORM_PREP_CONTENT.kitProductIds,
      directory: parsed.directory?.length ? parsed.directory : DEFAULT_STORM_PREP_CONTENT.directory,
      educationalTips: parsed.educationalTips?.length ? parsed.educationalTips : DEFAULT_STORM_PREP_CONTENT.educationalTips,
    }
  } catch {
    return DEFAULT_STORM_PREP_CONTENT
  }
}

export async function saveStormPrepContent(content: StormPrepContent): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(content) },
    update: { value: JSON.stringify(content) },
  })
}
