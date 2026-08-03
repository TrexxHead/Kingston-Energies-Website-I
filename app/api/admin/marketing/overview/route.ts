import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { campaignStats } from '@/lib/campaignAttribution'

/**
 * The Marketing tab's Overview dashboard. Deliberately shows only what's
 * actually measurable from live data — no ad spend/ROAS/CAC, since there's
 * no advertising-platform integration to compute them from (better an honest
 * gap than a fabricated number).
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const days = Math.min(365, Math.max(1, Number(searchParams.get('days')) || 30))
  const since = new Date(Date.now() - days * 86_400_000)

  const [
    scheduledCount,
    sentThisPeriod,
    sentCampaigns,
    leadsThisPeriod,
    newLeads,
    leadsByStatusRaw,
    segmentsCount,
    activeDiscountCodes,
    expiringDiscountCodes,
    suppressedCount,
    channelCounts,
  ] = await Promise.all([
    prisma.campaign.count({ where: { status: 'SCHEDULED' } }),
    prisma.campaign.count({ where: { status: 'SENT', sentAt: { gte: since } } }),
    prisma.campaign.findMany({
      where: { status: 'SENT', sentAt: { gte: since } },
      select: { id: true, name: true, discountCode: { select: { code: true } } },
    }),
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.lead.count({ where: { status: 'NEW' } }),
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.segment.count(),
    prisma.discountCode.count({ where: { active: true } }),
    prisma.discountCode.count({ where: { active: true, expiresAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) } } }),
    prisma.suppression.count(),
    prisma.campaign.groupBy({ by: ['channel'], where: { status: 'SENT', sentAt: { gte: since } }, _count: { _all: true } }),
  ])

  // Attributed (click and/or linked-discount-code) performance per campaign
  // sent in this period — every campaign has a real number, including a real
  // zero, since a tracking link exists from the moment a campaign is created.
  const campaignPerformance = await Promise.all(
    sentCampaigns.map(async (c) => ({ id: c.id, name: c.name, ...(await campaignStats(c.id, since)) })),
  )
  const attributedRevenue = campaignPerformance.reduce((s, c) => s + c.revenue, 0)
  const attributedOrders = campaignPerformance.reduce((s, c) => s + c.orders, 0)

  // Daily attributed-revenue trend: every order stamped with one of these
  // campaigns' click attribution, or that redeemed one of their linked
  // codes, bucketed by day. Same underlying data as the KPI above.
  const sentCampaignIds = sentCampaigns.map((c) => c.id)
  const linkedCodes = sentCampaigns.map((c) => c.discountCode?.code).filter((c): c is string => Boolean(c))
  const attributedOrdersInPeriod =
    sentCampaignIds.length || linkedCodes.length
      ? await prisma.order.findMany({
          where: {
            OR: [
              ...(sentCampaignIds.length ? [{ campaignId: { in: sentCampaignIds } }] : []),
              ...(linkedCodes.length ? [{ promoCode: { in: linkedCodes, mode: 'insensitive' as const } }] : []),
            ],
            status: { not: 'CANCELLED' },
            createdAt: { gte: since },
          },
          select: { total: true, createdAt: true },
        })
      : []
  const revenueSeries: { label: string; value: number }[] = []
  for (let i = 0; i < days; i++) {
    const day = new Date(since)
    day.setDate(since.getDate() + i)
    day.setHours(0, 0, 0, 0)
    const next = new Date(day)
    next.setDate(day.getDate() + 1)
    const value = attributedOrdersInPeriod
      .filter((o) => o.createdAt >= day && o.createdAt < next)
      .reduce((s, o) => s + o.total, 0)
    revenueSeries.push({ label: day.toLocaleDateString('en-GB', { day: 'numeric', month: days > 31 ? 'short' : undefined }), value })
  }

  const STATUS_LABEL: Record<string, string> = { NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', CONVERTED: 'Converted', LOST: 'Lost' }
  const leadsByStatus = leadsByStatusRaw.map((r) => ({ label: STATUS_LABEL[r.status] ?? r.status, value: r._count._all }))

  const CHANNEL_LABEL: Record<string, string> = { EMAIL: 'Email', SMS: 'SMS', PUSH: 'Push', SOCIAL: 'Social' }
  const channelBreakdown = channelCounts.map((r) => ({ label: CHANNEL_LABEL[r.channel] ?? r.channel, value: r._count._all }))

  return NextResponse.json({
    days,
    kpis: {
      scheduledCampaigns: scheduledCount,
      sentCampaigns: sentThisPeriod,
      // Revenue/orders attributed via click-through or a linked discount
      // code, across every campaign sent in this period.
      attributedRevenue,
      attributedOrders,
      leadsGenerated: leadsThisPeriod,
      newLeadsAwaitingContact: newLeads,
      segments: segmentsCount,
      activeDiscountCodes,
      expiringDiscountCodes,
      suppressedContacts: suppressedCount,
    },
    campaignPerformance: campaignPerformance.sort((a, b) => b.revenue - a.revenue),
    revenueSeries,
    leadsByStatus,
    channelBreakdown,
  })
}
