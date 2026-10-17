import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { resolveAll, skuReadiness, SPEC_FIELDS, type ProductKind } from '@/lib/catalogue/evidence'
import { toEvidenceRecords } from '@/lib/catalogue/records'
import { storefrontItems, LISTING_NOTE } from '@/lib/catalogue/storefrontSync'

function loadSkus() {
  return prisma.catalogueSku.findMany({ include: { evidence: { orderBy: { createdAt: 'asc' } } }, orderBy: { displayName: 'asc' } })
}

/** GET /api/admin/catalogue — every SKU with resolved fields and publication readiness. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  const now = new Date()
  const skus = await loadSkus()
  return NextResponse.json({
    skus: skus.map((s) => {
      const kind = s.kind as ProductKind
      const records = toEvidenceRecords(s.evidence)
      return { ...s, fields: SPEC_FIELDS[kind] ?? [], resolved: resolveAll(kind, records, now), readiness: skuReadiness(kind, records, now) }
    }),
  })
}

/** POST /api/admin/catalogue { action: 'sync_storefront' } — create SKU stubs for storefront items that don't have one. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const body = await request.json().catch(() => null)
  if (body?.action !== 'sync_storefront') return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })

  let created = 0
  for (const item of storefrontItems()) {
    const existing = await prisma.catalogueSku.findUnique({ where: { catalogId: item.product.id }, select: { id: true } })
    if (existing) continue
    await prisma.catalogueSku.create({
      data: {
        catalogId: item.product.id,
        kind: item.kind,
        displayName: item.product.name,
        status: 'draft',
        notes: 'Created from the storefront listing. Exact manufacturer model and regional variant must be confirmed.',
        evidence: {
          create: item.claims.map((c) => ({
            field: c.field,
            valueNum: c.valueNum ?? null,
            valueText: c.valueText ?? null,
            unit: c.unit ?? null,
            sourceType: 'listing_claim',
            sourceNote: LISTING_NOTE,
            reviewState: 'unverified',
            createdBy: session.user?.email ?? null,
          })),
        },
      },
    })
    created++
  }
  logActivity({ label: 'Catalogue: synced storefront SKUs', detail: `${created} created`, entity: 'CatalogueSku', actorEmail: session.user?.email })
  return NextResponse.json({ created })
}
