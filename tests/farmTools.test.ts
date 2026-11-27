import { describe, it, expect } from 'vitest'
import { generatorFuel, solarPumpSize } from '@/lib/energy/engine'

const manual = [
  { loadFraction: 0.5, litresPerHour: 1.6 },
  { loadFraction: 1, litresPerHour: 2.8 },
]

describe('generator fuel', () => {
  it('interpolates between manual figures and prices the hour and the kWh', () => {
    const r = generatorFuel({ ratedKw: 5, points: manual, averageLoadKw: 3.75, tankLitres: 25, fuelPricePerL: 200 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.litresPerHour).toBeCloseTo(2.2, 6) // 75% load, halfway between 1.6 and 2.8
    expect(r.value.hoursPerTank).toBeCloseTo(25 / 2.2, 6)
    expect(r.value.costPerHour).toBeCloseTo(440, 6)
    expect(r.value.costPerKwh).toBeCloseTo(440 / 3.75, 6)
    expect(r.warnings).toHaveLength(0)
  })
  it('floors below the lowest figure (runtime never overstated) and warns above 80%', () => {
    const low = generatorFuel({ ratedKw: 5, points: manual, averageLoadKw: 1 })
    expect(low.ok && low.value.litresPerHour).toBe(1.6)
    expect(low.ok && low.value.atLeast).toBe(true)
    const high = generatorFuel({ ratedKw: 5, points: manual, averageLoadKw: 4.5 })
    expect(high.ok && high.warnings.length).toBe(1)
  })
  it('uses a single figure only near its load, and refuses overloads', () => {
    expect(generatorFuel({ ratedKw: 5, points: [manual[0]], averageLoadKw: 2.7 }).ok).toBe(true)
    expect(generatorFuel({ ratedKw: 5, points: [manual[0]], averageLoadKw: 4 }).ok).toBe(false)
    expect(generatorFuel({ ratedKw: 5, points: manual, averageLoadKw: 6 }).ok).toBe(false)
    expect(generatorFuel({ ratedKw: 5, points: [], averageLoadKw: 2 }).ok).toBe(false)
  })
})

describe('solar water pump', () => {
  const monthly = [120, 125, 150, 150, 148, 140, 150, 150, 135, 130, 118, 112] // kWh/kWp
  it('sizes for the worst month with an efficiency range', () => {
    const r = solarPumpSize({ dailyWaterM3: 10, totalHeadM: 30, monthlyKwhPerKwp: monthly })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.hydraulicKwhPerDay).toBeCloseTo(0.8175, 4) // 1000·9.81·10·30 / 3.6e6
    expect(r.value.worstMonth).toBe(11) // December: 112/31
    expect(r.value.worstDailyKwhPerKwp).toBeCloseTo(112 / 31, 6)
    expect(r.value.pvKwp.base).toBeCloseTo(0.8175 / 0.4 / (112 / 31), 4)
    expect(r.value.pvKwp.low).toBeLessThan(r.value.pvKwp.high)
    expect(r.basis).toBe('assumed')
  })
  it('uses a datasheet efficiency when given, and refuses missing data', () => {
    const r = solarPumpSize({ dailyWaterM3: 10, totalHeadM: 30, pumpEfficiency: 0.45, monthlyKwhPerKwp: monthly })
    expect(r.ok && r.value.pvKwp.low).toBe(r.ok && r.value.pvKwp.high)
    expect(solarPumpSize({ dailyWaterM3: 10, totalHeadM: 30, monthlyKwhPerKwp: [1, 2] }).ok).toBe(false)
    expect(solarPumpSize({ dailyWaterM3: 0, totalHeadM: 30, monthlyKwhPerKwp: monthly }).ok).toBe(false)
  })
})
