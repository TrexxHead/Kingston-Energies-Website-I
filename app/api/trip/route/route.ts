import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { routingConfigured, osrmUrl, parseOsrm, routePoints } from '@/lib/map/routing'
import { loadPublicStations } from '@/lib/map/publicStations.server'
import { JAMAICA_BOUNDS } from '@/lib/map/parishes'

const pt = z.object({ lat: z.number().min(JAMAICA_BOUNDS.south - 0.1).max(JAMAICA_BOUNDS.north + 0.1), lng: z.number().min(JAMAICA_BOUNDS.west - 0.1).max(JAMAICA_BOUNDS.east + 0.1) })
const schema = z.object({ from: pt, to: pt })

/**
 * POST /api/trip/route — road route between two points in Jamaica plus the
 * published chargers within reach of it. 503 when routing isn't set up.
 */
export async function POST(request: Request) {
  if (!routingConfigured()) return NextResponse.json({ error: 'Route planning isn’t switched on yet.' }, { status: 503 })
  const rl = await rateLimit(`trip:${clientIp(request)}`, 20, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many routes — try again shortly.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Choose two places in Jamaica.' }, { status: 400 })
  try {
    const res = await fetch(osrmUrl(parsed.data.from, parsed.data.to), { signal: AbortSignal.timeout(10_000), next: { revalidate: 3600 } })
    const route = parseOsrm(await res.json().catch(() => null))
    if (!route) return NextResponse.json({ error: 'No road route was found between those places.' }, { status: 422 })
    // Chargers we'd send someone to: published, not closed, open to the public (or not yet confirmed).
    const stations = (await loadPublicStations({ status: 'published', access: { in: ['public', 'unknown'] } })).filter((s) => !s.closed)
    const points = routePoints(route, stations)
    const near = new Set(points.map((p) => p.charger?.id).filter(Boolean))
    return NextResponse.json({
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      coordinates: route.coordinates,
      points,
      chargers: stations.filter((s) => near.has(s.id)).map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, statusSummary: s.statusSummary, connectors: s.connectorGroups.map((g) => g.connectorType) })),
    })
  } catch (e) {
    console.warn('[trip] routing unavailable:', (e as Error).message)
    return NextResponse.json({ error: 'Route planning is unavailable right now.' }, { status: 503 })
  }
}
