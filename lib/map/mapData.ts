/**
 * Self-hosted Jamaica map data (public/maps/data), built by scripts/map-data.
 * File names carry the data version so browsers never mix old and new tiles;
 * bump them when the data is rebuilt.
 *
 * Sources: Overture Maps Foundation release 2026-09-23.1 (transportation,
 * base, divisions, buildings — derived from OpenStreetMap, ODbL; places —
 * CDLA-Permissive-2.0) and AWS Terrain Tiles (Mapzen) for elevation.
 */
export const MAP_DATA = {
  base: '/maps/data/jamaica-base-2026-09-r2.pmtiles',
  buildings: '/maps/data/jamaica-buildings-2026-09.pmtiles',
  terrain: '/maps/data/jamaica-terrain-v1.pmtiles',
  search: '/maps/data/jamaica-search-2026-09-r2.json',
  glyphs: '/maps/fonts/{fontstack}/{range}.pbf',
  parishes: '/maps/jamaica-parishes.geojson',
  /** Sentinel-2 cloud-free mosaic, dry seasons Dec 2023–Apr 2025, z8–13 (scripts/map-data/6_satellite.py). */
  satellite: '/maps/data/jamaica-satellite-2025-r1.pmtiles' as string | null,
} as const

export const DATA_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, <a href="https://overturemaps.org" target="_blank" rel="noopener">Overture Maps Foundation</a>'
export const TERRAIN_ATTRIBUTION = '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Terrain: Mapzen &amp; sources</a>'
export const SATELLITE_ATTRIBUTION = 'Contains modified <a href="https://sentinels.copernicus.eu" target="_blank" rel="noopener">Copernicus Sentinel</a> data'
