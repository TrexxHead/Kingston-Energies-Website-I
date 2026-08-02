import { prisma } from '@/lib/prisma'

export interface AttributionStats {
  orders: number
  revenue: number
}

/**
 * Revenue/orders attributed to a discount code: every non-cancelled order
 * that redeemed it. This is the one honest, non-fabricated attribution
 * mechanism available today — there's no click-tracking or UTM capture, so a
 * campaign's "results" are only as real as whether it has a linked code.
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
 * A campaign's attributed performance. Returns null (not zero) when the
 * campaign has no linked discount code — the UI must render that as "not
 * tracked", never as a fabricated $0.
 */
export async function campaignStats(campaignId: string): Promise<AttributionStats | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { discountCode: { select: { code: true } } },
  })
  if (!campaign?.discountCode) return null
  return discountCodeStats(campaign.discountCode.code)
}
