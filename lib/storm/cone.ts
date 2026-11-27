import { unzipSync, strFromU8 } from 'fflate'

/**
 * NHC forecast cone and track from the KMZ files linked in CurrentStorms.json
 * (`trackCone.kmzFile`, `forecastTrack.kmzFile`). A KMZ is a zip holding one
 * KML document; we read the polygon(s) of the cone and the line and points of
 * the forecast track. The cone shows where the CENTRE is likely to go — NHC
 * is explicit that impacts reach well outside it.
 */

export type LngLat = [number, number]

export function kmlFromKmz(buf: Uint8Array): string | null {
  try {
    const files = unzipSync(buf)
    const name = Object.keys(files).find((n) => n.toLowerCase().endsWith('.kml'))
    return name ? strFromU8(files[name]) : null
  } catch {
    return null
  }
}

const coords = (text: string): LngLat[] =>
  text
    .trim()
    .split(/\s+/)
    .map((t) => t.split(',').map(Number))
    .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)
    .map((p) => [p[0], p[1]] as LngLat)

/** Outer rings of every polygon in the KML. */
export function conePolygons(kml: string): LngLat[][] {
  const out: LngLat[][] = []
  for (const m of kml.matchAll(/<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/gi)) {
    const ring = coords(m[1])
    if (ring.length >= 4) out.push(ring)
  }
  return out
}

/** The track line and labelled forecast points. */
export function trackFeatures(kml: string): { line: LngLat[]; points: { at: LngLat; label: string }[] } {
  let line: LngLat[] = []
  for (const m of kml.matchAll(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/gi)) {
    const c = coords(m[1])
    if (c.length > line.length) line = c
  }
  const points: { at: LngLat; label: string }[] = []
  for (const m of kml.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/gi)) {
    const pm = m[1]
    const pt = pm.match(/<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i)
    if (!pt) continue
    const at = coords(pt[1])[0]
    if (!at) continue
    const name = (pm.match(/<name>([\s\S]*?)<\/name>/i)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim()
    points.push({ at, label: name.slice(0, 60) })
  }
  return { line, points: points.slice(0, 20) }
}

/** Ray-casting point-in-polygon on lng/lat. */
export function inside(p: LngLat, ring: LngLat[]): boolean {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** Places on the island used to say whether NHC's cone covers part of Jamaica. */
export const JAMAICA_PLACES: { name: string; at: LngLat }[] = [
  { name: 'Kingston', at: [-76.79, 18.0] },
  { name: 'Montego Bay', at: [-77.92, 18.47] },
  { name: 'Negril', at: [-78.35, 18.27] },
  { name: 'Mandeville', at: [-77.5, 18.04] },
  { name: 'Ocho Rios', at: [-77.1, 18.41] },
  { name: 'Port Antonio', at: [-76.45, 18.18] },
  { name: 'Morant Bay', at: [-76.41, 17.88] },
  { name: 'Black River', at: [-77.85, 18.03] },
]

export const placesInCone = (rings: LngLat[][]) => JAMAICA_PLACES.filter((p) => rings.some((r) => inside(p.at, r))).map((p) => p.name)
