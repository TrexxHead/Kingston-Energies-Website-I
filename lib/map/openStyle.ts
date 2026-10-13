import type { DisplayState } from './status'
import { PARISHES } from './parishes'

/**
 * The Kingston Energies map — our own MapLibre style over open data.
 *
 * Sources:
 *  - Jamaica's parishes, self-hosted at /maps/jamaica-parishes.geojson
 *    (OpenStreetMap boundaries via geoBoundaries JAM-ADM1). Always drawn, so
 *    the island renders even if the detail tiles are down.
 *  - Street detail: OpenStreetMap vector tiles (OpenMapTiles schema). Default
 *    host OpenFreeMap (free, no key). NEXT_PUBLIC_OPEN_MAP_TILES_URL swaps the
 *    TileJSON (e.g. self-hosted); "off" shows only our own layers.
 *  - Terrain: open elevation tiles (AWS Terrain Tiles, Terrarium encoding) for
 *    hill shading and the 3D view. NEXT_PUBLIC_OPEN_MAP_TERRAIN_URL swaps it.
 *
 * Nothing here is copied from Google or Apple. Colours live in MAP_THEMES,
 * layers in buildOpenStyle(); OpenStreetMap attribution must stay.
 */

export const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
export const TERRAIN_ATTRIBUTION = '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Terrain: Mapzen &amp; sources</a>'

const DEFAULT_TILES = 'https://tiles.openfreemap.org/planet'
const DEFAULT_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
const DEFAULT_TERRAIN = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

export interface OpenMapSources {
  /** TileJSON URL for OpenMapTiles-schema vector tiles, or null for our layers only. */
  tiles: string | null
  /** Glyph (font) URL template, or null to skip text labels. */
  glyphs: string | null
  /** Terrarium-encoded elevation tile template, or null for a flat map. */
  terrain: string | null
}

function envUrl(raw: string | undefined, fallback: string): string | null {
  const v = (raw ?? '').trim()
  if (v.toLowerCase() === 'off') return null
  return v || fallback
}

export function openMapSources(env: { tiles?: string; glyphs?: string; terrain?: string } = {}): OpenMapSources {
  const tiles = envUrl(env.tiles, DEFAULT_TILES)
  // Labels need glyphs; default them to the tile host only when that host is the default.
  const glyphs = envUrl(env.glyphs, tiles === DEFAULT_TILES ? DEFAULT_GLYPHS : '') || null
  const terrain = envUrl(env.terrain, DEFAULT_TERRAIN)
  return { tiles, glyphs, terrain }
}

/** Origins the map page (and its worker) must be allowed to fetch from (for the route CSP). */
export function openMapHosts(s: OpenMapSources): string[] {
  return [s.tiles, s.glyphs, s.terrain]
    .filter((u): u is string => !!u && /^https:\/\//.test(u))
    .map((u) => new URL(u.replace(/\{[^}]+\}/g, 'x')).origin)
    .filter((o, i, a) => a.indexOf(o) === i)
}

export type MapTheme = 'light' | 'dark'

export interface ThemeColors {
  sea: string
  land: string
  landSelected: string
  wood: string
  grass: string
  farmland: string
  sand: string
  wetland: string
  residential: string
  commercial: string
  industrial: string
  hospital: string
  school: string
  park: string
  water: string
  waterLabel: string
  building: string
  aeroway: string
  roadCasing: string
  roadMinor: string
  roadMajor: string
  roadTrunk: string
  roadMotorway: string
  roadMotorwayCasing: string
  path: string
  rail: string
  parishLine: string
  parishLineSelected: string
  label: string
  labelStrong: string
  labelMuted: string
  labelHalo: string
  parishLabel: string
  shieldText: string
  shade: string
  highlight: string
  shadeStrength: number
}

