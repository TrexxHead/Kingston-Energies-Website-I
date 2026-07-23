'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, Heart } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import ProductImage from '@/components/shop/ProductImage'
import { Badge, Button } from '@/components/shop/ui'
import { fmt, type ShopProduct } from '@/lib/catalog'
import { BENCHMARK_DEVICES, parseMah, chargesFor, formatCharges, CARE_TIPS } from '@/lib/productInfo'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'

export interface ProductReview {
  stars: number
  text: string
  who: string
  date: string
}

const monoOverline = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--color-text-muted)' } as const

export default function ProductClient({ product, initialReviews = [] }: { product: ShopProduct; initialReviews?: ProductReview[] }) {
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const { status } = useSession()
  const router = useRouter()

  const [variantIdx, setVariantIdx] = useState(0)
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews)
  const [revOpen, setRevOpen] = useState(false)
  const [revStars, setRevStars] = useState(5)
  const [revText, setRevText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewed, setReviewed] = useState(false)

  const soldOut = product.inStock === false
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5
  const variants = product.variants
  const activeVariant = variants?.[variantIdx]
  const activePrice = activeVariant?.price ?? product.price
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0
  const capMah = parseMah(activeVariant?.cap ?? product.cap)
  const careTips = CARE_TIPS[product.cat]

  // Detail-page photos: the product's own gallery, else just its main image.
  const gallery = (product.gallery?.length ? product.gallery : product.image ? [product.image] : []) as string[]

  // Spec cells shown under the buy button — only render the ones this product has.
  const specCells = [
    product.cap && { label: 'CAPACITY', value: activeVariant?.cap ?? product.cap },
    product.ports && { label: 'PORTS', value: product.ports },
    product.speed && { label: 'SPEED', value: product.speed },
    { label: 'WARRANTY', value: product.warranty ?? '12 months' },
  ].filter(Boolean) as { label: string; value: string }[]

  const handleAdd = () => {
    if (soldOut) return
    const name = activeVariant ? `${product.name} (${activeVariant.label})` : product.name
    addItem({ name, price: activePrice, spec: product.spec })
    pushToast('check', 'Added to cart', name)
  }

  const submitReview = async () => {
    if (status !== 'authenticated') {
      pushToast('star', 'Sign in to review', 'Please sign in to leave a review')
      router.push('/login')
      return
    }
    const text = revText.trim()
    if (!text) {
      pushToast('star', 'Add a few words', 'Please write a short review')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, rating: revStars, body: text }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setReviews((prev) => [{ stars: revStars, text, who: 'YOU', date: 'TODAY' }, ...prev])
        setRevOpen(false)
        setRevText('')
        setReviewed(true)
        pushToast('star', 'Review submitted', `You earned ${data.pointsEarned ?? 50} points`)
      } else if (res.status === 409) {
        setReviewed(true)
        setRevOpen(false)
        pushToast('star', 'Already reviewed', 'You can only review a product once')
      } else {
        pushToast('star', 'Could not submit', data.error ?? 'Please try again')
      }
    } catch {
      pushToast('star', 'Could not submit', 'Please try again')
    }
    setSubmitting(false)
  }

  return (
    <CommerceShell>
      <section
        className="kp-2col"
        style={{ maxWidth: 1240, margin: '0 auto', padding: '56px 32px 80px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative', width: '100%', height: 440, borderRadius: 28, overflow: 'hidden', background: '#eef3ee', boxShadow: 'var(--shadow-md)' }}>
            <ProductImage src={product.image} alt={product.name} cat={product.cat} sizes="(max-width: 900px) 100vw, 600px" iconSize={72} priority />
          </div>
          {gallery.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {gallery.slice(0, 8).map((src) => (
                <div key={src} style={{ position: 'relative', width: '100%', height: 88, borderRadius: 14, overflow: 'hidden', background: '#eef3ee' }}>
                  <Image src={src} alt={product.name} fill sizes="120px" style={{ objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Link href="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...monoOverline, color: 'var(--ke-green-600)', letterSpacing: '.24em' }}>
            ←&nbsp;ALL&nbsp;PRODUCTS
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(36px,5vw,52px)', letterSpacing: '-.025em', lineHeight: 1.02, color: 'var(--color-text)', margin: '16px 0 0' }}>
            {product.name}.
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'var(--color-text-muted)', marginTop: 14 }}>
            {product.spec.split('·').map((s) => s.trim().toLowerCase()).filter(Boolean).join(' · ')}{product.best ? `. Built for ${product.best.toLowerCase()}.` : '.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '24px 0 0', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, letterSpacing: '-.02em', color: 'var(--color-text)' }}>{fmt(activePrice)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.12em', color: 'var(--color-text-muted)' }}>
              OR&nbsp;3&nbsp;×&nbsp;{fmt(Math.round(activePrice / 3))}
            </span>
            {soldOut ? (
              <Badge tone="orange" dot>Sold out</Badge>
            ) : lowStock ? (
              <Badge tone="orange" dot>Only {product.stock} left</Badge>
            ) : (
              <Badge tone="green" dot>In stock</Badge>
            )}
          </div>

          {variants && variants.length > 1 && (
            <div style={{ marginTop: 26 }}>
              <div style={monoOverline}>CAPACITY</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                {variants.map((v, i) => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => setVariantIdx(i)}
                    style={{
                      flex: 1,
                      padding: '13px 0',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 14,
                      border: `1.5px solid ${variantIdx === i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: variantIdx === i ? 'var(--color-primary-soft)' : '#fff',
                      color: variantIdx === i ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
            <Button size="lg" block onClick={handleAdd} disabled={soldOut} iconRight={soldOut ? undefined : <ArrowRight size={17} />}>
              {soldOut ? 'Sold out' : `Add to cart — ${fmt(activePrice)}`}
            </Button>
            <Button size="lg" variant="ghost" iconLeft={<Heart size={17} />}>
              Save
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 30, borderTop: '1px solid var(--color-border)' }}>
            {specCells.map((c, i) => (
              <SpecCell key={c.label} label={c.label} value={c.value} bottom={i < specCells.length - 2} left={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      {(capMah || careTips.length > 0) && (
        <section className="kp-2col" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 8px', display: 'grid', gridTemplateColumns: capMah ? '1fr 1fr' : '1fr', gap: 32 }}>
          {capMah && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', margin: '0 0 6px' }}>Charges your devices</h2>
              <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 18px' }}>
                Estimated full charges from {activeVariant?.cap ?? product.cap} (real-world, after conversion losses).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {BENCHMARK_DEVICES.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 }}>{d.name}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ke-green-700)' }}>{formatCharges(chargesFor(capMah, d.mah))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {careTips.length > 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', margin: '0 0 6px' }}>Care &amp; best practices</h2>
              <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 18px' }}>Get the longest life and best performance from your {product.name}.</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {careTips.map((tip, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.55, color: 'var(--color-text)' }}>
                    <span style={{ color: 'var(--ke-green-500)', fontWeight: 800, flexShrink: 0 }}>✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 72px' }}>
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 40, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-.02em', margin: 0 }}>Reviews</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {reviews.length > 0 && (
              <>
                <span style={{ color: '#f7941e', fontSize: 15, letterSpacing: 2 }}>
                  {'★'.repeat(Math.round(avgRating))}
                  <span style={{ color: 'var(--ke-gray-300)' }}>{'★'.repeat(5 - Math.round(avgRating))}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.16em', color: 'var(--color-text-muted)' }}>
                  {avgRating.toFixed(1)}&nbsp;·&nbsp;{reviews.length}&nbsp;{reviews.length === 1 ? 'REVIEW' : 'REVIEWS'}
                </span>
              </>
            )}
            {reviewed ? (
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--ke-green-700)' }}>✓ You reviewed this</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setRevOpen((v) => !v)}>
                {revOpen ? 'Cancel' : 'Write a review'}
              </Button>
            )}
          </div>
        </div>

        {revOpen && (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: 24, marginTop: 22, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Your rating</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRevStars(n)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: n <= revStars ? '#f7941e' : 'var(--ke-gray-300)' }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={revText}
              onChange={(e) => setRevText(e.target.value)}
              placeholder="What should other customers know?"
              rows={3}
              style={{ width: '100%', marginTop: 14, padding: '12px 14px', border: '1.5px solid var(--color-border)', borderRadius: 12, fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <Button size="sm" onClick={submitReview} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit review — earn 50 pts'}
              </Button>
            </div>
          </div>
        )}

        {reviews.length === 0 && !revOpen && (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '32px 24px', marginTop: 22, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
            No reviews yet — be the first to share your experience.
          </div>
        )}

        <div className="kp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ color: '#f7941e', fontSize: 14, letterSpacing: 2 }}>
                {'★'.repeat(r.stars)}
                <span style={{ color: 'var(--ke-gray-300)' }}>{'★'.repeat(5 - r.stars)}</span>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)', margin: '12px 0 0' }}>{r.text}</p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.16em', color: 'var(--color-text-muted)', marginTop: 14 }}>
                {r.who}&nbsp;·&nbsp;{r.date}&nbsp;·&nbsp;VERIFIED&nbsp;PURCHASE
              </div>
            </div>
          ))}
        </div>
      </section>

      {product.cat === 'powerbanks' && (
        <div style={{ background: '#0d1714' }}>
          <section className="kp-3col" style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 32px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
            <StatBand value={<>{activeVariant?.cap ?? product.cap ?? '10,000'}</>} label="BATTERY CAPACITY" />
            <StatBand value={product.ports ?? 'USB-C'} label="PORTS" />
            <StatBand value={product.speed ?? '2×'} label="CHARGING SPEED" />
          </section>
        </div>
      )}
    </CommerceShell>
  )
}

function SpecCell({ label, value, bottom = false, left = false }: { label: string; value: string; bottom?: boolean; left?: boolean }) {
  return (
    <div
      style={{
        padding: left ? '16px 0 16px 20px' : '16px 0',
        borderBottom: bottom ? '1px solid var(--color-border)' : undefined,
        borderLeft: left ? '1px solid var(--color-border)' : undefined,
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.22em', color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--color-text)', marginTop: 6 }}>{value}</div>
    </div>
  )
}

function StatBand({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 44, letterSpacing: '-.03em', color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'rgba(234,242,236,.45)', marginTop: 10 }}>{label}</div>
    </div>
  )
}
