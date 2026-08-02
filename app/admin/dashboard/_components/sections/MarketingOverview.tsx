'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TriangleAlert, ArrowUpRight } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import { fmt } from '../mockData'
import Skeleton from '@/components/Skeleton'

interface Overview {
  days: number
  kpis: {
    scheduledCampaigns: number
    sentCampaigns: number
    attributedRevenue: number
    attributedOrders: number
    leadsGenerated: number
    newLeadsAwaitingContact: number
    segments: number
    activeDiscountCodes: number
    expiringDiscountCodes: number
    suppressedContacts: number
  }
  campaignPerformance: { id: string; name: string; orders: number; revenue: number }[]
}

const RANGES = [7, 30, 90]

/**
 * The Marketing tab's landing page: what's running, what it earned, what
 * needs attention. Deliberately shows only what's measurable from live
 * data — no ad spend/ROAS/CAC, since there's no ad-platform integration to
 * compute them from honestly.
 */
export default function MarketingOverview() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Overview | null>(null)

  useEffect(() => {
    setData(null)
    fetch(`/api/admin/marketing/overview?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
  }, [days])

  const k = data?.kpis
  const stats: { label: string; value: string; sub?: string }[] = [
    { label: 'CAMPAIGNS SCHEDULED', value: k ? String(k.scheduledCampaigns) : 'N/A', sub: 'waiting to send' },
    { label: 'CAMPAIGNS SENT', value: k ? String(k.sentCampaigns) : 'N/A', sub: `last ${days} days` },
    {
      label: 'CAMPAIGN-ATTRIBUTED REVENUE',
      value: k ? fmt(k.attributedRevenue) : 'N/A',
      sub: k ? `${k.attributedOrders} orders · linked-discount campaigns only` : undefined,
    },
    { label: 'LEADS GENERATED', value: k ? String(k.leadsGenerated) : 'N/A', sub: `last ${days} days` },
    { label: 'SEGMENTS', value: k ? String(k.segments) : 'N/A' },
    { label: 'ACTIVE DISCOUNT CODES', value: k ? String(k.activeDiscountCodes) : 'N/A' },
    { label: 'SUPPRESSED CONTACTS', value: k ? String(k.suppressedContacts) : 'N/A', sub: 'unsubscribed / bounced / blocked' },
  ]

  const opportunities: { text: string; href: string }[] = []
  if (k?.newLeadsAwaitingContact) opportunities.push({ text: `${k.newLeadsAwaitingContact} new lead${k.newLeadsAwaitingContact === 1 ? '' : 's'} haven't been contacted yet.`, href: '/admin/dashboard/marketing/leads' })
  if (k?.expiringDiscountCodes) opportunities.push({ text: `${k.expiringDiscountCodes} discount code${k.expiringDiscountCodes === 1 ? '' : 's'} expiring within 7 days.`, href: '/admin/dashboard/marketing/discounts' })
  if (k && k.scheduledCampaigns === 0 && k.sentCampaigns === 0) opportunities.push({ text: "No campaigns sent recently — it's been quiet. Draft one?", href: '/admin/dashboard/marketing/campaigns' })

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

      <div className="kad-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
            {data ? (
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-.01em' }}>{s.value}</div>
            ) : (
              <Skeleton width={64} height={22} />
            )}
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            {s.sub && data && <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {opportunities.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 12px' }}>Needs attention</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {opportunities.map((o, i) => (
              <Link
                key={i}
                href={o.href}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 11, fontSize: 13, color: 'var(--color-text)', textDecoration: 'none' }}
              >
                <TriangleAlert size={15} color="var(--ke-sun-500)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{o.text}</span>
                <ArrowUpRight size={14} color="var(--color-text-subtle)" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ ...h3Style, margin: '0 0 12px' }}>Campaign performance</h3>
        {!data ? (
          <Skeleton width="100%" height={80} />
        ) : data.campaignPerformance.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>
            No sent campaigns with a linked discount code in this period — attribution only works for campaigns tied to a code (set one when creating or editing a campaign).
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.campaignPerformance.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 11 }}>
                <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                <Badge tone="neutral">{c.orders} orders</Badge>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>{fmt(c.revenue)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