/** Light is crisp and paper-toned; dark is tinted to the site's green-black. */
export const MAP_THEMES: Record<MapTheme, ThemeColors> = {
  light: {
    sea: '#a7d3ee',
    land: '#f4f1ea',
    landSelected: '#eef5df',
    wood: '#cfe5bf',
    grass: '#dcecce',
    farmland: '#ecefdc',
    sand: '#f3ead2',
    wetland: '#d5e8de',
    residential: '#efebe3',
    commercial: '#f4e9e4',
    industrial: '#ece8ef',
    hospital: '#f8e1e0',
    school: '#f4ecd5',
    park: '#c9e4b8',
    water: '#a7d3ee',
    waterLabel: '#4f88ae',
    building: '#e4dfd6',
    aeroway: '#e6e2ec',
    roadCasing: '#dad4c8',
    roadMinor: '#ffffff',
    roadMajor: '#ffffff',
    roadTrunk: '#fff2c4',
    roadMotorway: '#fcd57e',
    roadMotorwayCasing: '#e2b04a',
    path: '#c9c2b5',
    rail: '#c4c0ba',
    parishLine: 'rgba(120,110,150,.35)',
    parishLineSelected: '#5c8a1e',
    label: '#4a4a50',
    labelStrong: '#1f1f23',
    labelMuted: '#77757a',
    labelHalo: 'rgba(255,255,255,.95)',
    parishLabel: 'rgba(92,138,30,.85)',
    shieldText: '#3f3f45',
    shade: '#5b4b3a',
    highlight: '#ffffff',
    shadeStrength: 0.22,
  },
  dark: {
    sea: '#0e2230',
    land: '#1a211e',
    landSelected: '#22301f',
    wood: '#1d2b22',
    grass: '#1e2a23',
    farmland: '#1d2520',
    sand: '#272620',
    wetland: '#1b2a28',
    residential: '#1e2522',
    commercial: '#252325',
    industrial: '#22232a',
    hospital: '#2c2224',
    school: '#29271f',
    park: '#1f3324',
    water: '#0e2230',
    waterLabel: '#6c9bbb',
    building: '#262e2b',
    aeroway: '#262630',
    roadCasing: '#141a17',
    roadMinor: '#38423d',
    roadMajor: '#48534e',
    roadTrunk: '#5a5340',
    roadMotorway: '#8a6c35',
    roadMotorwayCasing: '#4a3a1c',
    path: '#3b4440',
    rail: '#3b4440',
    parishLine: 'rgba(147,201,63,.28)',
    parishLineSelected: '#93c93f',
    label: '#c9d1cc',
    labelStrong: '#eef3f0',
    labelMuted: '#8d9893',
    labelHalo: 'rgba(13,23,20,.92)',
    parishLabel: 'rgba(147,201,63,.75)',
    shieldText: '#e8ece9',
    shade: '#000000',
    highlight: '#6c7c74',
    shadeStrength: 0.38,
  },
}

/** Marker colour per display state — matches the list's status meaning. */
export const STATE_MARKER_COLOR: Record<DisplayState, string> = {
  available_now: '#5fae2e',
  in_use: '#f2a20c',
  out_of_service: '#d9534f',
  recently_reported_working: '#2b8fd0',
  status_unavailable: '#7d8a84',
  status_may_be_outdated: '#f2a20c',
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
const FONT_ITALIC = ['Noto Sans Italic']

/** Images the style references; the map component draws them at runtime (no sprite sheet to host). */
export const SHIELD_IMAGES = { motorway: 'ke-shield-motorway', road: 'ke-shield-road' } as const
export const POI_KINDS = ['health', 'edu', 'food', 'shop', 'fuel', 'stay', 'airport', 'place'] as const
export type PoiKind = (typeof POI_KINDS)[number]

/* eslint-disable @typescript-eslint/no-explicit-any */
type Expr = any[]

const zoomWidth = (stops: [number, number][]): Expr => ['interpolate', ['exponential', 1.6], ['zoom'], ...stops.flat()]
const cls = (...c: string[]): Expr => ['in', ['get', 'class'], ['literal', c]]
const notTunnel: Expr = ['!=', ['get', 'brunnel'], 'tunnel']
const isTunnel: Expr = ['==', ['get', 'brunnel'], 'tunnel']
const nameField: Expr = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]

