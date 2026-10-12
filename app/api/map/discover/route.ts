import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { textSearchEvChargers, googleServerKeyConfigured } from '@/lib/map/googlePlaces'
import { deriveGroupStatus } from '@/lib/map/status'

const schema = z.object({
  bounds: z.object({ north: z.number(), south: z.number(), east: z.number(), west: z.number() }),
  query: z.string().max(80).optional(),
  pageToken: z.string().max(2000).optional(),
})

// Per-visitor and whole-site ceilings so this can never become an open,
// billable proxy. Billing alerts in Google Cloud are NOT a spending cap.
const PER_IP = { max: 10, windowMs: 60_000 }
const GLOBAL_PER_DAY = Number(process.env.MAP_DISCOVER_DAILY_CAP ?? 500)

/**
 * POST /api/map/discover — one bounded, user-initiated Google Places search
 * for the visible area ("Search this area"). Results are transient: not
 * stored, not cached, attributed to Google Maps, and labelled as a capped
 * search rather than national coverage.
 */
export async function POST(request: Request) {
  if (!googleServerKeyConfigured()) {
    return NextResponse.json({ error: 'Google discovery is not configured yet.', configured: false }, { status: 503 })
  }
  const origin = request.headers.get('origin')
  const site = process.env.NEXT_PUBLIC_SITE_URL
  if (origin && site && new URL(site).origin !== origin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const ip = await rateLimit(`map-discover:${clientIp(request)}`, PER_IP.max, PER_IP.windowMs)
  if (!ip.ok) return NextResponse.json({ error: 'Please wait a moment before searching again.' }, { status: 429, headers: { 'Retry-After': String(ip.retryAfter) } })
  const global = await rateLimit('map-discover:global', GLOBAL_PER_DAY, 86_400_000)
  if (!global.ok) return NextResponse.json({ error: 'Live discovery has reached today’s limit. Verified locations are still shown.' }, { status: 429 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'That search could not be read.' }, { status: 400 })

  const r = await textSearchEvChargers(parsed.data)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: r.status })
  const now = new Date()
  return NextResponse.json(
    {
      places: r.places.map((p) => ({
        ...p,
        connectorGroups: p.connectorGroups.map((g) => ({ ...g, status: deriveGroupStatus(g.count ?? 0, [g.observation], [], now) })),
      })),
      nextPageToken: r.nextPageToken,
      attribution: 'Google Maps',
      limitNote: 'Results from one capped search of this area (up to 20 per page). It does not prove there are no other chargers nearby.',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
