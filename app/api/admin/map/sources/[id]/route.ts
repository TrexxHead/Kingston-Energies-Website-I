import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { sourceVerifiable } from '@/lib/map/registry'

const schema = z.object({ reviewState: z.enum(['verified', 'rejected']), expiresAt: z.string().datetime().nullable().optional() })

/** PATCH — verify or reject a source. Verification needs checkable evidence and records who verified it. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid review.' }, { status: 400 })
  const src = await prisma.evSourceRecord.findUnique({ where: { id } })
  if (!src) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (parsed.data.reviewState === 'verified') {
    const why = sourceVerifiable(src)
    if (why) return NextResponse.json({ error: why }, { status: 409 })
  }
  const updated = await prisma.evSourceRecord.update({
    where: { id },
    data: {
      reviewState: parsed.data.reviewState,
      verifiedAt: parsed.data.reviewState === 'verified' ? new Date() : null,
      expiresAt: parsed.data.expiresAt !== undefined ? (parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null) : src.expiresAt,
      notes: [src.notes, `${parsed.data.reviewState} by ${session.user?.email ?? 'admin'} ${new Date().toISOString().slice(0, 10)}`].filter(Boolean).join('\n'),
    },
  })
  // Unpublish automatically if the last verified source is rejected.
  if (parsed.data.reviewState === 'rejected') {
    const remaining = await prisma.evSourceRecord.count({ where: { stationId: src.stationId, reviewState: 'verified' } })
    if (!remaining) await prisma.evStation.updateMany({ where: { id: src.stationId, status: 'published' }, data: { status: 'draft' } })
  }
  logActivity({ label: `Energy map: source ${parsed.data.reviewState}`, detail: src.sourceName, entity: 'EvSourceRecord', entityId: id, actorEmail: session.user?.email })
  return NextResponse.json({ source: updated })
}
