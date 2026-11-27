import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { MAP_DATA } from './mapData'
import { haversineKm } from '@/lib/storm/nhc'
import type { SearchIndex } from './search'

/**
 * Places within walking distance of a charger (food, shops, banks…) from
 * the self-hosted Jamaica search index (OpenStreetMap / Overture) — the
 * "what can I do while I charge?" list on station pages.
 */

export const NEARBY_KINDS = ['food', 'shop', 'bank', 'stay', 'attraction', 'park', 'health'] as const
export interface NearbyPlace {
  name: string
  kind: (typeof NEARBY_KINDS)[number]
  category: string | null
  metres: number
}

let cache: Promise<SearchIndex> | null = null
function loadIndex(): Promise<SearchIndex> {
  // MAP_DATA.search is a public URL path (/maps/data/…); read the same file from disk.
  cache ??= readFile(path.join(process.cwd(), 'public', MAP_DATA.search), 'utf8').then((t) => JSON.parse(t) as SearchIndex)
  cache.catch(() => (cache = null))
  return cache
}

export function nearbyFrom(index: SearchIndex, at: { lat: number; lng: number }, radiusM = 600, limit = 10): NearbyPlace[] {
  const out: NearbyPlace[] = []
  const kinds = new Set<string>(NEARBY_KINDS)
  for (const [name, kind, lng, lat, , category] of index.rows) {
    if (!kind.startsWith('poi:')) continue
    const k = kind.slice(4)
    if (!kinds.has(k)) continue
    // Cheap box test before the great-circle distance (≈0.006° ≈ 650 m).
    if (Math.abs(lat - at.lat) > 0.007 || Math.abs(lng - at.lng) > 0.007) continue
    const metres = Math.round(haversineKm(at, { lat, lng }) * 1000)
    if (metres <= radiusM) out.push({ name, kind: k as NearbyPlace['kind'], category: category ?? null, metres })
  }
  out.sort((a, b) => a.metres - b.metres)
  // One entry per name (chains and duplicates in the source data).
  const seen = new Set<string>()
  return out.filter((p) => !seen.has(p.name.toLowerCase()) && seen.add(p.name.toLowerCase())).slice(0, limit)
}

export async function nearbyPlaces(at: { lat: number; lng: number }): Promise<NearbyPlace[] | null> {
  try {
    return nearbyFrom(await loadIndex(), at)
  } catch (e) {
    console.warn('[map] nearby places unavailable:', (e as Error).message)
    return null
  }
}
