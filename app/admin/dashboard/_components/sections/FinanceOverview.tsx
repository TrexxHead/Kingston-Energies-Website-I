'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { cardStyle, cardStyleHero, h3Style } from '../ui/card'
import StatTile from '../charts/StatTile'
import GaugeRing from '../charts/GaugeRing'
import LineChart from '../charts/LineChart'
import BarChart from '../charts/BarChart'
import DonutChart from '../charts/DonutChart'
import WaterfallChart from '../charts/WaterfallChart'
import { foldSeries, money, CHROME } from '../charts/palette'
import QuickActions from './QuickActions'
import FeedPreview from './FeedPreview'

interface Kpi {
  value: number
  change: number | null
  unavailable?: string
}

interface Bucket {
  key: string
  label: string
  amount: number
  count: number
}

interface HealthData {
  period: string
  kpis: Record<'cash' | 'bank' | 'revenue' | 'grossProfit' | 'netProfit' | 'expenses' | 'receivables' | 'payables' | 'inventoryValue' | 'workingCapital', Kpi>
  ratios: {
    currentRatio: number | null
    quickRatio: number | null
    grossMargin: number | null
    netMargin: number | null
    costsMissing: boolean
    ratiosUnavailable: string | null
  }
  aging: {
    receivables: Bucket[]
    payables: Bucket[]
    receivablesTotal: number
    payablesTotal: number
    oldestReceivableDays: number
  }
  series: { month: string; revenue: number; expenses: number; profit: number; from: string }[]
  bridge: { steps: { label: string; value: number; total?: boolean }[]; costsMissing: boolean }
  cash: { code: string; name: string; balance: number }[]
  expenseMix: { label: string; value: number }[]
  revenueMix: { label: string; value: number }[]
}

const RANGES = [
  { months: 6, label: '6 months' },
  { months: 12, label: '12 months' },
  { months: 24, label: '24 months' },
]

type TrendMetric = 'all' | 'revenue' | 'expenses' | 'profit'
const METRICS: { id: TrendMetric; label: string }[] = [
  { id: 'all', label: 'Comparison' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'profit', label: 'Profit' },
]

