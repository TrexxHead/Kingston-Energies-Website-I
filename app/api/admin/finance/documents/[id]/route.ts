import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { deleteAdminFile, signedUrl } from '@/lib/storage'
import { postExpense } from '@/lib/ledger/post'

/** One document, with a short-lived link to the file itself. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const doc = await prisma.documentScan.findUnique({
    where: { id },
    include: { expense: { select: { id: true, category: true, amount: true, spentAt: true } } },
  })
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  return NextResponse.json({
    id: doc.id,
    kind: doc.kind,
    filename: doc.filename,
    contentType: doc.contentType,
    status: doc.status,
    provider: doc.provider,
    confidence: doc.confidence,
    raw: doc.raw,
    vendor: doc.vendor,
    documentDate: doc.documentDate?.toISOString() ?? null,
    total: doc.total,
    taxAmount: doc.taxAmount,
    currency: doc.currency,
    category: doc.category,
    notes: doc.notes,
    expense: doc.expense,
    // Signed for an hour and minted only inside this admin-guarded route, so
    // the bucket itself stays private.
    fileUrl: await signedUrl(doc.storagePath),
  })
}

const schema = z.object({
  vendor: z.string().max(160).optional(),
  documentDate: z.string().optional(),
  total: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  category: z.string().max(60).optional(),
  notes: z.string().max(1000).optional(),
  /** Confirm the fields and raise the expense. */
  confirm: z.boolean().optional(),
})

/**
 * Save the fields, and optionally confirm them.
 *
 * Confirming is what raises the expense and posts it to the ledger, and it
 * requires an amount, a date and a category — an extraction that missed one of
 * those is not something to guess at, so it stays in review until a person
 * fills it in.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid document details' }, { status: 400 })
  const d = parsed.data

  const doc = await prisma.documentScan.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (doc.status === 'CONFIRMED') {
    return NextResponse.json({ error: 'This document has already been confirmed and its expense raised.' }, { status: 409 })
  }

  const documentDate = d.documentDate ? new Date(d.documentDate) : doc.documentDate
  if (documentDate && Number.isNaN(documentDate.getTime())) {
    return NextResponse.json({ error: 'Invalid document date' }, { status: 400 })
  }

  const fields = {
    vendor: d.vendor !== undefined ? d.vendor || null : doc.vendor,
    documentDate,
    total: d.total !== undefined ? d.total : doc.total,
    taxAmount: d.taxAmount !== undefined ? d.taxAmount : doc.taxAmount,
    currency: d.currency ? d.currency.toUpperCase() : doc.currency,
    category: d.category !== undefined ? d.category || null : doc.category,
    notes: d.notes !== undefined ? d.notes || null : doc.notes,
  }

  if (!d.confirm) {
    await prisma.documentScan.update({ where: { id }, data: fields })
    return NextResponse.json({ ok: true })
  }

  const missing: string[] = []
  if (!fields.total || fields.total <= 0) missing.push('an amount')
  if (!fields.documentDate) missing.push('a date')
  if (!fields.category) missing.push('a category')
  if (missing.length) {
    return NextResponse.json({ error: `Add ${missing.join(', ')} before confirming.` }, { status: 400 })
  }
  if (fields.currency !== 'JMD') {
    // The ledger is kept in JMD. Converting silently at some rate nobody chose
    // would misstate the expense, so this is refused rather than approximated.
    return NextResponse.json(
      { error: 'Only JMD documents can be raised as expenses right now. Convert the amount and record it in JMD.' },
      { status: 400 },
    )
  }

  const expense = await prisma.expense.create({
    data: {
      category: fields.category as string,
      description: fields.vendor ? `${fields.vendor}${fields.notes ? `: ${fields.notes}` : ''}` : fields.notes,
      amount: fields.total as number,
      spentAt: fields.documentDate as Date,
    },
  })

  await prisma.documentScan.update({
    where: { id },
    data: {
      ...fields,
      status: 'CONFIRMED',
      expenseId: expense.id,
      confirmedAt: new Date(),
      confirmedBy: session.user?.email ?? null,
    },
  })

  // Best-effort, matching the expenses route: a posting failure must not lose
  // the expense — the backfill picks it up.
  void postExpense(expense).catch((err) => console.error('[ledger] document expense posting failed:', err))

  return NextResponse.json({ ok: true, expenseId: expense.id })
}

/**
 * Discard a document that has not been confirmed.
 *
 * A confirmed one is the evidence behind an expense on the books, so it stays —
 * delete the expense first if it was wrong.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const doc = await prisma.documentScan.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (doc.status === 'CONFIRMED' && doc.expenseId) {
    return NextResponse.json(
      { error: 'This receipt is the evidence for an expense on the books. Remove that expense first if it was wrong.' },
      { status: 409 },
    )
  }

  await deleteAdminFile(doc.storagePath).catch((err) => console.error('[storage] document delete failed:', err))
  await prisma.documentScan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
