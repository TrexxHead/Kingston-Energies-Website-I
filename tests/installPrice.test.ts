import { describe, it, expect } from 'vitest'
import { installPriceRange } from '@/lib/energy/engine'
import { installPriceDataSchema } from '@/lib/refdata/types'

const rates = { perKwpLow: 250_000, perKwpHigh: 350_000, minimumJob: 600_000, batteryPerKwhLow: 120_000, batteryPerKwhHigh: 160_000 }

describe('installed solar price range', () => {
  it('multiplies by system size, with a smallest-job floor', () => {
    const r = installPriceRange({ kwp: 4, rates })
    expect(r.ok && r.value.total).toEqual({ low: 1_000_000, high: 1_400_000 })
    const small = installPriceRange({ kwp: 2, rates })
    expect(small.ok && small.value.solar).toEqual({ low: 600_000, high: 700_000 })
  })
  it('adds a battery and works out payback from the saving range', () => {
    const r = installPriceRange({ kwp: 4, rates, batteryKwh: 10, annualSaving: { low: 200_000, high: 300_000 } })
    if (!r.ok) throw new Error(r.message)
    expect(r.value.battery).toEqual({ low: 1_200_000, high: 1_600_000 })
    expect(r.value.total).toEqual({ low: 2_200_000, high: 3_000_000 })
    // Fastest: lowest price ÷ highest saving; slowest: highest price ÷ lowest saving.
    expect(r.value.paybackYears?.low).toBeCloseTo(2_200_000 / 300_000)
    expect(r.value.paybackYears?.high).toBeCloseTo(3_000_000 / 200_000)
  })
  it('refuses without a size or battery prices, and validates records', () => {
    expect(installPriceRange({ kwp: 0, rates }).ok).toBe(false)
    expect(installPriceRange({ kwp: 4, rates: { perKwpLow: 1, perKwpHigh: 2 }, batteryKwh: 5 }).ok).toBe(false)
    expect(installPriceDataSchema.safeParse({ basis: 'TEST', perKwpLow: 300, perKwpHigh: 200 }).success).toBe(false)
    expect(installPriceDataSchema.safeParse({ basis: 'TEST', perKwpLow: 200, perKwpHigh: 300, batteryPerKwhLow: 5 }).success).toBe(false)
    expect(installPriceDataSchema.safeParse({ basis: 'TEST', perKwpLow: 200, perKwpHigh: 300 }).success).toBe(true)
  })
})