/** Same rule the ledger's own KPI tiles use — no Infinity/NaN off a zero or missing prior month. */
function changeBetween(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

/**
 * The finance command centre.
 *
 * Every figure on this page comes from one server call over the ledger, so the
 * tiles, the charts and the reports behind them cannot disagree. Charts are
 * clickable: selecting a month or a category navigates to the screen that
 * explains it, rather than leaving the reader with a shape and no way in.
 */
export default function FinanceOverview() {
  const router = useRouter()
  const [data, setData] = useState<HealthData | null>(null)
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(false)
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/finance/health?months=${months}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [months])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: 13, color: CHROME.textMuted, margin: 0 }}>Reading the ledger…</p>
      </div>
    )
  }

  const k = data.kpis
  const revenueTrend = data.series.map((s) => s.revenue)
  const profitTrend = data.series.map((s) => s.profit)
  const expenseTrend = data.series.map((s) => s.expenses)

  const F = '/admin/dashboard/finance'

  // Single-metric Trend view — same monthlySeries data the Comparison chart
  // plots, just read as one continuous line instead of three side by side.
  // KPI, high/low and the tooltip all come from this one array, so they can
  // never disagree with each other or with what's on the chart.
  const trendValues: Record<Exclude<TrendMetric, 'all'>, number[]> = {
    revenue: revenueTrend,
    expenses: expenseTrend,
    profit: profitTrend,
  }
  const trendColorIndex: Record<Exclude<TrendMetric, 'all'>, number> = { revenue: 0, expenses: 1, profit: 2 }
  const trendGoodWhenUp: Record<Exclude<TrendMetric, 'all'>, boolean> = { revenue: true, expenses: false, profit: true }
  const selectedTrend = trendMetric === 'all' ? null : trendValues[trendMetric]
  const trendCurrent = selectedTrend && selectedTrend.length ? selectedTrend[selectedTrend.length - 1] : null
  const trendPrevious = selectedTrend && selectedTrend.length >= 2 ? selectedTrend[selectedTrend.length - 2] : null
  const trendChange = trendCurrent !== null && trendPrevious !== null ? changeBetween(trendCurrent, trendPrevious) : null
  const trendHigh = selectedTrend && selectedTrend.length ? Math.max(...selectedTrend) : null
  const trendLow = selectedTrend && selectedTrend.length ? Math.min(...selectedTrend) : null

  const totalBalance = k.cash.value + k.bank.value
  const ratio = data.ratios.currentRatio
  // A 3.0 current ratio reads as fully healthy on the dial; 1.0 is the
  // textbook "can just cover short-term liabilities" line.
  const ratioPct = ratio !== null ? Math.max(0, Math.min(100, (ratio / 3) * 100)) : 0
  const ratioTone = ratio === null ? 'warning' : ratio >= 1.5 ? 'good' : ratio >= 1 ? 'warning' : 'critical'
  const ratioLabel = ratio === null ? 'No data' : ratio >= 1.5 ? 'Healthy' : ratio >= 1 ? 'Tight' : 'At risk'

  return (
    // While a reload is in flight the previous render is held at reduced
    // opacity — no skeleton, no layout jump.
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: loading ? 0.6 : 1, transition: 'opacity .15s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1.1fr) minmax(260px,0.8fr)', gap: 16, alignItems: 'stretch' }} className="kp-2col">
        <div style={{ ...cardStyleHero, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ke-dark-text-muted)' }}>
            Total balance
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, color: 'var(--color-text-on-ink)', letterSpacing: '-.02em' }}>
            {money(totalBalance)}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ke-dark-text-muted)' }}>Cash on hand + bank balance, as of {data.period}</div>
        </div>
        <div style={{ ...cardStyleHero, display: 'flex', alignItems: 'center', gap: 16 }}>
          <GaugeRing value={ratioPct} centreValue={ratio !== null ? `${ratio.toFixed(2)}×` : 'N/A'} statusLabel={ratioLabel} tone={ratioTone} size={104} onDark />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--color-text-on-ink)' }}>Current ratio</div>
            <div style={{ fontSize: 11.5, color: 'var(--ke-dark-text-muted)', marginTop: 3, lineHeight: 1.5, maxWidth: 180 }}>Current assets ÷ current liabilities</div>
          </div>
        </div>
      </div>

      {/* Filters sit in one row above everything they scope. */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: CHROME.textMuted }}>
          Trend range
        </span>
        {RANGES.map((r) => (
          <button
            key={r.months}
            type="button"
            onClick={() => setMonths(r.months)}
            aria-pressed={months === r.months}
            style={{
              border: '1px solid var(--color-border)',
              background: months === r.months ? 'var(--color-primary-soft)' : 'var(--color-surface)',
              color: months === r.months ? 'var(--color-primary)' : CHROME.textMuted,
              borderRadius: 999,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: months === r.months ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <QuickActions />

      <FeedPreview />

      <section aria-label="Key figures" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
        <StatTile label={`Revenue · ${data.period}`} value={money(k.revenue.value)} change={k.revenue.change} trend={revenueTrend} colorIndex={0} href={`${F}/sales`} />
        <StatTile label={`Gross profit · ${data.period}`} value={money(k.grossProfit.value)} change={k.grossProfit.change} trend={profitTrend} colorIndex={2} href={`${F}/reports`} hint="Revenue less the cost of the goods sold." />
        <StatTile label={`Net profit · ${data.period}`} value={money(k.netProfit.value)} change={k.netProfit.change} trend={profitTrend} colorIndex={2} href={`${F}/reports`} />
        <StatTile label={`Expenses · ${data.period}`} value={money(k.expenses.value)} change={k.expenses.change} goodWhenUp={false} trend={expenseTrend} colorIndex={1} href={`${F}/expenses`} />
        <StatTile label="Cash on hand" value={money(k.cash.value)} href={`${F}/banking`} />
        <StatTile label="Bank balance" value={money(k.bank.value)} href={`${F}/banking`} hint="What the books say. Reconcile to confirm the bank agrees." />
        <StatTile label="Receivables" value={money(k.receivables.value)} goodWhenUp={false} href={`${F}/reports`} hint="Orders placed but not yet paid." />
        <StatTile label="Payables" value={money(k.payables.value)} goodWhenUp={false} href={`${F}/reports`} hint="Approved payroll and statutory amounts not yet remitted." />
        <StatTile label="Inventory value" value={money(k.inventoryValue.value)} href="/admin/dashboard/inventory" />
        <StatTile label="Working capital" value={money(k.workingCapital.value)} href={`${F}/reports`} hint="Current assets less current liabilities." />
        <StatTile
          label="Current ratio"
          value={data.ratios.currentRatio !== null ? data.ratios.currentRatio.toFixed(2) : 'N/A'}
          unavailable={data.ratios.ratiosUnavailable ?? undefined}
          href={`${F}/reports`}
          hint="Current assets ÷ current liabilities."
        />
        <StatTile
          label="Quick ratio"
          value={data.ratios.quickRatio !== null ? data.ratios.quickRatio.toFixed(2) : 'N/A'}
          unavailable={data.ratios.ratiosUnavailable ?? undefined}
          href={`${F}/reports`}
          hint="Current assets excluding inventory ÷ current liabilities."
        />
      </section>

      {data.ratios.costsMissing && (
        <div
          style={{
            ...cardStyle,
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            borderColor: 'var(--ke-sun-300,#fcd34d)',
            background: 'var(--ke-sun-50,#fffbeb)',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--ke-sun-600,#b45309)', flexShrink: 0, marginTop: 2 }} aria-hidden />
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            No unit costs are recorded, so cost of sales is zero and gross profit currently equals revenue. Add a cost
            to each product in Inventory and the margin figures become real.
          </div>
        </div>
      )}

      {(() => {
        const metricToggle = (
          <div style={{ display: 'flex', gap: 6 }}>
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setTrendMetric(m.id)}
                aria-pressed={trendMetric === m.id}
                style={{
                  border: '1px solid var(--color-border)',
                  background: trendMetric === m.id ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                  color: trendMetric === m.id ? 'var(--color-primary)' : CHROME.textMuted,
                  borderRadius: 999,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: trendMetric === m.id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )

        if (trendMetric === 'all') {
          return (
            <LineChart
              title="Revenue, expenses and profit"
              subtitle={`Last ${months} months, from the ledger. Click a month to open its transactions.`}
              categories={data.series.map((s) => s.month)}
              series={[
                { label: 'Revenue', values: data.series.map((s) => s.revenue) },
                { label: 'Expenses', values: data.series.map((s) => s.expenses) },
                { label: 'Profit', values: data.series.map((s) => s.profit) },
              ]}
              height={250}
              onSelect={() => router.push(`${F}/transactions`)}
              actions={metricToggle}
            />
          )
        }

        const label = METRICS.find((m) => m.id === trendMetric)!.label
        return (
          <LineChart
            title={`${label} trend`}
            subtitle={`Last ${months} months, from the ledger. Click a month to open its transactions.`}
            categories={data.series.map((s) => s.month)}
            series={[{ label, values: selectedTrend as number[], area: true }]}
            height={220}
            onSelect={() => router.push(`${F}/transactions`)}
            actions={metricToggle}
            kpi={
              trendCurrent !== null && (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-.02em' }}>{money(trendCurrent)}</div>
                    <div style={{ fontSize: 12, color: CHROME.textMuted, marginTop: 2 }}>
                      {data.series[data.series.length - 1]?.month ?? 'This month'}
                      {trendChange !== null && (
                        <span style={{ marginLeft: 8, fontWeight: 700, color: (trendChange >= 0) === trendGoodWhenUp[trendMetric] ? 'var(--viz-good)' : 'var(--viz-critical)' }}>
                          {trendChange >= 0 ? '+' : ''}
                          {trendChange}% vs previous month
                        </span>
                      )}
                    </div>
                  </div>
                  {trendHigh !== null && trendLow !== null && (
                    <div style={{ fontSize: 12, color: CHROME.textMuted }}>
                      High {money(trendHigh)} · Low {money(trendLow)}
                      <span style={{ display: 'block', fontSize: 11, color: CHROME.textSubtle }}>over the last {months} months</span>
                    </div>
                  )}
                </div>
              )
            }
          />
        )
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
        <DonutChart
          title={`Where the money went · ${data.period}`}
          subtitle="Expenses by ledger account."
          slices={foldSeries(data.expenseMix, 6)}
          centreLabel="Total spend"
          onSelect={() => router.push(`${F}/expenses`)}
          footnote="Click a category to open the expense log."
        />
        <DonutChart
          title={`Where it came from · ${data.period}`}
          subtitle="Revenue by ledger account."
          slices={foldSeries(data.revenueMix, 6)}
          centreLabel="Total revenue"
          onSelect={() => router.push(`${F}/sales`)}
        />
      </div>

      <WaterfallChart
        title={`From revenue to profit · ${data.period}`}
        subtitle="Each step is a real movement in the ledger this month."
        steps={data.bridge.steps}
        footnote={data.bridge.costsMissing ? 'Cost of sales is absent because no unit costs are recorded yet.' : undefined}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
        <BarChart
          title="Receivables aging"
          subtitle={
            data.aging.receivablesTotal > 0
              ? `${money(data.aging.receivablesTotal)} outstanding. Oldest is ${data.aging.oldestReceivableDays} days.`
              : 'Nothing outstanding.'
          }
          categories={data.aging.receivables.map((b) => b.label)}
          series={[{ label: 'Owed to us', values: data.aging.receivables.map((b) => b.amount) }]}
          horizontal
          height={190}
          onSelect={() => router.push('/admin/dashboard/orders')}
          footnote="Unpaid orders, bucketed by how long they have been outstanding."
        />
        <BarChart
          title="Payables aging"
          subtitle={data.aging.payablesTotal > 0 ? `${money(data.aging.payablesTotal)} owed.` : 'Nothing owed.'}
          categories={data.aging.payables.map((b) => b.label)}
          series={[{ label: 'We owe', values: data.aging.payables.map((b) => b.amount) }]}
          horizontal
          height={190}
          onSelect={() => router.push(`${F}/payroll`)}
          footnote="Approved payroll and statutory deductions not yet remitted. Supplier bills are not modelled as documents, so they are not counted here."
        />
      </div>

      {data.cash.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 4px' }}>Cash position</h3>
          <p style={{ fontSize: 12.5, color: CHROME.textMuted, margin: '0 0 12px' }}>
            What the books say each account holds. Reconcile against a statement to confirm the bank agrees.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.cash.map((a) => (
              <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: CHROME.textMuted }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.code}</span> {a.name}
                </span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(a.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
