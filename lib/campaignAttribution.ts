import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface AttributionStats {
  orders: number
  revenue: number
}

/**
 * Revenue/orders attributed to a discount code: every non-cancelled order
 * that redeemed it. Used standalone by the Discounts tab (independent of any
 * campaign), and as one half of campaignStats() below.
 */
export async function discountCodeStats(code: string, since?: Date): Promise<AttributionStats> {
  const orders = await prisma.order.findMany({
    where: {
      promoCode: { equals: code, mode: 'insensitive' },
      status: { not: 'CANCELLED' },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: { total: true },
  })
  return { orders: orders.length, revenue: orders.reduce((s, o) => s + o.total, 0) }
}

/**
 * A campaign's attributed performance — the union of two independent, real
 * signals, deduplicated by a single query so an order matching both isn't
 * double-counted:
 *  1. Last-click: the order's Order.campaignId was stamped because the
 *     customer arrived via this campaign's tracking link within the
 *     attribution window (see lib/campaignClick.ts, CampaignClickCapture).
 *  2. Linked discount code: the order redeemed the code this campaign has
 *     linked, if any.
 * Every campaign has a tracking link the moment it's created, so this always
 * returns real numbers — including a real zero for "no attributed orders
 * yet," never a fabricated figure.
 */
export async function campaignStats(campaignId: string, since?: Date): Promise<AttributionStats> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { discountCode: { select: { code: true } } },
  })
  if (!campaign) return { orders: 0, revenue: 0 }

  const or: Prisma.OrderWhereInput[] = [{ campaignId }]
  if (campaign.discountCode) {
    or.push({ promoCode: { equals: campaign.discountCode.code, mode: 'insensitive' } })
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: or,
      status: { not: 'CANCELLED' },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: { total: true },
  })
  return { orders: orders.length, revenue: orders.reduce((s, o) => s + o.total, 0) }
}
