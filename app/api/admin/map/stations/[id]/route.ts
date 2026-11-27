import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { stationInputSchema, publishBlockers, STATION_STATUS } from '@/lib/map/registry'
import { STATION_INCLUDE, stationData, groupRows } from '@/lib/map/adminStore.server'

const patchSchema = z.object({ station: stationInputSchema.optional(), status: z.enum(STATION_STATUS).optional() })

/** PATCH — edit details/connectors and/or change status. Publishing is refused while blockers remain. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid update.' }, { status: 400 })
  const existing = await prisma.evStation.findUnique({ where: { id }, include: { sources: true, connectorGroups: true } })
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const { station, status } = parsed.data
  if (status === 'published') {
    const blockers = publishBlockers({
      parish: station?.parish ?? existing.parish,
      lat: station?.lat ?? existing.lat,
      lng: station?.lng ?? existing.lng,
      connectorGroups: station ? station.connectorGroups : existing.connectorGroups,
      sources: existing.sources,
    })
    if (blockers.length) return NextResponse.json({ error: 'Cannot publish yet.', blockers }, { status: 409 })
  }
  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (station) {
        // Status history lives in EvStatusObservation per group; replacing groups drops it, so only replace when they changed.
        const changed = JSON.stringify(existing.connectorGroups.map((g) => [g.connectorType, g.currentType, g.maxPowerKw, g.count, g.portsShared, g.notes])) !==
          JSON.stringify(groupRows(station).map((g) => [g.connectorType, g.currentType, g.maxPowerKw, g.count, g.portsShared, g.notes]))
        if (changed) {
          await tx.evConnectorGroup.deleteMany({ where: { stationId: id } })
          await tx.evConnectorGroup.createMany({ data: groupRows(station).map((g) => ({ ...g, stationId: id })) })
        }
      }
      return tx.evStation.update({
        where: { id },
        data: {
          ...(station ? await stationData(station) : {}),
          ...(status ? { status, ...(status === 'published' ? { verifiedAt: new Date() } : {}) } : {}),
        },
        include: STATION_INCLUDE,
      })
    })
    logActivity({ label: `Energy map: station ${status ?? 'edited'}`, detail: updated.name, entity: 'EvStation', entityId: id, actorEmail: session.user?.email })
    return NextResponse.json({ station: { ...updated, blockers: publishBlockers(updated) } })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Another station already uses that Google Place ID.' }, { status: 409 })
    throw e
  }
}

/** DELETE — only drafts can be deleted; published or closed stations are retired to keep history. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const s = await prisma.evStation.findUnique({ where: { id }, select: { status: true, name: true } })
  if (!s) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (s.status !== 'draft') return NextResponse.json({ error: 'Only drafts can be deleted. Mark it closed or retired instead.' }, { status: 409 })
  await prisma.evStation.delete({ where: { id } })
  logActivity({ label: 'Energy map: draft deleted', detail: s.name, entity: 'EvStation', entityId: id, actorEmail: session.user?.email })
  return NextResponse.json({ deleted: true })
}
