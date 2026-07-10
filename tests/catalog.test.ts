import { describe, it, expect } from 'vitest'
import { fmt, getProduct, CATALOG } from '@/lib/catalog'

describe('fmt', () => {
  it('formats prices as Jamaican dollars with thousands separators', () => {
    expect(fmt(7999)).toBe('J$7,999')
    expect(fmt(49999)).toBe('J$49,999')
    expect(fmt(0)).toBe('J$0')
  })
})

describe('getProduct', () => {
  it('finds a product by id', () => {
    expect(getProduct('pb10')?.name).toBe('Charmast 10,400')
  })

  it('returns undefined for an unknown id', () => {
    expect(getProduct('does-not-exist')).toBeUndefined()
  })
})

describe('CATALOG integrity', () => {
  it('every product has a positive JMD price and a unique id', () => {
    const ids = new Set<string>()
    for (const p of CATALOG) {
      expect(p.price).toBeGreaterThan(0)
      expect(Number.isInteger(p.price)).toBe(true)
      expect(ids.has(p.id)).toBe(false)
      ids.add(p.id)
    }
  })
})
