import type { ShopProduct } from '@/lib/catalog'
import type { RecentItem } from '@/lib/recentlyViewed'

/**
 * Lightweight on-device recommender. Blends three signals — category affinity
 * (from what the shopper has recently viewed), review strength (rating × count)
 * and featured status — then de-prioritises items they've already seen. No
 * server round-trip; personalises instantly from local behaviour.
 */
export function recommendProducts(all: ShopProduct[], recent: RecentItem[], limit = 4): ShopProduct[] {
  // Category affinity weights from recent views (more recent = slightly heavier).
  const affinity = new Map<string, number>()
  recent.forEach((r, i) => {
    const w = 1 + (recent.length - i) / recent.length
    affinity.set(r.cat, (affinity.get(r.cat) ?? 0) + w)
  })
  const viewedIds = new Set(recent.map((r) => r.id))
  const maxAffinity = Math.max(1, ...affinity.values())

  const scored = all
    .filter((p) => p.inStock !== false)
    .map((p) => {
      const catScore = (affinity.get(p.cat) ?? 0) / maxAffinity // 0..1
      const ratingScore = ((p.rating ?? 0) / 5) * Math.min(1, (p.reviewCount ?? 0) / 8) // 0..1
      const featured = p.featured ? 0.25 : 0
      const seenPenalty = viewedIds.has(p.id) ? 0.6 : 0
      // Weight affinity highest when we have history, else lean on ratings.
      const score = catScore * 1.4 + ratingScore * 1.0 + featured - seenPenalty
      return { p, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((s) => s.p)
}
