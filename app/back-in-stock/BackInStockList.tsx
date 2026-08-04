'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Mail } from 'lucide-react'
import { fmt } from '@/lib/catalog'

interface Item {
  id: string
  name: string
  spec: string
  price: number
  image: string | null
}

export default function BackInStockList({ products }: { products: Item[] }) {
  return (
    <div className="kp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
      {products.map((p) => (
        <ProductRow key={p.id} product={p} />
      ))}
    </div>
  )
}

function ProductRow({ product }: { product: Item }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(false)

  async function submit() {
    if (!email.trim()) return
    setSubmitting(true)
    setError(false)
    try {
      const res = await fetch('/api/restock-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, email: email.trim() }),
      })
      if (!res.ok) throw new Error('failed')
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--ke-dark-card)',
        border: '1px solid var(--ke-dark-hairline)',
        borderRadius: 20,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,.05)', position: 'relative' }}>
          {product.image && <Image src={product.image} alt={product.name} fill style={{ objectFit: 'cover' }} sizes="64px" />}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#fff' }}>{product.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em', color: 'rgba(234,242,236,.5)', marginTop: 3 }}>
            {fmt(product.price)}
          </div>
        </div>
      </div>

      {sent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--ke-green-400)' }}>
          <Check size={15} /> On the list — we&apos;ll email you.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,.14)',
              background: 'rgba(255,255,255,.04)',
              color: '#fff',
              fontSize: 13,
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--ke-green-500)',
              color: '#0a120f',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 13,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            <Mail size={13} /> Notify me
          </button>
        </div>
      )}
      {error && <p style={{ fontSize: 12, color: '#e17b6b', margin: 0 }}>Couldn&apos;t save that — try again.</p>}
    </div>
  )
}
