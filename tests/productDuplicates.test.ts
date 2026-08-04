import { describe, it, expect, vi } from 'vitest'

/**
 * Regression coverage for a real production incident: two Product rows
 * sharing a name (e.g. an admin adding "Type C to Lightning Charger" without
 * realising a similarly-named product already existed) produced the same
 * generated storefront id for both, and checkout's price re-check could
 * validate against a different duplicate than the one a customer actually
 * saw — failing checkout for that product, on every payment method, every
 * time. Both getShopProducts() and validateCartPrices() must now agree on
 * exactly one "real" row (the oldest) per name.
 */

const findManyMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: { findMany: (...args: unknown[]) => findManyMock(...args) },
    review: { groupBy: vi.fn().mockResolvedValue([]) },
  },
}))

const dupRows = [
  {
    id: 'p1', catalogId: null, name: 'Type C to Lightning Charger', price: 2500, salePrice: null, stock: 5, archived: false,
    category: 'COMPONENTS', spec: null, badge: null, description: null, shortDescription: null, brand: null, weight: null,
    dimensions: null, warranty: null, images: [], features: [], tags: [], specs: null, createdAt: new Date('2026-01-01'),
  },
  {
    id: 'p2', catalogId: null, name: 'type c to lightning charger', price: 3000, salePrice: null, stock: 2, archived: false,
    category: 'COMPONENTS', spec: null, badge: null, description: null, shortDescription: null, brand: null, weight: null,
    dimensions: null, warranty: null, images: [], features: [], tags: [], specs: null, createdAt: new Date('2026-02-01'),
  },
]

describe('getShopProducts de-duplicates DB-only rows by name', () => {
  it('keeps only the oldest row when two share a name, so no id collides', async () => {
    findManyMock.mockResolvedValueOnce(dupRows)
    const { getShopProducts } = await import('@/lib/products')
    const products = await getShopProducts()

    const matches = products.filter((p) => p.name.toLowerCase() === 'type c to lightning charger')
    expect(matches).toHaveLength(1)
    expect(matches[0].price).toBe(2500) // the older (Jan) row
  })
})

describe('getShopProducts prefers the entry with a real photo across a punctuation-only near-duplicate', () => {
  it('drops the image-less static catalog entry once an admin-added row with a photo covers the same product', async () => {
    // "USB-C Wall Adapter, White" is a real static catalog entry (lib/catalog.ts,
    // id cmp-adpt-w) with image: null. An admin separately added "USB-C Wall
    // Adapter — White" (em dash, not comma) as a DB-only product with a real
    // photo — different enough punctuation that the exact-name join above
    // never links them, so both used to show side by side on the shop grid,
    // one of them a blank placeholder for the exact same physical item.
    findManyMock.mockResolvedValueOnce([
      {
        id: 'db1', catalogId: null, name: 'USB-C Wall Adapter — White', price: 1500, salePrice: null, stock: 5, archived: false,
        category: 'COMPONENTS', spec: null, badge: null, description: null, shortDescription: null, brand: null, weight: null,
        dimensions: null, warranty: null, images: ['/uploads/wall-adapter-white.jpg'], features: [], tags: [], specs: null,
        createdAt: new Date('2026-01-01'),
      },
    ])
    const { getShopProducts } = await import('@/lib/products')
    const products = await getShopProducts()

    const matches = products.filter((p) => p.name.toLowerCase().includes('wall adapter') && p.name.toLowerCase().includes('white'))
    expect(matches).toHaveLength(1)
    expect(matches[0].image).toBe('/uploads/wall-adapter-white.jpg')
  })
})

describe('validateCartPrices agrees with the storefront on the same duplicate', () => {
  it('validates against the oldest row’s price, matching what getShopProducts shows', async () => {
    findManyMock.mockResolvedValueOnce(dupRows)
    const { validateCartPrices } = await import('@/lib/cartValidation')
    const result = await validateCartPrices([{ name: 'Type C to Lightning Charger', price: 2500, qty: 1 }])
    expect(result.ok).toBe(true)
  })

  it('rejects the newer duplicate’s price as stale', async () => {
    findManyMock.mockResolvedValueOnce(dupRows)
    const { validateCartPrices } = await import('@/lib/cartValidation')
    const result = await validateCartPrices([{ name: 'Type C to Lightning Charger', price: 3000, qty: 1 }])
    expect(result.ok).toBe(false)
  })
})
