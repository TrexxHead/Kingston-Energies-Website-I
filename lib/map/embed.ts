import { PARISHES } from './parishes'

/**
 * Google Maps Embed API URL builders (backlog M04 interim). Embed requests are
 * free; the key is a browser key restricted to the Maps Embed API and the
 * site's referrers. The embed shows Google's own map and results inside
 * Google's frame — nothing from it is read, stored or merged into our
 * registry, and it carries no live charger availability.
 */

const BASE = 'https://www.google.com/maps/embed/v1'

/** Strip whitespace and accidental surrounding quotes — a common paste mistake in hosting dashboards. */
export function cleanKey(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/^['"]+|['"]+$/g, '').trim()
}

/** A masked fingerprint (first 6 + last 4 characters, and length) for comparing keys without showing them in full. */
export function keyFingerprint(key: string): string {
  if (!key) return 'none'
  return key.length > 12 ? `${key.slice(0, 6)}…${key.slice(-4)} (${key.length} characters)` : `(${key.length} characters)`
}

export function embedKey(): string {
  return cleanKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY) || cleanKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY)
}

/** Google's own search for charging stations in a parish, or island-wide. */
export function embedSearchUrl(key: string, parishId?: string | null): string {
  const parish = PARISHES.find((p) => p.id === parishId)
  const where = parish ? `${parish.name}, Jamaica` : 'Jamaica'
  const q = `EV charging station in ${where}`
  const params = new URLSearchParams({ key, q, region: 'JM' })
  if (!parish) {
    // Frame the whole island rather than letting Google pick a city.
    params.set('center', '18.11,-77.3')
    params.set('zoom', '9')
  }
  return `${BASE}/search?${params.toString()}`
}

/** One verified location: by Google Place ID when we have the cross-reference, otherwise by coordinates. */
export function embedPlaceUrl(key: string, s: { lat: number; lng: number; googlePlaceId?: string | null }): string {
  const q = s.googlePlaceId ? `place_id:${s.googlePlaceId}` : `${s.lat},${s.lng}`
  return `${BASE}/place?${new URLSearchParams({ key, q, region: 'JM', zoom: '16' }).toString()}`
}
