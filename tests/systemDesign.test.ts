import { describe, it, expect } from 'vitest'
import { DIRECT_DERATE, derateFor, designSystem, performanceRatio, recommendSystemType } from '@/lib/energy/engine/systemDesign'
import { CALC_ENGINE_VERSION } from '@/lib/energy/engine/version'

// Figures from the owner's PV course notebook (worked examples cited).
describe('system design (notebook method)', () => {
  it('builds the derate from the loss chain (§6.3)', () => {
    expect(DIRECT_DERATE).toBeCloseTo(0.779, 3)
    expect(derateFor(0.5)).toBeCloseTo(0.740, 3)
    expect(derateFor(0)).toBeCloseTo(DIRECT_DERATE, 9)
  })

  it('sizes the corrected S01 household (§8.5)', () => {
    const r = designSystem({ type: 'hybrid', dailyWh: 9626, nightWh: 5896, peakWatts: 3709, surgeWatts: 5200, peakSunHours: 5, moduleWatts: 550, derate: 0.75 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const d = r.value
    expect(Math.round(d.array.minimumW)).toBe(2567)
    expect(d.array.modules).toBe(5)
    expect(Math.round(d.inverter.requiredW!)).toBe(4636)
    expect(d.inverter.sizeKw).toBe(5)
    expect(d.inverter.surgeOk).toBe(true)
    expect(Math.round(d.battery!.nameplateWh)).toBe(6896)
    expect(Math.round(d.battery!.ampHours)).toBe(135)
    expect(Math.round(d.battery!.dcCurrentA!)).toBe(104)
  })

  it('matches battery current to a 14 kW inverter (§8.1)', () => {
    const r = designSystem({ type: 'hybrid', dailyWh: 30000, peakWatts: 11000 })
    expect(r.ok && r.value.inverter.sizeKw).toBe(14)
    expect(r.ok && Math.round(r.value.battery!.dcCurrentA!)).toBe(290)
  })

  it('sizes the off-grid capstone (§17.4)', () => {
    const r = designSystem({ type: 'off_grid', dailyWh: 33850, nightWh: 23420, peakWatts: 8990, depthOfDischarge: 0.8, peakSunHours: 5, moduleWatts: 550, derate: 0.75 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Math.round(r.value.battery!.nameplateWh)).toBe(30816)
    expect(r.value.array.modules).toBe(20)
    expect(r.value.array.kwp).toBeCloseTo(11.0, 6)
    expect(Math.round(r.value.inverter.requiredW!)).toBe(11238)
    expect(r.value.inverter.sizeKw).toBe(12)
  })

  it('uses the corrected panel-count formula (C21)', () => {
    const r = designSystem({ type: 'grid_tied', dailyWh: 22586, peakSunHours: 5, moduleWatts: 550, derate: 0.75 })
    expect(r.ok && r.value.array.modules).toBe(11)
    expect(r.ok && r.value.battery).toBeNull()
    expect(r.ok && r.warnings.some((w) => /no backup/.test(w))).toBe(true)
  })

  it('cross-checks the load list against the bill (±15%, §7.3)', () => {
    const near = designSystem({ type: 'hybrid', dailyWh: 9626, billMonthlyKwh: 300, peakWatts: 3000 })
    expect(near.ok && near.value.billCheck!.withinTolerance).toBe(true)
    const far = designSystem({ type: 'hybrid', dailyWh: 22586, billMonthlyKwh: 300, peakWatts: 3000 })
    expect(far.ok && far.value.billCheck!.withinTolerance).toBe(false)
  })

  it('states its assumptions and refuses impossible input', () => {
    const r = designSystem({ type: 'hybrid', dailyWh: 10000 })
    expect(r.ok && r.value.inverter.sizeKw).toBeNull()
    expect(r.ok && r.assumptions.map((a) => a.id)).toEqual(expect.arrayContaining(['psh', 'module', 'night', 'derate', 'dod']))
    expect(designSystem({ type: 'hybrid', dailyWh: 0 }).ok).toBe(false)
    expect(designSystem({ type: 'hybrid', dailyWh: 1000, nightWh: 2000 }).ok).toBe(false)
  })

  it('recommends a system type', () => {
    expect(recommendSystemType({ wantsBackup: true, hasGrid: true })).toBe('hybrid')
    expect(recommendSystemType({ wantsBackup: false, hasGrid: true })).toBe('grid_tied')
    expect(recommendSystemType({ wantsBackup: false, hasGrid: false })).toBe('off_grid')
  })

  it('judges performance ratio (§15.4)', () => {
    const r = performanceRatio({ kwhProduced: 13, kwp: 3.3, peakSunHours: 5.5 })
    expect(r.ok && r.value.pr).toBeCloseTo(0.716, 3)
    expect(r.ok && r.value.status).toBe('healthy')
    expect(performanceRatio({ kwhProduced: 5, kwp: 3.3, peakSunHours: 5.5 }).ok && performanceRatio({ kwhProduced: 5, kwp: 3.3, peakSunHours: 5.5 })).toMatchObject({ value: { status: 'very_low' } })
  })

  it('bumped the engine version', () => {
    expect(CALC_ENGINE_VERSION).toBe('1.9.0')
  })
})
