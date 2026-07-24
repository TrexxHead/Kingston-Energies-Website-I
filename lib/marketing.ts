import { prisma } from '@/lib/prisma'

/**
 * Admin-controlled homepage marketing: a set of short promo "banners" and a
 * headline "flash sale" strip. Stored as JSON in SiteSetting (key "marketing")
 * and rendered on the storefront homepage.
 */
export interface Banner {
  text: string
  active: boolean
}
export interface FlashSale {
  enabled: boolean
  headline: string
  subtext: string
  href: string
}
export interface MarketingConfig {
  banners: Banner[]
  flash: FlashSale
}

const KEY = 'marketing'

export const DEFAULT_MARKETING: MarketingConfig = {
  banners: [
    { text: 'Free delivery over J$10,000 — Kingston-wide', active: true },
    { text: 'New: 20,000mAh PD power bank', active: true },
    { text: 'Solar early-access waitlist now open', active: false },
  ],
  flash: { enabled: false, headline: '20% off power banks', subtext: 'This weekend only', href: '/shop' },
}

export async function getMarketing(): Promise<MarketingConfig> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
    if (!row) return DEFAULT_MARKETING
    const parsed = JSON.parse(row.value) as Partial<MarketingConfig>
    return {
      banners: Array.isArray(parsed.banners) ? parsed.banners : DEFAULT_MARKETING.banners,
      flash: { ...DEFAULT_MARKETING.flash, ...parsed.flash },
    }
  } catch {
    return DEFAULT_MARKETING
  }
}

export async function saveMarketing(cfg: MarketingConfig): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(cfg) },
    update: { value: JSON.stringify(cfg) },
  })
}
