import { NextResponse } from 'next/server'
import { nhcFeedUrl, parseCurrentStorms, NHC_ATTRIBUTION } from '@/lib/storm/nhc'

/**
 * GET /api/storm/active — Atlantic systems from the NHC public feed, cached
 * 10 minutes server-side. If NHC can't be reached the caller gets 503 and
 * must say so (and point to the official sources) — "no storms" is only
 * ever shown when NHC itself says the list is empty.
 */
export async function GET() {
  try {
    const res = await fetch(nhcFeedUrl(), { next: { revalidate: 600 }, signal: AbortSignal.timeout(10_000), headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`NHC ${res.status}`)
    const parsed = parseCurrentStorms(await res.json())
    if (!parsed) throw new Error('NHC response not understood')
    const storms = parsed.storms.filter((s) => s.basin === 'atlantic')
    // When NHC actually served this (the response may come from our 10-minute cache).
    const served = Date.parse(res.headers.get('date') ?? '')
    const checkedAt = new Date(Number.isNaN(served) ? Date.now() : served).toISOString()
    return NextResponse.json(
      { storms, dropped: parsed.dropped, checkedAt, attribution: NHC_ATTRIBUTION },
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    )
  } catch (e) {
    console.warn('[storm] NHC unavailable:', (e as Error).message)
    return NextResponse.json({ error: 'We couldn’t reach the National Hurricane Center just now.' }, { status: 503 })
  }
}
