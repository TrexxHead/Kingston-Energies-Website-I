import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { discountCodeStats } from '@/lib/campaignAttribution'

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
    campaignsWithCode,
    leadsThisPeriod,
    newLeads,
    leadsByStatusRaw,
    segmentsCount,
    activeDiscountCodes,
    allDiscountCodes,
    expiringDiscountCodes,
    suppressedCount,
    channelCounts,
  ] = await Promise.all([
    prisma.campaign.count({ where: { status: 'SCHEDULED' } }),
    prisma.campaign.count({ where: { status: 'SENT', sentAt: { gte: since } } }),
    prisma.campaign.findMany({
      where: { discountCodeId: { not: null }, sentAt: { gte: since } },
      select: { id: true, name: true, discountCode: { select: { code: true } } },
    }),
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.lead.count({ where: { status: 'NEW' } }),
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.segment.count(),
    prisma.discountCode.count({ where: { active: true } }),
    prisma.discountCode.findMany({ select: { code: true } }),
    prisma.discountCode.count({ where: { active: true, expiresAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) } } }),
    prisma.suppression.count(),
    prisma.campaign.groupBy({ by: ['channel'], where: { status: 'SENT', sentAt: { gte: since } }, _count: { _all: true } }),
  ])

  const campaignStats = await Promise.all(
    campaignsWithCode.map(async (c) => ({
      id: c.id,
      name: c.name,
      ...(await discountCodeStats(c.discountCode!.code, since)),
    })),
  )
  const attributedRevenue = campaignStats.reduce((s, c) => s + c.revenue, 0)
  const attributedOrders = campaignStats.reduce((s, c) => s + c.orders, 0)

  // Daily attributed-revenue trend: every order that redeemed ANY code ever
  // linked to a campaign, bucketed by day. Same honesty rule as the KPI above
  // — this is real redemption data, not a projection.
  const linkedCodes = allDiscountCodes.map((d) => d.code)
  const attributedOrdersInPeriod = linkedCodes.length
    ? await prisma.order.findMany({
        where: { promoCode: { in: linkedCodes, mode: 'insensitive' }, status: { not: 'CANCELLED' }, createdAt: { gte: since } },
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
      // Revenue/orders from campaigns with a linked discount code, sent within
      // the period. Campaigns without a linked code aren't counted here — not
      // zero, just not trackable, and the campaign table below shows that
      // distinction per-campaign.
      attributedRevenue,
      attributedOrders,
      leadsGenerated: leadsThisPeriod,
      newLeadsAwaitingContact: newLeads,
      segments: segmentsCount,
      activeDiscountCodes,
      expiringDiscountCodes,
      suppressedContacts: suppressedCount,
    },
    campaignPerformance: campaignStats.sort((a, b) => b.revenue - a.revenue),
    revenueSeries,
    leadsByStatus,
    channelBreakdown,
  })
}
