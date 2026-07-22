import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const npsSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(1000).optional(),
  source: z.enum(['ORDER', 'SUPPORT']),
  orderNo: z.string().max(40).optional(),
})

export async function POST(request: Request) {
  // 5 submissions per IP per minute — one per survey, blocks spam.
  const rl = rateLimit(`nps:${clientIp(request)}`, 5, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const parsed = npsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid survey response' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? null
  const { score, comment, source, orderNo } = parsed.data

  try {
    await prisma.npsResponse.create({
      data: { userId, score, comment: comment ?? null, source, orderNo: orderNo ?? null },
    })
  } catch {
    // Never block the customer's flow on a survey write failing.
    return NextResponse.json({ ok: false }, { status: 202 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
