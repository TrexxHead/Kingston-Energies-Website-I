'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Heart, Scale, Star } from 'lucide-react'
import type { ShopProduct } from '@/lib/catalog'
import { fmt } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { analytics } from '@/lib/analytics'
import ProductImage from './ProductImage'
import { Badge, Button } from './ui'

export default function ProductCard({
  product,
  initialSaved = false,
  onCompare,
}: {
  product: ShopProduct
  initialSaved?: boolean
  onCompare?: (product: ShopProduct) => void
}) {
  const router = useRouter()
  const { status } = useSession()
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const soldOut = product.inStock === false
  const [saved, setSaved] = useState(initialSaved)
  const [savingFav, setSavingFav] = useState(false)

  const viewDetails = () => router.push(`/product/${product.id}`)

  const addToCart = () => {
    if (soldOut) return
    addItem({ name: product.name, price: product.price, spec: product.spec })
    analytics.trackAddToCart(product.id, product.name, 1, product.price)
    pushToast('check', 'Added to cart', product.name)
  }

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (status !== 'authenticated') {
      pushToast('star', 'Sign in to save', 'Please sign in to save products')
      router.push('/login')
      return
    }
    if (savingFav) return
    setSavingFav(true)
    const prev = saved
    setSaved(!prev)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      if (res.ok) {
        const { favorited } = await res.json()
        setSaved(favorited)
      } else setSaved(prev)
    } catch {
      setSaved(prev)
    } finally {
      setSavingFav(false)
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform .3s var(--ease-standard),box-shadow .3s var(--ease-standard)',
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transition = 'box-shadow .3s var(--ease-standard)'
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
      }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        e.currentTarget.style.transform = `perspective(900px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-6px)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transition = 'transform .45s var(--ease-standard),box-shadow .3s var(--ease-standard)'
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
      }}
    >
      <div role="button" tabIndex={0} onClick={viewDetails} onKeyDown={(e) => { if (e.key === 'Enter') viewDetails() }} aria-label={`View ${product.name}`} style={{ position: 'relative', width: '100%', aspectRatio: '1', background: '#eef3ee', cursor: 'pointer' }}>
        <ProductImage src={product.image} alt={product.name} cat={product.cat} sizes="(max-width: 900px) 100vw, 33vw" iconSize={44} />
        {/* Wishlist heart */}
        <button
          type="button"
          onClick={toggleSave}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          title={saved ? 'Saved' : 'Save'}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255,255,255,.9)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            color: saved ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
          }}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {soldOut && (
          <span style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(13,23,20,.82)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11 }}>
            Sold out
          </span>
        )}
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div role="button" tabIndex={0} onClick={viewDetails} onKeyDown={(e) => { if (e.key === 'Enter') viewDetails() }} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-text)', cursor: 'pointer' }}>{product.name}</div>
          {product.badge && <Badge tone={product.badgeTone}>{product.badge}</Badge>}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.16em', color: 'var(--color-text-muted)', marginTop: 8 }}>
          {product.spec}
        </div>
        <Stars rating={product.rating} count={product.reviewCount} />
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em', color: 'var(--color-text)' }}>
            {fmt(product.price)}
          </span>
          {product.listPrice && product.listPrice > product.price && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>{fmt(product.listPrice)}</span>
          )}
        </div>
        {/* Both actions on every card */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button size="sm" variant="outline" block onClick={viewDetails}>View</Button>
          <Button size="sm" variant="primary" block disabled={soldOut} onClick={addToCart}>{soldOut ? 'Sold out' : 'Add to cart'}</Button>
        </div>
        {onCompare && (
          <button
            type="button"
            onClick={() => onCompare(product)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text-muted)' }}
          >
            <Scale size={14} /> Compare
          </button>
        )}
      </div>
    </div>
  )
}

function Stars({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return null
  const full = Math.round(rating)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
      <span style={{ display: 'inline-flex', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={13} fill={n <= full ? '#f7941e' : 'none'} color={n <= full ? '#f7941e' : 'var(--ke-gray-300,#cbd3cb)'} />
        ))}
      </span>
      <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
        {rating.toFixed(1)}{count ? ` (${count})` : ''}
      </span>
    </div>
  )
}
