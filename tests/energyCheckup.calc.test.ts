import { describe, it, expect } from 'vitest'
import { HOUSEHOLD_LIBRARY } from '@/lib/energyCheckup/applianceLibrary'
import {
  allApplianceResults,
  totalEstimatedKwh,
  byCategory,
  calibration,
  effectiveRate,
  savingsRange,
  outageCost,
  solarOrientation,
  benchmarkVerdict,
  annualCostAtRate,
  type ApplianceRow,
} from '@/lib/energyCheckup/calc'

/**
 * Every number here is taken directly from the build spec's own worked
 * example (the exact household session shown across its screenshots: split
 * inverter AC, 5-10yr fridge, electric tank water heating, mostly LED, a
 * June bill of 520 kWh / J$27,040) — so this is a regression test against
 * the reference implementation, not just against our own formulas.
 */
const rows = new Map<string, ApplianceRow>(
  Object.entries({
    ac: { applianceId: 'ac', count: 1, hours: 8 },
    fridge: { applianceId: 'fridge', count: 1, hours: 10 },
    water: { applianceId: 'water', count: 1, hours: 1.2 },
    fans: { applianceId: 'fans', count: 3, hours: 8 },
    lighting: { applianceId: 'lighting', count: 6, hours: 5 },
    tv: { applianceId: 'tv', count: 1, hours: 5 },
    computers: { applianceId: 'computers', count: 2, hours: 6 },
    charging: { applianceId: 'charging', count: 4, hours: 3 },
    pump: { applianceId: 'pump', count: 0, hours: 1.5 },
    iron: { applianceId: 'iron', count: 1, hours: 0.5 },
    stove: { applianceId: 'stove', count: 1, hours: 1 },
    washer: { applianceId: 'washer', count: 1, hours: 1 },
    dryer: { applianceId: 'dryer', count: 0, hours: 0.7 },
    chestFreezer: { applianceId: 'chestFreezer', count: 0, hours: 10 },
  }),
)
const ctx = { acType: 'split' as const, waterType: 'tank' as const, lightType: 'led' as const, fridgeAgeBand: '5-10' as const }

describe('applianceKwh / allApplianceResults', () => {
  const results = allApplianceResults(HOUSEHOLD_LIBRARY, rows, ctx)
  const kwh = (id: string) => results.find((r) => r.applianceId === id)!.kwh

  it('matches every per-appliance figure from the spec screenshots', () => {
    expect(Math.round(kwh('ac'))).toBe(132)
    expect(Math.round(kwh('fridge'))).toBe(48) // 5-10yr band -> 1.15x
    expect(Math.round(kwh('water'))).toBe(108)
    expect(Math.round(kwh('fans'))).toBe(43)
    expect(Math.round(kwh('lighting'))).toBe(8)
    expect(Math.round(kwh('tv'))).toBe(15)
    expect(Math.round(kwh('computers'))).toBe(40)
    expect(Math.round(kwh('charging'))).toBe(5)
    expect(Math.round(kwh('iron'))).toBe(17)
    expect(Math.round(kwh('stove'))).toBe(60)
    expect(Math.round(kwh('washer'))).toBe(15)
    expect(kwh('pump')).toBe(0)
    expect(kwh('dryer')).toBe(0)
    expect(kwh('chestFreezer')).toBe(0)
  })

  it('totals to the live-estimate figure shown throughout the spec (491 kWh)', () => {
    expect(Math.round(totalEstimatedKwh(results))).toBe(491)
  })

  it('groups into categories matching the legend percentages (cooling 36%, water 22%, other 19%, electronics 12%, refrigeration 10%, lighting 2%)', () => {
    const total = totalEstimatedKwh(results)
    const groups = byCategory(results)
    const pct = (cat: string) => Math.round(((groups.find((g) => g.category === cat)?.kwh ?? 0) / total) * 100)

    expect(pct('cooling')).toBe(36) // AC + fans
    expect(pct('water')).toBe(22)
    expect(pct('other')).toBe(19) // iron + stove + washer
    expect(pct('electronics')).toBe(12) // tv + computers + charging
    expect(pct('refrigeration')).toBe(10)
    expect(pct('lighting')).toBe(2)
  })
})

