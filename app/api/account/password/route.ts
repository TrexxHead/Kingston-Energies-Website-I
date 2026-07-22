import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const schema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8).max(72),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 5 attempts per IP per 5 minutes — blunts brute-forcing the current password.
  const rl = rateLimit(`pwchange:${clientIp(request)}`, 5, 5 * 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Accounts created via Google have no password set.
  if (!user.password) {
    return NextResponse.json(
      { error: 'This account signs in with Google, so it has no password to change.' },
      { status: 400 }
    )
  }

  const ok = await verifyPassword(parsed.data.currentPassword, user.password)
  if (!ok) {
    return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(parsed.data.newPassword) },
  })

  return NextResponse.json({ ok: true })
}
