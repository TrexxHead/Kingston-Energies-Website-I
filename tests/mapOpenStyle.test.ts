import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { openMapSources, openMapHosts, buildOpenStyle, stationMarkerState, OSM_ATTRIBUTION, TERRAIN_ATTRIBUTION } from '@/lib/map/openStyle'
import { geometryBounds, PARISH_IDS, JAMAICA_BOUNDS } from '@/lib/map/parishes'
import { clusterStations } from '@/lib/map/cluster'

describe('Kingston map sources', () => {
  it('defaults to OpenFreeMap tiles and glyphs, no key', () => {
    const s = openMapSources()
    expect(s.tiles).toBe('https://tiles.openfreemap.org/planet')
    expect(s.glyphs).toContain('tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf')
    expect(s.terrain).toContain('elevation-tiles-prod/terrarium')
    expect(openMapHosts(s)).toEqual(['https://tiles.openfreemap.org', 'https://s3.amazonaws.com'])
  })

  it('"off" leaves only our own self-hosted layers', () => {
    const s = openMapSources({ tiles: 'off', terrain: 'off' })
    expect(s).toEqual({ tiles: null, glyphs: null, terrain: null })
    const style = buildOpenStyle(s)
    expect(Object.keys(style.sources).sort()).toEqual(['parishCentres', 'parishes'])
    expect(style.layers.every((l: { source?: string }) => l.source !== 'osm')).toBe(true)
    expect(style.layers.some((l: { type: string }) => l.type === 'symbol')).toBe(false) // no glyphs → no labels
  })

  it('a custom tile host does not silently borrow the default font host', () => {
    const s = openMapSources({ tiles: 'https://maps.example.com/jamaica.json', terrain: 'off' })
    expect(s.glyphs).toBeNull()
    expect(openMapHosts({ ...s, glyphs: 'https://fonts.example.com/{fontstack}/{range}.pbf' })).toEqual(['https://maps.example.com', 'https://fonts.example.com'])
  })

  it('keeps OpenStreetMap attribution on every source', () => {
    const style = buildOpenStyle(openMapSources())
    expect(style.sources.osm.attribution).toBe(OSM_ATTRIBUTION)
    expect(style.sources.parishes.attribution).toBe(OSM_ATTRIBUTION)
    expect(style.sources.parishes.promoteId).toBe('id')
    expect(style.sources.hillshade.attribution).toBe(TERRAIN_ATTRIBUTION)
  })

  it('light and dark themes share one layer list (so the style can be swapped in place)', () => {
    const ids = (t: 'light' | 'dark') => buildOpenStyle(openMapSources(), '/x.geojson', t).layers.map((l: { id: string }) => l.id)
    expect(ids('dark')).toEqual(ids('light'))
    expect(new Set(ids('light')).size).toBe(ids('light').length)
  })

  it('never shows OpenStreetMap charging points as map icons', () => {
    const poi = buildOpenStyle(openMapSources()).layers.find((l: { id: string }) => l.id === 'poi-label')
    expect(JSON.stringify(poi.filter)).toContain('charging_station')
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

describe('pin clustering', () => {
  const pts = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 20, y: 10 },
    { id: 'c', x: 300, y: 0 },
  ]
  it('groups pins that would overlap and leaves distant ones alone', () => {
    expect(clusterStations(pts, (p) => p).map((g) => g.map((p) => p.id))).toEqual([['a', 'b'], ['c']])
  })
  it('never hides the selected station inside a bubble', () => {
    expect(clusterStations(pts, (p) => p, 'b').map((g) => g.map((p) => p.id))).toEqual([['a'], ['b'], ['c']])
  })
})
