'use client'

import { useCallback, useEffect, useState } from 'react'
import { cardStyle } from '../ui/card'
import Pill from '../ui/Pill'
import BarChart from '../charts/BarChart'
import DonutChart from '../charts/DonutChart'
import { foldSeries } from '../charts/palette'
import { fmt } from '../mockData'

type Period = 'month' | 'quarter' | 'year' | 'all'

interface SalesData {
  periodLabel: string
  grossSales: number
  collected: number
  outstanding: number
  orderCount: number
  avgOrderValue: number
  topProducts: { name: string; qty: number; revenue: number }[]
  byPaymentMethod: { method: string; amount: number }[]
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
]

export default function SalesTab() {
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<SalesData | null>(null)

  const load = useCallback(async (p: Period) => {
    const res = await fetch(`/api/admin/finance/sales?period=${p}`)
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => {
    load(period)
  }, [period, load])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PERIODS.map((p) => (
          <Pill key={p.id} label={p.label} selected={period === p.id} onClick={() => setPeriod(p.id)} />
        ))}
      </div>

      {!data ? (
        <div style={cardStyle}><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }} className="kad-kpi-grid">
            <Stat label={`Gross sales · ${data.periodLabel}`} value={fmt(data.grossSales)} />
            <Stat label="Cash collected" value={fmt(data.collected)} />
            <Stat label="Outstanding (A/R)" value={fmt(data.outstanding)} />
            <Stat label="Orders" value={String(data.orderCount)} />
            <Stat label="Average order value" value={fmt(data.avgOrderValue)} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            Gross sales counts every order placed in this period, paid or not — it is not the same as cash in hand. See Cash Flow for collections over time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16, alignItems: 'start' }}>
            <BarChart
              title="Top products by revenue"
              subtitle={`What sold in ${data.periodLabel.toLowerCase()}.`}
              categories={data.topProducts.map((p) => p.name)}
              series={[{ label: 'Revenue', values: data.topProducts.map((p) => p.revenue) }]}
              horizontal
              height={Math.max(160, data.topProducts.length * 34 + 50)}
              footnote={
                data.topProducts.length > 0
                  ? `${data.topProducts.reduce((s, p) => s + p.qty, 0)} units across ${data.topProducts.length} product${data.topProducts.length === 1 ? '' : 's'}.`
                  : undefined
              }
            />

            <DonutChart
              title="Sales by payment method"
              subtitle="How customers actually paid."
              slices={foldSeries(
                data.byPaymentMethod.map((m) => ({ label: m.method.charAt(0).toUpperCase() + m.method.slice(1), value: m.amount })),
                6,
              )}
              centreLabel="Gross sales"
            />
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)', marginTop: 6, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}
