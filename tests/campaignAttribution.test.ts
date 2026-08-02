import { describe, it, expect, vi } from 'vitest'

const findManyMock = vi.fn()
const findUniqueMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findMany: (...args: unknown[]) => findManyMock(...args) },
    campaign: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
  },
}))

describe('discountCodeStats', () => {
  it('sums revenue and counts orders for a code, excluding cancelled orders', async () => {
    findManyMock.mockResolvedValueOnce([{ total: 1000 }, { total: 2500 }])
    const { discountCodeStats } = await import('@/lib/campaignAttribution')
    const result = await discountCodeStats('SUMMER25')
    expect(result).toEqual({ orders: 2, revenue: 3500 })
    expect(findManyMock).toHaveBeenCalledWith({
      where: { promoCode: { equals: 'SUMMER25', mode: 'insensitive' }, status: { not: 'CANCELLED' } },
      select: { total: true },
    })
  })

  it('applies a since filter when provided', async () => {
    findManyMock.mockResolvedValueOnce([])
    const { discountCodeStats } = await import('@/lib/campaignAttribution')
    const since = new Date('2026-01-01')
    await discountCodeStats('CODE', since)
    expect(findManyMock).toHaveBeenCalledWith({
      where: { promoCode: { equals: 'CODE', mode: 'insensitive' }, status: { not: 'CANCELLED' }, createdAt: { gte: since } },
      select: { total: true },
    })
  })
})

describe('campaignStats', () => {
  it('returns null (not a fabricated $0) when the campaign has no linked discount code', async () => {
    findUniqueMock.mockResolvedValueOnce({ discountCode: null })
    const { campaignStats } = await import('@/lib/campaignAttribution')
    expect(await campaignStats('c1')).toBeNull()
  })

  it('returns real stats when a discount code is linked', async () => {
    findUniqueMock.mockResolvedValueOnce({ discountCode: { code: 'PROMO10' } })
    findManyMock.mockResolvedValueOnce([{ total: 500 }])
    const { campaignStats } = await import('@/lib/campaignAttribution')
    expect(await campaignStats('c2')).toEqual({ orders: 1, revenue: 500 })
  })
})
