import { describe, it, expect } from 'vitest'
import { realisedFxDifference, FUNCTIONAL_CURRENCY, MAX_RATE_AGE_DAYS, SUPPORTED_CURRENCIES } from '../lib/fx'

describe('functional currency', () => {
  it('is JMD, and is one of the supported currencies', () => {
    expect(FUNCTIONAL_CURRENCY).toBe('JMD')
    expect(SUPPORTED_CURRENCIES).toContain('JMD')
  })

  it('will not let a rate go more than about a month stale', () => {
    // The exact number can move; that it is bounded, and bounded tightly, is
    // the property worth locking down.
    expect(MAX_RATE_AGE_DAYS).toBeGreaterThan(0)
    expect(MAX_RATE_AGE_DAYS).toBeLessThanOrEqual(45)
  })
})

describe('realisedFxDifference', () => {
  it('is a gain when the settling rate is higher than the booked rate', () => {
    // US$1,000 receivable booked at 155, settled at 158.
    expect(realisedFxDifference(1000, 155, 158)).toBeCloseTo(3000, 2)
  })

  it('is a loss when the settling rate is lower', () => {
    expect(realisedFxDifference(1000, 158, 155)).toBeCloseTo(-3000, 2)
  })

  it('is exactly zero when the rate did not move', () => {
    expect(realisedFxDifference(1000, 157.25, 157.25)).toBe(0)
  })

  it('scales with the foreign amount, not the JMD amount', () => {
    const small = realisedFxDifference(100, 155, 158)
    const large = realisedFxDifference(1000, 155, 158)
    expect(large).toBeCloseTo(small * 10, 2)
  })

  it('rounds to cents rather than carrying float noise', () => {
    const d = realisedFxDifference(333.33, 155.11, 158.77)
    expect(d).toBe(Math.round(d * 100) / 100)
  })
})
