import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const schema = z.object({ email: z.string().email() })

export async function POST(request: Request) {
  const rl = rateLimit(`resend-verification:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return the same generic response — don't leak whether an account exists.
  const genericResponse = NextResponse.json({ ok: true })

  if (!user || user.emailVerified) {
    return genericResponse
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: email } })

  const token = randomBytes(32).toString('hex')
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + VERIFICATION_TTL_MS) },
  })

  const verifyUrl = `${siteUrl}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`
  await sendVerificationEmail({ to: email, name: user.name ?? email, verifyUrl })

  return genericResponse
}
