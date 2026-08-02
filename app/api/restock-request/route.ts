import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getShopProducts } from '@/lib/products'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const schema = z.object({
  productId: z.string().min(1).max(60),
  email: z.string().email().max(160),
})

/** Public: join the back-in-stock waitlist for a sold-out product. */
export async function POST(request: Request) {
  const rl = await rateLimit(`restock:${clientIp(request)}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a moment.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })

  const { productId, email } = parsed.data
  const products = await getShopProducts()
  if (!products.some((p) => p.id === productId)) {
    return NextResponse.json({ error: 'Unknown product.' }, { status: 400 })
  }

  await prisma.restockRequest.upsert({
    where: { productId_email: { productId, email } },
    update: {},
    create: { productId, email },
  })

  return NextResponse.json({ ok: true })
}
