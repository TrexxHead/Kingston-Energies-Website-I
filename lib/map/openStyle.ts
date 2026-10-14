import type { DisplayState } from './status'
import { PARISHES } from './parishes'
import { MAP_DATA, DATA_ATTRIBUTION, TERRAIN_ATTRIBUTION, SATELLITE_ATTRIBUTION } from './mapData'

/**
 * The Kingston Energies map — our own MapLibre style over self-hosted data.
 *
 * Everything is served from this site (lib/map/mapData.ts): Jamaica's roads,
 * water, land use, place names, points of interest and buildings as PMTiles,
 * terrain as Terrarium PMTiles, and label fonts. No third-party tile host, so
 * nothing outside our control can blank the map.
 *
 * Colours live in MAP_THEMES, layers in buildOpenStyle(). Attribution to
 * OpenStreetMap contributors and Overture must stay visible.
 */

export const OSM_ATTRIBUTION = DATA_ATTRIBUTION
export { TERRAIN_ATTRIBUTION }

export interface OpenMapSources {
  base: string
  buildings: string
  terrain: string
  glyphs: string
  /** Sentinel-2 satellite mosaic (raster PMTiles), when built. */
  satellite?: string
}

/** Absolute URLs for the self-hosted data (MapLibre needs absolute URLs in a style). */
export function openMapSources(origin: string): OpenMapSources {
  const o = origin.replace(/\/$/, '')
  return {
    base: `pmtiles://${o}${MAP_DATA.base}`,
    buildings: `pmtiles://${o}${MAP_DATA.buildings}`,
    terrain: `pmtiles://${o}${MAP_DATA.terrain}`,
    satellite: MAP_DATA.satellite ? `pmtiles://${o}${MAP_DATA.satellite}` : undefined,
    glyphs: `${o}${MAP_DATA.glyphs}`,
  }
}

export type MapTheme = 'light' | 'dark'

export const POI_KINDS = ['food', 'stay', 'shop', 'health', 'edu', 'worship', 'fuel', 'bank', 'gov', 'attraction', 'park', 'auto', 'transport', 'airport', 'place'] as const
export type PoiKind = (typeof POI_KINDS)[number]

/** Category colours (icon fill, and label text in the light theme). */
export const POI_COLOR: Record<PoiKind, string> = {
  food: '#ee7d1f',
  stay: '#8a5cd6',
  shop: '#d99100',
  health: '#e5484d',
  edu: '#9a6b3f',
  worship: '#6b7a90',
  fuel: '#2f6fb3',
  bank: '#2e9467',
  gov: '#5f6f82',
  attraction: '#d6457a',
  park: '#3c9a4a',
  auto: '#5b6b7a',
  transport: '#2f80ed',
  airport: '#2f80ed',
  place: '#8b8d98',
}

export const POI_LABEL: Record<PoiKind, string> = {
  food: 'Food & drink',
  stay: 'Hotel',
  shop: 'Shop',
  health: 'Health',
  edu: 'Education',
  worship: 'Place of worship',
  fuel: 'Fuel',
  bank: 'Bank',
  gov: 'Government',
  attraction: 'Attraction',
  park: 'Park & beach',
  auto: 'Auto',
  transport: 'Transport',
  airport: 'Airport',
  place: 'Place',
}

export interface ThemeColors {
  sea: string
  land: string
  landSelected: string
  forest: string
  shrub: string
  grass: string
  farmland: string
  wetland: string
  barren: string
  urban: string
  sand: string
  residential: string
  commercial: string
  industrial: string
  park: string
  pitch: string
  school: string
  hospital: string
  cemetery: string
  airport: string
  protected: string
  water: string
  waterLabel: string
  building: string
  buildingLine: string
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
  neighbourhood: string
  parishLabel: string
  peak: string
  shade: string
  highlight: string
  shadeStrength: number
}

