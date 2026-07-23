import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, uploadAdminFile } from '@/lib/storage'

const KINDS = ['INVOICE', 'QUOTE', 'PRICE_LIST', 'CONTRACT', 'LINK', 'OTHER'] as const
const MAX_BYTES = 20 * 1024 * 1024

const linkSchema = z.object({
  label: z.string().min(1).max(160),
  url: z.string().url().max(2000),
  kind: z.enum(KINDS).optional(),
  supplierId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
})

// Every attachment must hang off a supplier or a purchase order.
function requireTarget(supplierId?: string | null, purchaseOrderId?: string | null) {
  return Boolean(supplierId || purchaseOrderId)
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const contentType = request.headers.get('content-type') ?? ''

  // ---- File upload ----
  if (contentType.includes('multipart/form-data')) {
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: 'File storage is not set up yet. Attach a link instead, or configure Supabase Storage.' },
        { status: 503 },
      )
    }
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    const label = String(form?.get('label') ?? '').trim()
    const kindRaw = String(form?.get('kind') ?? 'OTHER')
    const kind = (KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as (typeof KINDS)[number]) : 'OTHER'
    const supplierId = String(form?.get('supplierId') ?? '') || null
    const purchaseOrderId = String(form?.get('purchaseOrderId') ?? '') || null

    if (!requireTarget(supplierId, purchaseOrderId)) {
      return NextResponse.json({ error: 'Attach the file to a supplier or purchase order.' }, { status: 400 })
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'That file is over the 20 MB limit.' }, { status: 400 })
    }

    const path = buildPath('procurement', file.name)
    try {
      await uploadAdminFile(path, await file.arrayBuffer(), file.type || 'application/octet-stream')
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 500 })
    }

    const created = await prisma.procurementFile.create({
      data: {
        label: label || file.name,
        kind,
        storagePath: path,
        fileName: file.name,
        supplierId,
        purchaseOrderId,
      },
    })
    return NextResponse.json({ id: created.id }, { status: 201 })
  }

  // ---- Link ----
  const parsed = linkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Provide a label and a valid URL.' }, { status: 400 })
  const d = parsed.data
  if (!requireTarget(d.supplierId, d.purchaseOrderId)) {
    return NextResponse.json({ error: 'Attach the link to a supplier or purchase order.' }, { status: 400 })
  }
  const created = await prisma.procurementFile.create({
    data: {
      label: d.label,
      kind: d.kind ?? 'LINK',
      url: d.url,
      supplierId: d.supplierId ?? null,
      purchaseOrderId: d.purchaseOrderId ?? null,
    },
  })
  return NextResponse.json({ id: created.id }, { status: 201 })
}
