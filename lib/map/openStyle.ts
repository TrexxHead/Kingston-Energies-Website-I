import type { DisplayState } from './status'
import { PARISHES } from './parishes'

/**
 * The Kingston Energies map — our own MapLibre style over open data.
 *
 * Layers, from the bottom up:
 *  1. Jamaica's parishes, self-hosted at /maps/jamaica-parishes.geojson
 *     (OpenStreetMap boundaries via geoBoundaries JAM-ADM1). Always drawn, so
 *     the island and parish lines render even if the detail tiles are down.
 *  2. Street detail from OpenStreetMap vector tiles (OpenMapTiles schema).
 *     Default host: OpenFreeMap (free, no key). Swap the host with
 *     NEXT_PUBLIC_OPEN_MAP_TILES_URL (a TileJSON URL, e.g. self-hosted), or
 *     set it to "off" to show only our own layers.
 *
 * Nothing here is copied from Google. Edit colours in MAP_COLORS and layers in
 * buildOpenStyle(); attribution to OpenStreetMap contributors must stay.
 */

export const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'

const DEFAULT_TILES = 'https://tiles.openfreemap.org/planet'
const DEFAULT_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

export interface OpenMapSources {
  /** TileJSON URL for OpenMapTiles-schema vector tiles, or null for our layers only. */
  tiles: string | null
  /** Glyph (font) URL template, or null to skip text labels. */
  glyphs: string | null
}

function envUrl(raw: string | undefined, fallback: string): string | null {
  const v = (raw ?? '').trim()
  if (v.toLowerCase() === 'off') return null
  return v || fallback
}

export function openMapSources(env: { tiles?: string; glyphs?: string } = {}): OpenMapSources {
  const tiles = envUrl(env.tiles, DEFAULT_TILES)
  // Labels need glyphs; default them to the tile host only when that host is the default.
  const glyphs = envUrl(env.glyphs, tiles === DEFAULT_TILES ? DEFAULT_GLYPHS : '') || null
  return { tiles, glyphs }
}

/** Hostnames the map page must be allowed to fetch from (for the route CSP). */
export function openMapHosts(s: OpenMapSources): string[] {
  return [s.tiles, s.glyphs]
    .filter((u): u is string => !!u && /^https:\/\//.test(u))
    .map((u) => new URL(u.replace(/\{[^}]+\}/g, 'x')).origin)
    .filter((o, i, a) => a.indexOf(o) === i)
}

export const MAP_COLORS = {
  sea: '#0b2634', // --ke-blue-900
  land: '#13231d',
  landSelected: '#1d3326',
  parishLine: 'rgba(147,201,63,.45)', // --ke-green-400
  parishLineSelected: '#93c93f',
  park: '#17301f',
  water: '#0d3247',
  building: '#1c2a25',
  roadMinor: '#2a3a33',
  roadMajor: '#556059',
  roadMotorway: '#c0821c', // --ke-gold
  label: '#eaf2ec',
  labelMuted: 'rgba(234,242,236,.6)',
  labelHalo: '#0d1714',
} as const

/** Marker colour per display state — matches the list's status colours. */
export const STATE_MARKER_COLOR: Record<DisplayState, string> = {
  available_now: '#93c93f',
  in_use: '#fdb813',
  out_of_service: '#f6a5a5',
  recently_reported_working: '#6bb8db',
  status_unavailable: '#93a099',
  status_may_be_outdated: '#fdb813',
}

/** Most useful state across a station's connector groups (available beats unknown, etc.). */
const STATE_RANK: DisplayState[] = ['available_now', 'recently_reported_working', 'in_use', 'status_may_be_outdated', 'status_unavailable', 'out_of_service']
export function stationMarkerState(states: (DisplayState | null | undefined)[]): DisplayState {
  const present = states.filter((s): s is DisplayState => !!s)
  if (present.length === 0) return 'status_unavailable'
  return STATE_RANK.find((r) => present.includes(r)) ?? 'status_unavailable'
}

const FONT = ['Noto Sans Regular']
const FONT_BOLD = ['Noto Sans Bold']

