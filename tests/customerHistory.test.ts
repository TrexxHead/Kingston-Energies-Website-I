import { describe, it, expect, vi } from 'vitest'

const findFirstMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: { order: { findFirst: (...args: unknown[]) => findFirstMock(...args) } },
}))

/**
 * Regression coverage for a real bug: an abandoned/declined WiPay card order
 * is created (status PENDING, paid false) before the customer ever reaches
 * the hosted payment page — see app/api/payments/wipay/create/route.ts. That
 * row used to count as "this customer already has an order," permanently
 * costing a genuinely-new customer their first-order discount the moment
 * their card was declined or they closed the tab, and (via the totalSpent
 * calculations that also used to ignore paid/paymentMethod) inflating their
 * loyalty points off a sale that never happened.
 */
describe('countsTowardCustomerHistory', () => {
  it('excludes an abandoned/declined card order (unpaid, card)', async () => {
    const { countsTowardCustomerHistory } = await import('@/lib/customerHistory')
    expect(countsTowardCustomerHistory({ paymentMethod: 'card', paid: false })).toBe(false)
  })

  it('counts a card order once it actually cleared (paid)', async () => {
    const { countsTowardCustomerHistory } = await import('@/lib/customerHistory')
    expect(countsTowardCustomerHistory({ paymentMethod: 'card', paid: true })).toBe(true)
  })

  it('counts non-card orders immediately, even before paid is confirmed (bank/cod/etc are real commitments)', async () => {
    const { countsTowardCustomerHistory } = await import('@/lib/customerHistory')
    expect(countsTowardCustomerHistory({ paymentMethod: 'bank', paid: false })).toBe(true)
    expect(countsTowardCustomerHistory({ paymentMethod: 'cod', paid: false })).toBe(true)
    expect(countsTowardCustomerHistory({ paymentMethod: null, paid: false })).toBe(true)
  })
})

describe('isFirstTimeCustomer', () => {
  it('returns false with neither identifier (unverifiable, default to no discount)', async () => {
    const { isFirstTimeCustomer } = await import('@/lib/customerHistory')
    expect(await isFirstTimeCustomer(null, null)).toBe(false)
    expect(findFirstMock).not.toHaveBeenCalled()
  })

  it('excludes abandoned card orders from the userId lookup', async () => {
    findFirstMock.mockResolvedValueOnce(null)
    const { isFirstTimeCustomer } = await import('@/lib/customerHistory')
    const result = await isFirstTimeCustomer('user-1', null)
    expect(result).toBe(true)
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { userId: 'user-1', NOT: { paymentMethod: 'card', paid: false } },
      select: { id: true },
    })
  })

  it('returns false once a real (counted) order exists', async () => {
    findFirstMock.mockResolvedValueOnce({ id: 'order-1' })
    const { isFirstTimeCustomer } = await import('@/lib/customerHistory')
    expect(await isFirstTimeCustomer('user-1', null)).toBe(false)
  })
})
