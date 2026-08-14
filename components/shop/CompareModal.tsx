'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Table2, SlidersHorizontal } from 'lucide-react'
import { CATALOG, fmt, type Product } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { analytics } from '@/lib/analytics'
import { Button } from './ui'
import ProductBenchmarkDetail from './ProductBenchmarkDetail'

const ROWS: { label: string; render: (p: Product) => string }[] = [
  { label: 'Price', render: (p) => fmt(p.price) },
  { label: 'Capacity', render: (p) => p.cap ?? 'N/A' },
  { label: 'Ports', render: (p) => p.ports ?? 'N/A' },
  { label: 'Speed', render: (p) => p.speed ?? 'N/A' },
  { label: 'Best for', render: (p) => p.best ?? 'N/A' },
  { label: 'Warranty', render: (p) => p.warranty ?? 'N/A' },
]

export default function CompareModal({ onClose }: { onClose: () => void }) {
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const [view, setView] = useState<'table' | 'detail'>('table')
  const [focusedId, setFocusedId] = useState<string | null>(null)

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 30px 18px', gap: 16, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', margin: 0 }}>
            Compare power banks
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div role="group" aria-label="View" style={{ display: 'flex', gap: 4, background: 'var(--ke-gray-50,#f6f7f6)', borderRadius: 999, padding: 3 }}>
              <button
                type="button"
                aria-pressed={view === 'table'}
                onClick={() => setView('table')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'table' ? '#fff' : 'transparent', color: 'var(--color-text)', boxShadow: view === 'table' ? '0 1px 3px rgba(0,0,0,.12)' : 'none' }}
              >
                <Table2 size={13} /> Table
              </button>
              <button
                type="button"
                aria-pressed={view === 'detail'}
                onClick={() => setView('detail')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'detail' ? '#fff' : 'transparent', color: 'var(--color-text)', boxShadow: view === 'detail' ? '0 1px 3px rgba(0,0,0,.12)' : 'none' }}
              >
                <SlidersHorizontal size={13} /> Details
              </button>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--color-border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {view === 'detail' ? (
          <div style={{ overflow: 'auto', padding: '0 30px 30px' }}>
            <ProductBenchmarkDetail products={powerbanks} selectedId={focusedId ?? powerbanks[0]?.id} onSelect={setFocusedId} />
          </div>
        ) : (
        /* Horizontally scrollable table — first column (spec labels) stays put. */
        <div style={{ overflow: 'auto', padding: '0 30px 30px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
            <caption style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
              Power bank specification comparison
            </caption>
            <thead>
              <tr>
                <th style={{ ...labelCell, borderBottom: '2px solid var(--color-border)', verticalAlign: 'bottom' }} aria-hidden />
                {powerbanks.map((p) => (
                  <th key={p.id} scope="col" style={{ padding: '14px 16px', textAlign: 'left', verticalAlign: 'bottom', borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', minWidth: 150 }}>
                    <Link href={`/product/${p.id}`} onClick={onClose} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-text)', textDecoration: 'none' }}>
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setFocusedId(p.id); setView('detail') }}
                      style={{ display: 'block', marginTop: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--ke-green-700,#15803d)' }}
                    >
                      View benchmark
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" style={labelCell}>{row.label}</th>
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
                        analytics.trackAddToCart(p.id, p.name, 1, p.price)
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
        )}
      </div>
    </div>
  )
}
