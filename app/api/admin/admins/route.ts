import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, guardSuperAdmin } from '@/lib/requireAdmin'
import { hashPassword } from '@/lib/password'

/** Engagement status thresholds. */
const ACTIVE_MS = 5 * 60 * 1000 // seen in last 5 min → active
const DORMANT_MS = 24 * 60 * 60 * 1000 // seen in last 24h → dormant, else offline

function statusFor(lastActiveAt: Date | null): 'active' | 'dormant' | 'offline' {
  if (!lastActiveAt) return 'offline'
  const age = Date.now() - new Date(lastActiveAt).getTime()
  if (age <= ACTIVE_MS) return 'active'
  if (age <= DORMANT_MS) return 'dormant'
  return 'offline'
}

/** List users with admin privileges + their live engagement status. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    orderBy: [{ role: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, email: true, role: true, lastActiveAt: true, createdAt: true },
  })

  return NextResponse.json({
    admins: admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      status: statusFor(a.lastActiveAt),
      lastActive: a.lastActiveAt
        ? new Date(a.lastActiveAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'never',
    })),
  })
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
})

/** Create a new admin account directly — only a SUPER_ADMIN may do this. */
export async function POST(request: Request) {
  const denied = await guardSuperAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid admin details' }, { status: 400 })
  const { name, email, password, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      role,
      // Admin-created accounts skip the email-verification loop — they need
      // to be able to log in immediately.
      emailVerified: new Date(),
    },
  })

  return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 })
}
