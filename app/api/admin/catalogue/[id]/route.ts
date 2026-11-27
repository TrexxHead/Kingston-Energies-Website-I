import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { skuReadiness, SPEC_FIELDS, type ProductKind } from '@/lib/catalogue/evidence'
import { toEvidenceRecords } from '@/lib/catalogue/records'

const schema = z.object({
  status: z.enum(['draft', 'in_review', 'published', 'retired']).optional(),
  kind: z.enum(Object.keys(SPEC_FIELDS) as [ProductKind, ...ProductKind[]]).optional(),
  manufacturer: z.string().max(80).nullable().optional(),
  model: z.string().max(80).nullable().optional(),
  regionVariant: z.string().max(80).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

/** PATCH — edit SKU identity or status. Publishing is refused until every critical field is verified and current. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  const sku = await prisma.catalogueSku.findUnique({ where: { id }, include: { evidence: true } })
  if (!sku) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  if (parsed.data.status === 'published') {
    const kind = (parsed.data.kind ?? sku.kind) as ProductKind
    const readiness = skuReadiness(kind, toEvidenceRecords(sku.evidence), new Date())
    if (!readiness.publishable) {
      return NextResponse.json({ error: 'Cannot publish: critical specifications are not verified.', blocking: readiness.blocking }, { status: 409 })
    }
  }
  const updated = await prisma.catalogueSku.update({ where: { id }, data: parsed.data })
  logActivity({ label: 'Catalogue: SKU updated', detail: JSON.stringify(parsed.data), entity: 'CatalogueSku', entityId: id, actorEmail: session.user?.email })
  return NextResponse.json({ sku: updated })
}
