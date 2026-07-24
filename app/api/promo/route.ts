import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validatePromo } from '@/lib/promo'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const schema = z.object({ code: z.string().min(1).max(40), subtotal: z.number().min(0) })

/** Public: validate a promo code against a cart subtotal. */
export async function POST(request: Request) {
  const rl = rateLimit(`promo:${clientIp(request)}`, 20, 60_000)
  if (!rl.ok) return NextResponse.json({ valid: false, message: 'Too many attempts — wait a moment.' }, { status: 429 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ valid: false, message: 'Enter a code.' }, { status: 400 })

  const result = await validatePromo(parsed.data.code, parsed.data.subtotal)
  return NextResponse.json(result)
}
