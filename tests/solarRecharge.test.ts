import { describe, it, expect } from 'vitest'
import { estimateSolarRecharge, hoursToRecharge, SKY_CONDITION_META } from '@/lib/energyCheckup/solarRecharge'

describe('estimateSolarRecharge', () => {
  it('returns null for a missing or non-positive panel rating', () => {
    expect(estimateSolarRecharge(null, 6, 'sunny')).toBeNull()
    expect(estimateSolarRecharge(0, 6, 'sunny')).toBeNull()
  })

  it('returns null for non-positive sun hours', () => {
    expect(estimateSolarRecharge(100, 0, 'sunny')).toBeNull()
  })

  it('computes a low/high Wh range from the derate band', () => {
    const est = estimateSolarRecharge(100, 6, 'sunny')
    expect(est).not.toBeNull()
    expect(est!.lowWh).toBeCloseTo(100 * 0.5 * 6)
    expect(est!.highWh).toBeCloseTo(100 * 0.7 * 6)
  })

  it('overcast conditions produce a strictly lower range than sunny', () => {
    const sunny = estimateSolarRecharge(100, 6, 'sunny')!
    const overcast = estimateSolarRecharge(100, 6, 'overcast')!
    expect(overcast.highWh).toBeLessThan(sunny.lowWh)
  })
})

describe('hoursToRecharge', () => {
  it('returns null for a missing panel rating or non-positive target', () => {
    expect(hoursToRecharge(null, 500, 'sunny')).toBeNull()
    expect(hoursToRecharge(100, 0, 'sunny')).toBeNull()
  })

  it('returns a [fast, slow] hour range', () => {
    const [fast, slow] = hoursToRecharge(100, 300, 'sunny')!
    expect(fast).toBeLessThan(slow)
  })
})

describe('SKY_CONDITION_META', () => {
  it('every condition has a real label and a derate band under 1', () => {
    for (const meta of Object.values(SKY_CONDITION_META)) {
      expect(meta.label.length).toBeGreaterThan(3)
      expect(meta.derate[0]).toBeLessThan(meta.derate[1])
      expect(meta.derate[1]).toBeLessThanOrEqual(1)
    }
  })
})
