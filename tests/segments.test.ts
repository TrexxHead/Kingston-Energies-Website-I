import { describe, it, expect, vi } from 'vitest'

const findManyMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}))

function customer(overrides: Partial<{
  id: string; email: string; name: string | null; segment: string | null; primaryNeed: string | null; createdAt: Date
  orders: { status: string; total: number; paymentMethod: string | null; paid: boolean; createdAt: Date }[]
}> = {}) {
  return {
    id: 'u1', email: 'a@example.com', name: 'A', segment: null, primaryNeed: null, createdAt: new Date('2024-01-01'), orders: [],
    ...overrides,
  }
}

describe('segmentMembers', () => {
  it('matches on tier', async () => {
    findManyMock.mockResolvedValueOnce([customer({ id: 'u1', segment: 'VIP' }), customer({ id: 'u2', segment: 'NEW' })])
    const { segmentMembers } = await import('@/lib/segments')
    const result = await segmentMembers({ tiers: ['VIP'] })
    expect(result.map((m) => m.id)).toEqual(['u1'])
  })

  it('matches on total spend across counted orders only', async () => {
    findManyMock.mockResolvedValueOnce([
      customer({
        id: 'big-spender',
        orders: [{ status: 'DONE', total: 50_000, paymentMethod: 'bank', paid: true, createdAt: new Date() }],
      }),
      customer({
        id: 'abandoned-card',
        // An unpaid card order (never cleared) shouldn't count toward spend — same rule as loyalty points.
        orders: [{ status: 'PENDING', total: 50_000, paymentMethod: 'card', paid: false, createdAt: new Date() }],
      }),
    ])
    const { segmentMembers } = await import('@/lib/segments')
    const result = await segmentMembers({ minTotalSpent: 10_000 })
    expect(result.map((m) => m.id)).toEqual(['big-spender'])
  })

  it('matches neverPurchased', async () => {
    findManyMock.mockResolvedValueOnce([
      customer({ id: 'has-order', orders: [{ status: 'DONE', total: 100, paymentMethod: 'bank', paid: true, createdAt: new Date() }] }),
      customer({ id: 'no-order', orders: [] }),
    ])
    const { segmentMembers } = await import('@/lib/segments')
    const result = await segmentMembers({ neverPurchased: true })
    expect(result.map((m) => m.id)).toEqual(['no-order'])
  })

  it('matches lastPurchaseWithinDays', async () => {
    const recent = new Date()
    const old = new Date(Date.now() - 200 * 86_400_000)
    findManyMock.mockResolvedValueOnce([
      customer({ id: 'recent', orders: [{ status: 'DONE', total: 100, paymentMethod: 'bank', paid: true, createdAt: recent }] }),
      customer({ id: 'stale', orders: [{ status: 'DONE', total: 100, paymentMethod: 'bank', paid: true, createdAt: old }] }),
      customer({ id: 'none', orders: [] }),
    ])
    const { segmentMembers } = await import('@/lib/segments')
    const result = await segmentMembers({ lastPurchaseWithinDays: 90 })
    expect(result.map((m) => m.id)).toEqual(['recent'])
  })

  it('AND-combines multiple filters', async () => {
    findManyMock.mockResolvedValueOnce([
      customer({ id: 'match', segment: 'VIP', orders: [{ status: 'DONE', total: 20_000, paymentMethod: 'bank', paid: true, createdAt: new Date() }] }),
      customer({ id: 'wrong-tier', segment: 'NEW', orders: [{ status: 'DONE', total: 20_000, paymentMethod: 'bank', paid: true, createdAt: new Date() }] }),
      customer({ id: 'low-spend', segment: 'VIP', orders: [{ status: 'DONE', total: 100, paymentMethod: 'bank', paid: true, createdAt: new Date() }] }),
    ])
    const { segmentMembers } = await import('@/lib/segments')
    const result = await segmentMembers({ tiers: ['VIP'], minTotalSpent: 10_000 })
    expect(result.map((m) => m.id)).toEqual(['match'])
  })

  it('returns everyone when criteria is empty', async () => {
    findManyMock.mockResolvedValueOnce([customer({ id: 'a' }), customer({ id: 'b' })])
    const { segmentMembers } = await import('@/lib/segments')
    const result = await segmentMembers({})
    expect(result).toHaveLength(2)
  })
})
