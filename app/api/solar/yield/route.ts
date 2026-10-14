import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { pvgisUrl, parsePvgis, PVGIS_ATTRIBUTION } from '@/lib/solar/pvgis'
import { JAMAICA_BOUNDS } from '@/lib/map/parishes'

const q = z.object({
  lat: z.coerce.number().min(JAMAICA_BOUNDS.south - 0.1).max(JAMAICA_BOUNDS.north + 0.1),
  lng: z.coerce.number().min(JAMAICA_BOUNDS.west - 0.1).max(JAMAICA_BOUNDS.east + 0.1),
  tilt: z.coerce.number().min(0).max(60),
  aspect: z.coerce.number().min(-180).max(180),
  loss: z.coerce.number().min(0).max(40).default(14),
})

/**
 * GET /api/solar/yield?lat&lng&tilt&aspect[&loss] — PVGIS specific yield
 * for 1 kWp. Rounded to ~1 km so nearby roofs share a cached answer.
 * If PVGIS can't be reached the caller gets 503 and must say so.
 */
export async function GET(request: Request) {
  const rl = await rateLimit(`solar-yield:${clientIp(request)}`, 30, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests — try again shortly.' }, { status: 429 })
  const parsed = q.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Choose a roof in Jamaica.' }, { status: 400 })
  const p = parsed.data
  const query = { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100, tiltDeg: Math.round(p.tilt), aspectDeg: Math.round(p.aspect / 5) * 5, lossPct: Math.round(p.loss) }
  try {
    const res = await fetch(pvgisUrl(query), { next: { revalidate: 60 * 60 * 24 * 30 }, signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`PVGIS ${res.status}`)
    const y = parsePvgis(await res.json(), query)
    if (!y) throw new Error('PVGIS response not understood')
    return NextResponse.json({ yield: y, attribution: PVGIS_ATTRIBUTION, query }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
  } catch (e) {
    console.warn('[solar] PVGIS unavailable:', (e as Error).message)
    return NextResponse.json({ error: 'Solar data (PVGIS) is unavailable right now, so we can’t estimate output. Please try again later.' }, { status: 503 })
  }
}
