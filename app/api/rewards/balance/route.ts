import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { loyaltyPoints, pointsToValue, POINTS_REDEEM_MIN, POINTS_REDEEM_STEP, POINTS_REDEEM_VALUE } from '@/lib/loyalty'

/**
 * The signed-in customer's current redeemable points balance — backs the
 * "use your points" card on the cart page (same spot as the promo code).
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ signedIn: false, points: 0, redeemable: 0, minRedeem: POINTS_REDEEM_MIN, step: POINTS_REDEEM_STEP, stepValue: POINTS_REDEEM_VALUE })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { orders: true, _count: { select: { reviews: true, registeredUnits: true } } },
  })
  if (!user) {
    return NextResponse.json({ signedIn: false, points: 0, redeemable: 0, minRedeem: POINTS_REDEEM_MIN, step: POINTS_REDEEM_STEP, stepValue: POINTS_REDEEM_VALUE })
  }

  const totalSpent = user.orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)
  const earned = loyaltyPoints({ totalSpent, reviewCount: user._count.reviews, deviceRegistrations: user._count.registeredUnits })
  const points = Math.max(0, earned - user.pointsRedeemed)

  return NextResponse.json({
    signedIn: true,
    points,
    redeemable: pointsToValue(points),
    minRedeem: POINTS_REDEEM_MIN,
    step: POINTS_REDEEM_STEP,
    stepValue: POINTS_REDEEM_VALUE,
  })
}
