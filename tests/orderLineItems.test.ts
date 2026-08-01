import { describe, it, expect } from 'vitest'
import { isProductLine } from '@/lib/orderLineItems'

describe('isProductLine', () => {
  it('treats real product names as product lines', () => {
    expect(isProductLine('Charmast 10,400')).toBe(true)
    expect(isProductLine('Tech Pouch')).toBe(true)
  })

  it('excludes delivery, first-order discount, and points-redemption lines', () => {
    expect(isProductLine('Delivery: Standard (Kingston Energies courier, Kingston)')).toBe(false)
    expect(isProductLine('First order discount (10% off first item)')).toBe(false)
    expect(isProductLine('Rewards points redeemed (250 pts)')).toBe(false)
  })
})
