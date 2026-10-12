import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { sourceInputSchema } from '@/lib/map/registry'

/** POST — record where this station's facts came from and what we may do with them. Starts unverified. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = sourceInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid source.' }, { status: 400 })
  if (!(await prisma.evStation.findUnique({ where: { id }, select: { id: true } }))) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const d = parsed.data
  const source = await prisma.evSourceRecord.create({
    data: { ...d, stationId: id, observedAt: d.observedAt ? new Date(d.observedAt) : null, retrievedAt: new Date(), reviewState: 'unverified' },
  })
  logActivity({ label: 'Energy map: source recorded', detail: d.sourceName, entity: 'EvSourceRecord', entityId: source.id, actorEmail: session.user?.email })
  return NextResponse.json({ source }, { status: 201 })
}
