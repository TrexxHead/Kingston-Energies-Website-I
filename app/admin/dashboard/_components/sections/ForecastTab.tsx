'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Info } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Pill from '../ui/Pill'
import { fmt } from '../mockData'

type Confidence = 'none' | 'indicative' | 'low' | 'moderate' | 'good'

interface MonthPoint { periodLabel: string; revenue: number; expenses: number; net: number; cashIn: number; cashOut: number }
interface ForecastPoint { periodLabel: string; projected: number; low: number; high: number }
interface Data {
  history: MonthPoint[]
  forecast: ForecastPoint[]
  confidence: Confidence
  monthsOfHistory: number
  basis: string
  monthsUntilNextTier: number | null
  method: 'none' | 'average' | 'trend'
  projectedCashPosition: number | null
  cashRunwayMonths: number | null
}

const CONF_TONE: Record<Confidence, 'grey' | 'orange' | 'blue' | 'green'> = {
  none: 'grey', indicative: 'orange', low: 'orange', moderate: 'blue', good: 'green',
}
const CONF_LABEL: Record<Confidence, string> = {
  none: 'Not enough data', indicative: 'Indicative only', low: 'Low confidence', moderate: 'Moderate confidence', good: 'Good confidence',
}

/**
 * Cash forecasting driven by real ledger history.
 *
 * Rather than drawing a confident line through three data points, this states
 * plainly how much history it has and how much that projection is worth. As
 * months of trading accumulate the method upgrades from a flat average to a
 * trend line and the bands tighten — automatically, with no code change.
 */
