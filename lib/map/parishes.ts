/**
 * Jamaica's 14 parishes, with an approximate centre for map framing only
 * (never used as a station location). Coverage review is tracked per parish
 * so "searched, none confirmed" is distinguishable from "not yet reviewed".
 */
export const PARISHES = [
  { id: 'kingston', name: 'Kingston', center: { lat: 17.9714, lng: -76.7931 } },
  { id: 'st-andrew', name: 'St. Andrew', center: { lat: 18.0747, lng: -76.7951 } },
  { id: 'st-thomas', name: 'St. Thomas', center: { lat: 17.9564, lng: -76.4013 } },
  { id: 'portland', name: 'Portland', center: { lat: 18.1325, lng: -76.5393 } },
  { id: 'st-mary', name: 'St. Mary', center: { lat: 18.3086, lng: -76.9114 } },
  { id: 'st-ann', name: 'St. Ann', center: { lat: 18.3509, lng: -77.2697 } },
  { id: 'trelawny', name: 'Trelawny', center: { lat: 18.3524, lng: -77.6078 } },
  { id: 'st-james', name: 'St. James', center: { lat: 18.4125, lng: -77.8823 } },
  { id: 'hanover', name: 'Hanover', center: { lat: 18.4097, lng: -78.1336 } },
  { id: 'westmoreland', name: 'Westmoreland', center: { lat: 18.2944, lng: -78.1564 } },
  { id: 'st-elizabeth', name: 'St. Elizabeth', center: { lat: 18.0496, lng: -77.7322 } },
  { id: 'manchester', name: 'Manchester', center: { lat: 18.0429, lng: -77.5072 } },
  { id: 'clarendon', name: 'Clarendon', center: { lat: 17.9557, lng: -77.2406 } },
  { id: 'st-catherine', name: 'St. Catherine', center: { lat: 18.0364, lng: -77.0564 } },
] as const

export type ParishId = (typeof PARISHES)[number]['id']

export const PARISH_IDS = PARISHES.map((p) => p.id) as ParishId[]

/** Island-wide framing for the initial map view. */
export const JAMAICA_BOUNDS = { north: 18.53, south: 17.7, west: -78.4, east: -76.18 }
export const JAMAICA_CENTER = { lat: 18.11, lng: -77.3 }

export type CoverageState = 'unreviewed' | 'in_progress' | 'reviewed_none_confirmed' | 'reviewed_sites_confirmed'

export const COVERAGE_LABEL: Record<CoverageState, string> = {
  unreviewed: 'Not yet reviewed',
  in_progress: 'Review in progress',
  reviewed_none_confirmed: 'Reviewed — no confirmed sites',
  reviewed_sites_confirmed: 'Reviewed — sites confirmed',
}

export function isParishId(v: string): v is ParishId {
  return (PARISH_IDS as string[]).includes(v)
}

/** [west, south, east, north] of a GeoJSON Polygon / MultiPolygon — used to frame a parish. */
export function geometryBounds(geometry: { type: string; coordinates: unknown }): [number, number, number, number] | null {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
  const walk = (c: unknown): void => {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1])
      return
    }
    c.forEach(walk)
  }
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return null
  walk(geometry.coordinates)
  return Number.isFinite(w) ? [w, s, e, n] : null
}
