import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, uploadAdminFile } from '@/lib/storage'
import { compressImageToLimit, isCompressibleImage, MAX_UPLOAD_BYTES } from '@/lib/imageCompress'
import { ocrStatus, tryExtract, LOW_CONFIDENCE, type Extraction } from '@/lib/ocr'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

/** Captured documents, newest first, with the extraction situation. */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const status = new URL(request.url).searchParams.get('status')

  const documents = await prisma.documentScan.findMany({
    where: status && status !== 'ALL' ? { status: status as 'NEEDS_REVIEW' } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { expense: { select: { id: true, category: true, amount: true } } },
  })

  return NextResponse.json({
    ocr: ocrStatus(),
    storageConfigured: isStorageConfigured(),
    lowConfidence: LOW_CONFIDENCE,
    documents: documents.map((doc) => ({
      id: doc.id,
      kind: doc.kind,
      filename: doc.filename,
      contentType: doc.contentType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      provider: doc.provider,
      confidence: doc.confidence,
      vendor: doc.vendor,
      documentDate: doc.documentDate?.toISOString() ?? null,
      total: doc.total,
      taxAmount: doc.taxAmount,
      currency: doc.currency,
      category: doc.category,
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
      confirmedAt: doc.confirmedAt?.toISOString() ?? null,
      expense: doc.expense,
    })),
  })
}

/** Flatten an extraction into the columns, keeping confidence alongside. */
function draftFrom(extraction: Extraction) {
  const confidence: Record<string, number> = {}
  const set = <T>(key: string, field?: { value: T; confidence: number }) => {
    if (!field) return undefined
    confidence[key] = field.confidence
    return field.value
  }
  return {
    vendor: set('vendor', extraction.vendor) ?? null,
    documentDate: set('documentDate', extraction.documentDate) ?? null,
    total: set('total', extraction.total) ?? null,
    taxAmount: set('taxAmount', extraction.taxAmount) ?? null,
    currency: set('currency', extraction.currency) ?? 'JMD',
    confidence,
  }
}

/**
 * Capture a document.
 *
 * The file is stored and a draft record created. If an OCR provider is
 * configured its reading pre-fills the fields; if not, they stay empty. Either
 * way the record lands as NEEDS_REVIEW — nothing becomes an expense until a
 * person confirms what the document says.
 */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'File storage is not set up, so documents cannot be kept. Add the Supabase storage keys first.' },
      { status: 503 },
    )
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const kind = String(form?.get('kind') ?? 'RECEIPT')

  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Upload a JPEG, PNG, WEBP, GIF or PDF.' }, { status: 400 })
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer())
  let contentType = file.type

  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    if (!isCompressibleImage(contentType)) {
      return NextResponse.json({ error: 'That PDF is over 5MB — compress it or photograph the receipt instead.' }, { status: 400 })
    }
    const compressed = await compressImageToLimit(bytes, contentType).catch(() => null)
    if (!compressed || compressed.buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'That image is over 5MB and could not be compressed enough — try a smaller photo.' }, { status: 400 })
    }
    bytes = compressed.buffer
    contentType = compressed.contentType
  }

  const path = buildPath('finance/documents', file.name)
  await uploadAdminFile(path, bytes, contentType)

  const extracted = await tryExtract({ bytes, contentType, filename: file.name })
  const draft = extracted ? draftFrom(extracted.extraction) : null

  const doc = await prisma.documentScan.create({
    data: {
      kind: kind === 'BILL' || kind === 'STATEMENT' || kind === 'OTHER' ? kind : 'RECEIPT',
      storagePath: path,
      filename: file.name,
      contentType,
      sizeBytes: bytes.byteLength,
      uploadedBy: session.user?.email ?? null,
      provider: extracted?.provider ?? null,
      raw: extracted ? (extracted.extraction.raw as object) : undefined,
      confidence: draft ? draft.confidence : undefined,
      vendor: draft?.vendor ?? null,
      documentDate: draft?.documentDate ?? null,
      total: draft?.total ?? null,
      taxAmount: draft?.taxAmount ?? null,
      currency: draft?.currency ?? 'JMD',
    },
  })

  return NextResponse.json({ id: doc.id, extracted: Boolean(extracted) }, { status: 201 })
}
