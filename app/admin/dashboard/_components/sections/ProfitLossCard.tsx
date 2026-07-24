'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileDown, TrendingUp } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import Pill from '../ui/Pill'
import { fmt } from '../mockData'

type Period = 'month' | 'quarter' | 'year' | 'all'

interface Statement {
  period: Period
  periodLabel: string
  grossSales: number
  gct: number
  gctRate: number
  netRevenue: number
  cogs: number
  cogsCoverage: number
  grossProfit: number
  grossMargin: number
  opex: { category: string; amount: number }[]
  totalOpex: number
  netProfit: number
  netMargin: number
  cashIn: number
  cashOut: number
  netCash: number
  receivables: number
  orderCount: number
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
]

/** A proper Profit & Loss statement + cash-flow summary, per period. */
export default function ProfitLossCard() {
  const [period, setPeriod] = useState<Period>('month')
  const [s, setS] = useState<Statement | null>(null)
  const [gctRate, setGctRate] = useState('15')
  const [savingRate, setSavingRate] = useState(false)

  const load = useCallback(async (p: Period) => {
    const res = await fetch(`/api/admin/finance/statement?period=${p}`)
    if (res.ok) {
      const data = (await res.json()).statement as Statement
      setS(data)
      setGctRate(String(data.gctRate))
    }
  }, [])

  useEffect(() => {
    load(period)
  }, [period, load])

  const saveRate = async () => {
    setSavingRate(true)
    await fetch('/api/admin/accounting', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gctRate: Number(gctRate) || 0, gctInclusive: true }),
    })
    setSavingRate(false)
    load(period)
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <TrendingUp size={17} color="var(--ke-green-600)" />
          <h3 style={{ ...h3Style, margin: 0 }}>Profit &amp; Loss{s ? ` · ${s.periodLabel}` : ''}</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href={`/api/admin/finance/statement?period=${period}&format=csv`} style={{ textDecoration: 'none' }}>
            <Button size="sm" variant="outline" iconRight={<FileDown size={14} />}>Export CSV</Button>
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {PERIODS.map((p) => (
          <Pill key={p.id} label={p.label} selected={period === p.id} onClick={() => setPeriod(p.id)} />
        ))}
      </div>

      {!s ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* P&L */}
          <div>
            <Line label="Gross sales" value={s.grossSales} sub={`${s.orderCount} orders`} />
            <Line label={`Less GCT (${s.gctRate}%)`} value={-s.gct} muted />
            <Line label="Net revenue" value={s.netRevenue} strong divider />
            <Line label="Cost of goods sold" value={-s.cogs} muted sub={s.cogsCoverage < 100 ? `${s.cogsCoverage}% of units costed` : undefined} />
            <Line label="Gross profit" value={s.grossProfit} strong sub={`${s.grossMargin}% margin`} divider />
            {s.opex.length > 0 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--color-text-muted)', margin: '10px 0 6px' }}>OPERATING EXPENSES</div>}
            {s.opex.map((o) => <Line key={o.category} label={o.category} value={-o.amount} muted small />)}
            <Line label="Total operating expenses" value={-s.totalOpex} muted />
            <Line label="Net profit" value={s.netProfit} strong big sub={`${s.netMargin}% net margin`} divider />
          </div>

          {/* Cash flow + GCT setting */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--color-text-muted)', marginBottom: 6 }}>CASH FLOW</div>
            <Line label="Cash in (paid orders)" value={s.cashIn} />
            <Line label="Cash out (expenses)" value={-s.cashOut} muted />
            <Line label="Net cash flow" value={s.netCash} strong divider />
            <Line label="Receivables (unpaid)" value={s.receivables} sub="awaiting payment" muted />

            <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: 'var(--ke-gray-50, #f6f7f6)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>GCT rate</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={gctRate} onChange={(e) => setGctRate(e.target.value)} type="number" style={{ width: 70, height: 34, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }} />
                <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>% (prices GCT-inclusive)</span>
                <Button size="sm" variant="outline" onClick={saveRate}>{savingRate ? '…' : 'Save'}</Button>
              </div>
            </div>
            {s.cogsCoverage < 100 && (
              <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 12 }}>
                Set each product&apos;s <strong>unit cost</strong> in Inventory for accurate COGS &amp; margins.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Line({ label, value, sub, strong, big, muted, small, divider }: { label: string; value: number; sub?: string; strong?: boolean; big?: boolean; muted?: boolean; small?: boolean; divider?: boolean }) {
  const neg = value < 0
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: small ? '3px 0' : '5px 0', borderTop: divider ? '1px solid var(--color-border)' : undefined, marginTop: divider ? 6 : 0, paddingTop: divider ? 8 : undefined }}>
      <span style={{ fontSize: small ? 12 : 13, color: muted ? 'var(--color-text-muted)' : 'var(--color-text)', fontWeight: strong ? 700 : 400 }}>
        {label}
        {sub && <span style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-subtle)' }}>{sub}</span>}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: strong ? 800 : 600, fontSize: big ? 18 : small ? 12.5 : 13.5, color: neg ? 'var(--color-text-muted)' : strong ? 'var(--color-text)' : 'var(--color-text)', whiteSpace: 'nowrap' }}>
        {neg ? '−' : ''}{fmt(Math.abs(value))}
      </span>
    </div>
  )
}
