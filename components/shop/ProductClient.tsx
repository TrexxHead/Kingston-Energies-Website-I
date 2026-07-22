'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, Heart } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import ProductImage from '@/components/shop/ProductImage'
import { Badge, Button, Radio } from '@/components/shop/ui'
import { fmt, type ShopProduct } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'

const GALLERY = [
  '/images/powerbank-hand.jpg',
  '/images/powerbanks-window.jpg',
  '/images/charger-cable.jpg',
  '/images/otterbox-hand.jpg',
]

const SEED_REVIEWS = [
  { stars: 5, text: 'Charges my phone three times over. The LED display is a game changer — no more guessing.', who: 'RENÉE B.', date: 'JUN 2026' },
  { stars: 5, text: 'Slim enough for my pocket, tough enough for the road. Kingston-made and it shows.', who: 'MARCUS D.', date: 'MAY 2026' },
]

const monoOverline = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--color-text-muted)' } as const

export default function ProductClient({ product }: { product: ShopProduct }) {
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const { status } = useSession()
  const router = useRouter()

  const [capacity, setCapacity] = useState(0)
  const [finish, setFinish] = useState(0)
  const [reviews, setReviews] = useState(SEED_REVIEWS)
  const [revOpen, setRevOpen] = useState(false)
  const [revStars, setRevStars] = useState(5)
  const [revText, setRevText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewed, setReviewed] = useState(false)

  const soldOut = product.inStock === false
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5
  const capacities = [product.cap ?? '10,400mAh', '20,000mAh', 'Fast PD']

  const handleAdd = () => {
    if (soldOut) return
    addItem({ name: product.name, price: product.price, spec: product.spec })
    pushToast('check', 'Added to cart', product.name)
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {GALLERY.map((src) => (
              <div key={src} style={{ position: 'relative', width: '100%', height: 88, borderRadius: 14, overflow: 'hidden', background: '#eef3ee' }}>
                <Image src={src} alt="" fill sizes="120px" style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <Link href="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...monoOverline, color: 'var(--ke-green-600)', letterSpacing: '.24em' }}>
            ←&nbsp;ALL&nbsp;PRODUCTS
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(36px,5vw,52px)', letterSpacing: '-.025em', lineHeight: 1.02, color: 'var(--color-text)', margin: '16px 0 0' }}>
            {product.name}.
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'var(--color-text-muted)', marginTop: 14 }}>
            Ultra-slim triple-port power bank with an LED charge display. USB-C, Micro and USB-A — 2× faster charging in a size that fits any pocket.
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '24px 0 0', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, letterSpacing: '-.02em', color: 'var(--color-text)' }}>{fmt(product.price)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.12em', color: 'var(--color-text-muted)' }}>
              OR&nbsp;3&nbsp;×&nbsp;{fmt(Math.round(product.price / 3))}
            </span>
            {soldOut ? (
              <Badge tone="orange" dot>Sold out</Badge>
            ) : lowStock ? (
              <Badge tone="orange" dot>Only {product.stock} left</Badge>
            ) : (
              <Badge tone="green" dot>In stock</Badge>
            )}
          </div>

          <div style={{ marginTop: 26 }}>
            <div style={monoOverline}>CAPACITY</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              {capacities.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCapacity(i)}
                  style={{
                    flex: 1,
                    padding: '13px 0',
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 14,
                    border: `1.5px solid ${capacity === i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: capacity === i ? 'var(--color-primary-soft)' : '#fff',
                    color: capacity === i ? 'var(--color-primary)' : 'var(--color-text)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={monoOverline}>FINISH</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <Radio name="fin" label="Matte black" checked={finish === 0} onChange={() => setFinish(0)} />
              <Radio name="fin" label="Pearl white" checked={finish === 1} onChange={() => setFinish(1)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
            <Button size="lg" block onClick={handleAdd} disabled={soldOut} iconRight={soldOut ? undefined : <ArrowRight size={17} />}>
              {soldOut ? 'Sold out' : `Add to cart — ${fmt(product.price)}`}
            </Button>
            <Button size="lg" variant="ghost" iconLeft={<Heart size={17} />}>
              Save
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 30, borderTop: '1px solid var(--color-border)' }}>
            <SpecCell label="CAPACITY" value={product.cap ?? '10,400mAh'} bottom />
            <SpecCell label="PORTS" value={product.ports ?? 'USB-C · Micro · A'} bottom left />
            <SpecCell label="SPEED" value={product.speed ?? '2× standard'} />
            <SpecCell label="WARRANTY" value="12 months" left />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 72px' }}>
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 40, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-.02em', margin: 0 }}>Reviews</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#f7941e', fontSize: 15, letterSpacing: 2 }}>★★★★★</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.16em', color: 'var(--color-text-muted)' }}>
              4.8&nbsp;·&nbsp;{reviews.length}&nbsp;REVIEWS
            </span>
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

      <div style={{ background: '#0d1714' }}>
        <section className="kp-3col" style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 32px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
          <StatBand value={<>{product.cap ?? '10,400'}<span style={{ fontSize: 22, color: 'rgba(234,242,236,.5)' }}> mAh</span></>} label="BATTERY CAPACITY" />
          <StatBand value="×3" label="CHARGING PORTS" />
          <StatBand value={<>2<span style={{ color: '#f7941e' }}>×</span></>} label="FASTER CHARGING" />
        </section>
      </div>
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