/** Road classes, narrowest first (drawn first), with fill widths by zoom. */
const ROADS: { id: string; classes: string[]; minzoom: number; width: [number, number][]; fill: keyof ThemeColors; casing: keyof ThemeColors }[] = [
  { id: 'service', classes: ['service', 'track'], minzoom: 14, width: [[14, 0.6], [18, 7]], fill: 'roadMinor', casing: 'roadCasing' },
  { id: 'minor', classes: ['minor'], minzoom: 12.5, width: [[12.5, 0.6], [14, 2.4], [18, 14]], fill: 'roadMinor', casing: 'roadCasing' },
  { id: 'tertiary', classes: ['tertiary'], minzoom: 11, width: [[11, 0.6], [14, 3.2], [18, 18]], fill: 'roadMajor', casing: 'roadCasing' },
  { id: 'secondary', classes: ['secondary'], minzoom: 9, width: [[9, 0.6], [14, 4.2], [18, 22]], fill: 'roadMajor', casing: 'roadCasing' },
  { id: 'primary', classes: ['primary'], minzoom: 7, width: [[7, 0.6], [10, 1.6], [14, 5.5], [18, 26]], fill: 'roadMajor', casing: 'roadCasing' },
  { id: 'trunk', classes: ['trunk'], minzoom: 6, width: [[6, 0.6], [10, 2], [14, 6.5], [18, 28]], fill: 'roadTrunk', casing: 'roadMotorwayCasing' },
  { id: 'motorway', classes: ['motorway'], minzoom: 5, width: [[5, 0.8], [10, 2.4], [14, 7.5], [18, 32]], fill: 'roadMotorway', casing: 'roadMotorwayCasing' },
]

