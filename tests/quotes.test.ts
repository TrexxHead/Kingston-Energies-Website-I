import { describe, it, expect } from 'vitest'
import { quoteTotal } from '@/lib/quotes'

describe('quoteTotal', () => {
  it('sums price × qty across line items', () => {
    expect(quoteTotal([{ name: 'A', price: 1000, qty: 2 }, { name: 'B', price: 500, qty: 3 }])).toBe(3500)
  })

  it('returns 0 for null, undefined, or an empty list', () => {
    expect(quoteTotal(null)).toBe(0)
    expect(quoteTotal(undefined)).toBe(0)
    expect(quoteTotal([])).toBe(0)
  })
})
