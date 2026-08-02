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
    segmentsCount,
    activeDiscountCodes,
    expiringDiscountCodes,
    suppressedCount,
  ] = await Promise.all([
    prisma.campaign.count({ where: { status: 'SCHEDULED' } }),
    prisma.campaign.count({ where: { status: 'SENT', sentAt: { gte: since } } }),
    prisma.campaign.findMany({
      where: { discountCodeId: { not: null }, sentAt: { gte: since } },
      select: { id: true, name: true, discountCode: { select: { code: true } } },
    }),
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.lead.count({ where: { status: 'NEW' } }),
    prisma.segment.count(),
    prisma.discountCode.count({ where: { active: true } }),
    prisma.discountCode.count({ where: { active: true, expiresAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) } } }),
    prisma.suppression.count(),
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
  })
}
