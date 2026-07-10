import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
})

export async function POST(request: Request) {
  // 5 sign-up attempts per IP per 10 minutes — blunts credential-stuffing / spam accounts.
  const rl = rateLimit(`signup:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const body = await request.json()
  const parsed = signupSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid signup details' }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const hashed = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: 'USER',
    },
  })

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
}
