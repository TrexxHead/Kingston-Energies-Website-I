import { describe, it, expect } from 'vitest'
import { fridgeDutyCycleRange, conservativeCyclingKwh, acLoadProfile } from '@/lib/energyCheckup/loadModeling'
import { confidenceFor } from '@/lib/energyCheckup/applianceLibrary'
import { HOUSEHOLD_LIBRARY } from '@/lib/energyCheckup/applianceLibrary'

describe('fridgeDutyCycleRange', () => {
  it('widens as the unit ages', () => {
    const young = fridgeDutyCycleRange('<5')
    const mid = fridgeDutyCycleRange('5-10')
    const old = fridgeDutyCycleRange('10+')
    expect(young.highPct).toBeLessThanOrEqual(mid.highPct)
    expect(mid.highPct).toBeLessThanOrEqual(old.highPct)
  })

  it('low is always below high', () => {
    for (const band of ['<5', '5-10', '10+'] as const) {
      const r = fridgeDutyCycleRange(band)
      expect(r.lowPct).toBeLessThan(r.highPct)
    }
  })
})

describe('conservativeCyclingKwh', () => {
  it('is always at least the point estimate, never less', () => {
    const point = 42
    for (const band of ['<5', '5-10', '10+'] as const) {
      expect(conservativeCyclingKwh(point, band)).toBeGreaterThan(point)
    }
  })
})

describe('acLoadProfile', () => {
  it('models zero draw for no AC', () => {
    const p = acLoadProfile('none', 0)
    expect(p.startupW).toBe(0)
    expect(p.highLoadW).toBe(0)
  })

  it('startup exceeds high-load exceeds maintenance for a real unit', () => {
    const p = acLoadProfile('split', 550)
    expect(p.startupW).toBeGreaterThan(p.highLoadW)
    expect(p.highLoadW).toBeGreaterThan(p.maintenanceW)
  })

  it('a window unit swings harder than a split (inverter) unit', () => {
    const window = acLoadProfile('window', 900)
    const split = acLoadProfile('split', 900)
    expect(window.startupW).toBeGreaterThan(split.startupW)
  })
})

describe('confidenceFor', () => {
  it('only ever returns estimate or medium — nothing here is a measured reading', () => {
    for (const appliance of HOUSEHOLD_LIBRARY) {
      expect(['estimate', 'medium']).toContain(confidenceFor(appliance))
    }
  })

  it('fixed-watts appliances are plain estimates; context-driven ones are medium', () => {
    const fridge = HOUSEHOLD_LIBRARY.find((a) => a.id === 'fridge')!
    const ac = HOUSEHOLD_LIBRARY.find((a) => a.id === 'ac')!
    expect(confidenceFor(fridge)).toBe('estimate')
    expect(confidenceFor(ac)).toBe('medium')
  })
})
