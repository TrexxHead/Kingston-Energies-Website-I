'use client'

import { X } from 'lucide-react'
import { CATALOG, fmt } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { Button } from './ui'

const ROWS: { label: string; key: 'cap' | 'ports' | 'speed' | 'best' }[] = [
  { label: 'CAPACITY', key: 'cap' },
  { label: 'PORTS', key: 'ports' },
  { label: 'SPEED', key: 'speed' },
  { label: 'BEST FOR', key: 'best' },
]

export default function CompareModal({ onClose }: { onClose: () => void }) {
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const powerbanks = CATALOG.filter((p) => p.cat === 'powerbanks')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(13,23,20,.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'keFade .25s var(--ease-out)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 24,
          maxWidth: 1020,
          width: '100%',
          maxHeight: '86vh',
          overflowY: 'auto',
          padding: 34,
          boxShadow: 'var(--shadow-xl)',
          color: 'var(--color-text)',
          animation: 'keUp .3s var(--ease-out)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', margin: 0 }}>
            Compare power banks
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="kp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {powerbanks.map((p) => (
            <div
              key={p.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 16,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, minHeight: 40 }}>{p.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.01em' }}>{fmt(p.price)}</div>
              {ROWS.map((row) => (
                <div key={row.key}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', color: 'var(--color-text-muted)' }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{p[row.key]}</div>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                block
                onClick={() => {
                  addItem({ name: p.name, price: p.price, spec: p.spec })
                  pushToast('check', 'Added to cart', p.name)
                }}
              >
                Add to cart
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