export function buildOpenStyle(s: OpenMapSources, parishData: string | object = '/maps/jamaica-parishes.geojson', theme: MapTheme = 'light', seaMaskUrl = '/maps/jamaica-sea-mask.geojson'): any {
  const c = MAP_THEMES[theme]
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
  if (s.terrain) {
    const dem = { type: 'raster-dem', tiles: [s.terrain], tileSize: 256, maxzoom: 14, encoding: 'terrarium', attribution: TERRAIN_ATTRIBUTION }
    // Separate sources for shading and 3D terrain, as MapLibre recommends.
    sources.hillshade = dem
    sources.terrain = { ...dem }
    // Elevation tiles include the sea floor; this mask (sea with Jamaica cut
    // out) keeps the shading on land and gives a crisp coastline.
    sources.seaMask = { type: 'geojson', data: seaMaskUrl }
  }

  const osm = (layers: any[]) => (s.tiles ? layers : [])
  const labels = (layers: any[]) => (s.glyphs ? layers : [])
  const halo = { 'text-halo-color': c.labelHalo, 'text-halo-width': 1.4, 'text-halo-blur': 0.4 }

  const roadLine = (id: string, filter: Expr, color: string, width: Expr, minzoom: number, extra: any = {}) => ({
    id,
    type: 'line',
    source: 'osm',
    'source-layer': 'transportation',
    minzoom,
    filter,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': color, 'line-width': width, ...extra },
  })
  const casingWidth = (w: [number, number][]): Expr => zoomWidth(w.map(([z, v]) => [z, v + Math.max(0.8, v * 0.28)] as [number, number]))

  const roadLayers = (tunnel: boolean) => {
    const base = tunnel ? isTunnel : notTunnel
    const sfx = tunnel ? '-tunnel' : ''
    const opacity = tunnel ? { 'line-opacity': 0.5 } : {}
    return [
      ...ROADS.map((r) => roadLine(`road-${r.id}-casing${sfx}`, ['all', base, cls(...r.classes)], c[r.casing] as string, casingWidth(r.width), Math.max(r.minzoom, r.id === 'motorway' || r.id === 'trunk' ? 8 : 11), opacity)),
      ...ROADS.map((r) => roadLine(`road-${r.id}${sfx}`, ['all', base, cls(...r.classes)], c[r.fill] as string, zoomWidth(r.width), r.minzoom, opacity)),
    ]
  }

  const poiFilter: Expr = [
    'all',
    ['<=', ['coalesce', ['get', 'rank'], 99], 18],
    cls('hospital', 'college', 'school', 'shop', 'grocery', 'fuel', 'restaurant', 'cafe', 'lodging', 'bank', 'town_hall', 'police', 'attraction', 'museum', 'stadium', 'harbor'),
    // OSM charging points are unverified — our registry is the only charger layer shown.
    ['!=', ['get', 'subclass'], 'charging_station'],
  ]
  const poiKind: Expr = ['match', ['get', 'class'], ['hospital'], 'health', ['college', 'school'], 'edu', ['restaurant', 'cafe'], 'food', ['shop', 'grocery'], 'shop', ['fuel'], 'fuel', ['lodging'], 'stay', 'place']

  return {
    version: 8,
    name: `Kingston Energies — Jamaica (${theme})`,
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
        { id: 'landcover-farmland', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: cls('farmland'), paint: { 'fill-color': c.farmland, 'fill-opacity': 0.7 } },
        { id: 'landcover-grass', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: cls('grass'), paint: { 'fill-color': c.grass, 'fill-opacity': 0.75 } },
        { id: 'landcover-wood', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: cls('wood', 'forest'), paint: { 'fill-color': c.wood, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 12, 0.85] } },
        { id: 'landcover-wetland', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: cls('wetland'), paint: { 'fill-color': c.wetland, 'fill-opacity': 0.8 } },
        { id: 'landcover-sand', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: cls('sand'), paint: { 'fill-color': c.sand } },
        { id: 'landuse-residential', type: 'fill', source: 'osm', 'source-layer': 'landuse', minzoom: 10, filter: cls('residential', 'suburb', 'neighbourhood'), paint: { 'fill-color': c.residential, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 14, 1] } },
        { id: 'landuse-commercial', type: 'fill', source: 'osm', 'source-layer': 'landuse', minzoom: 11, filter: cls('commercial', 'retail'), paint: { 'fill-color': c.commercial } },
        { id: 'landuse-industrial', type: 'fill', source: 'osm', 'source-layer': 'landuse', minzoom: 11, filter: cls('industrial', 'railway', 'quarry'), paint: { 'fill-color': c.industrial } },
        { id: 'landuse-hospital', type: 'fill', source: 'osm', 'source-layer': 'landuse', minzoom: 12, filter: cls('hospital'), paint: { 'fill-color': c.hospital } },
        { id: 'landuse-school', type: 'fill', source: 'osm', 'source-layer': 'landuse', minzoom: 12, filter: cls('school', 'university', 'college'), paint: { 'fill-color': c.school } },
        { id: 'park', type: 'fill', source: 'osm', 'source-layer': 'park', paint: { 'fill-color': c.park, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 0.9] } },
      ]),
      ...(s.terrain
        ? [
            {
              id: 'hillshade',
              type: 'hillshade',
              source: 'hillshade',
              paint: {
                'hillshade-shadow-color': c.shade,
                'hillshade-highlight-color': c.highlight,
                'hillshade-accent-color': c.shade,
                'hillshade-exaggeration': c.shadeStrength,
                'hillshade-illumination-direction': 315,
              },
            },
            { id: 'sea-mask', type: 'fill', source: 'seaMask', paint: { 'fill-color': c.sea, 'fill-antialias': false } },
          ]
        : []),
      ...osm([
        { id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', filter: notTunnel, paint: { 'fill-color': c.water } },
        { id: 'waterway', type: 'line', source: 'osm', 'source-layer': 'waterway', minzoom: 9, filter: notTunnel, layout: { 'line-cap': 'round' }, paint: { 'line-color': c.water, 'line-width': zoomWidth([[9, 0.5], [14, 1.6], [18, 6]]) } },
        { id: 'aeroway-area', type: 'fill', source: 'osm', 'source-layer': 'aeroway', minzoom: 11, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': c.aeroway } },
        { id: 'aeroway-runway', type: 'line', source: 'osm', 'source-layer': 'aeroway', minzoom: 10, filter: cls('runway'), paint: { 'line-color': c.aeroway, 'line-width': zoomWidth([[10, 2], [14, 18], [18, 80]]) } },
        ...roadLayers(true),
        roadLine('path', cls('path', 'pedestrian'), c.path, zoomWidth([[14, 0.6], [18, 3]]), 15, { 'line-dasharray': [2, 1.5] }),
        ...roadLayers(false),
        roadLine('rail', cls('rail', 'transit'), c.rail, zoomWidth([[11, 0.6], [18, 3]]), 11, { 'line-dasharray': [3, 2] }),
        {
          id: 'building-3d',
          type: 'fill-extrusion',
          source: 'osm',
          'source-layer': 'building',
          minzoom: 14.5,
          filter: ['!=', ['get', 'hide_3d'], true],
          paint: {
            'fill-extrusion-color': c.building,
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15.5, ['coalesce', ['get', 'render_height'], 6]],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.88,
            'fill-extrusion-vertical-gradient': true,
          },
        },
      ]),
      {
        id: 'parish-line',
        type: 'line',
        source: 'parishes',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], c.parishLineSelected, c.parishLine],
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.4, 1],
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'parish-line-selected',
        type: 'line',
        source: 'parishes',
        layout: { 'line-join': 'round' },
        paint: { 'line-color': c.parishLineSelected, 'line-width': 2.6, 'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0] },
      },
      ...labels(
        osm([
          {
            id: 'water-label-sea',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'water_name',
            filter: cls('ocean', 'sea', 'bay', 'strait'),
            layout: { 'text-field': nameField, 'text-font': FONT_ITALIC, 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 10, 16], 'text-letter-spacing': 0.2, 'text-max-width': 6 },
            paint: { 'text-color': c.waterLabel, 'text-halo-color': c.labelHalo, 'text-halo-width': 0.6 },
          },
          {
            id: 'waterway-label',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'waterway',
            minzoom: 13,
            layout: { 'symbol-placement': 'line', 'text-field': nameField, 'text-font': FONT_ITALIC, 'text-size': 11, 'text-letter-spacing': 0.05 },
            paint: { 'text-color': c.waterLabel, ...halo },
          },
          {
            id: 'road-label',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'transportation_name',
            minzoom: 13,
            filter: ['has', 'name'],
            layout: {
              'symbol-placement': 'line',
              'text-field': nameField,
              'text-font': FONT,
              'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10.5, 18, 14],
              'symbol-spacing': 320,
              'text-max-angle': 30,
            },
            paint: { 'text-color': c.label, ...halo },
          },
          {
            id: 'road-shield',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'transportation_name',
            minzoom: 8,
            filter: ['all', ['has', 'ref'], ['<=', ['coalesce', ['get', 'ref_length'], 9], 5], cls('motorway', 'trunk', 'primary', 'secondary')],
            layout: {
              'symbol-placement': 'line',
              'symbol-spacing': ['interpolate', ['linear'], ['zoom'], 8, 280, 14, 520],
              'text-field': ['get', 'ref'],
              'text-font': FONT_BOLD,
              'text-size': 10.5,
              'text-rotation-alignment': 'viewport',
              'icon-image': ['match', ['get', 'class'], ['motorway', 'trunk'], SHIELD_IMAGES.motorway, SHIELD_IMAGES.road],
              'icon-rotation-alignment': 'viewport',
              'icon-text-fit': 'both',
              'icon-text-fit-padding': [2, 5, 2, 5],
            },
            paint: { 'text-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#5a3d00', c.shieldText] },
          },
          {
            id: 'poi-label',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'poi',
            minzoom: 15,
            filter: poiFilter,
            layout: {
              'text-field': nameField,
              'text-font': FONT,
              'text-size': 11,
              'text-max-width': 8,
              'text-anchor': 'top',
              'text-offset': [0, 0.8],
              'text-optional': true,
              'icon-image': ['concat', 'ke-poi-', poiKind],
            },
            paint: { 'text-color': c.labelMuted, ...halo },
          },
          {
            id: 'airport-label',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'aerodrome_label',
            minzoom: 9,
            layout: { 'text-field': nameField, 'text-font': FONT_BOLD, 'text-size': 12, 'text-max-width': 8, 'icon-image': 'ke-poi-airport', 'text-anchor': 'top', 'text-offset': [0, 0.9], 'text-optional': true },
            paint: { 'text-color': c.label, ...halo },
          },
          {
            id: 'place-village',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'place',
            minzoom: 11,
            filter: cls('village', 'suburb', 'neighbourhood', 'hamlet'),
            layout: { 'text-field': nameField, 'text-font': FONT, 'text-size': ['match', ['get', 'class'], 'village', 12, 11], 'text-max-width': 7 },
            paint: { 'text-color': c.label, ...halo },
          },
          {
            id: 'place-town',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'place',
            minzoom: 8,
            filter: cls('town'),
            layout: { 'text-field': nameField, 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11.5, 13, 15], 'text-max-width': 7 },
            paint: { 'text-color': c.labelStrong, ...halo },
          },
          {
            id: 'place-city',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'place',
            minzoom: 6,
            filter: cls('city'),
            layout: { 'text-field': nameField, 'text-font': FONT_BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 13, 12, 19], 'text-max-width': 7 },
            paint: { 'text-color': c.labelStrong, ...halo },
          },
        ]),
      ),
      ...labels([
        {
          id: 'parish-label',
          type: 'symbol',
          source: 'parishCentres',
          maxzoom: 10.5,
          layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT_BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9.5, 10, 12], 'text-letter-spacing': 0.18 },
          paint: { 'text-color': c.parishLabel, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.2, 'text-opacity': ['interpolate', ['linear'], ['zoom'], 9.5, 1, 10.5, 0] },
        },
      ]),
    ],
  }
}
