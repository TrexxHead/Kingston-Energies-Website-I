import { NextResponse } from 'next/server'
import { VPIC_BASE, parseVpic } from '@/lib/vehicles/lookup'
import { rateLimit, clientIp } from '@/lib/rateLimit'

/** GET /api/vehicles/vin/:vin — decode a 17-character VIN with NHTSA vPIC. The VIN isn't stored or logged here. */
export async function GET(request: Request, { params }: { params: Promise<{ vin: string }> }) {
  const rl = await rateLimit(`vehicles-vin:${clientIp(request)}`, 20, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests — try again shortly.' }, { status: 429 })
  const vin = (await params).vin.toUpperCase()
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return NextResponse.json({ error: 'A VIN has 17 letters and numbers (no I, O or Q). Japanese-market imports often have a shorter chassis number instead — enter the details yourself.' }, { status: 400 })
  try {
    const res = await fetch(`${VPIC_BASE()}/vehicles/DecodeVinValues/${vin}?format=json`, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(String(res.status))
    const decoded = parseVpic(await res.json())
    if (!decoded) return NextResponse.json({ error: 'That VIN couldn’t be decoded — it may be a non-US vehicle. Enter the details yourself.' }, { status: 404 })
    return NextResponse.json({ vehicle: decoded })
  } catch {
    return NextResponse.json({ error: 'The VIN decoder isn’t answering right now. You can enter your car’s details yourself.' }, { status: 503 })
  }
}
