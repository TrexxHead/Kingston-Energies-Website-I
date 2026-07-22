import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const schema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  newPassword: z.string().min(8).max(72),
})

const resetIdentifier = (email: string) => `reset:${email}`

export async function POST(request: Request) {
  const rl = rateLimit(`reset:${clientIp(request)}`, 10, 15 * 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
  }

  const { token, email, newPassword } = parsed.data
  const identifier = resetIdentifier(email)

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  })

  if (!record || record.expires < new Date()) {
    if (record) {
      await prisma.verificationToken.delete({ where: { identifier_token: { identifier, token } } })
    }
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { email },
    data: { password: await hashPassword(newPassword) },
  })
  await prisma.verificationToken.delete({ where: { identifier_token: { identifier, token } } })

  return NextResponse.json({ ok: true })
}
