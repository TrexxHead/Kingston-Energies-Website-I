'use client'

import { useEffect, useState } from 'react'
import { cardStyle, h3Style } from '../ui/card'
import BarChart from '../charts/BarChart'
import LineChart from '../charts/LineChart'
import { money } from '../charts/palette'
import Skeleton from '@/components/Skeleton'

interface ChannelRoi {
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'SOCIAL'
  campaignsSent: number
  spend: number
  revenue: number
  roi: number | null
}

interface CohortRow {
  cohort: string
  newCustomers: number
  repeatCustomers: number
  retentionRate: number
}

interface Reports {
  days: number
  channels: ChannelRoi[]
  cohorts: CohortRow[]
}

const RANGES = [30, 90, 180]
const percent = (n: number) => `${n.toFixed(0)}%`

/**
 * Deeper analytics beyond the Overview: what each channel's spend actually
 * returned, and whether customers come back for a second order. Built to
 * read honestly at low volume — a channel with no spend logged shows "no
 * spend logged" rather than a fabricated 0% ROI, and cohorts are unwindowed
 * (any repeat order counts, not just one within N days) so a thin dataset
 * doesn't understate itself.
 */
export default function MarketingReports() {
  const [days, setDays] = useState(90)
  const [data, setData] = useState<Reports | null>(null)

  useEffect(() => {
    setData(null)
    fetch(`/api/admin/marketing/reports?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
  }, [days])

  const activeChannels = data?.channels.filter((c) => c.campaignsSent > 0) ?? []
  const hasCohorts = (data?.cohorts.length ?? 0) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setDays(r)}
            style={{
              height: 30, padding: '0 12px', borderRadius: 999, fontSize: 12.5, fontFamily: 'var(--font-display)', fontWeight: 600,
              border: '1px solid var(--color-border)', cursor: 'pointer',
              background: days === r ? 'var(--ke-green-600)' : 'var(--color-surface)',
              color: days === r ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {r}d
          </button>
        ))}
      </div>

      {!data ? (
        <Skeleton width="100%" height={260} />
      ) : (
        <BarChart
          title="Spend vs. attributed revenue by channel"
          subtitle={`Sent campaigns, last ${days} days`}
          categories={activeChannels.length ? activeChannels.map((c) => c.channel) : ['No campaigns sent']}
          series={
            activeChannels.length
              ? [
                  { label: 'Spend', values: activeChannels.map((c) => c.spend) },
                  { label: 'Revenue', values: activeChannels.map((c) => c.revenue) },
                ]
              : [{ label: 'Spend', values: [0] }, { label: 'Revenue', values: [0] }]
          }
          height={240}
          format={money}
          footnote="Spend only shows for channels with a logged expense — a channel with none isn't assumed free, it's just unmeasured."
        />
      )}

      {!data ? (
        <Skeleton width="100%" height={90} />
      ) : (
        <div style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 12px' }}>ROI by channel</h3>
          {activeChannels.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No campaigns sent in this period.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeChannels.map((c) => (
                <div key={c.channel} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 11 }}>
                  <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{c.channel}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.campaignsSent} sent</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.spend > 0 ? `${money(c.spend)} spend` : 'no spend logged'}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: c.roi != null && c.roi >= 0 ? 'var(--ke-green-700)' : c.roi != null ? 'var(--color-danger)' : 'var(--color-text-subtle)' }}>
                    {c.roi != null ? `${c.roi >= 0 ? '+' : ''}${(c.roi * 100).toFixed(0)}% ROI` : 'n/a'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!data ? (
        <Skeleton width="100%" height={260} />
      ) : (
        <LineChart
          title="Repeat-purchase rate by signup cohort"
          subtitle="Share of each month's first-time customers who came back for a second order, ever"
          categories={hasCohorts ? data.cohorts.map((c) => c.cohort) : ['No cohorts yet']}
          series={[{ label: 'Retention rate', values: hasCohorts ? data.cohorts.map((c) => c.retentionRate * 100) : [0] }]}
          height={220}
          format={percent}
          footnote={!hasCohorts ? 'No account-based orders yet to build cohorts from.' : undefined}
        />
      )}
    </div>
  )
}
