import { describe, it, expect } from 'vitest'
import { CAR_DESIGNS, designFor, tyreRadius } from '@/lib/vehicles/designs'
import { spanForZoom, zoomForSpan } from '@/app/solar/_components/satellite'

describe('car designs', () => {
  it('matches make, model name and generation by year', () => {
    expect(designFor('Nissan', 'Leaf', 2020)?.id).toBe('nissan-leaf-ze1')
    expect(designFor('NISSAN', 'LEAF SV PLUS', 2026)?.id).toBe('nissan-leaf-3')
    expect(designFor('Hyundai', 'IONIQ 5', 2023)?.id).toBe('hyundai-ioniq5')
    expect(designFor('Ford', 'Mustang Mach-E AWD', 2022)?.id).toBe('ford-mach-e')
    expect(designFor('Ford', 'F150 Lightning 4WD', 2023)?.id).toBe('ford-f150-lightning')
    expect(designFor('Toyota', 'C-HR', 2019)?.id).toBe('toyota-chr-1')
    expect(designFor('Tesla', 'Model Y Long Range AWD', 2022)?.id).toBe('tesla-modely-1')
    expect(designFor('Tesla', 'Model Y', 2025)?.id).toBe('tesla-modely-juniper')
    expect(designFor('Chevy', 'Bolt EUV', 2022)?.id).toBe('chevrolet-bolt-euv')
    expect(designFor('Chevrolet', 'Bolt EV', 2023)?.id).toBe('chevrolet-bolt-ev')
    expect(designFor('MG', 'MG4', 2023)?.id).toBe('mg-4')
    expect(designFor('MG Motor', 'ZS EV', 2022)?.id).toBe('mg-zs-ev')
    expect(designFor('Toyota', 'Prius Prime', 2024)?.id).toBe('toyota-prius-5')
  })

  it('leaves unknown models and other generations to the body-style shape', () => {
    expect(designFor('Nissan', 'Leaf', 2013)).toBeNull()
    expect(designFor('Toyota', 'Prius Prime', 2019)).toBeNull()
    expect(designFor('BYD', 'Sealion 7', 2025)).toBeNull()
    expect(designFor('Tesla', 'Model 3', 2019)).toBeNull()
    expect(designFor('Kia', 'EV6', undefined)).toBeNull()
    expect(designFor('Porsche', 'Taycan', 2024)).toBeNull()
  })

  it('every design is sourced and dimensionally sane', () => {
    const ids = new Set<string>()
    for (const d of CAR_DESIGNS) {
      expect(ids.has(d.id)).toBe(false)
      ids.add(d.id)
      expect(d.sources.length).toBeGreaterThan(0)
      for (const u of d.sources) expect(u).toMatch(/^https:\/\//)
      expect(d.lengthMm).toBeGreaterThan(d.wheelbaseMm)
      expect(d.widthMm).toBeGreaterThan(1500)
      expect(d.heightMm).toBeGreaterThan(1300)
      if (d.yearTo) expect(d.yearTo).toBeGreaterThanOrEqual(d.yearFrom)
    }
  })

  it('works out tyre radius from the size', () => {
    expect(tyreRadius('215/50R17', 17)).toBeCloseTo(0.3234, 3)
    expect(tyreRadius('275/65R18', 18)).toBeCloseTo(0.4073, 3)
    expect(tyreRadius(undefined, 16)).toBeCloseTo(0.2032 + 0.12375, 3)
  })
})

describe('satellite zoom hand-over', () => {
  it('converts a web-mercator zoom to a region span and back', () => {
    const s = spanForZoom(18, 1000, 600, 18)
    expect(s.lngDelta).toBeCloseTo((360 * 1000) / (256 * 2 ** 18), 9)
    expect(s.latDelta).toBeLessThan(s.lngDelta)
    expect(zoomForSpan(s.lngDelta, 1000)).toBeCloseTo(18, 9)
  })
})

describe('2D side view', () => {
  it('draws every design and every body style without broken numbers', async () => {
    const { sideGeometry } = await import('@/lib/vehicles/sideGeometry')
    const { specFor } = await import('@/lib/vehicles/buildSpec')
    const specs = [...CAR_DESIGNS.map((d) => specFor(d, d.bodyStyle, 'bev')), ...(['hatchback', 'sedan', 'suv', 'crossover', 'pickup', 'van', 'coupe', 'wagon'] as const).map((b) => specFor(null, b, 'hev'))]
    for (const s of specs) {
      const g = sideGeometry(s)
      const all = [g.body, g.windows, g.greenhouse, g.bPillar, g.rocker, g.shoulder, ...g.seams, ...g.head.housing, ...g.head.light, ...g.tail.housing, ...g.tail.light].join(' ')
      expect(all).not.toMatch(/NaN|Infinity/)
      expect(g.body.length).toBeGreaterThan(100)
      expect(g.windows.length).toBeGreaterThan(100)
      expect(g.wheels[1].x - g.wheels[0].x).toBeCloseTo(s.WB, 6)
    }
  })
})
