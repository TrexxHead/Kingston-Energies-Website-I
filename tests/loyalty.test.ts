import { describe, it, expect } from 'vitest'
import { loyaltyPoints, POINTS_PER_REVIEW } from '@/lib/loyalty'

describe('loyaltyPoints', () => {
  it('awards 1 point per J$100 spent', () => {
    expect(loyaltyPoints({ totalSpent: 7999 })).toBe(79)
    expect(loyaltyPoints({ totalSpent: 0 })).toBe(0)
  })

  it('adds review points on top of spend', () => {
    expect(loyaltyPoints({ totalSpent: 10000, reviewCount: 2 })).toBe(100 + 2 * POINTS_PER_REVIEW)
  })

  it('handles a review-only customer', () => {
    expect(loyaltyPoints({ totalSpent: 0, reviewCount: 3 })).toBe(3 * POINTS_PER_REVIEW)
  })
})
