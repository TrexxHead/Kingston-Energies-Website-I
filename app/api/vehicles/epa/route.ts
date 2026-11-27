import { NextResponse } from 'next/server'
import { EPA_BASE, parseEpaMenu, parseEpaVehicle } from '@/lib/vehicles/lookup'
import { rateLimit, clientIp } from '@/lib/rateLimit'

/**
 * GET /api/vehicles/epa — US EPA fuel economy data, step by step:
 *   ?step=years | ?step=makes&year= | ?step=models&year=&make= | ?step=options&year=&make=&model= | ?id=
 * Cached for a day. 503 with a plain message when the EPA can't be reached.
 */
export async function GET(request: Request) {
  const rl = await rateLimit(`vehicles-epa:${clientIp(request)}`, 120, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests — try again shortly.' }, { status: 429 })
  const q = new URL(request.url).searchParams
  const base = EPA_BASE()
  const get = async (path: string) => {
    const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' }, next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(String(res.status))
    return res.json()
  }
  const enc = encodeURIComponent
  try {
    const id = q.get('id')
    if (id) {
      if (!/^\d{1,7}$/.test(id)) return NextResponse.json({ error: 'Bad id.' }, { status: 400 })
      const vehicle = parseEpaVehicle(await get(`/vehicle/${id}`))
      return vehicle ? NextResponse.json({ vehicle }) : NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }
    const step = q.get('step')
    const year = q.get('year') ?? ''
    if (step !== 'years' && !/^\d{4}$/.test(year)) return NextResponse.json({ error: 'Pick a year.' }, { status: 400 })
    const path =
      step === 'years'
        ? '/vehicle/menu/year'
        : step === 'makes'
          ? `/vehicle/menu/make?year=${year}`
          : step === 'models'
            ? `/vehicle/menu/model?year=${year}&make=${enc(q.get('make') ?? '')}`
            : step === 'options'
              ? `/vehicle/menu/options?year=${year}&make=${enc(q.get('make') ?? '')}&model=${enc(q.get('model') ?? '')}`
              : null
    if (!path) return NextResponse.json({ error: 'Unknown step.' }, { status: 400 })
    let items = parseEpaMenu(await get(path))
    // EVs and hybrids from 2011 on — older years have almost none.
    if (step === 'years') items = items.filter((i) => Number(i.value) >= 2011)
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: 'The US EPA vehicle database isn’t answering right now. You can enter your car’s details yourself.' }, { status: 503 })
  }
}
