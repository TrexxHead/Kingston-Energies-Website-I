import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

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
