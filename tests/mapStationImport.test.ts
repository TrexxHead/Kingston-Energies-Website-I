import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { planStationImport, displayName, localityOf, type StationList } from '@/lib/map/stationImport'
import { publishBlockers, stationInputSchema } from '@/lib/map/registry'
import list from '@/lib/map/data/station-list-2026-10-14.json'

const LIST = list as StationList
const plan = planStationImport(LIST)

function inside(pt: [number, number], ring: number[][]) {
  let c = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

describe('owner station list import (14 Oct 2026)', () => {
  it('plans all 37 entries: 27 publishable, 10 drafts (no connector details)', () => {
    expect(plan).toHaveLength(37)
    expect(plan.filter((p) => p.publish)).toHaveLength(27)
    for (const p of plan.filter((x) => !x.publish)) expect(p.input.connectorGroups).toHaveLength(0)
  })

  it('every input passes the registry schema; publishable ones clear the publish rules once the source is verified', () => {
    for (const p of plan) {
      expect(stationInputSchema.safeParse(p.input).success).toBe(true)
      const blockers = publishBlockers({ ...p.input, sources: [{ reviewState: 'verified' }] })
      expect(blockers.length === 0).toBe(p.publish)
    }
  })

  it('stores nothing that is not in the list — no Google ratings, no invented access or status', () => {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'lib', 'map', 'data', 'station-list-2026-10-14.json'), 'utf8')
    expect(raw).not.toMatch(/google_rating|google_reviews/)
    for (const p of plan) {
      expect(p.input.access).toBe('unknown')
      expect(p.input.pricingNotes ?? null).toBeNull()
    }
  })

  it('each station sits in the parish recorded for it', () => {
    const parishes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'maps', 'jamaica-parishes.geojson'), 'utf8'))
    for (const p of plan) {
      const f = parishes.features.find((x: { properties: { id: string } }) => x.properties.id === p.input.parish)
      const polys: number[][][][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
      expect(polys.some((poly) => inside([p.input.lng, p.input.lat], poly[0])), `#${p.ref} ${p.input.parish}`).toBe(true)
    }
  })

  it('connector currents follow the plug (CCS/CHAdeMO are DC; Type 2, J1772, outlets AC)', () => {
    for (const g of plan.flatMap((p) => p.input.connectorGroups)) {
      expect(g.currentType).toBe(/CCS|CHAdeMO/.test(g.connectorType) ? 'DC' : 'AC')
    }
    expect(plan.flatMap((p) => p.input.connectorGroups).some((g) => g.connectorType === 'J1772 (Type 1)')).toBe(true)
  })

  it('tells generic listing names apart by their listed place, without inventing names', () => {
    const e = LIST.stations.find((s) => s.ref === 16)!
    expect(displayName(e)).toBe('Evergo · Bayshore Plaza, Port Antonio')
    const distinctive = LIST.stations.find((s) => s.ref === 36)!
    expect(displayName(distinctive)).toBe('Jruncarservicelimited')
    expect(localityOf('CRFF+HQQ, Ocho Rios')).toBe('Ocho Rios')
    expect(localityOf('A1')).toBeNull()
  })

  it('flags entries within 300 m of another for a duplicate check', () => {
    const p25 = plan.find((p) => p.ref === 25)!
    expect(p25.warnings.join(' ')).toMatch(/#33 \(52 m\)/)
  })

  it('records the list as the source, with the entry number for safe re-runs', () => {
    for (const p of plan) {
      expect(p.source.sourceName).toBe('Kingston Energies station list (2026-10-14)')
      expect(p.source.notes.startsWith(`List entry #${p.ref}.`)).toBe(true)
    }
  })
})