/** Light is crisp and paper-toned; dark is tinted to the site's green-black. */
export const MAP_THEMES: Record<MapTheme, ThemeColors> = {
  light: {
    sea: '#9fd0ee',
    land: '#f5f2ec',
    landSelected: 'rgba(147,201,63,.12)',
    forest: '#cde5be',
    shrub: '#e0ebd2',
    grass: '#dcedcf',
    farmland: '#edf0dd',
    wetland: '#d2e8df',
    barren: '#ede7db',
    urban: '#ece8e2',
    sand: '#f6ecd0',
    residential: '#eeeae3',
    commercial: '#f5e8e5',
    industrial: '#ebe7f0',
    park: '#c5e5b2',
    pitch: '#bfe0a9',
    school: '#f4ebd4',
    hospital: '#fbe0df',
    cemetery: '#d8e8cf',
    airport: '#e7e5ef',
    protected: 'rgba(120,180,90,.14)',
    water: '#9fd0ee',
    waterLabel: '#3f7fab',
    building: '#e5e0d7',
    buildingLine: '#d6cfc3',
    roadCasing: '#d8d1c4',
    roadMinor: '#ffffff',
    roadMajor: '#ffffff',
    roadTrunk: '#fff0bd',
    roadMotorway: '#fcd27a',
    roadMotorwayCasing: '#dfa944',
    path: '#c3baab',
    rail: '#bdb8b0',
    parishLine: 'rgba(110,100,140,.38)',
    parishLineSelected: '#5c8a1e',
    label: '#45454b',
    labelStrong: '#1c1c20',
    labelMuted: '#727077',
    labelHalo: 'rgba(255,255,255,.96)',
    neighbourhood: '#8a8790',
    parishLabel: 'rgba(92,138,30,.9)',
    peak: '#6d5a44',
    shade: '#4f402f',
    highlight: '#ffffff',
    shadeStrength: 0.3,
  },
  dark: {
    sea: '#0d2231',
    land: '#1b2320',
    landSelected: 'rgba(147,201,63,.1)',
    forest: '#1d2c23',
    shrub: '#1e2823',
    grass: '#1f2a24',
    farmland: '#1e2622',
    wetland: '#1a2a28',
    barren: '#25241f',
    urban: '#202725',
    sand: '#2a281f',
    residential: '#1f2724',
    commercial: '#262426',
    industrial: '#23242b',
    park: '#1f3425',
    pitch: '#223a28',
    school: '#29271f',
    hospital: '#2d2325',
    cemetery: '#1f2d23',
    airport: '#24242e',
    protected: 'rgba(147,201,63,.06)',
    water: '#0d2231',
    waterLabel: '#6b9cbd',
    building: '#262e2b',
    buildingLine: '#323b37',
    roadCasing: '#121815',
    roadMinor: '#38423d',
    roadMajor: '#4a5550',
    roadTrunk: '#5d5540',
    roadMotorway: '#8d6e36',
    roadMotorwayCasing: '#4a3a1c',
    path: '#3b4440',
    rail: '#3b4440',
    parishLine: 'rgba(147,201,63,.28)',
    parishLineSelected: '#93c93f',
    label: '#c9d1cc',
    labelStrong: '#eef3f0',
    labelMuted: '#8d9893',
    labelHalo: 'rgba(13,23,20,.92)',
    neighbourhood: '#88938e',
    parishLabel: 'rgba(147,201,63,.8)',
    peak: '#b9a88f',
    shade: '#000000',
    highlight: '#5e6e66',
    shadeStrength: 0.45,
  },
}

/** Marker colour per display state — matches the list's status meaning. */
export const STATE_MARKER_COLOR: Record<DisplayState, string> = {
  available: '#3f9d2a',
  status_unknown: '#7d8a84',
  out_of_service: '#d9534f',
}

