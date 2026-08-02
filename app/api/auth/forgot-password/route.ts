import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { sendPasswordResetEmail } from '@/lib/email'

const RESET_TTL_MS = 60 * 60 * 1000 // 1 hour
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const schema = z.object({ email: z.string().email() })

// Reset tokens live in VerificationToken with a "reset:" identifier prefix so
// they never collide with email-verification tokens.
const resetIdentifier = (email: string) => `reset:${email}`

export async function POST(request: Request) {
  // 5 requests per IP per 15 minutes — limits reset-email spam / enumeration.
  const rl = await rateLimit(`forgot:${clientIp(request)}`, 5, 15 * 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const { email } = parsed.data

  // Also cap per email, not just per IP — an attacker spread across many IPs
  // could otherwise still flood one person's inbox even though each
  // individual IP stays under its own limit. Same "always return ok" shape
  // as an unregistered email below, so this can't be used to enumerate
  // accounts either.
  const emailRl = await rateLimit(`forgot-email:${email.toLowerCase()}`, 3, 60 * 60_000)
  if (!emailRl.ok) {
    return NextResponse.json({ ok: true })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Only send if the account exists and has a password (not a Google-only account),
  // but always return success so we never reveal whether an email is registered.
  if (user && user.password) {
    const identifier = resetIdentifier(email)
    // Clear any previous reset tokens for this address.
    await prisma.verificationToken.deleteMany({ where: { identifier } })

    const token = randomBytes(32).toString('hex')
    await prisma.verificationToken.create({
      data: { identifier, token, expires: new Date(Date.now() + RESET_TTL_MS) },
    })

    const resetUrl = `${siteUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    await sendPasswordResetEmail({ to: email, name: user.name ?? 'there', resetUrl })
  }

  return NextResponse.json({ ok: true })
}
