import { prisma } from '@/lib/prisma'

/**
 * A single site-wide announcement the admin controls from Marketing. Stored as
 * JSON in SiteSetting (key "announcement"). Rendered as a slim bar across the
 * very top of every page — either a static bar or a scrolling "billboard".
 */
export interface Announcement {
  enabled: boolean
  message: string
  link: string
  style: 'marquee' | 'bar'
}

const KEY = 'announcement'

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  enabled: false,
  message: '',
  link: '',
  style: 'marquee',
}

export async function getAnnouncement(): Promise<Announcement> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
    if (!row) return DEFAULT_ANNOUNCEMENT
    return { ...DEFAULT_ANNOUNCEMENT, ...(JSON.parse(row.value) as Partial<Announcement>) }
  } catch {
    return DEFAULT_ANNOUNCEMENT
  }
}

export async function saveAnnouncement(a: Announcement): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(a) },
    update: { value: JSON.stringify(a) },
  })
}
