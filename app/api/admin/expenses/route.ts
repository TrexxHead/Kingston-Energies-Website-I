import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { postExpense } from '@/lib/ledger/post'
import { buildPath, isStorageConfigured, uploadAdminFile } from '@/lib/storage'
import { compressImageToLimit, isCompressibleImage, MAX_UPLOAD_BYTES } from '@/lib/imageCompress'

const schema = z.object({
  category: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  amount: z.number().positive(),
  spentAt: z.string().optional(), // ISO date; defaults to now
})

const ALLOWED_RECEIPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

/**
 * Log an expense, optionally with a receipt attached in the same step.
 *
 * Accepts either JSON (no receipt) or multipart form data (receipt file
 * alongside the same fields) so the quick "log expense" flow can carry its own
 * evidence without a separate trip to Receipts & bills. A receipt attached
 * here is evidence for a figure a person just typed in themselves, so it's
 * stored straight in CONFIRMED status — unlike a scanned document, there's
 * nothing here for OCR to extract or a reviewer to double-check.
 */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const contentType = request.headers.get('content-type') ?? ''
  const isMultipart = contentType.includes('multipart/form-data')

  let fields: z.infer<typeof schema>
  let file: File | null = null

  if (isMultipart) {
    const form = await request.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'Enter a category and a positive amount.' }, { status: 400 })
    const amountRaw = form.get('amount')
    const parsed = schema.safeParse({
      category: form.get('category'),
      description: form.get('description') || undefined,
      amount: amountRaw ? Number(amountRaw) : undefined,
      spentAt: form.get('spentAt') || undefined,
    })
    if (!parsed.success) return NextResponse.json({ error: 'Enter a category and a positive amount.' }, { status: 400 })
    fields = parsed.data
    const receipt = form.get('receipt')
    if (receipt instanceof File && receipt.size > 0) file = receipt
  } else {
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Enter a category and a positive amount.' }, { status: 400 })
    fields = parsed.data
  }

  if (file && !ALLOWED_RECEIPT_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Receipts must be a JPEG, PNG, WEBP, GIF or PDF.' }, { status: 400 })
  }
  if (file && !isStorageConfigured()) {
    return NextResponse.json({ error: 'File storage is not set up, so the receipt cannot be kept. Add the Supabase storage keys first, or save the expense without it.' }, { status: 503 })
  }

  const { category, description, amount, spentAt } = fields
  const expense = await prisma.expense.create({
    data: {
      category,
      description: description || null,
      amount,
      spentAt: spentAt ? new Date(spentAt) : new Date(),
    },
  })

  if (file) {
    try {
      let bytes: Buffer = Buffer.from(await file.arrayBuffer())
      let fileContentType = file.type
      if (bytes.byteLength > MAX_UPLOAD_BYTES) {
        if (!isCompressibleImage(fileContentType)) throw new Error('file too large')
        const compressed = await compressImageToLimit(bytes, fileContentType)
        bytes = compressed.buffer
        fileContentType = compressed.contentType
      }
      const path = buildPath('finance/documents', file.name)
      await uploadAdminFile(path, bytes, fileContentType)
      const session = await requireAdmin()
      await prisma.documentScan.create({
        data: {
          kind: 'RECEIPT',
          storagePath: path,
          filename: file.name,
          contentType: fileContentType,
          sizeBytes: bytes.byteLength,
          uploadedBy: session.user?.email ?? null,
          vendor: description || null,
          documentDate: expense.spentAt,
          total: amount,
          currency: 'JMD',
          category,
          status: 'CONFIRMED',
          expenseId: expense.id,
          confirmedAt: new Date(),
          confirmedBy: session.user?.email ?? null,
        },
      })
    } catch (err) {
      // The expense itself is the record of truth; losing the receipt image
      // must never lose the expense entry that was already saved.
      console.error('[expenses] receipt upload failed:', err)
    }
  }

  // Journal it to the ledger. Best-effort: a posting failure must never lose
  // the expense record itself — the backfill will pick it up later.
  void postExpense(expense).catch((err) => console.error('[ledger] expense posting failed:', err))
  return NextResponse.json({ id: expense.id }, { status: 201 })
}
