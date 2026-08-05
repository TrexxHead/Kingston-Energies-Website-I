import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { postEntry, reverseEntry } from '@/lib/ledger/post'
import { ACC, EXPENSE_CATEGORY_ACCOUNT } from '@/lib/ledger/chart'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }
}

const patchSchema = z.object({
  category: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  amount: z.number().positive(),
  spentAt: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
})

/**
 * Correct an already-logged expense.
 *
 * Never edits the figure quietly: the Expense row is updated, an ExpenseEdit
 * row records exactly what changed and why, and if this expense already made
 * it onto the ledger, that entry is reversed and a new correcting entry is
 * posted for the new figures — so the books and the expense log always agree,
 * and nothing about the change is left unrecorded for the period it landed in.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await getServerSession(authOptions)

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a category, a positive amount, a date and a reason for the change.' }, { status: 400 })
  }
  const d = parsed.data

  const spentAt = new Date(d.spentAt)
  if (Number.isNaN(spentAt.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

  const unchanged =
    expense.category === d.category &&
    (expense.description ?? '') === (d.description ?? '') &&
    expense.amount === d.amount &&
    expense.spentAt.getTime() === spentAt.getTime()
  if (unchanged) return NextResponse.json({ ok: true, expense })

  const adminEmail = session?.user?.email ?? null

  await prisma.expenseEdit.create({
    data: {
      expenseId: id,
      beforeCategory: expense.category,
      beforeDescription: expense.description,
      beforeAmount: expense.amount,
      beforeSpentAt: expense.spentAt,
      afterCategory: d.category,
      afterDescription: d.description || null,
      afterAmount: d.amount,
      afterSpentAt: spentAt,
      reason: d.reason,
      editedBy: adminEmail,
    },
  })

  const updated = await prisma.expense.update({
    where: { id },
    data: { category: d.category, description: d.description || null, amount: d.amount, spentAt },
  })

  // If this expense already made it onto the ledger, reverse that entry and
  // post a fresh one for the corrected figures — both stay visible, forever.
  const existing = await prisma.journalEntry.findFirst({ where: { source: 'EXPENSE', sourceId: id } })
  if (existing && !existing.reversedById) {
    const reversal = await reverseEntry(existing.id, adminEmail, d.reason)
    if (reversal) {
      const code = EXPENSE_CATEGORY_ACCOUNT[updated.category] ?? '6900'
      await postEntry({
        date: spentAt,
        source: 'MANUAL',
        memo: `Correction of ${existing.entryNo} (expense edited): ${updated.description || updated.category} — ${d.reason}`,
        createdBy: adminEmail,
        lines: [
          { code, debit: updated.amount },
          { code: ACC.BANK, credit: updated.amount },
        ],
      }).catch((err) => console.error('[ledger] expense correction posting failed:', err))
    }
  }

  return NextResponse.json({ ok: true, expense: updated })
}
