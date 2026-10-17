import { z } from 'zod'
import { parseOcpiLocations, parseOcpiTariffs, type OcpiLocation, type OcpiChargingPrice } from './ocpi'

/**
 * Live operator status (roadmap L3). Configured per operator once an
 * agreement exists — OCPI_FEEDS is a JSON array in the environment:
 *   [{"operator":"Evergo","url":"https://…/ocpi/2.2.1/locations","token":"…",
 *     "tariffsUrl":"https://…/ocpi/2.2.1/tariffs"}]
 * `operator` must match the operator name on our stations, and each station
 * needs its operator location id (Admin → station → "Operator location id").
 *
 * Status is fetched live and cached ~60 s — not stored — so nothing is kept
 * beyond what an agreement allows. A failing feed yields no observations,
 * and the map falls back to what we know (usually "Status unknown").
 * With `tariffsUrl`, the operator's live JMD tariffs (cached ~1 h) are shown
 * as the station's price, ahead of any price we entered by hand.
 */

const feedSchema = z.array(z.object({ operator: z.string().min(1), url: z.string().url(), token: z.string().min(1), tariffsUrl: z.string().url().optional() }))
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

/** Every page of an OCPI list endpoint (follows `Link: rel=next`, at most 10 pages). */
async function fetchPages(feed: OperatorFeed, first: string, revalidate: number, onPage: (json: unknown) => void): Promise<void> {
  let url: string | null = first
  for (let page = 0; url && page < 10; page++) {
    const res: Response = await fetch(url, { headers: { Authorization: authHeader(feed.token), Accept: 'application/json' }, next: { revalidate }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`${feed.operator} OCPI ${res.status}`)
    const json = await res.json()
    if (json?.status_code != null && json.status_code !== 1000) throw new Error(`${feed.operator} OCPI status ${json.status_code}`)
    onPage(json)
    url = nextLink(res.headers.get('link'))
  }
}

async function fetchFeed(feed: OperatorFeed): Promise<Map<string, OcpiLocation>> {
  const out = new Map<string, OcpiLocation>()
  await fetchPages(feed, feed.url, 60, (json) => {
    for (const loc of parseOcpiLocations(json) ?? []) out.set(loc.id, loc)
  })
  return out
}

async function fetchTariffs(feed: OperatorFeed): Promise<Map<string, OcpiChargingPrice>> {
  const out = new Map<string, OcpiChargingPrice>()
  if (!feed.tariffsUrl) return out
  await fetchPages(feed, feed.tariffsUrl, 3600, (json) => {
    for (const [id, t] of parseOcpiTariffs(json, feed.operator)) out.set(id, t)
  })
  return out
}

/**
 * operator name (lower case) → location id → location, and → tariff id →
 * price. Failed feeds are logged and left out; a failing tariff feed never
 * hides live status.
 */
export async function liveOperatorLocations(): Promise<{ locations: Map<string, Map<string, OcpiLocation>>; tariffs: Map<string, Map<string, OcpiChargingPrice>>; retrievedAt: string }> {
  const feeds = configuredFeeds()
  const locations = new Map<string, Map<string, OcpiLocation>>()
  const tariffs = new Map<string, Map<string, OcpiChargingPrice>>()
  const retrievedAt = new Date().toISOString()
  await Promise.all(
    feeds.map(async (f) => {
      const key = f.operator.trim().toLowerCase()
      const [locs, tars] = await Promise.allSettled([fetchFeed(f), fetchTariffs(f)])
      if (locs.status === 'fulfilled') locations.set(key, locs.value)
      else console.warn('[map] operator feed unavailable:', (locs.reason as Error).message)
      if (tars.status === 'fulfilled') tariffs.set(key, tars.value)
      else console.warn('[map] operator tariffs unavailable:', (tars.reason as Error).message)
    }),
  )
  return { locations, tariffs, retrievedAt }
}