/* eslint-disable @typescript-eslint/no-explicit-any */
export function buildOpenStyle(s: OpenMapSources, parishData: string | object = '/maps/jamaica-parishes.geojson'): any {
  const c = MAP_COLORS
  const sources: Record<string, any> = {
    parishes: { type: 'geojson', data: parishData, attribution: OSM_ATTRIBUTION, promoteId: 'id' },
    // One label point per parish (approximate centres from lib/map/parishes — framing only).
    parishCentres: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: PARISHES.map((p) => ({ type: 'Feature', properties: { id: p.id, name: p.name }, geometry: { type: 'Point', coordinates: [p.center.lng, p.center.lat] } })),
      },
    },
  }
  if (s.tiles) sources.osm = { type: 'vector', url: s.tiles, attribution: OSM_ATTRIBUTION }

  const label = (extra: any) => (s.glyphs ? [extra] : [])
  const osm = (layers: any[]) => (s.tiles ? layers : [])

  const roadWidth = (base: number) => ['interpolate', ['exponential', 1.5], ['zoom'], 8, base * 0.3, 12, base, 17, base * 6]

  return {
    version: 8,
    name: 'Kingston Energies — Jamaica',
    ...(s.glyphs ? { glyphs: s.glyphs } : {}),
    sources,
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': c.sea } },
      {
        id: 'parish-land',
        type: 'fill',
        source: 'parishes',
        paint: { 'fill-color': ['case', ['boolean', ['feature-state', 'selected'], false], c.landSelected, c.land] },
      },
      ...osm([
        { id: 'park', type: 'fill', source: 'osm', 'source-layer': 'park', paint: { 'fill-color': c.park, 'fill-opacity': 0.7 } },
        { id: 'landcover-wood', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest']]], paint: { 'fill-color': c.park, 'fill-opacity': 0.45 } },
        { id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', paint: { 'fill-color': c.water } },
        { id: 'waterway', type: 'line', source: 'osm', 'source-layer': 'waterway', minzoom: 10, paint: { 'line-color': c.water, 'line-width': 1 } },
        { id: 'building', type: 'fill', source: 'osm', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': c.building, 'fill-opacity': 0.9 } },
        {
          id: 'road-minor',
          type: 'line',
          source: 'osm',
          'source-layer': 'transportation',
          minzoom: 11,
          filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary', 'track']]],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': c.roadMinor, 'line-width': roadWidth(0.8) },
        },
        {
          id: 'road-major',
          type: 'line',
          source: 'osm',
          'source-layer': 'transportation',
          filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'trunk']]],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': c.roadMajor, 'line-width': roadWidth(1.4) },
        },
        {
          id: 'road-motorway',
          type: 'line',
          source: 'osm',
          'source-layer': 'transportation',
          filter: ['==', ['get', 'class'], 'motorway'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': c.roadMotorway, 'line-width': roadWidth(1.8) },
        },
      ]),
      {
        id: 'parish-line',
        type: 'line',
        source: 'parishes',
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], c.parishLineSelected, c.parishLine],
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.2, 1],
        },
      },
      ...(s.tiles
        ? label({
            id: 'road-label',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'transportation_name',
            minzoom: 13,
            layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11 },
            paint: { 'text-color': c.labelMuted, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.2 },
          }).concat(
            label({
              id: 'place-label',
              type: 'symbol',
              source: 'osm',
              'source-layer': 'place',
              minzoom: 9,
              filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb', 'neighbourhood']]],
              layout: {
                'text-field': ['get', 'name'],
                'text-font': FONT,
                'text-size': ['match', ['get', 'class'], 'city', 15, 'town', 13, 11.5],
              },
              paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.4 },
            }),
          )
        : []),
      ...label({
        id: 'parish-label',
        type: 'symbol',
        source: 'parishCentres',
        maxzoom: 10.5,
        layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT_BOLD, 'text-size': 11, 'text-letter-spacing': 0.15 },
        paint: { 'text-color': 'rgba(147,201,63,.85)', 'text-halo-color': c.labelHalo, 'text-halo-width': 1.2 },
      }),
    ],
  }
}
