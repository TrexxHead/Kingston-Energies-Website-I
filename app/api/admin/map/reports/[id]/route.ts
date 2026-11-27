import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'

const schema = z.object({ moderation: z.enum(['approved', 'rejected']), note: z.string().max(1000).optional() })

/**
 * PATCH — moderate a report. An approved "successful charge" shows on the
 * station as dated community evidence; it never changes provider status.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid moderation.' }, { status: 400 })
  const report = await prisma.evCommunityReport.update({
    where: { id },
    data: { moderation: parsed.data.moderation, moderatorNote: parsed.data.note ?? null, moderatedBy: session.user?.email ?? null, moderatedAt: new Date() },
  }).catch(() => null)
  if (!report) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  logActivity({ label: `Energy map: report ${parsed.data.moderation}`, detail: report.kind, entity: 'EvCommunityReport', entityId: id, actorEmail: session.user?.email })
  return NextResponse.json({ report })
}
