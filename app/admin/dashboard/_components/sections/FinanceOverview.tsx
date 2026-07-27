'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'
import CountUp from '../ui/CountUp'
import { useFinanceData, type Kpi as KpiShape } from './useFinanceData'

/** Finance landing page: the four numbers that matter, and the six-month shape. */
export default function FinanceOverview() {
  const { data } = useFinanceData()
  const [narrow, setNarrow] = useState(false)

  // The four KPIs need to stack on a phone rather than squeeze to nothing.
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 720)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!data) {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading finances…</p>
      </div>
    )
  }

  const maxBar = Math.max(1, ...data.series.map((s) => Math.max(s.revenue, s.expenses)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : 'repeat(4,1fr)', gap: 14 }}>
        <Kpi label={`Revenue · ${data.currentMonth}`} kpi={data.kpis.revenue} goodWhenUp />
        <Kpi label={`Expenses · ${data.currentMonth}`} kpi={data.kpis.expenses} goodWhenUp={false} />
        <Kpi label={`Net profit · ${data.currentMonth}`} kpi={data.kpis.profit} goodWhenUp />
        <Kpi label="Outstanding (unpaid)" kpi={data.kpis.outstanding} goodWhenUp={false} />
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Revenue vs expenses — last 6 months</h3>
          <span style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
            <Legend color="var(--ke-green-500)" label="Revenue" />
            <Legend color="var(--ke-sun-400)" label="Expenses" />
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 170, paddingTop: 10 }}>
          {data.series.map((s) => (
            <div key={s.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 130, width: '100%', justifyContent: 'center' }}>
                <div title={`Revenue ${fmt(s.revenue)}`} style={{ width: 16, height: `${(s.revenue / maxBar) * 100}%`, minHeight: 2, background: 'var(--ke-green-500)', borderRadius: '4px 4px 0 0' }} />
                <div title={`Expenses ${fmt(s.expenses)}`} style={{ width: 16, height: `${(s.expenses / maxBar) * 100}%`, minHeight: 2, background: 'var(--ke-sun-400)', borderRadius: '4px 4px 0 0' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-subtle)' }}>{s.month.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, kpi, goodWhenUp }: { label: string; kpi: KpiShape; goodWhenUp: boolean }) {
  const up = (kpi.change ?? 0) >= 0
  const good = kpi.change === null ? null : goodWhenUp ? up : !up
  const color = good === null ? 'var(--color-text-muted)' : good ? 'var(--ke-green-600)' : 'var(--color-danger)'
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em' }}>
        <CountUp value={kpi.value} format={fmt} />
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)', marginTop: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      {kpi.change !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color, marginTop: 6 }}>
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(kpi.change)}% MoM
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} /> {label}
    </span>
  )
}
