'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Scale } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import ProductCard from '@/components/shop/ProductCard'
import CompareModal from '@/components/shop/CompareModal'
import SmartSearch from '@/components/shop/SmartSearch'
import { CATEGORY_PILLS, type Category, type ShopProduct } from '@/lib/catalog'
import { fuzzyScore } from '@/lib/search'

export default function ShopClient({ products }: { products: ShopProduct[] }) {
  const searchParams = useSearchParams()
  // Usually a single category, but a deep link can name more than one (e.g.
  // the homepage's "Chargers & cables" card links to chargers,components —
  // two separate catalog categories shown together there) via a comma-
  // separated list.
  const initialCats = (searchParams.get('category')?.split(',').filter(Boolean) as ('all' | Category)[] | undefined) ?? []
  const [cats, setCats] = useState<('all' | Category)[]>(initialCats.length ? initialCats : ['all'])
  const [query, setQuery] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/favorites')
      .then((r) => (r.ok ? r.json() : { productIds: [] }))
      .then((d: { productIds: string[] }) => setSavedIds(new Set(d.productIds ?? [])))
      .catch(() => {})
  }, [])

  const byCat = products.filter((p) => cats.includes('all') || cats.includes(p.cat))
  const q = query.trim()
  const visible = q
    ? byCat
        .map((p) => ({ p, s: Math.max(fuzzyScore(q, p.name), fuzzyScore(q, p.spec), fuzzyScore(q, p.brand ?? ''), ...(p.tags ?? []).map((t) => fuzzyScore(q, t))) }))
        .filter((m) => m.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((m) => m.p)
    : byCat
  const countLabel = String(visible.length).padStart(2, '0') + ' ITEMS'

  return (
    <CommerceShell>
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '56px 32px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-600)' }}>
              THE&nbsp;CATALOG:&nbsp;{countLabel}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(38px,6vw,56px)',
                letterSpacing: '-.025em',
                lineHeight: 1,
                color: 'var(--color-text)',
                margin: '16px 0 0',
              }}
            >
              Shop Kingston.
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORY_PILLS.map((pill) => {
              const selected = cats.includes(pill.id)
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setCats([pill.id])}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 12.5,
                    whiteSpace: 'nowrap',
                    border: `1.5px solid ${selected ? '#0d1714' : 'var(--color-border)'}`,
                    background: selected ? '#0d1714' : '#fff',
                    color: selected ? '#fff' : 'var(--color-text)',
                  }}
                >
                  {pill.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <SmartSearch products={products} query={query} onQuery={setQuery} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 999,
              padding: '9px 16px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '.2em',
              color: 'var(--color-text-muted)',
            }}
          >
            <Scale size={14} />
            COMPARE&nbsp;POWER&nbsp;BANKS
          </button>
        </div>

        <div className="kp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 20 }}>
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} initialSaved={savedIds.has(p.id)} onCompare={() => setCompareOpen(true)} />
          ))}
        </div>
      </section>

      {compareOpen && <CompareModal onClose={() => setCompareOpen(false)} />}
    </CommerceShell>
  )
}