export default function ForecastTab() {
  const [data, setData] = useState<Data | null>(null)
  const [months, setMonths] = useState(6)

  useEffect(() => {
    fetch(`/api/admin/finance/forecast?months=${months}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
  }, [months])

  if (!data) return <div style={cardStyle}><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p></div>

  const allValues = [
    ...data.history.map((h) => h.cashIn - h.cashOut),
    ...data.forecast.flatMap((f) => [f.low, f.high]),
  ]
  const max = Math.max(1, ...allValues.map(Math.abs))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Data-sufficiency banner — the honest framing sits above the numbers. */}
      <div style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info size={16} color="var(--color-text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ ...h3Style, margin: 0 }}>Forecast reliability</h3>
            <Badge tone={CONF_TONE[data.confidence]} dot>{CONF_LABEL[data.confidence]}</Badge>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {data.monthsOfHistory} month{data.monthsOfHistory === 1 ? '' : 's'} of ledger history
              {data.method !== 'none' && ` · ${data.method === 'trend' ? 'trend line' : 'flat average'}`}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>{data.basis}</p>
          {data.monthsUntilNextTier !== null && data.monthsUntilNextTier > 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: '4px 0 0' }}>
              {data.monthsUntilNextTier} more month{data.monthsUntilNextTier === 1 ? '' : 's'} of trading will improve this automatically.
            </p>
          )}
        </div>
      </div>

      {data.confidence === 'none' ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 18px' }}>
          <TrendingUp size={22} color="var(--color-text-subtle)" />
          <p style={{ fontSize: 13.5, fontWeight: 600, margin: '10px 0 4px' }}>No projection yet</p>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, maxWidth: 440, marginInline: 'auto' }}>
            Once there are at least two months of posted activity in the ledger, a cash projection will appear here and sharpen
            as more history builds up.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="kad-kpi-grid">
            <Stat label={`Projected cash in ${months} months`} value={data.projectedCashPosition != null ? fmt(Math.round(data.projectedCashPosition)) : '—'} />
            <Stat
              label="Cash runway"
              value={data.cashRunwayMonths ? `${data.cashRunwayMonths} mo` : 'No shortfall projected'}
              warn={Boolean(data.cashRunwayMonths)}
            />
            <Stat label="Avg monthly net cash" value={fmt(Math.round(data.history.reduce((s, h) => s + h.cashIn - h.cashOut, 0) / Math.max(1, data.history.length)))} />
          </div>

          {data.cashRunwayMonths && (
            <p style={{ fontSize: 12.5, color: 'var(--ke-sun-600,#b45309)', fontWeight: 600, margin: 0 }}>
              On current trend, cash could go negative in about {data.cashRunwayMonths} month{data.cashRunwayMonths === 1 ? '' : 's'} —
              worth treating as an early warning rather than a prediction, given the {CONF_LABEL[data.confidence].toLowerCase()}.
            </p>
          )}

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <h3 style={{ ...h3Style, margin: 0 }}>Net cash — history and projection</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {[3, 6, 12].map((m) => (
                  <Pill key={m} label={`${m} mo`} selected={months === m} onClick={() => setMonths(m)} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 190, overflowX: 'auto', paddingBottom: 4 }}>
              {data.history.map((h) => {
                const v = h.cashIn - h.cashOut
                return (
                  <Bar key={h.periodLabel} label={h.periodLabel} value={v} max={max} tone="actual" title={`Actual · in ${fmt(Math.round(h.cashIn))} / out ${fmt(Math.round(h.cashOut))}`} />
                )
              })}
              {data.forecast.map((f) => (
                <Bar
                  key={f.periodLabel}
                  label={f.periodLabel}
                  value={f.projected}
                  max={max}
                  tone="forecast"
                  band={{ low: f.low, high: f.high }}
                  title={`Projected ${fmt(Math.round(f.projected))} (range ${fmt(Math.round(f.low))}–${fmt(Math.round(f.high))})`}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11.5, color: 'var(--color-text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--ke-green-500)' }} /> Actual
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--ke-blue-400)', opacity: 0.55 }} /> Projected
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, border: '1px dashed var(--ke-blue-400)' }} /> Likely range
              </span>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px' }}>
              <h3 style={{ ...h3Style, margin: 0 }}>Monthly history</h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Straight from the ledger — revenue and expenses as posted.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, padding: '9px 18px', background: 'var(--ke-gray-50,#f5f7f5)', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)' }}>
              <span>MONTH</span>
              <span style={{ textAlign: 'right' }}>REVENUE</span>
              <span style={{ textAlign: 'right' }}>EXPENSES</span>
              <span style={{ textAlign: 'right' }}>NET CASH</span>
            </div>
            {[...data.history].reverse().map((h) => (
              <div key={h.periodLabel} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, padding: '10px 18px', borderTop: '1px solid var(--color-border)', fontSize: 13 }}>
                <span>{h.periodLabel}</span>
                <span style={{ textAlign: 'right' }}>{fmt(Math.round(h.revenue))}</span>
                <span style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{fmt(Math.round(h.expenses))}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Math.round(h.cashIn - h.cashOut))}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Bar({ label, value, max, tone, band, title }: { label: string; value: number; max: number; tone: 'actual' | 'forecast'; band?: { low: number; high: number }; title: string }) {
  const h = Math.max(2, (Math.abs(value) / max) * 130)
  const bandH = band ? Math.max(2, ((Math.abs(band.high) - Math.abs(band.low)) / max) * 130) : 0
  return (
    <div style={{ flex: '1 0 42px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 42 }} title={title}>
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 140 }}>
        {band && (
          <div style={{ position: 'absolute', bottom: Math.max(0, h - bandH / 2), width: '70%', height: bandH, border: '1px dashed var(--ke-blue-400)', borderRadius: 3, opacity: 0.7 }} />
        )}
        <div
          style={{
            width: '70%',
            height: h,
            borderRadius: '4px 4px 2px 2px',
            background: tone === 'actual' ? (value < 0 ? 'var(--ke-sun-400)' : 'var(--ke-green-500)') : 'var(--ke-blue-400)',
            opacity: tone === 'forecast' ? 0.55 : 1,
          }}
        />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
        {label.split(' ')[0]}
      </span>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-.01em', color: warn ? 'var(--ke-sun-600,#b45309)' : undefined }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)', marginTop: 6, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}
