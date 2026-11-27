import { describe, it, expect } from 'vitest'
import { ringAreaM2, footprintAreaM2, sizeRoof, estimateProduction, estimateSavings, recommendSystem, aspectText, SOLAR_DEFAULTS, type SpecificYield } from '@/lib/energy/engine/solar'
import { parsePvgis, pvgisUrl } from '@/lib/solar/pvgis'
import type { TariffVersion } from '@/lib/energy/engine/tariff'

// A 20 m × 10 m rectangle near Kingston (1° lat ≈ 110.6 km; 1° lng ≈ 105.2 km at 18°N).
const dLat = 10 / 110_600
const dLng = 20 / (111_320 * Math.cos((18 * Math.PI) / 180))
const rect: [number, number][] = [[-76.8, 18], [-76.8 + dLng, 18], [-76.8 + dLng, 18 + dLat], [-76.8, 18 + dLat], [-76.8, 18]]

// Synthetic PVGIS-shaped payload (structure per PVGIS PVcalc JSON); numbers are test values only.
const pvgisPayload = {
  inputs: { meteo_data: { radiation_db: 'PVGIS-NSRDB' } },
  outputs: {
    monthly: { fixed: Array.from({ length: 12 }, (_, i) => ({ month: 12 - i, E_m: 100 + (12 - i) })) },
    totals: { fixed: { E_y: 1300, SD_y: 50 } },
  },
}
const Q = { lat: 18, lng: -76.8, tiltDeg: 10, aspectDeg: 0, lossPct: 14 }

describe('roof geometry', () => {
  it('measures a 20 × 10 m roof as ~200 m²', () => {
    expect(ringAreaM2(rect)).toBeGreaterThan(198)
    expect(ringAreaM2(rect)).toBeLessThan(202)
  })
  it('subtracts courtyards (holes) and adds multipolygon parts', () => {
    const hole = rect.map(([x, y]) => [-76.8 + (x + 76.8) / 4 + dLng / 4, 18 + (y - 18) / 4 + dLat / 4] as [number, number])
    const withHole = footprintAreaM2({ type: 'Polygon', coordinates: [rect, hole] })
    expect(withHole).toBeCloseTo(200 - 200 / 16, -1)
    expect(footprintAreaM2({ type: 'MultiPolygon', coordinates: [[rect], [rect]] })).toBeCloseTo(2 * ringAreaM2(rect), 3)
    expect(footprintAreaM2({ type: 'Point', coordinates: [0, 0] })).toBe(0)
  })
})

describe('roof sizing', () => {
  it('fits panels in the usable share and reports kWp, with the assumptions named', () => {
    const r = sizeRoof({ footprintM2: 200, roofType: 'flat' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.modules).toBe(Math.floor((200 * SOLAR_DEFAULTS.usableFractionFlat) / SOLAR_DEFAULTS.moduleAreaM2))
    expect(r.value.kwp).toBeCloseTo((r.value.modules * SOLAR_DEFAULTS.moduleWatts) / 1000)
    expect(r.basis).toBe('assumed')
    expect(r.assumptions.map((a) => a.id)).toEqual(['solar.usable_fraction', 'solar.module'])
  })
  it('refuses nonsense instead of guessing', () => {
    expect(sizeRoof({ footprintM2: 0, roofType: 'flat' }).ok).toBe(false)
    expect(sizeRoof({ footprintM2: 2, roofType: 'flat' }).ok).toBe(false)
    expect(sizeRoof({ footprintM2: 100, roofType: 'flat', usableFraction: 1.5 }).ok).toBe(false)
    expect(sizeRoof({ footprintM2: 100_000, roofType: 'flat' }).ok).toBe(false)
  })
})

describe('PVGIS', () => {
  it('builds a 1 kWp request with tilt, direction and losses', () => {
    const u = new URL(pvgisUrl(Q))
    expect(u.hostname).toBe('re.jrc.ec.europa.eu')
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ peakpower: '1', angle: '10', aspect: '0', loss: '14', outputformat: 'json' })
  })
  it('parses yearly and monthly output in month order, keeping the variability', () => {
    const y = parsePvgis(pvgisPayload, Q)!
    expect(y.annual).toBe(1300)
    expect(y.annualSd).toBe(50)
    expect(y.monthly[0]).toBe(101)
    expect(y.monthly[11]).toBe(112)
    expect(y.source).toBe('PVGIS (PVGIS-NSRDB)')
  })
  it('anything malformed is "unavailable", never a made-up number', () => {
    expect(parsePvgis({}, Q)).toBeNull()
    expect(parsePvgis({ outputs: { totals: { fixed: { E_y: 1300 } }, monthly: { fixed: [] } } }, Q)).toBeNull()
    expect(parsePvgis({ outputs: { totals: { fixed: { E_y: -5 } }, monthly: pvgisPayload.outputs.monthly } }, Q)).toBeNull()
  })
})

