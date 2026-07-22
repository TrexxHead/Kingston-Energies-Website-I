/**
 * Loyalty points model. Points come from spend plus engagement actions, matching
 * what the support FAQ tells customers:
 *   - 1 point per J$100 spent
 *   - 50 points per product review
 * (Device-registration points can be added here once registrations persist.)
 */
export const POINTS_PER_JMD = 100
export const POINTS_PER_REVIEW = 50

export interface LoyaltyInputs {
  totalSpent: number
  reviewCount?: number
}

export function loyaltyPoints({ totalSpent, reviewCount = 0 }: LoyaltyInputs): number {
  return Math.floor(totalSpent / POINTS_PER_JMD) + reviewCount * POINTS_PER_REVIEW
}
