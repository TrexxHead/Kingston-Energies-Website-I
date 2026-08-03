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
  it('returns a real zero (not null) for a campaign with no linked code and no clicks yet', async () => {
    findUniqueMock.mockResolvedValueOnce({ discountCode: null })
    findManyMock.mockResolvedValueOnce([])
    const { campaignStats } = await import('@/lib/campaignAttribution')
    expect(await campaignStats('c1')).toEqual({ orders: 0, revenue: 0 })
  })

  it('queries by click attribution alone when there is no linked discount code', async () => {
    findUniqueMock.mockResolvedValueOnce({ discountCode: null })
    findManyMock.mockResolvedValueOnce([{ total: 800 }])
    const { campaignStats } = await import('@/lib/campaignAttribution')
    const result = await campaignStats('c1')
    expect(result).toEqual({ orders: 1, revenue: 800 })
    expect(findManyMock).toHaveBeenCalledWith({
      where: { OR: [{ campaignId: 'c1' }], status: { not: 'CANCELLED' } },
      select: { total: true },
    })
  })

  it('combines click attribution and a linked discount code in one query', async () => {
    findUniqueMock.mockResolvedValueOnce({ discountCode: { code: 'PROMO10' } })
    findManyMock.mockResolvedValueOnce([{ total: 500 }, { total: 300 }])
    const { campaignStats } = await import('@/lib/campaignAttribution')
    const result = await campaignStats('c2')
    expect(result).toEqual({ orders: 2, revenue: 800 })
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        OR: [{ campaignId: 'c2' }, { promoCode: { equals: 'PROMO10', mode: 'insensitive' } }],
        status: { not: 'CANCELLED' },
      },
      select: { total: true },
    })
  })

  it('returns a real zero for an unknown campaign id', async () => {
    findUniqueMock.mockResolvedValueOnce(null)
    const { campaignStats } = await import('@/lib/campaignAttribution')
    expect(await campaignStats('missing')).toEqual({ orders: 0, revenue: 0 })
  })
})
