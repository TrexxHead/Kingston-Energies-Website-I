import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { stationInputSchema, publishBlockers } from '@/lib/map/registry'
import { STATION_INCLUDE, stationData, groupRows } from '@/lib/map/adminStore.server'

/** GET — every registry station (all statuses) with its publish blockers. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  const stations = await prisma.evStation.findMany({ include: STATION_INCLUDE, orderBy: [{ status: 'asc' }, { name: 'asc' }] })
  const now = new Date()
  return NextResponse.json({ stations: stations.map((s) => ({ ...s, blockers: publishBlockers(s, now) })) })
}

/** POST — create a draft station. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const parsed = stationInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid station.', path: parsed.error.issues[0]?.path }, { status: 400 })
  try {
    const station = await prisma.evStation.create({
      data: { ...(await stationData(parsed.data)), status: 'draft', connectorGroups: { create: groupRows(parsed.data) } },
      include: STATION_INCLUDE,
    })
    logActivity({ label: 'Energy map: station drafted', detail: station.name, entity: 'EvStation', entityId: station.id, actorEmail: session.user?.email })
    return NextResponse.json({ station }, { status: 201 })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Another station already uses that Google Place ID.' }, { status: 409 })
    throw e
  }
}
