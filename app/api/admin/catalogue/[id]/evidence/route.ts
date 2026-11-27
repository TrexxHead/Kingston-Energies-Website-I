import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { SPEC_FIELDS, type ProductKind } from '@/lib/catalogue/evidence'

const schema = z
  .object({
    field: z.string().max(60),
    valueNum: z.number().finite().nullable().optional(),
    valueText: z.string().max(500).nullable().optional(),
    unit: z.string().max(20).nullable().optional(),
    sourceType: z.enum(['manufacturer_doc', 'test_record', 'label_photo', 'supplier_doc', 'listing_claim']),
    sourceUrl: z.string().url().max(1000).nullable().optional(),
    documentPath: z.string().max(500).nullable().optional(),
    sourceNote: z.string().max(2000).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  })
  .refine((d) => d.valueNum != null || (d.valueText ?? '').trim() !== '', { message: 'A value is required.' })

/** POST — record a new piece of evidence for one field. Always starts unverified; a second person verifies via PATCH. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid evidence.' }, { status: 400 })
  const sku = await prisma.catalogueSku.findUnique({ where: { id }, select: { kind: true } })
  if (!sku) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (!(SPEC_FIELDS[sku.kind as ProductKind] ?? []).some((f) => f.key === parsed.data.field)) {
    return NextResponse.json({ error: `"${parsed.data.field}" is not a field for ${sku.kind}.` }, { status: 400 })
  }
  const d = parsed.data
  const ev = await prisma.specEvidence.create({
    data: { ...d, skuId: id, expiresAt: d.expiresAt ? new Date(d.expiresAt) : null, reviewState: 'unverified', createdBy: session.user?.email ?? null },
  })
  logActivity({ label: 'Catalogue: evidence recorded', detail: `${d.field} (${d.sourceType})`, entity: 'SpecEvidence', entityId: ev.id, actorEmail: session.user?.email })
  return NextResponse.json({ evidence: ev }, { status: 201 })
}
