import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { NOTIFICATION_PREF_DEFS, resolveNotificationPrefs } from '@/lib/notificationPrefs'

/** Hub → Settings notification toggles — the signed-in customer's own, merged with defaults. */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ prefs: resolveNotificationPrefs(null) })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notificationPrefs: true } })
  return NextResponse.json({ prefs: resolveNotificationPrefs(user?.notificationPrefs ?? null) })
}

const KNOWN_KEYS = NOTIFICATION_PREF_DEFS.map((d) => d.key) as [string, ...string[]]
const patchSchema = z.object({ key: z.enum(KNOWN_KEYS), on: z.boolean() })

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preference' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notificationPrefs: true } })
  const overrides = user?.notificationPrefs && typeof user.notificationPrefs === 'object' ? (user.notificationPrefs as Record<string, boolean>) : {}
  const next = { ...overrides, [parsed.data.key]: parsed.data.on }

  await prisma.user.update({ where: { id: session.user.id }, data: { notificationPrefs: next } })

  return NextResponse.json({ prefs: resolveNotificationPrefs(next) })
}
