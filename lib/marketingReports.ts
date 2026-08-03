import { prisma } from '@/lib/prisma'
import { campaignStats } from '@/lib/campaignAttribution'

const CHANNELS = ['EMAIL', 'SMS', 'PUSH', 'SOCIAL'] as const
export type ReportChannel = (typeof CHANNELS)[number]

export interface ChannelRoi {
  channel: ReportChannel
  campaignsSent: number
  spend: number
  revenue: number
  /** null when no spend was logged for the channel — an honest "can't compute ROI" rather than a fabricated 0. */
  roi: number | null
}

/**
 * Spend vs attributed revenue per channel, for every campaign actually sent
 * in the window. Spend is what was posted as a real Expense at send time
 * (lib/campaigns.ts), so this always agrees with what Finance recorded.
 */
export async function channelRoi(since?: Date): Promise<ChannelRoi[]> {
  const sent = await prisma.campaign.findMany({
    where: { status: 'SENT', ...(since ? { sentAt: { gte: since } } : {}) },
    select: { id: true, channel: true, spend: true },
  })

  const results: ChannelRoi[] = []
  for (const channel of CHANNELS) {
    const campaigns = sent.filter((c) => c.channel === channel)
    const spend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0)
    const stats = await Promise.all(campaigns.map((c) => campaignStats(c.id, since)))
    const revenue = stats.reduce((s, r) => s + r.revenue, 0)
    results.push({
      channel,
      campaignsSent: campaigns.length,
      spend,
      revenue,
      roi: spend > 0 ? (revenue - spend) / spend : null,
    })
  }
  return results
}

export interface CohortRow {
  /** "2026-03" style label — the month of each customer's first counted order. */
  cohort: string
  newCustomers: number
  repeatCustomers: number
  retentionRate: number
}

/**
 * Customer cohorts by the month of their first order, and what share of each
 * cohort came back for a second order (any time since — not windowed), so
 * the trend reads honestly even with a small customer base. Guest orders
 * (no account) aren't tied to a stable identity across visits, so they're
 * excluded rather than double-counted or guessed at.
 */
export async function cohortRetention(months = 12): Promise<CohortRow[]> {
  const orders = await prisma.order.findMany({
    where: { userId: { not: null }, status: { not: 'CANCELLED' }, NOT: { paymentMethod: 'card', paid: false } },
    select: { userId: true, createdAt: true },
  })

  const byUser = new Map<string, Date[]>()
  for (const o of orders) {
    if (!o.userId) continue
    const dates = byUser.get(o.userId) ?? []
    dates.push(o.createdAt)
    byUser.set(o.userId, dates)
  }

  const cohorts = new Map<string, { newCustomers: number; repeatCustomers: number }>()
  for (const dates of byUser.values()) {
    dates.sort((a, b) => a.getTime() - b.getTime())
    const first = dates[0]
    const label = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`
    const bucket = cohorts.get(label) ?? { newCustomers: 0, repeatCustomers: 0 }
    bucket.newCustomers += 1
    if (dates.length > 1) bucket.repeatCustomers += 1
    cohorts.set(label, bucket)
  }

  const rows = Array.from(cohorts.entries())
    .map(([cohort, v]) => ({ cohort, ...v, retentionRate: v.newCustomers > 0 ? v.repeatCustomers / v.newCustomers : 0 }))
    .sort((a, b) => (a.cohort < b.cohort ? -1 : 1))

  return rows.slice(-months)
}
