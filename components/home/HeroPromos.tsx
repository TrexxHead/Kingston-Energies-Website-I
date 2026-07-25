import { getMarketing } from '@/lib/marketing'
import FloatingPromos, { type FloatingPromo } from './FloatingPromos'

/**
 * Server wrapper that feeds the floating promo orbs from the same
 * admin-controlled marketing config, then renders them as a hero overlay.
 * Returns nothing when there are no active promos.
 */
export default async function HeroPromos() {
  const m = await getMarketing()
  const banners = m.banners.filter((b) => b.active && b.text.trim())
  const flash = m.flash.enabled && m.flash.headline.trim() ? m.flash : null

  const floating: FloatingPromo[] = [
    ...(flash ? [{ label: flash.headline, detail: flash.subtext || undefined, href: flash.href || '/shop', kind: 'flash' as const }] : []),
    ...banners.map((b) => ({ label: b.text, href: '/shop', kind: 'banner' as const })),
  ]

  if (floating.length === 0) return null
  return <FloatingPromos promos={floating} />
}
