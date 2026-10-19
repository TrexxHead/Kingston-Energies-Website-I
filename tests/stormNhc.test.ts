import { describe, it, expect } from 'vitest'
import { parseCurrentStorms, saffirSimpson, compass, haversineKm, KINGSTON } from '@/lib/storm/nhc'
import { backupEstimate, quickDevices } from '@/lib/storm/backup'

// Shape per NHC's published sample (productexamples/NHC_JSON_Sample.json).
const sample = {
  activeStorms: [
    {
      id: 'al142026', binNumber: 'AT4', name: 'Testa', classification: 'HU', intensity: '105', pressure: '960',
      latitude: '16.0N', longitude: '75.0W', latitudeNumeric: 16.0, longitudeNumeric: -75.0,
      movementDir: 290, movementSpeed: 10, lastUpdate: '2026-10-14T15:00:00.000Z',
      publicAdvisory: { advNum: '12', issuance: '2026-10-14T15:00:00.000Z', url: 'https://www.nhc.noaa.gov/text/MIATCPAT4.shtml' },
      forecastGraphics: { url: 'https://www.nhc.noaa.gov/graphics_at4.shtml' },
    },
    { id: 'ep092026', binNumber: 'EP1', name: 'Pacifico', classification: 'TS', intensity: '45', pressure: '1000', latitudeNumeric: 14, longitudeNumeric: -105, movementDir: 0, movementSpeed: 0, lastUpdate: '2026-10-14T15:00:00Z', publicAdvisory: { advNum: '3', url: 'http://evil.example/x' } },
    { id: 'al152026', name: 'NoPosition', classification: 'TS', lastUpdate: '2026-10-14T15:00:00Z' },
  ],
}

describe('NHC CurrentStorms parser', () => {
  it('parses the documented shape and drops incomplete storms', () => {
    const r = parseCurrentStorms(sample)!
    expect(r.dropped).toBe(1)
    expect(r.storms).toHaveLength(2)
    const h = r.storms.find((s) => s.id === 'al142026')!
    expect(h.basin).toBe('atlantic')
    expect(h.classificationLabel).toBe('Hurricane')
    expect(h.category).toBe(3)
    expect(h.windKmh).toBe(194)
    expect(h.movementText).toBe('Moving west-northwest at 16 km/h')
    expect(h.advisoryNumber).toBe('12')
    expect(h.advisoryUrl).toMatch(/^https:\/\/www\.nhc\.noaa\.gov\//)
    expect(h.distanceFromKingstonKm).toBeGreaterThan(285)
    expect(h.distanceFromKingstonKm).toBeLessThan(300)
  })
  it('never links to a non-NHC url and reports a stationary storm', () => {
    const p = parseCurrentStorms(sample)!.storms.find((s) => s.id === 'ep092026')!
    expect(p.advisoryUrl).toBeNull()
    expect(p.basin).toBe('eastern_pacific')
    expect(p.category).toBeNull()
    expect(p.movementText).toBe('Stationary')
  })
  it('treats an empty list as no storms but garbage as unreadable', () => {
    expect(parseCurrentStorms({ activeStorms: [] })).toEqual({ storms: [], dropped: 0 })
    expect(parseCurrentStorms({})).toBeNull()
    expect(parseCurrentStorms(null)).toBeNull()
  })
  it('scale and geometry helpers', () => {
    expect([63, 64, 83, 96, 113, 137].map(saffirSimpson)).toEqual([null, 1, 2, 3, 4, 5])
    expect(compass(0)).toBe('north')
    expect(compass(359)).toBe('north')
    expect(compass(225)).toBe('southwest')
    expect(haversineKm(KINGSTON, KINGSTON)).toBe(0)
  })
})

describe('backup estimate', () => {
  const rows = [
    { id: 'a', name: 'Fridge', watts: 150, hoursPerDay: 12, quantity: 1, motor: true },
    { id: 'b', name: 'Lights', watts: 20, hoursPerDay: 6, quantity: 3, motor: false },
    { id: 'c', name: 'Fan', watts: null, hoursPerDay: 8, quantity: 1, motor: false },
  ]
  it('runs on the engine and keeps unknown devices out of the totals', () => {
    const r = backupEstimate(quickDevices(rows), { capacityWh: 2000, capacityBasis: 'usable_dc', outputPath: 'ac', continuousWatts: 1000 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // 1.8 + 0.36 = 2.16 kWh/day → 90 W average (base).
    expect(r.value.totals.averageWatts.base).toBeCloseTo(90, 0)
    expect(r.value.totals.unresolved.map((u) => u.name)).toContain('Fan')
    expect(r.value.hours.low).toBeLessThan(r.value.hours.base)
    expect(r.value.hours.base).toBeLessThan(r.value.hours.high)
    expect(r.value.continuous.status).toBe('pass')
    // Fridge startup demand is unknown → surge can't be confirmed.
    expect(r.value.surge.status).toBe('unknown')
  })
  it('refuses without capacity or countable loads', () => {
    expect(backupEstimate(quickDevices(rows), { capacityWh: 0, capacityBasis: 'nominal', outputPath: 'ac' }).ok).toBe(false)
    expect(backupEstimate(quickDevices([rows[2]]), { capacityWh: 1000, capacityBasis: 'nominal', outputPath: 'ac' }).ok).toBe(false)
    expect(backupEstimate([], { capacityWh: 1000, capacityBasis: 'nominal', outputPath: 'ac' }).ok).toBe(false)
  })
  it('an unknown output rating is never a pass', () => {
    const r = backupEstimate(quickDevices(rows), { capacityWh: 2000, capacityBasis: 'nominal', outputPath: 'ac' })
    expect(r.ok && r.value.continuous.status).toBe('unknown')
  })
})
