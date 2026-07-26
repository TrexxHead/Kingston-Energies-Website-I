'use client'

import { useEffect, useState } from 'react'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'
import NpsCard from './NpsCard'

interface Metrics {
  kpis: {
    orders: number
    repeatRate: number
    abandonedCarts: number
    abandonedValue: number
    conversionRate: number | null
  }
  channelBreakdown: { label: string; count: number }[]
  dayOfWeekBreakdown: { label: string; count: number }[]
}

/**
 * Every number here is computed from real Orders/Carts — no placeholder
 * funnel, heatmap or geography. It intentionally reuses the same
 * /api/admin/metrics endpoint as the Executive Dashboard so the two tabs can
 * never contradict each other again.
 */
export default function AnalyticsSection() {
  const [m, setM] = useState<Metrics | null>(null)

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((r) => (r.ok ? r.json() : null))
      .then(setM)
      .catch(() => {})
  }, [])

  const k = m?.kpis
  const channels = m?.channelBreakdown ?? []
  const maxChannel = Math.max(1, ...channels.map((c) => c.count))
  const days = m?.dayOfWeekBreakdown ?? []
  const maxDay = Math.max(1, ...days.map((d) => d.count))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NpsCard />
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={h3Style}>Orders by channel</h3>
          {channels.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>{m ? 'No orders yet.' : 'Loading…'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {channels.map((c) => (
                <div key={c.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    <span>{c.label}</span>
                    <span>{c.count}</span>
                  </div>
                  <div style={{ height: 20, borderRadius: 8, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(c.count / maxChannel) * 100}%`,
                        background: 'linear-gradient(90deg,var(--ke-green-400),var(--ke-blue-400))',
                        borderRadius: 8,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--color-border)', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            Abandoned carts: <strong>{k ? k.abandonedCarts : '—'}</strong> · potential recovery{' '}
            <strong style={{ color: 'var(--ke-green-700)' }}>{k ? fmt(k.abandonedValue) : '—'}</strong>
            <span style={{ display: 'block', fontSize: 11, marginTop: 2, color: 'var(--color-text-subtle)' }}>
              Same figure as the Executive Dashboard — carts idle 60+ minutes with items in them.
            </span>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Orders by day of week</h3>
          {days.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>{m ? 'No orders yet.' : 'Loading…'}</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
              {days.map((d) => (
                <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${d.count} orders`}>
                  <div
                    style={{
                      width: '100%',
                      height: Math.max(2, (d.count / maxDay) * 90),
                      borderRadius: '4px 4px 2px 2px',
                      background: 'var(--gradient-brand)',
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-subtle)' }}>{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Repeat purchases &amp; checkout completion</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{k ? `${k.repeatRate}%` : '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>repeat customer rate</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{k?.conversionRate != null ? `${k.conversionRate}%` : '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>checkout completion</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{k ? k.orders : '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>total orders</div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: '10px 0 0' }}>
          Same numbers as the Executive Dashboard — this tab no longer computes its own.
        </p>
      </div>
    </div>
  )
}
