'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, TrendingUp, Sparkles, CornerDownLeft } from 'lucide-react'
import type { ShopProduct } from '@/lib/catalog'
import { fmt, CATEGORY_PILLS } from '@/lib/catalog'
import { fuzzyScore } from '@/lib/search'
import { recommendProducts } from '@/lib/recommend'
import { getRecentlyViewed } from '@/lib/recentlyViewed'
import { analytics } from '@/lib/analytics'
import ProductImage from './ProductImage'

const RECENT_KEY = 'ke-recent-searches'

/** Searchable haystack for a product. */
function haystack(p: ShopProduct): string[] {
  return [p.name, p.spec, p.brand ?? '', ...(p.tags ?? []), ...(p.best ? [p.best] : [])].filter(Boolean)
}

function scoreProduct(query: string, p: ShopProduct): number {
  let best = 0
  for (const field of haystack(p)) best = Math.max(best, fuzzyScore(query, field))
  return best
}

export default function SmartSearch({
  products,
  query,
  onQuery,
}: {
  products: ShopProduct[]
  query: string
  onQuery: (q: string) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [recommended, setRecommended] = useState<ShopProduct[]>([])
  const [active, setActive] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecent(JSON.parse(raw))
    } catch { /* ignore */ }
    // Personalised picks from on-device browsing history.
    setRecommended(recommendProducts(products, getRecentlyViewed(), 4))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const saveRecent = (term: string) => {
    const t = term.trim()
    if (!t) return
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6)
    setRecent(next)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // Trending = best-rated / featured products' names.
  const trending = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.rating ?? 0) * (b.reviewCount ?? 0) - (a.rating ?? 0) * (a.reviewCount ?? 0) || (a.featured ? -1 : 0))
      .slice(0, 5)
      .map((p) => p.name)
  }, [products])

  const matches = useMemo(() => {
    if (!query.trim()) return []
    return products
      .map((p) => ({ p, score: scoreProduct(query, p) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [products, query])

  // Category suggestions when the query loosely matches a category label.
  const catSuggestions = useMemo(() => {
    if (!query.trim()) return []
    return CATEGORY_PILLS.filter((c) => c.id !== 'all' && fuzzyScore(query, c.label) >= 45)
  }, [query])

  // "Did you mean" — closest product name when there are no strong matches.
  const didYouMean = useMemo(() => {
    if (!query.trim() || matches.length > 0) return null
    let best: { name: string; score: number } | null = null
    for (const p of products) {
      const s = scoreProduct(query, p)
      if (s > 0 && (!best || s > best.score)) best = { name: p.name, score: s }
    }
    return best?.name ?? null
  }, [products, query, matches])

  const goToProduct = (p: ShopProduct) => {
    saveRecent(query || p.name)
    setOpen(false)
    router.push(`/product/${p.id}`)
  }

  const applyTerm = (term: string) => {
    onQuery(term)
    saveRecent(term)
    setOpen(false)
    analytics.trackSearch(term)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
    else if (e.key === 'Enter') {
      if (active >= 0 && matches[active]) goToProduct(matches[active].p)
      else applyTerm(query)
    } else if (e.key === 'Escape') setOpen(false)
  }

  const showDropdown = open

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input
          value={query}
          onChange={(e) => { onQuery(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search power banks, chargers, solar…"
          aria-label="Search products"
          style={{
            width: '100%', height: 46, padding: '0 40px 0 42px', borderRadius: 999,
            border: '1.5px solid var(--color-border)', fontSize: 14, fontFamily: 'var(--font-body)',
            outline: 'none', background: '#fff', color: 'var(--color-text)',
          }}
        />
        {query && (
          <button type="button" onClick={() => { onQuery(''); setActive(-1) }} aria-label="Clear" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 60,
            background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16,
            boxShadow: '0 20px 48px rgba(0,0,0,.16)', padding: 8, maxHeight: '70vh', overflowY: 'auto',
          }}
        >
          {query.trim() ? (
            <>
              {matches.length > 0 ? (
                matches.map((m, i) => (
                  <button
                    key={m.p.id}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => goToProduct(m.p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 10px',
                      borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: active === i ? 'var(--ke-green-50,#eef7ee)' : 'transparent',
                    }}
                  >
                    <span style={{ position: 'relative', width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#eef3ee', flexShrink: 0 }}>
                      <ProductImage src={m.p.image} alt={m.p.name} cat={m.p.cat} sizes="40px" iconSize={16} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, color: 'var(--color-text)' }}>{m.p.name}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.p.spec}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{fmt(m.p.price)}</span>
                  </button>
                ))
              ) : (
                <div style={{ padding: '14px 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  No products match “{query}”.
                  {didYouMean && (
                    <> Did you mean{' '}
                      <button type="button" onClick={() => applyTerm(didYouMean)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ke-green-700)', fontWeight: 600, fontFamily: 'inherit', fontSize: 13 }}>{didYouMean}</button>?
                    </>
                  )}
                </div>
              )}

              {catSuggestions.length > 0 && (
                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 6 }}>
                  {catSuggestions.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setOpen(false); router.push(`/shop?category=${c.id}`) }} style={rowStyle}>
                      <Search size={13} style={{ color: 'var(--color-text-muted)' }} /> Browse <strong style={{ fontWeight: 600 }}>{c.label}</strong>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {recommended.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ ...sectionLabel, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Sparkles size={11} style={{ color: 'var(--ke-green-600)' }} /> Recommended for you
                  </div>
                  {recommended.map((p) => (
                    <button key={p.id} type="button" onClick={() => goToProduct(p)} style={rowStyle}>
                      <span style={{ position: 'relative', width: 32, height: 32, borderRadius: 7, overflow: 'hidden', background: '#eef3ee', flexShrink: 0 }}>
                        <ProductImage src={p.image} alt={p.name} cat={p.cat} sizes="32px" iconSize={14} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5 }}>{fmt(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
              {recent.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <div style={sectionLabel}>Recent</div>
                  {recent.map((r) => (
                    <button key={r} type="button" onClick={() => applyTerm(r)} style={rowStyle}>
                      <Clock size={13} style={{ color: 'var(--color-text-muted)' }} /> {r}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <div style={sectionLabel}>Trending</div>
                {trending.map((t) => (
                  <button key={t} type="button" onClick={() => applyTerm(t)} style={rowStyle}>
                    <TrendingUp size={13} style={{ color: 'var(--ke-green-600)' }} /> {t}
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px 4px', fontSize: 11, color: 'var(--color-text-subtle)' }}>
            <CornerDownLeft size={12} /> Press Enter to filter the grid
          </div>
        </div>
      )}
    </div>
  )
}

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
  borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', background: 'transparent',
  fontSize: 13, color: 'var(--color-text)', fontFamily: 'var(--font-body)',
} as const

const sectionLabel = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
  color: 'var(--color-text-muted)', padding: '6px 10px 2px',
} as const
