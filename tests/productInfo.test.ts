import { describe, it, expect } from 'vitest'
import { parseMah, chargesFor, formatCharges, CARE_TIPS } from '@/lib/productInfo'

describe('parseMah', () => {
  it('pulls the mAh number out of a capacity string', () => {
    expect(parseMah('10,400mAh')).toBe(10400)
    expect(parseMah('16,000mAh')).toBe(16000)
    expect(parseMah('100W')).toBeNull()
    expect(parseMah(null)).toBeNull()
  })
})

describe('chargesFor / formatCharges', () => {
  it('estimates device charges with the conversion factor', () => {
    // 10,000mAh * 0.65 / 3349 ≈ 1.94
    const n = chargesFor(10000, 3349)
    expect(n).toBeGreaterThan(1.8)
    expect(n).toBeLessThan(2.1)
    expect(formatCharges(n)).toBe('≈1.9×')
  })

  it('formats sub-1 estimates with more precision', () => {
    expect(formatCharges(0.83)).toBe('≈0.83×')
  })
})

describe('CARE_TIPS', () => {
  it('has tips for every catalog category', () => {
    for (const cat of ['powerbanks', 'chargers', 'stations', 'accessories'] as const) {
      expect(CARE_TIPS[cat].length).toBeGreaterThan(0)
    }
  })
})
