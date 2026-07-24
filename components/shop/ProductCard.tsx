'use client'

import { useRouter } from 'next/navigation'
import type { ShopProduct } from '@/lib/catalog'
import { fmt } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import ProductImage from './ProductImage'
import { Badge, Button } from './ui'

export default function ProductCard({ product }: { product: ShopProduct }) {
  const router = useRouter()
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const isPowerbank = product.cat === 'powerbanks'
  const soldOut = product.inStock === false

  const viewDetails = () => router.push(`/product/${product.id}`)

  const handleAdd = () => {
    if (isPowerbank) {
      router.push(`/product/${product.id}`)
      return
    }
    addItem({ name: product.name, price: product.price, spec: product.spec })
    pushToast('check', 'Added to cart', product.name)
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform .28s var(--ease-standard),box-shadow .28s var(--ease-standard)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
      }}
    >
      <div role="button" tabIndex={0} onClick={viewDetails} onKeyDown={(e) => { if (e.key === 'Enter') viewDetails() }} aria-label={`View ${product.name}`} style={{ position: 'relative', width: '100%', height: 215, background: '#eef3ee', cursor: 'pointer' }}>
        <ProductImage src={product.image} alt={product.name} cat={product.cat} sizes="(max-width: 900px) 100vw, 33vw" iconSize={44} />
        {soldOut && (
          <span
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(13,23,20,.82)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 11,
            }}
          >
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em', color: 'var(--color-text)' }}>
            {fmt(product.price)}
          </span>
          <Button size="sm" variant={isPowerbank ? 'outline' : 'primary'} onClick={handleAdd}>
            {isPowerbank ? 'View' : 'Add to cart'}
          </Button>
        </div>
      </div>
    </div>
  )
}
