'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Heart } from 'lucide-react'
import type { ShopProduct } from '@/lib/catalog'
import { fmt } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import ProductImage from './ProductImage'
import { Badge, Button } from './ui'

export default function ProductCard({ product, initialSaved = false }: { product: ShopProduct; initialSaved?: boolean }) {
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
      <div role="button" tabIndex={0} onClick={viewDetails} onKeyDown={(e) => { if (e.key === 'Enter') viewDetails() }} aria-label={`View ${product.name}`} style={{ position: 'relative', width: '100%', height: 215, background: '#eef3ee', cursor: 'pointer' }}>
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
        <div style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em', color: 'var(--color-text)' }}>
          {fmt(product.price)}
        </div>
        {/* Both actions on every card */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button size="sm" variant="outline" block onClick={viewDetails}>View</Button>
          <Button size="sm" variant="primary" block disabled={soldOut} onClick={addToCart}>{soldOut ? 'Sold out' : 'Add to cart'}</Button>
        </div>
      </div>
    </div>
  )
}
