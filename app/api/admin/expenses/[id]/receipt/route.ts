import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, uploadAdminFile } from '@/lib/storage'
import { compressImageToLimit, isCompressibleImage, MAX_UPLOAD_BYTES } from '@/lib/imageCompress'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

/**
 * Attach a receipt/invoice to an expense that was already logged without
 * one — the counterpart to attaching one at log time. Since the expense's
 * figures are already trusted (typed in or previously confirmed), the
 * document is stored straight as CONFIRMED evidence, same as an in-the-
 * moment attachment.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params

  const expense = await prisma.expense.findUnique({ where: { id }, include: { document: { select: { id: true } } } })
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  if (expense.document) return NextResponse.json({ error: 'This expense already has a receipt attached.' }, { status: 409 })

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: 'File storage is not set up. Add the Supabase storage keys first.' }, { status: 503 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Choose a file to attach.' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Upload a JPEG, PNG, WEBP, GIF or PDF.' }, { status: 400 })

  let bytes: Buffer = Buffer.from(await file.arrayBuffer())
  let contentType = file.type
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    if (!isCompressibleImage(contentType)) return NextResponse.json({ error: 'That file is over 5MB. Compress it first.' }, { status: 400 })
    const compressed = await compressImageToLimit(bytes, contentType).catch(() => null)
    if (!compressed || compressed.buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'That image is over 5MB and could not be compressed enough.' }, { status: 400 })
    }
    bytes = compressed.buffer
    contentType = compressed.contentType
  }

  const path = buildPath('finance/documents', file.name)
  await uploadAdminFile(path, bytes, contentType)

  const doc = await prisma.documentScan.create({
    data: {
      kind: 'RECEIPT',
      storagePath: path,
      filename: file.name,
      contentType,
      sizeBytes: bytes.byteLength,
      uploadedBy: session.user?.email ?? null,
      vendor: expense.description || null,
      documentDate: expense.spentAt,
      total: expense.amount,
      currency: 'JMD',
      category: expense.category,
      status: 'CONFIRMED',
      expenseId: expense.id,
      confirmedAt: new Date(),
      confirmedBy: session.user?.email ?? null,
    },
  })

  return NextResponse.json({ ok: true, documentId: doc.id }, { status: 201 })
}
