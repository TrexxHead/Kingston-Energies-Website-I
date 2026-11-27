import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'

const schema = z.object({
  reviewState: z.enum(['verified', 'rejected', 'superseded']),
  expiresAt: z.string().datetime().nullable().optional(),
  note: z.string().max(1000).optional(),
})

/**
 * PATCH — review a piece of evidence. Verification requires a document
 * (URL or stored file), is refused for listing claims, and is refused for
 * the person who recorded it (two-person check).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid review.' }, { status: 400 })
  const ev = await prisma.specEvidence.findUnique({ where: { id } })
  if (!ev) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const actor = session.user?.email ?? null

  if (parsed.data.reviewState === 'verified') {
    if (ev.sourceType === 'listing_claim') return NextResponse.json({ error: 'A listing claim cannot be verified. Record the manufacturer document or a test record instead.' }, { status: 409 })
    if (!ev.sourceUrl && !ev.documentPath) return NextResponse.json({ error: 'Attach a source document before verifying.' }, { status: 409 })
    if (actor && ev.createdBy === actor) return NextResponse.json({ error: 'Evidence must be verified by someone other than the person who recorded it.' }, { status: 409 })
  }
  const updated = await prisma.specEvidence.update({
    where: { id },
    data: {
      reviewState: parsed.data.reviewState,
      verifiedBy: parsed.data.reviewState === 'verified' ? actor : ev.verifiedBy,
      verifiedAt: parsed.data.reviewState === 'verified' ? new Date() : ev.verifiedAt,
      expiresAt: parsed.data.expiresAt !== undefined ? (parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null) : ev.expiresAt,
      sourceNote: parsed.data.note ? [ev.sourceNote, `Review: ${parsed.data.note}`].filter(Boolean).join('\n') : ev.sourceNote,
    },
  })
  logActivity({ label: `Catalogue: evidence ${parsed.data.reviewState}`, detail: ev.field, entity: 'SpecEvidence', entityId: id, actorEmail: actor })
  return NextResponse.json({ evidence: updated })
}
