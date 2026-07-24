'use client'

import { useEffect, useState } from 'react'
import { TriangleAlert, Star } from 'lucide-react'
import Badge from '../ui/Badge'
import { cardStyle, h3Style } from '../ui/card'
import SheetsSyncCard from './SheetsSyncCard'
import { fmt } from '../mockData'
import Skeleton from '@/components/Skeleton'

interface Metrics {
  kpis: {
    revenue: number
    monthRevenue: number
    orders: number
    aov: number
    customers: number
    newCustomers: number
    repeatRate: number
    pendingDeliveries: number
    unpaid: number
    lowStockCount: number
    avgRating: number | null
    reviewCount: number
    inventoryValue: number
    abandonedCarts: number
    abandonedValue: number
    conversionRate: number | null
    openTickets: number
    campaignsSent: number
    campaignReach: number
  }
  revenueSeries: { label: string; value: number }[]
  bestSellers: { name: string; units: number }[]
  lowStock: { name: string; stock: number; out: boolean }[]
  customerGrowth: { total: number; newThisMonth: number }
  recentReviews: { author: string; rating: number; body: string; at: string }[]
}

function relTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function ExecutiveSection() {
  const [m, setM] = useState<Metrics | null>(null)

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((r) => (r.ok ? r.json() : null))
      .then(setM)
      .catch(() => {})
  }, [])

  const k = m?.kpis
  const stats: { label: string; value: string; sub?: string }[] = [
    { label: 'TOTAL REVENUE', value: k ? fmt(k.revenue) : '—', sub: k ? `${fmt(k.monthRevenue)} this month` : undefined },
    { label: 'ORDERS', value: k ? String(k.orders) : '—' },
    { label: 'AVG ORDER VALUE', value: k ? fmt(k.aov) : '—' },
    { label: 'REPEAT CUSTOMERS', value: k ? `${k.repeatRate}%` : '—' },
    { label: 'CONVERSION RATE', value: k?.conversionRate != null ? `${k.conversionRate}%` : '—', sub: 'checkout completion' },
    { label: 'ABANDONED CARTS', value: k ? String(k.abandonedCarts) : '—', sub: k && k.abandonedValue ? `${fmt(k.abandonedValue)} value` : undefined },
    { label: 'PENDING DELIVERIES', value: k ? String(k.pendingDeliveries) : '—', sub: k && k.unpaid ? `${k.unpaid} unpaid` : undefined },
    { label: 'LOW / OUT OF STOCK', value: k ? String(k.lowStockCount) : '—' },
    { label: 'CUSTOMERS', value: k ? String(k.customers) : '—', sub: k ? `+${k.newCustomers} this month` : undefined },
    { label: 'AVG RATING', value: k?.avgRating != null ? `${k.avgRating}★` : '—', sub: k ? `${k.reviewCount} reviews` : undefined },
    { label: 'OPEN SUPPORT TICKETS', value: k ? String(k.openTickets) : '—' },
    { label: 'CAMPAIGNS SENT', value: k ? String(k.campaignsSent) : '—', sub: k && k.campaignReach ? `${k.campaignReach} reached` : undefined },
  ]

  const series = m?.revenueSeries ?? []
  const maxBar = Math.max(1, ...series.map((s) => s.value))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="kad-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
            {m ? (
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-.01em' }}>{s.value}</div>
            ) : (
              <Skeleton width={64} height={22} />
            )}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--color-text-muted)', marginTop: 5 }}>
              {s.label}
            </div>
            {m && s.sub && <div style={{ fontSize: 10.5, color: 'var(--ke-green-600)', marginTop: 5 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ ...h3Style, margin: 0 }}>Revenue — last 14 days</h3>
            <Badge tone="green">Live</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
            {series.length === 0 ? (
              <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', alignSelf: 'center' }}>Loading…</span>
            ) : (
              series.map((s, i) => {
                const isLast = i === series.length - 1
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${fmt(s.value)}`}>
                    <div
                      style={{
                        width: '100%',
                        height: Math.max(2, (s.value / maxBar) * 120),
                        borderRadius: '4px 4px 2px 2px',
                        background: isLast ? 'var(--gradient-sun)' : 'var(--gradient-brand)',
                        opacity: isLast ? 1 : 0.85,
                      }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-subtle)' }}>{s.label}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Best sellers</h3>
          {m && m.bestSellers.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No sales yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(m?.bestSellers ?? []).map((p, i) => (
                <div key={p.name} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5 }}>{p.units} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ ...cardStyle, border: '1px solid var(--ke-sun-400)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TriangleAlert size={16} color="var(--ke-sun-400)" />
            <h3 style={{ ...h3Style, margin: 0 }}>Low stock alerts</h3>
          </div>
          {m && m.lowStock.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>Everything is well stocked.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(m?.lowStock ?? []).map((a) => (
                <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  <Badge tone="orange">{a.out ? 'Out of stock' : `${a.stock} left`}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Customer growth</h3>
          <div style={{ display: 'flex', gap: 26 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{m?.customerGrowth.total ?? '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>total customers</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--ke-green-600)' }}>
                +{m?.customerGrowth.newThisMonth ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>new this month</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{k ? fmt(k.inventoryValue) : '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>inventory value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent reviews */}
      <div style={cardStyle}>
        <h3 style={h3Style}>Recent reviews</h3>
        {m && m.recentReviews.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No reviews yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(m?.recentReviews ?? []).map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderTop: i > 0 ? '1px solid var(--color-border)' : 'none', paddingTop: i > 0 ? 12 : 0 }}>
                <span style={{ display: 'inline-flex', gap: 1, flexShrink: 0 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={12} fill={n <= r.rating ? '#f7941e' : 'none'} color={n <= r.rating ? '#f7941e' : 'var(--ke-gray-300,#cbd3cb)'} />
                  ))}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{r.body}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.author} · {relTime(r.at)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <SheetsSyncCard />
    </div>
  )
}
