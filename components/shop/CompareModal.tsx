'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { CATALOG, fmt, type Product } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { Button } from './ui'

const ROWS: { label: string; render: (p: Product) => string }[] = [
  { label: 'Price', render: (p) => fmt(p.price) },
  { label: 'Capacity', render: (p) => p.cap ?? '—' },
  { label: 'Ports', render: (p) => p.ports ?? '—' },
  { label: 'Speed', render: (p) => p.speed ?? '—' },
  { label: 'Best for', render: (p) => p.best ?? '—' },
  { label: 'Warranty', render: (p) => p.warranty ?? '—' },
]

export default function CompareModal({ onClose }: { onClose: () => void }) {
  const { addItem } = useCart()
  const { pushToast } = useToast()

  // Overlay live prices from the DB (admin inventory) onto the catalog rows.
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/products')
      .then((r) => (r.ok ? r.json() : { prices: {} }))
      .then((d: { prices: Record<string, { price: number }> }) => {
        const map: Record<string, number> = {}
        for (const [id, v] of Object.entries(d.prices ?? {})) map[id] = v.price
        setLivePrices(map)
      })
      .catch(() => {})
  }, [])

  const powerbanks = CATALOG.filter((p) => p.cat === 'powerbanks').map((p) => ({
    ...p,
    price: livePrices[p.id] ?? p.price,
  }))

  const labelCell: React.CSSProperties = {
    padding: '13px 16px',
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
    position: 'sticky',
    left: 0,
    background: 'var(--ke-gray-50, #f6f7f6)',
    borderBottom: '1px solid var(--color-border)',
  }
  const valueCell: React.CSSProperties = {
    padding: '13px 16px',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text)',
    borderBottom: '1px solid var(--color-border)',
    borderLeft: '1px solid var(--color-border)',
    minWidth: 150,
  }

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
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          color: 'var(--color-text)',
          animation: 'keUp .3s var(--ease-out)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 30px 18px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', margin: 0 }}>
            Compare power banks
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--color-border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Horizontally scrollable table — first column (spec labels) stays put. */}
        <div style={{ overflow: 'auto', padding: '0 30px 30px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
            <thead>
              <tr>
                <th style={{ ...labelCell, borderBottom: '2px solid var(--color-border)', verticalAlign: 'bottom' }} aria-hidden />
                {powerbanks.map((p) => (
                  <th key={p.id} style={{ padding: '14px 16px', textAlign: 'left', verticalAlign: 'bottom', borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', minWidth: 150 }}>
                    <Link href={`/product/${p.id}`} onClick={onClose} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-text)', textDecoration: 'none' }}>
                      {p.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <td style={labelCell}>{row.label}</td>
                  {powerbanks.map((p) => (
                    <td key={p.id} style={valueCell}>{row.render(p)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td style={{ ...labelCell, borderBottom: 'none' }} aria-hidden />
                {powerbanks.map((p) => (
                  <td key={p.id} style={{ ...valueCell, borderBottom: 'none', paddingTop: 16 }}>
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
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
