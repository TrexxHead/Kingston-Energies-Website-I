import { describe, it, expect } from 'vitest'
import { bulkRateForQty, bulkDiscountForLines, firstOrderDiscount } from '@/lib/pricing'

describe('bulkRateForQty', () => {
  it('has no discount below 3', () => {
    expect(bulkRateForQty(1)).toBe(0)
    expect(bulkRateForQty(2)).toBe(0)
  })

  it('gives 5% at 3-9 and 10% at 10+', () => {
    expect(bulkRateForQty(3)).toBe(0.05)
    expect(bulkRateForQty(9)).toBe(0.05)
    expect(bulkRateForQty(10)).toBe(0.1)
  })
})

describe('bulkDiscountForLines', () => {
  it('does not combine different products to reach a tier', () => {
    // 2 of one item + 1 of another = 3 items in the cart, but neither line
    // alone qualifies — this must not discount either.
    const lines = [
      { price: 1000, qty: 2 },
      { price: 1000, qty: 1 },
    ]
    expect(bulkDiscountForLines(lines)).toBe(0)
  })

  it('discounts a line once it alone reaches 3 of the same product', () => {
    const lines = [{ price: 1000, qty: 3 }]
    expect(bulkDiscountForLines(lines)).toBe(150) // 5% of 3000
  })

  it('discounts each qualifying line independently', () => {
    const lines = [
      { price: 1000, qty: 3 }, // 5% of 3000 = 150
      { price: 500, qty: 10 }, // 10% of 5000 = 500
      { price: 2000, qty: 1 }, // no discount
    ]
    expect(bulkDiscountForLines(lines)).toBe(650)
  })
})

describe('firstOrderDiscount', () => {
  it('is zero when not eligible', () => {
    expect(firstOrderDiscount([{ price: 5000, qty: 1 }], false)).toBe(0)
  })

  it('is zero for an empty cart even when eligible', () => {
    expect(firstOrderDiscount([], true)).toBe(0)
  })

  it('discounts only 10% of one unit of the first item — never the whole cart', () => {
    const lines = [
      { price: 5000, qty: 3 },
      { price: 2000, qty: 5 },
    ]
    expect(firstOrderDiscount(lines, true)).toBe(500) // 10% of 5000, not scaled by qty or the second line
  })
})