const yieldData: SpecificYield = parsePvgis(pvgisPayload, Q)!

describe('production and savings', () => {
  it('scales PVGIS 1 kWp output and shows ±1 SD as the range', () => {
    const p = estimateProduction(5, yieldData)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.value.annualKwh).toEqual({ low: 6250, base: 6500, high: 6750 })
    expect(p.value.monthlyKwh[0]).toBe(505)
    expect(p.warnings.join(' ')).toMatch(/Shading/)
  })

  // Synthetic approved tariff — test only.
  const t: TariffVersion = {
    id: 't', name: 'TEST', geography: 'Test', customerClass: 'Test', effectiveFrom: '2026-01-01', effectiveTo: null,
    source: { title: 'test', retrievedAt: '2026-01-01' }, reviewStatus: 'approved', currency: 'JMD',
    components: [
      { kind: 'fixed', label: 'Customer', amountPerPeriod: 500 },
      { kind: 'energy_blocks', label: 'Energy', blocks: [{ upToKwh: 100, ratePerKwh: 10 }, { upToKwh: null, ratePerKwh: 20 }] },
    ],
  }

  it('values offset kWh at the marginal rate, bounded by daytime use, and never counts exports', () => {
    const p = estimateProduction(1, yieldData)
    if (!p.ok) throw new Error()
    // ~101–112 kWh/month of solar against 300 kWh/month use.
    const s = estimateSavings(t, p.value, [300], 0.25, '2026-10-01')
    expect(s.ok).toBe(true)
    if (!s.ok) return
    // Upper: every solar kWh offsets top-block (J$20) kWh; daytime: 75 kWh/month × J$20.
    expect(s.value.annualUpper).toBeCloseTo(p.value.monthlyKwh.reduce((a, m) => a + m * 20, 0))
    expect(s.value.annualDaytime).toBeCloseTo(12 * 75 * 20)
    expect(s.value.annualExcessKwh).toBe(0)
  })

  it('reports surplus kWh without valuing it, and refuses an unapproved tariff', () => {
    const p = estimateProduction(5, yieldData)
    if (!p.ok) throw new Error()
    const s = estimateSavings(t, p.value, [200], 0.5, '2026-10-01')
    expect(s.ok && s.value.annualExcessKwh).toBeGreaterThan(0)
    expect(s.ok && s.warnings.join(' ')).toMatch(/net-billing/)
    expect(estimateSavings({ ...t, reviewStatus: 'draft' }, p.value, [200], 0.5, '2026-10-01').ok).toBe(false)
  })

  it('names roof directions for PVGIS aspect angles', () => {
    expect(aspectText(0)).toBe('south')
    expect(aspectText(-90)).toBe('east')
    expect(aspectText(180)).toBe('north')
    expect(aspectText(45)).toBe('south-west')
  })
})

describe('sizing to the household', () => {
  const roof = { usableM2: 90, modules: 46, kwp: 19.78 }
  it('recommends enough panels for yearly output ≈ yearly use, capped by the roof', () => {
    const r = recommendSystem(roof, yieldData, 350)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // 350 × 12 / 1300 = 3.23 kWp → 8 × 430 W panels
    expect(r.value.neededModules).toBe(8)
    expect(r.value.modules).toBe(8)
    expect(r.value.limitedByRoof).toBe(false)
    const big = recommendSystem({ ...roof, modules: 5 }, yieldData, 350)
    expect(big.ok && big.value.modules).toBe(5)
    expect(big.ok && big.value.limitedByRoof).toBe(true)
    expect(recommendSystem(roof, yieldData, 0).ok).toBe(false)
  })
})

import { ROOF_TYPES, ROOF_LABEL, isSloped } from '@/lib/energy/engine/solar'

describe('roof types', () => {
  it('zinc roofs use the sloped-roof defaults', () => {
    const zinc = sizeRoof({ footprintM2: 120, roofType: 'zinc' })
    const pitched = sizeRoof({ footprintM2: 120, roofType: 'pitched' })
    expect(zinc.ok && pitched.ok && zinc.value.modules).toBe(pitched.ok && pitched.value.modules)
    expect(zinc.ok && zinc.assumptions[0].description).toMatch(/zinc/i)
    expect(isSloped('zinc')).toBe(true)
    expect(isSloped('flat')).toBe(false)
    expect(ROOF_TYPES.every((t) => ROOF_LABEL[t])).toBe(true)
  })
})
