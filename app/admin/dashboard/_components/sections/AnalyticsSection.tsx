'use client'

import { useEffect, useState } from 'react'
import { cardStyle, h3Style } from '../ui/card'
import BarChart from '../charts/BarChart'
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
  const days = m?.dayOfWeekBreakdown ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NpsCard />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
        <BarChart
          title="Orders by channel"
          subtitle="Where orders actually came from."
          categories={channels.map((c) => c.label)}
          series={[{ label: 'Orders', values: channels.map((c) => c.count) }]}
          horizontal
          height={Math.max(150, channels.length * 34 + 40)}
          format={(n) => `${n} order${n === 1 ? '' : 's'}`}
          tickFormat={(n) => String(Math.round(n))}
          footnote={
            <>
              Abandoned carts: <strong>{k ? k.abandonedCarts : '—'}</strong> · potential recovery{' '}
              <strong style={{ color: 'var(--ke-green-700)' }}>{k ? fmt(k.abandonedValue) : '—'}</strong>
              <span style={{ display: 'block', fontSize: 11, marginTop: 2, color: 'var(--color-text-subtle)' }}>
                Same figure as the Executive Dashboard — carts idle 60+ minutes with items in them.
              </span>
            </>
          }
        />

        <BarChart
          title="Orders by day of week"
          subtitle="When customers actually buy."
          categories={days.map((d) => d.label)}
          series={[{ label: 'Orders', values: days.map((d) => d.count) }]}
          height={200}
          format={(n) => `${n} order${n === 1 ? '' : 's'}`}
          tickFormat={(n) => String(Math.round(n))}
        />
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
