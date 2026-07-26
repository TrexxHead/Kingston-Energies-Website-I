'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Pill from '../ui/Pill'
import { fmt } from '../mockData'

type Period = 'month' | 'quarter' | 'year' | 'all'

interface SalesData {
  periodLabel: string
  grossSales: number
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            <Stat label={`Gross sales · ${data.periodLabel}`} value={fmt(data.grossSales)} />
            <Stat label="Orders" value={String(data.orderCount)} />
            <Stat label="Average order value" value={fmt(data.avgOrderValue)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
            <div style={cardStyle}>
              <h3 style={h3Style}>Top products by revenue</h3>
              {data.topProducts.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No sales in this period yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {data.topProducts.map((p, i) => {
                    const max = data.topProducts[0].revenue || 1
                    return (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                        <ShoppingBag size={15} color="var(--color-text-subtle)" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{p.name}</span>
                            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(p.revenue)}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(p.revenue / max) * 100}%`, background: 'var(--ke-green-500)', borderRadius: 999 }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 3 }}>{p.qty} units</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h3 style={h3Style}>Sales by payment method</h3>
              {data.byPaymentMethod.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No sales in this period yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.byPaymentMethod.map((m) => (
                    <div key={m.method} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{m.method}</span>
                      <span style={{ fontWeight: 700 }}>{fmt(m.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
