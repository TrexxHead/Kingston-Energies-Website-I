import { describe, it, expect } from 'vitest'
import { co2SavedKg, formatCo2 } from '@/lib/impact'

describe('co2SavedKg', () => {
  it('scales with items purchased', () => {
    expect(co2SavedKg(0)).toBe(0)
    expect(co2SavedKg(1)).toBe(1.1)
    expect(co2SavedKg(10)).toBe(10.5)
  })
})

describe('formatCo2', () => {
  it('formats sub-tonne values in kg', () => {
    expect(formatCo2(10.5)).toBe('10.5 kg')
    expect(formatCo2(999)).toBe('999.0 kg')
  })

  it('switches to tonnes at 1000kg and above', () => {
    expect(formatCo2(1000)).toBe('1.0 tonnes')
    expect(formatCo2(2500)).toBe('2.5 tonnes')
  })
})
