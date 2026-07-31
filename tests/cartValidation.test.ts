import { describe, it, expect, vi } from 'vitest'
import { CATALOG } from '@/lib/catalog'

const findManyMock = vi.fn().mockResolvedValue([])
vi.mock('@/lib/prisma', () => ({
  prisma: { product: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}))

/**
 * Regression test for a real, previously-unflagged vulnerability: both public
 * checkout endpoints (/api/orders, /api/payments/wipay/create) built the
 * order total from client-supplied `items[].price` with no server-side check
 * against real catalog prices — a client editing that request body could
 * check out, and for the WiPay path get a card charged, at any price it
 * chose. validateCartPrices() closes that gap.
 */
describe('validateCartPrices', () => {
  it('accepts a cart whose prices match the real catalog', async () => {
    const { validateCartPrices } = await import('@/lib/cartValidation')
    const real = CATALOG[0]
    const result = await validateCartPrices([{ name: real.name, price: real.price, qty: 1 }])
    expect(result.ok).toBe(true)
  })

  it('rejects a tampered price for a real product', async () => {
    const { validateCartPrices } = await import('@/lib/cartValidation')
    const real = CATALOG[0]
    const result = await validateCartPrices([{ name: real.name, price: 1, qty: 1 }])
    expect(result.ok).toBe(false)
  })

  it('rejects an item name that matches no known product', async () => {
    const { validateCartPrices } = await import('@/lib/cartValidation')
    const result = await validateCartPrices([{ name: 'Not A Real Product', price: 1, qty: 1 }])
    expect(result.ok).toBe(false)
  })

  it('prefers a DB sale price over the static catalog price when both exist', async () => {
    findManyMock.mockResolvedValueOnce([{ name: CATALOG[0].name, price: CATALOG[0].price, salePrice: 1 }])
    const { validateCartPrices } = await import('@/lib/cartValidation')
    const result = await validateCartPrices([{ name: CATALOG[0].name, price: 1, qty: 1 }])
    expect(result.ok).toBe(true)
  })
})
