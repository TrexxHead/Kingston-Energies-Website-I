'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Star, ShoppingBag } from 'lucide-react'

export interface ReviewCard {
  id: string
  author: string
  location: string | null
  rating: number
  body: string
  productId: string
  productName: string
  productHref: string
  priceLabel: string
}

const CARD_WIDTH = 360 // card + gap, for arrow scroll distance

export default function ReviewCarousel({ reviews }: { reviews: ReviewCard[] }) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scrollBy = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * CARD_WIDTH, behavior: 'smooth' })
  }

  return (
    <div>
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: 20,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          padding: '4px 4px 20px',
          margin: '0 -4px',
          scrollbarWidth: 'none',
        }}
        className="ke-reviews-track"
      >
        {reviews.map((r) => (
          <article
            key={r.id}
            style={{
              scrollSnapAlign: 'start',
              flex: '0 0 auto',
              width: 'min(340px, 82vw)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              padding: 24,
              borderRadius: 20,
              background: 'var(--ke-dark-card)',
              border: '1px solid var(--ke-dark-hairline)',
            }}
          >
            <div style={{ display: 'flex', gap: 3 }} aria-label={`${r.rating} out of 5 stars`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < r.rating ? 'var(--ke-sun-300)' : 'none'}
                  color={i < r.rating ? 'var(--ke-sun-300)' : 'var(--ke-dark-text-muted)'}
                />
              ))}
            </div>

            <p style={{ flex: 1, fontSize: 15, lineHeight: 1.6, color: 'var(--ke-dark-text)' }}>“{r.body}”</p>

            <div style={{ fontSize: 13.5, color: 'var(--ke-dark-text-muted)' }}>
              <strong style={{ color: 'var(--ke-dark-text)' }}>{r.author}</strong>
              {r.location ? ` · ${r.location}` : ''}
            </div>

            <Link
              href={r.productHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
                padding: '9px 14px',
                borderRadius: 999,
                background: 'rgba(147,201,63,.12)',
                border: '1px solid rgba(147,201,63,.28)',
                color: 'var(--ke-green-400)',
                fontSize: 13,
                fontWeight: 600,
                alignSelf: 'flex-start',
              }}
            >
              <ShoppingBag size={14} />
              {r.productName} · {r.priceLabel}
            </Link>
          </article>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" aria-label="Previous reviews" onClick={() => scrollBy(-1)} style={arrowStyle}>
          <ArrowLeft size={18} />
        </button>
        <button type="button" aria-label="More reviews" onClick={() => scrollBy(1)} style={arrowStyle}>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}

const arrowStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: '50%',
  border: '1px solid var(--ke-dark-hairline)',
  background: 'rgba(255,255,255,.04)',
  color: 'var(--ke-dark-text)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
