import { describe, it, expect } from 'vitest'
import { getShopProducts, getShopProduct } from '@/lib/products'
import { CATALOG } from '@/lib/catalog'

// No DATABASE_URL is configured in the test environment, so these exercise the
// "DB unavailable" fallback path — the one thing that keeps the storefront up
// if Supabase is ever unreachable in production.

describe('getShopProducts (DB unavailable fallback)', () => {
  it('returns every catalog product, marked in stock with the static price', async () => {
    const products = await getShopProducts()
    expect(products).toHaveLength(CATALOG.length)
    for (const p of products) {
      const source = CATALOG.find((c) => c.id === p.id)
      expect(p.price).toBe(source?.price)
      expect(p.stock).toBeNull()
      expect(p.inStock).toBe(true)
    }
  })
})

describe('getShopProduct (DB unavailable fallback)', () => {
  it('finds a product by id with fallback stock data', async () => {
    const product = await getShopProduct('pb10')
    expect(product?.name).toBe('Charmast 10,400')
    expect(product?.inStock).toBe(true)
  })

  it('returns undefined for an unknown id', async () => {
    expect(await getShopProduct('does-not-exist')).toBeUndefined()
  })
})
