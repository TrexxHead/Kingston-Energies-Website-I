import type { StatusObservation } from './status'
import { JAMAICA_BOUNDS } from './parishes'

/**
 * Google Places API (New) adapter for user-driven EV charger discovery
 * (backlog M01/M04). Server-only: uses the RESTRICTED server key.
 *
 * Rules this adapter enforces (Google Maps Platform terms, see
 * docs/platform/EXTERNAL_SETUP.md):
 * - Results are processed transiently for the requesting visitor. Only the
 *   place ID may be retained (as a cross-reference in our own registry).
 *   Nothing here writes Places content to the database, logs or caches.
 * - Attribution "Google Maps" accompanies every result shown.
 * - A capped search (max 20 per page, 60 across pages for Text Search) is
 *   never presented as national coverage.
 * - evChargeOptions fields are optional and coverage-dependent; absent
 *   counts stay null. Google does not report "in use", so supportsInUse is
 *   false and zero available is never shown as busy.
 */

export const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'

// Request only what the map needs. evChargeOptions places the request in a
// higher pricing tier — see EXTERNAL_SETUP.md cost notes.
export const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
  'places.evChargeOptions',
  'nextPageToken',
].join(',')

export interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

/** Clamp a requested rectangle to Jamaica; null when it doesn't overlap the island. */
export function clampToJamaica(b: Bounds): Bounds | null {
  const north = Math.min(b.north, JAMAICA_BOUNDS.north)
  const south = Math.max(b.south, JAMAICA_BOUNDS.south)
  const east = Math.min(b.east, JAMAICA_BOUNDS.east)
  const west = Math.max(b.west, JAMAICA_BOUNDS.west)
  if (north <= south || east <= west) return null
  return { north, south, east, west }
}

export interface GoogleConnectorAggregation {
  type?: string
  maxChargeRateKw?: number
  count?: number
  availableCount?: number
  outOfServiceCount?: number
  availabilityLastUpdateTime?: string
}

interface GooglePlace {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  googleMapsUri?: string
  evChargeOptions?: { connectorCount?: number; connectorAggregation?: GoogleConnectorAggregation[] }
}

export interface DiscoveredConnectorGroup {
  connectorType: string
  rawType: string | null
  maxChargeRateKw: number | null
  count: number | null
  observation: StatusObservation
}

export interface DiscoveredPlace {
  placeId: string
  name: string
  address: string | null
  lat: number
  lng: number
  googleMapsUri: string | null
  connectorCount: number | null
  connectorGroups: DiscoveredConnectorGroup[]
  attribution: 'Google Maps'
  transient: true
}

const CONNECTOR_LABEL: Record<string, string> = {
  EV_CONNECTOR_TYPE_J1772: 'J1772 (Type 1)',
  EV_CONNECTOR_TYPE_TYPE_2: 'Type 2',
  EV_CONNECTOR_TYPE_CHADEMO: 'CHAdeMO',
  EV_CONNECTOR_TYPE_CCS_COMBO_1: 'CCS1',
  EV_CONNECTOR_TYPE_CCS_COMBO_2: 'CCS2',
  EV_CONNECTOR_TYPE_TESLA: 'Tesla',
  EV_CONNECTOR_TYPE_NACS: 'NACS',
  EV_CONNECTOR_TYPE_UNSPECIFIED_GB_T: 'GB/T',
  EV_CONNECTOR_TYPE_UNSPECIFIED_WALL_OUTLET: 'Wall outlet',
  EV_CONNECTOR_TYPE_OTHER: 'Other',
}

export function connectorLabel(raw: string | undefined): string {
  if (!raw) return 'Unknown connector'
  return CONNECTOR_LABEL[raw] ?? raw.replace(/^EV_CONNECTOR_TYPE_/, '').replace(/_/g, ' ')
}

const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function normalizePlaces(payload: unknown, retrievedAt: string): DiscoveredPlace[] {
  const places = (payload as { places?: GooglePlace[] } | null)?.places
  if (!Array.isArray(places)) return []
  const out: DiscoveredPlace[] = []
  for (const p of places) {
    const lat = numOrNull(p.location?.latitude)
    const lng = numOrNull(p.location?.longitude)
    if (!p.id || lat == null || lng == null) continue
    const groups = (p.evChargeOptions?.connectorAggregation ?? []).map((a) => ({
      connectorType: connectorLabel(a.type),
      rawType: a.type ?? null,
      maxChargeRateKw: numOrNull(a.maxChargeRateKw),
      count: numOrNull(a.count),
      observation: {
        source: 'google_places' as const,
        observedAt: typeof a.availabilityLastUpdateTime === 'string' ? a.availabilityLastUpdateTime : null,
        retrievedAt,
        availableCount: numOrNull(a.availableCount),
        outOfServiceCount: numOrNull(a.outOfServiceCount),
        inUseCount: null,
        supportsInUse: false,
      },
    }))
    out.push({
      placeId: p.id,
      name: p.displayName?.text ?? 'EV charging location',
      address: p.formattedAddress ?? null,
      lat,
      lng,
      googleMapsUri: p.googleMapsUri ?? null,
      connectorCount: numOrNull(p.evChargeOptions?.connectorCount),
      connectorGroups: groups,
      attribution: 'Google Maps',
      transient: true,
    })
  }
  return out
}

export function googleServerKeyConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_SERVER_KEY)
}

export interface TextSearchArgs {
  bounds: Bounds
  query?: string
  pageToken?: string
  signal?: AbortSignal
}

export type TextSearchResult =
  | { ok: true; places: DiscoveredPlace[]; nextPageToken: string | null }
  | { ok: false; status: number; message: string }

/** One bounded Text Search page. Caller enforces rate limits and never persists the content. */
export async function textSearchEvChargers(args: TextSearchArgs, fetchImpl: typeof fetch = fetch): Promise<TextSearchResult> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!key) return { ok: false, status: 503, message: 'Google discovery is not configured.' }
  const rect = clampToJamaica(args.bounds)
  if (!rect) return { ok: false, status: 400, message: 'That area is outside Jamaica.' }
  const body = {
    textQuery: args.query?.trim() ? `${args.query.trim()} EV charging station` : 'EV charging station',
    includedType: 'electric_vehicle_charging_station',
    pageSize: 20,
    locationRestriction: { rectangle: { low: { latitude: rect.south, longitude: rect.west }, high: { latitude: rect.north, longitude: rect.east } } },
    ...(args.pageToken ? { pageToken: args.pageToken } : {}),
  }
  let res: Response
  try {
    res = await fetchImpl(PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': PLACES_FIELD_MASK },
      body: JSON.stringify(body),
      signal: args.signal,
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 502, message: 'Google discovery could not be reached.' }
  }
  if (!res.ok) return { ok: false, status: res.status === 429 ? 429 : 502, message: res.status === 429 ? 'Google discovery is busy — try again shortly.' : 'Google discovery returned an error.' }
  const json = await res.json().catch(() => null)
  return { ok: true, places: normalizePlaces(json, new Date().toISOString()), nextPageToken: (json as { nextPageToken?: string } | null)?.nextPageToken ?? null }
}