/** Best state across a station's connector groups: any confirmed working group makes the pin green. */
const STATE_RANK: DisplayState[] = ['available', 'status_unknown', 'out_of_service']
export function stationMarkerState(states: (DisplayState | null | undefined)[]): DisplayState {
  const present = states.filter((s): s is DisplayState => !!s && (STATE_RANK as string[]).includes(s))
  if (present.length === 0) return 'status_unknown'
  return STATE_RANK.find((r) => present.includes(r)) ?? 'status_unknown'
}

const FONT = ['Open Sans Regular']
const FONT_SEMI = ['Open Sans Semibold']
const FONT_BOLD = ['Open Sans Bold']
const FONT_ITALIC = ['Open Sans Italic']

/** POI layer ids — the map component makes these clickable. */
export const POI_LAYERS = ['poi-major', 'poi-minor'] as const

/* eslint-disable @typescript-eslint/no-explicit-any */
type Expr = any[]

const zoomWidth = (stops: [number, number][]): Expr => ['interpolate', ['exponential', 1.6], ['zoom'], ...stops.flat()]
const kind = (...k: string[]): Expr => ['in', ['get', 'kind'], ['literal', k]]
/** Zoom-interpolated width that differs for one kind (MapLibre allows only one zoom curve per expression). */
const byKind = (k: string, stops: [number, number, number][]): Expr => ['interpolate', ['exponential', 1.6], ['zoom'], ...stops.flatMap(([z, a, b]) => [z, ['match', ['get', 'kind'], k, a, b]])]

/** Road classes, narrowest first (drawn first), with fill widths by zoom. */
const ROADS: { id: string; kinds: string[]; minzoom: number; width: [number, number][]; fill: keyof ThemeColors; casing: keyof ThemeColors }[] = [
  { id: 'service', kinds: ['service', 'track'], minzoom: 13.5, width: [[13.5, 0.5], [16, 2.6], [19, 10]], fill: 'roadMinor', casing: 'roadCasing' },
  { id: 'minor', kinds: ['residential', 'unclassified', 'living_street'], minzoom: 12, width: [[12, 0.5], [14, 2.2], [16, 6], [19, 18]], fill: 'roadMinor', casing: 'roadCasing' },
  { id: 'tertiary', kinds: ['tertiary'], minzoom: 10, width: [[10, 0.5], [13, 2.2], [16, 8], [19, 22]], fill: 'roadMajor', casing: 'roadCasing' },
  { id: 'secondary', kinds: ['secondary'], minzoom: 8, width: [[8, 0.5], [12, 2.2], [16, 10], [19, 26]], fill: 'roadMajor', casing: 'roadCasing' },
  { id: 'primary', kinds: ['primary'], minzoom: 7, width: [[7, 0.6], [10, 1.6], [14, 5.5], [16, 12], [19, 30]], fill: 'roadMajor', casing: 'roadCasing' },
  { id: 'trunk', kinds: ['trunk'], minzoom: 6, width: [[6, 0.6], [10, 2], [14, 6.5], [16, 13], [19, 32]], fill: 'roadTrunk', casing: 'roadMotorwayCasing' },
  { id: 'motorway', kinds: ['motorway'], minzoom: 5, width: [[5, 0.8], [10, 2.4], [14, 7.5], [16, 14], [19, 34]], fill: 'roadMotorway', casing: 'roadMotorwayCasing' },
]

/**
 * `satellite`: hybrid view — the Sentinel-2 mosaic over the land and near
 * shore, with roads, places and labels on top in the dark palette (light
 * text on imagery reads like Google's hybrid view). Flat building fills are
 * hidden so the roofs show.
 */
