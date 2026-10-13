import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { openMapSources, openMapHosts, buildOpenStyle, stationMarkerState, OSM_ATTRIBUTION } from '@/lib/map/openStyle'
import { geometryBounds, PARISH_IDS, JAMAICA_BOUNDS } from '@/lib/map/parishes'

describe('Kingston map sources', () => {
  it('defaults to OpenFreeMap tiles and glyphs, no key', () => {
    const s = openMapSources()
    expect(s.tiles).toBe('https://tiles.openfreemap.org/planet')
    expect(s.glyphs).toContain('tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf')
    expect(openMapHosts(s)).toEqual(['https://tiles.openfreemap.org'])
  })

  it('"off" leaves only our own self-hosted layers', () => {
    const s = openMapSources({ tiles: 'off' })
    expect(s).toEqual({ tiles: null, glyphs: null })
    const style = buildOpenStyle(s)
    expect(Object.keys(style.sources).sort()).toEqual(['parishCentres', 'parishes'])
    expect(style.layers.every((l: { source?: string }) => l.source !== 'osm')).toBe(true)
    expect(style.layers.some((l: { type: string }) => l.type === 'symbol')).toBe(false) // no glyphs → no labels
  })

  it('a custom tile host does not silently borrow the default font host', () => {
    const s = openMapSources({ tiles: 'https://maps.example.com/jamaica.json' })
    expect(s.glyphs).toBeNull()
    expect(openMapHosts({ ...s, glyphs: 'https://fonts.example.com/{fontstack}/{range}.pbf' })).toEqual(['https://maps.example.com', 'https://fonts.example.com'])
  })

  it('keeps OpenStreetMap attribution on every source', () => {
    const style = buildOpenStyle(openMapSources())
    expect(style.sources.osm.attribution).toBe(OSM_ATTRIBUTION)
    expect(style.sources.parishes.attribution).toBe(OSM_ATTRIBUTION)
    expect(style.sources.parishes.promoteId).toBe('id')
  })
})

describe('station marker state', () => {
  it('shows the most useful known state, and unknown when nothing is known', () => {
    expect(stationMarkerState([])).toBe('status_unavailable')
    expect(stationMarkerState([null, undefined])).toBe('status_unavailable')
    expect(stationMarkerState(['out_of_service', 'available_now'])).toBe('available_now')
    expect(stationMarkerState(['status_unavailable', 'in_use'])).toBe('in_use')
    expect(stationMarkerState(['out_of_service'])).toBe('out_of_service')
  })
})

describe('parish boundaries file', () => {
  const geo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'maps', 'jamaica-parishes.geojson'), 'utf8'))

  it('has all 14 parishes keyed by our parish ids', () => {
    expect(geo.features.map((f: { properties: { id: string } }) => f.properties.id).sort()).toEqual([...PARISH_IDS].sort())
  })

  it('every parish sits inside the island framing bounds', () => {
    for (const f of geo.features) {
      const b = geometryBounds(f.geometry)!
      expect(b).not.toBeNull()
      expect(b[0]).toBeGreaterThanOrEqual(JAMAICA_BOUNDS.west - 0.05)
      expect(b[2]).toBeLessThanOrEqual(JAMAICA_BOUNDS.east + 0.05)
      expect(b[1]).toBeGreaterThanOrEqual(JAMAICA_BOUNDS.south - 0.15)
      expect(b[3]).toBeLessThanOrEqual(JAMAICA_BOUNDS.north + 0.05)
    }
  })

  it('geometryBounds handles MultiPolygons and rejects points', () => {
    expect(geometryBounds({ type: 'MultiPolygon', coordinates: [[[[0, 0], [2, 1], [1, 3], [0, 0]]], [[[-1, -2], [0, 0], [-1, -2]]]] })).toEqual([-1, -2, 2, 3])
    expect(geometryBounds({ type: 'Point', coordinates: [1, 2] })).toBeNull()
  })
})
