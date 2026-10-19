import { NextResponse } from 'next/server'
import { nhcFeedUrl, parseCurrentStorms, NHC_ATTRIBUTION } from '@/lib/storm/nhc'
import { kmlFromKmz, conePolygons, trackFeatures, placesInCone } from '@/lib/storm/cone'

/**
 * GET /api/storm/cone?id=al052026 — NHC's forecast cone + track for one active
 * system as GeoJSON, from the KMZ files NHC links in CurrentStorms.json
 * (only nhc.noaa.gov URLs are fetched). Cached 10 minutes. 404 when NHC
 * hasn't issued a cone for it.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.toLowerCase() ?? ''
  if (!/^[a-z]{2}\d{6}$/.test(id)) return NextResponse.json({ error: 'Unknown storm.' }, { status: 400 })
  try {
    const feed = await fetch(nhcFeedUrl(), { next: { revalidate: 600 }, signal: AbortSignal.timeout(10_000) })
    if (!feed.ok) throw new Error(`NHC ${feed.status}`)
    const storm = parseCurrentStorms(await feed.json())?.storms.find((s) => s.id === id)
    if (!storm) return NextResponse.json({ error: 'That system isn’t active.' }, { status: 404 })
    if (!storm.coneKmzUrl) return NextResponse.json({ error: 'NHC hasn’t issued a forecast cone for this system.' }, { status: 404 })
    const get = async (url: string) => {
      const res = await fetch(url.replace('https://www.nhc.noaa.gov', process.env.NHC_BASE_URL || 'https://www.nhc.noaa.gov'), { next: { revalidate: 600 }, signal: AbortSignal.timeout(10_000) })
      if (!res.ok) throw new Error(`NHC KMZ ${res.status}`)
      return kmlFromKmz(new Uint8Array(await res.arrayBuffer()))
    }
    const [coneKml, trackKml] = await Promise.all([get(storm.coneKmzUrl), storm.trackKmzUrl ? get(storm.trackKmzUrl).catch(() => null) : Promise.resolve(null)])
    const rings = coneKml ? conePolygons(coneKml) : []
    if (!rings.length) throw new Error('cone not understood')
    const track = trackKml ? trackFeatures(trackKml) : { line: [], points: [] }
    const features = [
      ...rings.map((r) => ({ type: 'Feature', properties: { kind: 'cone' }, geometry: { type: 'Polygon', coordinates: [r] } })),
      ...(track.line.length > 1 ? [{ type: 'Feature', properties: { kind: 'track' }, geometry: { type: 'LineString', coordinates: track.line } }] : []),
      ...track.points.map((p) => ({ type: 'Feature', properties: { kind: 'point', label: p.label }, geometry: { type: 'Point', coordinates: p.at } })),
      { type: 'Feature', properties: { kind: 'now', label: storm.name }, geometry: { type: 'Point', coordinates: [storm.lng, storm.lat] } },
    ]
    return NextResponse.json(
      { geojson: { type: 'FeatureCollection', features }, placesInCone: placesInCone(rings), advisoryNumber: storm.advisoryNumber, lastUpdate: storm.lastUpdate, attribution: NHC_ATTRIBUTION },
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    )
  } catch (e) {
    console.warn('[storm] cone unavailable:', (e as Error).message)
    return NextResponse.json({ error: 'We couldn’t load NHC’s forecast cone just now — see the NHC graphics link.' }, { status: 503 })
  }
}
