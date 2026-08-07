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
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<string | null>(null)

  const load = () => {
    fetch('/api/admin/metrics')
      .then((r) => (r.ok ? r.json() : null))
      .then(setM)
      .catch(() => {})
  }

  useEffect(load, [])

  const purgeTestCarts = async () => {
    if (!confirm('Remove carts from before launch (1 Aug 2026) and carts tied to admin accounts? This deletes them permanently.')) return
    setPurging(true)
    setPurgeResult(null)
    try {
      const res = await fetch('/api/admin/carts/purge-test-data', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (res.ok && data) {
        setPurgeResult(`Removed ${data.deleted} test cart${data.deleted === 1 ? '' : 's'}.`)
        load()
      } else {
        setPurgeResult('Could not clean up test carts.')
      }
    } catch {
      setPurgeResult('Could not clean up test carts.')
    }
    setPurging(false)
  }

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
              Abandoned carts: <strong>{k ? k.abandonedCarts : 'N/A'}</strong> · potential recovery{' '}
              <strong style={{ color: 'var(--ke-green-700)' }}>{k ? fmt(k.abandonedValue) : 'N/A'}</strong>
              <span style={{ display: 'block', fontSize: 11, marginTop: 2, color: 'var(--color-text-subtle)' }}>
                Carts idle 60+ minutes with items in them, since launch (1 Aug 2026) and excluding admin accounts —
                same figure as the Executive Dashboard.
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={purgeTestCarts}
                  disabled={purging}
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-muted)',
                    borderRadius: 8,
                    padding: '5px 10px',
                    fontSize: 11,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    cursor: purging ? 'default' : 'pointer',
                    opacity: purging ? 0.6 : 1,
                  }}
                >
                  {purging ? 'Cleaning up…' : 'Clean up pre-launch/admin test carts'}
                </button>
                {purgeResult && <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{purgeResult}</span>}
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
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{k ? `${k.repeatRate}%` : 'N/A'}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>repeat customer rate</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{k?.conversionRate != null ? `${k.conversionRate}%` : 'N/A'}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>checkout completion</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{k ? k.orders : 'N/A'}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>total orders</div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: '10px 0 0' }}>
          Same numbers as the Executive Dashboard. This tab no longer computes its own.
        </p>
      </div>
    </div>
  )
}
