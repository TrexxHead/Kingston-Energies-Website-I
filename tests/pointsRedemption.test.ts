import { describe, it, expect, vi } from 'vitest'

const findUniqueMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) } },
}))

function makeUser(pointsRedeemed: number, totalSpent: number) {
  return {
    pointsRedeemed,
    orders: [{ status: 'DONE', total: totalSpent, paymentMethod: 'bank', paid: true }],
    _count: { reviews: 0, registeredUnits: 0 },
  }
}

/**
 * Regression coverage for a real race condition: resolvePointsRedemption()
 * is a read-only quote — it doesn't lock or deduct anything. Two concurrent
 * checkouts on the same account could both quote against the same starting
 * balance and both then deduct, together spending more points than the
 * customer actually has. redeemPointsAtomic() is meant to close that at the
 * moment of deduction with a single conditional UPDATE, the same pattern as
 * the stock-decrement fix.
 */
describe('redeemPointsAtomic', () => {
  it('deducts via a conditional updateMany guarded against the balance at commit time', async () => {
    findUniqueMock.mockResolvedValueOnce(makeUser(0, 100_000)) // earned = 1000 points
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const tx = { user: { findUnique: findUniqueMock, updateMany } } as unknown as Parameters<
      typeof import('@/lib/pointsRedemption').redeemPointsAtomic
    >[0]

    const { redeemPointsAtomic } = await import('@/lib/pointsRedemption')
    await redeemPointsAtomic(tx, 'user-1', 250)

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', pointsRedeemed: { lte: 1000 - 250 } },
      data: { pointsRedeemed: { increment: 250 } },
    })
  })

  it('throws when a concurrent deduction already used up the balance (updateMany affects 0 rows)', async () => {
    findUniqueMock.mockResolvedValueOnce(makeUser(900, 100_000)) // earned=1000, already redeemed 900 -> only 100 left
    const updateMany = vi.fn().mockResolvedValue({ count: 0 })
    const tx = { user: { findUnique: findUniqueMock, updateMany } } as unknown as Parameters<
      typeof import('@/lib/pointsRedemption').redeemPointsAtomic
    >[0]

    const { redeemPointsAtomic, PointsUnavailableError } = await import('@/lib/pointsRedemption')
    await expect(redeemPointsAtomic(tx, 'user-1', 250)).rejects.toBeInstanceOf(PointsUnavailableError)
  })

  it('is a no-op for zero/negative points (never even looks up the balance)', async () => {
    const findUnique = vi.fn()
    const updateMany = vi.fn()
    const tx = { user: { findUnique, updateMany } } as unknown as Parameters<typeof import('@/lib/pointsRedemption').redeemPointsAtomic>[0]
    const { redeemPointsAtomic } = await import('@/lib/pointsRedemption')
    await redeemPointsAtomic(tx, 'user-1', 0)
    expect(updateMany).not.toHaveBeenCalled()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('throws if the user no longer exists', async () => {
    findUniqueMock.mockResolvedValueOnce(null)
    const updateMany = vi.fn()
    const tx = { user: { findUnique: findUniqueMock, updateMany } } as unknown as Parameters<
      typeof import('@/lib/pointsRedemption').redeemPointsAtomic
    >[0]
    const { redeemPointsAtomic, PointsUnavailableError } = await import('@/lib/pointsRedemption')
    await expect(redeemPointsAtomic(tx, 'ghost', 250)).rejects.toBeInstanceOf(PointsUnavailableError)
  })
})

describe('resolvePointsRedemption', () => {
  it('rounds down to the nearest whole redemption step and caps at the available balance', async () => {
    findUniqueMock.mockResolvedValueOnce(makeUser(0, 50_000)) // earned = 500 points available
    const { resolvePointsRedemption } = await import('@/lib/pointsRedemption')
    const result = await resolvePointsRedemption('user-1', 900) // request more than available
    expect(result.pointsUsed).toBe(500) // capped, and already a whole step
  })

  it('returns zero for a guest (no userId)', async () => {
    const { resolvePointsRedemption } = await import('@/lib/pointsRedemption')
    const result = await resolvePointsRedemption(null, 250)
    expect(result).toEqual({ pointsUsed: 0, discount: 0 })
  })
})
