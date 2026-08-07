import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { unsuppress } from '@/lib/suppression'

const schema = z.object({ email: z.string().email().max(160) })

/** The footer's "Get updated" box. */
export async function POST(request: Request) {
  const rl = await rateLimit(`newsletter:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()

  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email },
    update: {},
  })
  // Signing up again after a prior unsubscribe is a deliberate opt back in.
  await unsuppress(email)

  return NextResponse.json({ ok: true })
}
