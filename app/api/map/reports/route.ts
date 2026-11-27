import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { isParishId, JAMAICA_BOUNDS } from '@/lib/map/parishes'

const schema = z
  .object({
    stationId: z.string().max(40).optional(),
    kind: z.enum(['could_not_find', 'access_blocked', 'connector_missing', 'equipment_fault', 'successful_charge', 'new_station']),
    observedAt: z.string().datetime(),
    message: z.string().trim().max(1000).optional(),
    proposedName: z.string().trim().max(120).optional(),
    proposedLat: z.number().min(JAMAICA_BOUNDS.south).max(JAMAICA_BOUNDS.north).optional(),
    proposedLng: z.number().min(JAMAICA_BOUNDS.west).max(JAMAICA_BOUNDS.east).optional(),
    parish: z.string().max(40).optional(),
    contactEmail: z.string().email().max(200).optional(),
  })
  .refine((d) => d.kind === 'new_station' || d.stationId, { message: 'stationId is required for reports about an existing station' })
  .refine((d) => d.kind !== 'new_station' || d.proposedName, { message: 'A name is required for a missing station' })

/**
 * POST /api/map/reports — a driver's observation or a missing station. Stored
 * as pending; nothing changes on the map until a moderator reviews it, and
 * an approved report is shown as community evidence, never as live status.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(`map-report:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many reports — try again later.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'That report could not be read.' }, { status: 400 })
  const d = parsed.data
  if (Date.parse(d.observedAt) > Date.now() + 5 * 60_000) return NextResponse.json({ error: 'The observation date is in the future.' }, { status: 400 })
  if (d.parish && !isParishId(d.parish)) return NextResponse.json({ error: 'Unknown parish.' }, { status: 400 })
  if (d.stationId) {
    const exists = await prisma.evStation.findFirst({ where: { id: d.stationId, status: { in: ['published', 'closed'] } }, select: { id: true } })
    if (!exists) return NextResponse.json({ error: 'Station not found.' }, { status: 404 })
  }
  const session = await getServerSession(authOptions)
  const report = await prisma.evCommunityReport.create({
    data: { ...d, observedAt: new Date(d.observedAt), userId: session?.user?.id ?? null },
    select: { id: true, moderation: true },
  })
  return NextResponse.json({ report, message: 'Thanks — a moderator will review this before anything on the map changes.' }, { status: 201 })
}
