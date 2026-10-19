import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { statusCheckSchema, checkObservation, checkTimeProblem } from '@/lib/map/registry'

/**
 * POST — record a Kingston Energies status check for one or more connector
 * groups (working / out of service / unknown). Shown publicly as
 * "Confirmed … by Kingston Energies <when>" until it goes stale
 * (7 days for working, 30 for out of service — lib/map/status.ts).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = statusCheckSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid status check.' }, { status: 400 })
  const now = new Date()
  const observedAt = parsed.data.observedAt ? new Date(parsed.data.observedAt) : now
  const problem = checkTimeProblem(observedAt, now)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const station = await prisma.evStation.findUnique({ where: { id }, include: { connectorGroups: { select: { id: true, connectorType: true, count: true } } } })
  if (!station) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const groups = new Map(station.connectorGroups.map((g) => [g.id, g]))
  if (parsed.data.checks.some((c) => !groups.has(c.groupId))) return NextResponse.json({ error: 'That connector group is not part of this station.' }, { status: 400 })

  await prisma.evStatusObservation.createMany({
    data: parsed.data.checks.map((c) => ({
      connectorGroupId: c.groupId,
      source: 'staff_check',
      observedAt,
      retrievedAt: now,
      supportsInUse: false,
      inUseCount: null,
      ...checkObservation(c.state, groups.get(c.groupId)!.count),
    })),
  })
  const summary = parsed.data.checks.map((c) => `${groups.get(c.groupId)!.connectorType}: ${c.state.replace(/_/g, ' ')}`).join(', ')
  logActivity({
    label: 'Energy map: status checked',
    detail: `${station.name} — ${summary} (${parsed.data.method.replace(/_/g, ' ')}${parsed.data.note ? `: ${parsed.data.note}` : ''})`,
    entity: 'EvStation',
    entityId: station.id,
    actorEmail: session.user?.email,
  })
  return NextResponse.json({ ok: true, observedAt: observedAt.toISOString() }, { status: 201 })
}
