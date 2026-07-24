import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import { getShopProducts } from '@/lib/products'
import ReviewCarousel, { type ReviewCard } from './ReviewCarousel'

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default async function Reviews() {
  // Pull a wide, recent pool then randomise, so the featured strip rotates
  // through different customer reviews (including newly submitted ones) rather
  // than always showing the same newest handful. Guarded so a DB blip can never
  // break the homepage.
  let rows: Awaited<ReturnType<typeof prisma.review.findMany>> = []
  try {
    rows = await prisma.review.findMany({ orderBy: { createdAt: 'desc' }, take: 60 })
  } catch {
    return null
  }

  // Live prices from the DB (admin inventory), so the homepage figures always
  // match the shop rather than the static catalog fallback.
  const shopProducts = await getShopProducts()
  const byId = new Map(shopProducts.map((p) => [p.id, p]))

  const reviews: ReviewCard[] = shuffle(rows)
    .map((r): ReviewCard | null => {
      const product = byId.get(r.productId)
      if (!product) return null // only surface reviews whose product is in the catalog
      return {
        id: r.id,
        author: r.author,
        location: r.location,
        rating: r.rating,
        body: r.body,
        productId: r.productId,
        productName: product.name,
        productHref: `/product/${r.productId}`,
        priceLabel: fmt(product.price),
      }
    })
    .filter((r): r is ReviewCard => r !== null)
    .slice(0, 12)

  if (reviews.length === 0) return null

  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <section style={{ padding: 'clamp(56px,8vw,120px) var(--page-pad)', background: '#0d1714' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ maxWidth: 640, marginBottom: 36 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '.2em',
              color: 'var(--ke-green-400)',
              marginBottom: 14,
            }}
          >
            ★ {avg} AVERAGE · {reviews.length}+ REVIEWS
          </div>
          <h2
            style={{
              font: 'var(--text-h2)',
              fontFamily: 'var(--font-display)',
              color: '#fff',
              margin: 0,
              letterSpacing: '-.02em',
            }}
          >
            Loved across Kingston
          </h2>
          <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6, color: 'var(--ke-dark-text-muted)' }}>
            Real customers, real power. Tap any review to shop the exact product.
          </p>
        </div>

        <ReviewCarousel reviews={reviews} />
      </div>
    </section>
  )
}
