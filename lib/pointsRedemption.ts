// Server-only: touches the database, so this stays separate from lib/loyalty.ts
// (which is imported by client components like CartContext and must stay
// prisma-free).
import { prisma } from '@/lib/prisma'
import { loyaltyPoints, pointsToValue, POINTS_REDEEM_STEP } from '@/lib/loyalty'
import { countsTowardCustomerHistory } from '@/lib/customerHistory'

/**
 * Validate a requested points redemption against the customer's real balance
 * — never trust the client-sent point count. Rounds down to the nearest
 * whole redemption step and caps at what's actually available.
 */
export async function resolvePointsRedemption(userId: string | null, requestedPoints: number): Promise<{ pointsUsed: number; discount: number }> {
  if (!userId || requestedPoints <= 0) return { pointsUsed: 0, discount: 0 }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { orders: true, _count: { select: { reviews: true, registeredUnits: true } } },
  })
  if (!user) return { pointsUsed: 0, discount: 0 }

  const totalSpent = user.orders.filter((o) => o.status !== 'CANCELLED' && countsTowardCustomerHistory(o)).reduce((s, o) => s + o.total, 0)
  const earned = loyaltyPoints({ totalSpent, reviewCount: user._count.reviews, deviceRegistrations: user._count.registeredUnits })
  const available = Math.max(0, earned - user.pointsRedeemed)

  const requestedSteps = Math.floor(requestedPoints / POINTS_REDEEM_STEP)
  const availableSteps = Math.floor(available / POINTS_REDEEM_STEP)
  const pointsUsed = Math.min(requestedSteps, availableSteps) * POINTS_REDEEM_STEP

  return { pointsUsed, discount: pointsToValue(pointsUsed) }
}

/** Deduct redeemed points from a user's balance after an order is placed. */
export async function markPointsRedeemed(userId: string, points: number): Promise<void> {
  if (points <= 0) return
  await prisma.user.update({ where: { id: userId }, data: { pointsRedeemed: { increment: points } } }).catch(() => {})
}
