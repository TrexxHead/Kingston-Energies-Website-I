import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'

/**
 * Records that the current admin is active right now. The dashboard pings this
 * on load and periodically, so the Settings tab can show who's online.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { lastActiveAt: new Date() } })
  } catch {
    // ignore — heartbeat is best-effort
  }
  return NextResponse.json({ ok: true })
}
