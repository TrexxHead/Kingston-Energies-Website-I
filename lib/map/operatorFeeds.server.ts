import { z } from 'zod'
import { parseOcpiLocations, type OcpiLocation } from './ocpi'

/**
 * Live operator status (roadmap L3). Configured per operator once an
 * agreement exists — OCPI_FEEDS is a JSON array in the environment:
 *   [{"operator":"Evergo","url":"https://…/ocpi/2.2.1/locations","token":"…"}]
 * `operator` must match the operator name on our stations, and each station
 * needs its operator location id (Admin → station → "Operator location id").
 *
 * Status is fetched live and cached ~60 s — not stored — so nothing is kept
 * beyond what an agreement allows. A failing feed yields no observations,
 * and the map falls back to what we know (usually "Status unknown").
 */

const feedSchema = z.array(z.object({ operator: z.string().min(1), url: z.string().url(), token: z.string().min(1) }))
export type OperatorFeed = z.infer<typeof feedSchema>[number]

export function configuredFeeds(): OperatorFeed[] {
  try {
    const parsed = feedSchema.safeParse(JSON.parse(process.env.OCPI_FEEDS ?? '[]'))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

/** OCPI 2.2+: "Authorization: Token <base64(token)>". */
const authHeader = (token: string) => `Token ${Buffer.from(token).toString('base64')}`

function nextLink(link: string | null): string | null {
  const m = link?.match(/<([^>]+)>\s*;\s*rel="?next"?/)
  return m ? m[1] : null
}

async function fetchFeed(feed: OperatorFeed): Promise<Map<string, OcpiLocation>> {
  const out = new Map<string, OcpiLocation>()
  let url: string | null = feed.url
  for (let page = 0; url && page < 10; page++) {
    const res: Response = await fetch(url, { headers: { Authorization: authHeader(feed.token), Accept: 'application/json' }, next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`${feed.operator} OCPI ${res.status}`)
    const json = await res.json()
    if (json?.status_code != null && json.status_code !== 1000) throw new Error(`${feed.operator} OCPI status ${json.status_code}`)
    for (const loc of parseOcpiLocations(json) ?? []) out.set(loc.id, loc)
    url = nextLink(res.headers.get('link'))
  }
  return out
}

/** operator name (lower case) → location id → location. Failed feeds are logged and left out. */
export async function liveOperatorLocations(): Promise<{ locations: Map<string, Map<string, OcpiLocation>>; retrievedAt: string }> {
  const feeds = configuredFeeds()
  const locations = new Map<string, Map<string, OcpiLocation>>()
  const retrievedAt = new Date().toISOString()
  await Promise.all(
    feeds.map(async (f) => {
      try {
        locations.set(f.operator.trim().toLowerCase(), await fetchFeed(f))
      } catch (e) {
        console.warn('[map] operator feed unavailable:', (e as Error).message)
      }
    }),
  )
  return { locations, retrievedAt }
}
