import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { PARISHES, PARISH_IDS, type ParishId } from '@/lib/map/parishes'
import { COVERAGE_STATES } from '@/lib/map/registry'

const schema = z.object({
  parish: z.enum(PARISH_IDS as [ParishId, ...ParishId[]]),
  state: z.enum(COVERAGE_STATES),
  sourcesReviewed: z.array(z.string().trim().min(1).max(120)).max(30),
  notes: z.string().max(2000).nullable().optional(),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  const [rows, counts] = await Promise.all([
    prisma.mapCoverageReview.findMany(),
    prisma.evStation.groupBy({ by: ['parish'], where: { status: 'published' }, _count: true }),
  ])
  const byParish = new Map(rows.map((r) => [r.parish, r]))
  const n = new Map(counts.map((c) => [c.parish, c._count]))
  return NextResponse.json({
    parishes: PARISHES.map((p) => {
      const r = byParish.get(p.id)
      return { parish: p.id, name: p.name, published: n.get(p.id) ?? 0, state: r?.state ?? 'unreviewed', sourcesReviewed: r?.sourcesReviewed ?? [], notes: r?.notes ?? null, reviewedAt: r?.reviewedAt ?? null, reviewedBy: r?.reviewedBy ?? null }
    }),
  })
}

/** PUT — record a parish coverage review. "Reviewed — sites confirmed" requires a published station there. */
export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid review.' }, { status: 400 })
  const d = parsed.data
  if (d.state === 'reviewed_sites_confirmed' && !(await prisma.evStation.count({ where: { parish: d.parish, status: 'published' } }))) {
    return NextResponse.json({ error: 'Publish at least one station in this parish before marking sites confirmed.' }, { status: 409 })
  }
  if ((d.state === 'reviewed_none_confirmed' || d.state === 'reviewed_sites_confirmed') && d.sourcesReviewed.length === 0) {
    return NextResponse.json({ error: 'List the sources you reviewed.' }, { status: 400 })
  }
  const reviewed = d.state.startsWith('reviewed')
  const row = await prisma.mapCoverageReview.upsert({
    where: { parish: d.parish },
    create: { ...d, reviewedAt: reviewed ? new Date() : null, reviewedBy: reviewed ? session.user?.email ?? null : null },
    update: { ...d, reviewedAt: reviewed ? new Date() : null, reviewedBy: reviewed ? session.user?.email ?? null : null },
  })
  logActivity({ label: 'Energy map: coverage review', detail: `${d.parish}: ${d.state}`, entity: 'MapCoverageReview', entityId: d.parish, actorEmail: session.user?.email })
  return NextResponse.json({ review: row })
}