describe('calibration', () => {
  it('flags within-band when the estimate lands close to the real bill (-6% shown in the spec)', () => {
    const cal = calibration(491, 520)
    expect(cal!.withinBand).toBe(true)
    expect(Math.round(cal!.variance * 100)).toBe(-6)
  })

  it('flags out-of-band beyond 15%', () => {
    const cal = calibration(491, 300)
    expect(cal!.withinBand).toBe(false)
  })

  it('returns null with no real bill to calibrate against', () => {
    expect(calibration(491, null)).toBeNull()
    expect(calibration(491, 0)).toBeNull()
  })
})

describe('effectiveRate', () => {
  it('derives the rate from the real bill when one is supplied', () => {
    const r = effectiveRate(520, 27_040, 'home')
    expect(r.source).toBe('bill')
    expect(r.rate).toBeCloseTo(52, 0)
  })

  it('falls back to the dated reference rate, never the JPS tariff formula', () => {
    expect(effectiveRate(null, null, 'home')).toEqual({ rate: 52, source: 'reference' })
    expect(effectiveRate(0, 0, 'biz')).toEqual({ rate: 42, source: 'reference' })
  })
})

describe('savingsRange', () => {
  it('is always a range, never a single figure, and widens when cooling dominates', () => {
    const highCooling = savingsRange(25_000, 0.4)
    expect(highCooling).toEqual({ lowPct: 5, highPct: 15, lowJmd: 1250, highJmd: 3750 })

    const lowCooling = savingsRange(25_000, 0.2)
    expect(lowCooling).toEqual({ lowPct: 5, highPct: 10, lowJmd: 1250, highJmd: 2500 })
  })
})

describe('outageCost', () => {
  it('scales with revenue per hour and how many systems stop', () => {
    const c = outageCost(6500, 1)
    expect(c.low).toBe(Math.round(6500 * 0.43))
    expect(c.high).toBe(Math.round(6500 * 0.8))
  })
})

describe('solarOrientation', () => {
  it('matches the spec\'s worked example exactly (491 kWh, J$25,537 bill -> 4.0kW, J$0.8M-1.1M, ~14m², ~4.5yr payback)', () => {
    const s = solarOrientation(491, 25_537)
    expect(s.kw).toBe(4)
    expect(s.costLow).toBe(800_000)
    expect(s.costHigh).toBe(1_120_000)
    expect(s.roofAreaM2).toBe(14)
    expect(s.paybackYears).toBeCloseTo(4.5, 1)
    expect(s.verdict).toBe('exploring')
  })

  it('never has a system size below 1kW', () => {
    expect(solarOrientation(10, 2000).kw).toBeGreaterThanOrEqual(1)
  })

  it('reaches "strong fit" at 600+ kWh', () => {
    expect(solarOrientation(650, 40_000).verdict).toBe('strong')
  })

  it('reaches "efficiency-first" below 300 kWh', () => {
    expect(solarOrientation(200, 12_000).verdict).toBe('efficiency-first')
  })
})

describe('benchmarkVerdict', () => {
  it('reads 491 kWh as above the 250-300 typical band', () => {
    expect(benchmarkVerdict(491)).toBe('above')
  })
  it('reads the typical band itself as "at"', () => {
    expect(benchmarkVerdict(275)).toBe('at')
  })
  it('reads under 250 as below, and 600+ as well above', () => {
    expect(benchmarkVerdict(200)).toBe('below')
    expect(benchmarkVerdict(650)).toBe('well-above')
  })
})

describe('annualCostAtRate', () => {
  it('multiplies the monthly figure out to a year', () => {
    expect(annualCostAtRate(491, 52)).toBe(Math.round(491 * 52 * 12))
  })
})
