/**
 * Loyalty points model. Points come from spend plus engagement actions, matching
 * what the support FAQ tells customers:
 *   - 1 point per J$100 spent
 *   - 50 points per product review
 *   - 25 points per registered device (My devices)
 */
export const POINTS_PER_JMD = 100
export const POINTS_PER_REVIEW = 50
export const POINTS_PER_DEVICE_REGISTRATION = 25

export interface LoyaltyInputs {
  totalSpent: number
  reviewCount?: number
  deviceRegistrations?: number
}

export function loyaltyPoints({ totalSpent, reviewCount = 0, deviceRegistrations = 0 }: LoyaltyInputs): number {
  return Math.floor(totalSpent / POINTS_PER_JMD) + reviewCount * POINTS_PER_REVIEW + deviceRegistrations * POINTS_PER_DEVICE_REGISTRATION
}

/**
 * Redeeming points at checkout — customers need at least POINTS_REDEEM_MIN
 * banked before they can redeem anything, then it's J$500 off per 250 points.
 */
export const POINTS_REDEEM_MIN = 250 // minimum balance needed to redeem at all
export const POINTS_REDEEM_STEP = 250 // points per redemption step
export const POINTS_REDEEM_VALUE = 500 // J$ off per step

/** J$ discount for redeeming `points` — rounds down to the nearest whole step. */
export function pointsToValue(points: number): number {
  if (points < POINTS_REDEEM_MIN) return 0
  return Math.floor(points / POINTS_REDEEM_STEP) * POINTS_REDEEM_VALUE
}
