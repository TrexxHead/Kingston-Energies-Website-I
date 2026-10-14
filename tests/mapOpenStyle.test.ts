import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { openMapSources, buildOpenStyle, stationMarkerState, OSM_ATTRIBUTION, TERRAIN_ATTRIBUTION } from '@/lib/map/openStyle'
import { MAP_DATA } from '@/lib/map/mapData'
import { normalize, prepare, search, zoomForKind, type SearchIndex } from '@/lib/map/search'
import { geometryBounds, PARISH_IDS, JAMAICA_BOUNDS } from '@/lib/map/parishes'
import { clusterStations } from '@/lib/map/cluster'

describe('Kingston map sources (self-hosted)', () => {
  const src = openMapSources('https://kingstonenergies.com/')
  const style = buildOpenStyle(src, '/x.geojson')

  it('reads every layer from this site — no third-party tile host', () => {
    expect(src.base).toBe(`pmtiles://https://kingstonenergies.com${MAP_DATA.base}`)
    expect(src.glyphs).toBe(`https://kingstonenergies.com${MAP_DATA.glyphs}`)
    const urls = JSON.stringify(style.sources) + style.glyphs
    expect(urls).not.toMatch(/openfreemap|amazonaws|googleapis|mapbox/)
  })

  it('the versioned data files the style points at exist in public/', () => {
    for (const f of [MAP_DATA.base, MAP_DATA.buildings, MAP_DATA.terrain, MAP_DATA.search, MAP_DATA.parishes]) {
      expect(fs.existsSync(path.join(__dirname, '..', 'public', f)), f).toBe(true)
    }
    for (const font of ['Open Sans Regular', 'Open Sans Semibold', 'Open Sans Bold', 'Open Sans Italic']) {
      expect(fs.existsSync(path.join(__dirname, '..', 'public', 'maps', 'fonts', font, '0-255.pbf')), font).toBe(true)
    }
  })

  it('every font the style uses is self-hosted', () => {
    const fonts = new Set(JSON.stringify(style.layers).match(/Open Sans [A-Za-z]+/g))
    for (const f of fonts) expect(fs.existsSync(path.join(__dirname, '..', 'public', 'maps', 'fonts', f, '0-255.pbf')), f).toBe(true)
  })

  it('keeps OpenStreetMap / Overture and terrain attribution', () => {
    expect(style.sources.jamaica.attribution).toBe(OSM_ATTRIBUTION)
    expect(OSM_ATTRIBUTION).toContain('OpenStreetMap contributors')
    expect(OSM_ATTRIBUTION).toContain('Overture')
    expect(style.sources.hillshade.attribution).toBe(TERRAIN_ATTRIBUTION)
    expect(style.sources.parishes.promoteId).toBe('id')
  })

  it('light and dark themes share one layer list (so the style can be swapped in place)', () => {
    const ids = (t: 'light' | 'dark') => buildOpenStyle(src, '/x.geojson', t).layers.map((l: { id: string }) => l.id)
    expect(ids('dark')).toEqual(ids('light'))
    expect(new Set(ids('light')).size).toBe(ids('light').length)
  })

  it('draws the sea over the hill shading so sea-floor relief never shows', () => {
    const ids = style.layers.map((l: { id: string }) => l.id)
    expect(ids.indexOf('ocean')).toBeGreaterThan(ids.indexOf('hillshade'))
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

describe('map search', () => {
  const index = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', MAP_DATA.search), 'utf8')) as SearchIndex
  const prepared = prepare(index)

  it('normalises abbreviations, accents and punctuation', () => {
    expect(normalize('St. Ann’s Bay')).toBe('saint ann s bay')
    expect(normalize('Mt. Salem')).toBe('mount salem')
  })

  it('finds Jamaica\'s major places by prefix, biggest first', () => {
    const hits = search(prepared, index, 'kingst')
    expect(hits[0].name).toMatch(/^Kingston/)
    expect(['city', 'town']).toContain(hits[0].kind)
    expect(search(prepared, index, 'montego')[0].name).toMatch(/Montego Bay/)
  })

  it('every result carries coordinates inside Jamaica and a parish', () => {
    for (const h of search(prepared, index, 'half way tree')) {
      expect(h.lng).toBeGreaterThan(-78.5)
      expect(h.lng).toBeLessThan(-76.1)
      expect(h.parish).toBeTruthy()
    }
  })

  it('registry chargers are searchable; an exact place name still comes first', () => {
    const hub = [{ id: 'c1', name: 'Kingston Charge Hub', kind: 'charger', lng: -76.79, lat: 18, parish: null, category: null }]
    expect(search(prepared, index, 'kingston charge', hub)[0].id).toBe('c1')
    expect(search(prepared, index, 'kingston', hub)[0].kind).toBe('city')
    expect(search(prepared, index, 'kingston', hub).map((h) => h.id)).toContain('c1')
  })

  it('the index never lists OpenStreetMap/Overture charging points', () => {
    expect(index.rows.some((r) => /charging/i.test(r[5] ?? ''))).toBe(false)
  })

  it('zooms closer for smaller things', () => {
    expect(zoomForKind('city')).toBeLessThan(zoomForKind('street'))
    expect(zoomForKind('street')).toBeLessThan(zoomForKind('poi:food'))
  })
})

describe('style validity', () => {
  it('both themes pass the MapLibre style specification', async () => {
    const { validateStyleMin } = await import('@maplibre/maplibre-gl-style-spec')
    for (const t of ['light', 'dark'] as const) {
      const errs = validateStyleMin(buildOpenStyle(openMapSources('https://kingstonenergies.com'), { type: 'FeatureCollection', features: [] }, t))
      expect(errs.map((e: { message: string }) => e.message)).toEqual([])
    }
  })
})
