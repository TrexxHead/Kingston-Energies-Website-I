// Server-only: touches the database, so this stays separate from lib/loyalty.ts
// (which is imported by client components like CartContext and must stay
// prisma-free).
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { loyaltyPoints, pointsToValue, POINTS_REDEEM_STEP } from '@/lib/loyalty'
import { countsTowardCustomerHistory } from '@/lib/customerHistory'

type Db = Prisma.TransactionClient | typeof prisma

/** Points earned (independent of any redemption) and the balance already spent — shared by every check below. */
async function loadPointsBalance(db: Db, userId: string): Promise<{ earned: number; pointsRedeemed: number } | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { orders: true, _count: { select: { reviews: true, registeredUnits: true } } },
  })
  if (!user) return null
  const totalSpent = user.orders.filter((o) => o.status !== 'CANCELLED' && countsTowardCustomerHistory(o)).reduce((s, o) => s + o.total, 0)
  const earned = loyaltyPoints({ totalSpent, reviewCount: user._count.reviews, deviceRegistrations: user._count.registeredUnits })
  return { earned, pointsRedeemed: user.pointsRedeemed }
}

/**
 * Validate a requested points redemption against the customer's real balance
 * — never trust the client-sent point count. Rounds down to the nearest
 * whole redemption step and caps at what's actually available.
 *
 * This is a quote, not a reservation: it doesn't lock or deduct anything, so
 * two concurrent checkouts from the same account could both quote against
 * the same starting balance. redeemPointsAtomic() is the actual atomic
 * deduction that closes that race at commit time.
 */
export async function resolvePointsRedemption(userId: string | null, requestedPoints: number): Promise<{ pointsUsed: number; discount: number }> {
  if (!userId || requestedPoints <= 0) return { pointsUsed: 0, discount: 0 }

  const balance = await loadPointsBalance(prisma, userId)
  if (!balance) return { pointsUsed: 0, discount: 0 }
  const available = Math.max(0, balance.earned - balance.pointsRedeemed)

  const requestedSteps = Math.floor(requestedPoints / POINTS_REDEEM_STEP)
  const availableSteps = Math.floor(available / POINTS_REDEEM_STEP)
  const pointsUsed = Math.min(requestedSteps, availableSteps) * POINTS_REDEEM_STEP

  return { pointsUsed, discount: pointsToValue(pointsUsed) }
}

/** Deduct redeemed points from a user's balance after an order is placed — no balance guard (see redeemPointsAtomic for that). */
export async function markPointsRedeemed(userId: string, points: number): Promise<void> {
  if (points <= 0) return
  await prisma.user.update({ where: { id: userId }, data: { pointsRedeemed: { increment: points } } }).catch(() => {})
}

/** Thrown by redeemPointsAtomic when the balance can't actually cover the requested points at the moment of deduction. */
export class PointsUnavailableError extends Error {
  constructor() {
    super('Your points balance changed. Please refresh and try again.')
    this.name = 'PointsUnavailableError'
  }
}

/**
 * Atomically deducts points inside the caller's transaction, re-checking the
 * balance at the moment of deduction — not just at quote time. Closes a race
 * where two concurrent checkouts on the same account could each call
 * resolvePointsRedemption() against the same starting balance and both then
 * deduct, together spending more points than the customer actually has.
 *
 * Only use this on paths where no payment has cleared yet — throwing here is
 * meant to roll back the whole order. The WiPay callback (after a card is
 * already charged) deducts unconditionally via markPointsRedeemed instead,
 * same reasoning as fulfillOrderItems' 'allow' mode: rolling back a paid
 * order over a points guard would be worse than letting a rare double-spend
 * through.
 */
export async function redeemPointsAtomic(tx: Prisma.TransactionClient, userId: string, pointsUsed: number): Promise<void> {
  if (pointsUsed <= 0) return

  const balance = await loadPointsBalance(tx, userId)
  if (!balance) throw new PointsUnavailableError()

  const result = await tx.user.updateMany({
    where: { id: userId, pointsRedeemed: { lte: balance.earned - pointsUsed } },
    data: { pointsRedeemed: { increment: pointsUsed } },
  })
  if (result.count === 0) throw new PointsUnavailableError()
}