export function buildOpenStyle(s: OpenMapSources, parishData: string | object, theme: MapTheme = 'light', opts: { satellite?: boolean } = {}): any {
  const sat = Boolean(opts.satellite && s.satellite)
  const c = MAP_THEMES[sat ? 'dark' : theme]
  const dem = { type: 'raster-dem', url: s.terrain, tileSize: 256, encoding: 'terrarium', attribution: TERRAIN_ATTRIBUTION }
  const sources: Record<string, any> = {
    jamaica: { type: 'vector', url: s.base, attribution: OSM_ATTRIBUTION },
    buildings: { type: 'vector', url: s.buildings },
    // Separate sources for shading and 3D terrain, as MapLibre recommends.
    hillshade: dem,
    terrain: { ...dem },
    ...(s.satellite ? { satellite: { type: 'raster', url: s.satellite, tileSize: 256, attribution: SATELLITE_ATTRIBUTION } } : {}),
    parishes: { type: 'geojson', data: parishData, promoteId: 'id' },
    // One label point per parish (approximate centres from lib/map/parishes — framing only).
    parishCentres: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: PARISHES.map((p) => ({ type: 'Feature', properties: { id: p.id, name: p.name }, geometry: { type: 'Point', coordinates: [p.center.lng, p.center.lat] } })),
      },
    },
  }

  const v = (id: string, layer: string, type: string, extra: any) => ({ id, type, source: 'jamaica', 'source-layer': layer, ...extra })
  const halo = { 'text-halo-color': c.labelHalo, 'text-halo-width': 1.5, 'text-halo-blur': 0.3 }

  const road = (id: string, filter: Expr, color: string, width: Expr, minzoom: number, extra: any = {}) =>
    v(id, 'roads', 'line', { minzoom, filter, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': width, ...extra } })
  const casingWidth = (w: [number, number][]): Expr => zoomWidth(w.map(([z, x]) => [z, x + Math.max(0.9, x * 0.26)] as [number, number]))

  const landcover = (k: string, color: string, op: Expr | number = 1) => v(`landcover-${k}`, 'landcover', 'fill', { filter: kind(k), paint: { 'fill-color': color, 'fill-opacity': op } })
  const landuse = (k: string[], id: string, color: string, minzoom = 10) => v(`landuse-${id}`, 'landuse', 'fill', { minzoom, filter: kind(...k), paint: { 'fill-color': color } })

  const poiColor: Expr = ['match', ['get', 'kind'], ...POI_KINDS.flatMap((k) => [k, POI_COLOR[k]]), POI_COLOR.place]
  const poiLayer = (id: string, rank: number, minzoom: number) =>
    v(id, 'poi', 'symbol', {
      minzoom,
      filter: ['==', ['get', 'rank'], rank],
      layout: {
        'icon-image': ['concat', 'ke-poi-', ['get', 'kind']],
        'icon-size': rank === 1 ? 1 : 0.9,
        'text-field': ['get', 'name'],
        'text-font': FONT_SEMI,
        'text-size': rank === 1 ? 12 : 11,
        'text-max-width': 8,
        'text-variable-anchor': ['left', 'right', 'top'],
        'text-radial-offset': 1.05,
        'text-justify': 'auto',
        'text-optional': true,
        'text-padding': 4,
        'icon-padding': 3,
        'symbol-sort-key': rank,
      },
      paint: { 'text-color': theme === 'dark' ? c.label : poiColor, ...halo },
    })

  return {
    version: 8,
    name: `Kingston Energies — Jamaica (${theme})`,
    glyphs: s.glyphs,
    sources,
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': c.sea } },
      v('earth', 'earth', 'fill', { paint: { 'fill-color': c.land } }),
      landcover('forest', c.forest, ['interpolate', ['linear'], ['zoom'], 5, 0.7, 12, 0.9]),
      landcover('shrub', c.shrub, 0.8),
      landcover('grass', c.grass, 0.8),
      landcover('farmland', c.farmland, 0.8),
      landcover('wetland', c.wetland),
      landcover('barren', c.barren, 0.8),
      landcover('urban', c.urban, ['interpolate', ['linear'], ['zoom'], 8, 0.6, 12, 0]),
      landcover('sand', c.sand),
      v('landuse-protected', 'landuse', 'fill', { minzoom: 7, filter: kind('protected'), paint: { 'fill-color': c.protected } }),
      landuse(['residential'], 'residential', c.residential),
      landuse(['farmland', 'garden'], 'farm', c.farmland, 11),
      landuse(['commercial'], 'commercial', c.commercial, 12),
      landuse(['industrial', 'transport'], 'industrial', c.industrial, 12),
      landuse(['park', 'golf', 'grass'], 'park', c.park),
      landuse(['pitch'], 'pitch', c.pitch, 13),
      landuse(['school'], 'school', c.school, 12),
      landuse(['hospital'], 'hospital', c.hospital, 12),
      landuse(['cemetery'], 'cemetery', c.cemetery, 12),
      landuse(['airport'], 'airport', c.airport),
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'hillshade',
        paint: {
          'hillshade-shadow-color': c.shade,
          'hillshade-highlight-color': c.highlight,
          'hillshade-accent-color': c.shade,
          'hillshade-exaggeration': ['interpolate', ['linear'], ['zoom'], 6, c.shadeStrength + 0.1, 13, c.shadeStrength * 0.6],
          'hillshade-illumination-direction': 315,
        },
      },
      // The sea polygon sits over the shading so sea-floor relief never shows.
      v('ocean', 'ocean', 'fill', { paint: { 'fill-color': c.sea, 'fill-antialias': false } }),
      v('water', 'water', 'fill', { filter: ['!=', ['get', 'kind'], 'pool'], paint: { 'fill-color': c.water } }),
      v('water-pool', 'water', 'fill', { minzoom: 15, filter: kind('pool'), paint: { 'fill-color': c.water } }),
      v('waterway', 'waterway', 'line', {
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.water, 'line-width': byKind('river', [[9, 0.8, 0.3], [13, 2.2, 0.8], [17, 8, 2.6]]) },
      }),
      ...(sat ? [{ id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-fade-duration': 150, 'raster-saturation': 0.08, 'raster-contrast': 0.06 } }] : []),
      v('aeroway', 'aeroway', 'line', { filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': c.airport, 'line-width': byKind('runway', [[11, 3, 0.5], [14, 20, 4], [17, 80, 24]]) } }),
      v('pier', 'pier', 'line', { paint: { 'line-color': c.land, 'line-width': zoomWidth([[13, 1], [17, 8]]) } }),
      road('path', kind('footway', 'path', 'pedestrian', 'steps', 'cycleway', 'bridleway'), c.path, zoomWidth([[14, 0.6], [18, 2.6]]), 14.5, { 'line-dasharray': [2, 1.4] }),
      ...ROADS.map((r) => road(`road-${r.id}-casing`, kind(...r.kinds), c[r.casing] as string, casingWidth(r.width), Math.max(r.minzoom, ['motorway', 'trunk'].includes(r.id) ? 8 : 11))),
      ...ROADS.map((r) => road(`road-${r.id}`, kind(...r.kinds), c[r.fill] as string, zoomWidth(r.width), r.minzoom)),
      v('rail', 'rail', 'line', { minzoom: 10, paint: { 'line-color': c.rail, 'line-width': zoomWidth([[10, 0.8], [16, 2.4]]), 'line-dasharray': [3, 2] } }),
      {
        id: 'building',
        type: 'fill',
        source: 'buildings',
        'source-layer': 'buildings',
        minzoom: 14,
        layout: { visibility: sat ? 'none' : 'visible' },
        paint: { 'fill-color': c.building, 'fill-outline-color': c.buildingLine, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.5, 15, 1] },
      },
      // Shown only in the 3D view (the map component toggles visibility).
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'buildings',
        'source-layer': 'buildings',
        minzoom: 14,
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': c.building,
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.2, ['coalesce', ['get', 'h'], 5]],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.4, 15, 0.92],
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'parish-highlight',
        type: 'fill',
        source: 'parishes',
        paint: { 'fill-color': c.landSelected, 'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0] },
      },
      {
        id: 'parish-line',
        type: 'line',
        source: 'parishes',
        maxzoom: 12,
        layout: { 'line-join': 'round' },
        paint: { 'line-color': c.parishLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.7, 11, 1.2], 'line-dasharray': [3, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 1, 12, 0] },
      },
      {
        id: 'parish-line-selected',
        type: 'line',
        source: 'parishes',
        layout: { 'line-join': 'round' },
        paint: { 'line-color': c.parishLineSelected, 'line-width': 2.6, 'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0] },
      },
      v('water-label', 'water_label', 'symbol', {
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT_ITALIC, 'text-size': ['match', ['get', 'kind'], 'bay', 13, 11], 'text-letter-spacing': 0.06, 'text-max-width': 7 },
        paint: { 'text-color': c.waterLabel, 'text-halo-color': c.labelHalo, 'text-halo-width': 1 },
      }),
      v('waterway-label', 'waterway', 'symbol', {
        minzoom: 13,
        filter: ['has', 'name'],
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT_ITALIC, 'text-size': 11.5, 'text-letter-spacing': 0.05 },
        paint: { 'text-color': c.waterLabel, ...halo },
      }),
      v('road-label-minor', 'roads', 'symbol', {
        minzoom: 15,
        filter: ['all', ['has', 'name'], kind('residential', 'unclassified', 'living_street', 'service', 'pedestrian')],
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10.5, 19, 14], 'symbol-spacing': 300, 'text-max-angle': 30 },
        paint: { 'text-color': c.labelMuted, ...halo },
      }),
      v('road-label-major', 'roads', 'symbol', {
        minzoom: 12,
        filter: ['all', ['has', 'name'], kind('motorway', 'trunk', 'primary', 'secondary', 'tertiary')],
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT_SEMI, 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10.5, 18, 14.5], 'symbol-spacing': 360, 'text-max-angle': 30 },
        paint: { 'text-color': c.label, ...halo },
      }),
      v('peak', 'peak', 'symbol', {
        minzoom: 10,
        layout: { 'icon-image': 'ke-peak', 'text-field': ['get', 'name'], 'text-font': FONT_ITALIC, 'text-size': 11.5, 'text-anchor': 'top', 'text-offset': [0, 0.7], 'text-optional': true, 'text-max-width': 7 },
        paint: { 'text-color': c.peak, ...halo },
      }),
      poiLayer('poi-minor', 2, 16),
      poiLayer('poi-major', 1, 13),
      v('place-neighbourhood', 'place', 'symbol', {
        minzoom: 13,
        filter: kind('neighbourhood'),
        layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT_SEMI, 'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 12], 'text-letter-spacing': 0.14, 'text-max-width': 8 },
        paint: { 'text-color': c.neighbourhood, ...halo },
      }),
      v('place-hamlet', 'place', 'symbol', {
        minzoom: 13,
        filter: kind('hamlet'),
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11.5, 'text-max-width': 7 },
        paint: { 'text-color': c.label, ...halo },
      }),
      v('place-village', 'place', 'symbol', {
        minzoom: 11,
        filter: kind('village'),
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT_SEMI, 'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11.5, 15, 14], 'text-max-width': 7 },
        paint: { 'text-color': c.label, ...halo },
      }),
      v('place-town', 'place', 'symbol', {
        minzoom: 8,
        filter: kind('town'),
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT_SEMI, 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 13, 16], 'text-max-width': 7 },
        paint: { 'text-color': c.labelStrong, ...halo },
      }),
      v('place-city', 'place', 'symbol', {
        minzoom: 6,
        filter: kind('city'),
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT_BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 13, 12, 20], 'text-max-width': 7 },
        paint: { 'text-color': c.labelStrong, ...halo },
      }),
      {
        id: 'parish-label',
        type: 'symbol',
        source: 'parishCentres',
        maxzoom: 10.5,
        layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT_BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9.5, 10, 12], 'text-letter-spacing': 0.2 },
        paint: { 'text-color': c.parishLabel, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.2, 'text-opacity': ['interpolate', ['linear'], ['zoom'], 9, 1, 10.5, 0] },
      },
    ],
  }
}
