import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { postExpense } from '@/lib/ledger/post'

const schema = z.object({
  category: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  amount: z.number().positive(),
  spentAt: z.string().optional(), // ISO date; defaults to now
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a category and a positive amount.' }, { status: 400 })

  const { category, description, amount, spentAt } = parsed.data
  const expense = await prisma.expense.create({
    data: {
      category,
      description: description || null,
      amount,
      spentAt: spentAt ? new Date(spentAt) : new Date(),
    },
  })
  // Journal it to the ledger. Best-effort: a posting failure must never lose
  // the expense record itself — the backfill will pick it up later.
  void postExpense(expense).catch((err) => console.error('[ledger] expense posting failed:', err))
  return NextResponse.json({ id: expense.id }, { status: 201 })
}
