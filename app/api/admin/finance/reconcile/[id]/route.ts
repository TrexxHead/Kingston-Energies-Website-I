import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * A reconciliation session: every journal line on the account up to the
 * statement date, flagged cleared or not, plus the running difference.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const rec = await prisma.reconciliation.findUnique({
    where: { id },
    include: { account: { select: { id: true, code: true, name: true } } },
  })
  if (!rec) return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 })

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: rec.accountId,
      entry: { date: { lte: rec.statementDate } },
      // Lines cleared on a *different* reconciliation stay hidden — they're settled.
      OR: [{ reconciliationId: null }, { reconciliationId: id }],
    },
    include: { entry: { select: { entryNo: true, date: true, memo: true, source: true } } },
    orderBy: [{ entry: { date: 'asc' } }, { id: 'asc' }],
  })

  // Cleared movement is what the bank has actually seen.
  const cleared = lines.filter((l) => l.reconciliationId === id)
  const clearedMovement = round2(cleared.reduce((s, l) => s + l.debit - l.credit, 0))
  const clearedBalance = round2(rec.beginningBalance + clearedMovement)
  const difference = round2(rec.endingBalance - clearedBalance)

  return NextResponse.json({
    id: rec.id,
    account: rec.account,
    statementDate: rec.statementDate.toISOString(),
    beginningBalance: rec.beginningBalance,
    endingBalance: rec.endingBalance,
    status: rec.status,
    completedAt: rec.completedAt?.toISOString() ?? null,
    clearedBalance,
    difference,
    balanced: Math.abs(difference) < 0.01,
    lines: lines.map((l) => ({
      id: l.id,
      entryNo: l.entry.entryNo,
      date: l.entry.date.toISOString(),
      memo: l.memo ?? l.entry.memo,
      source: l.entry.source,
      debit: l.debit,
      credit: l.credit,
      cleared: l.reconciliationId === id,
    })),
  })
}

const patchSchema = z.object({
  /** Toggle individual lines as seen on the statement. */
  clear: z.array(z.string()).optional(),
  unclear: z.array(z.string()).optional(),
  /** Finish the reconciliation — only allowed when the difference is zero. */
  complete: z.boolean().optional(),
  endingBalance: z.number().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const rec = await prisma.reconciliation.findUnique({ where: { id } })
  if (!rec) return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 })
  if (rec.status === 'COMPLETED') {
    return NextResponse.json({ error: 'This reconciliation is already complete and cannot be changed.' }, { status: 400 })
  }

  if (parsed.data.endingBalance !== undefined) {
    await prisma.reconciliation.update({ where: { id }, data: { endingBalance: parsed.data.endingBalance } })
  }
  if (parsed.data.clear?.length) {
    await prisma.journalLine.updateMany({
      where: { id: { in: parsed.data.clear }, accountId: rec.accountId, reconciliationId: null },
      data: { reconciliationId: id },
    })
  }
  if (parsed.data.unclear?.length) {
    await prisma.journalLine.updateMany({
      where: { id: { in: parsed.data.unclear }, reconciliationId: id },
      data: { reconciliationId: null },
    })
  }

  if (parsed.data.complete) {
    const fresh = await prisma.reconciliation.findUnique({ where: { id } })
    const cleared = await prisma.journalLine.findMany({ where: { reconciliationId: id }, select: { debit: true, credit: true } })
    const clearedBalance = round2((fresh?.beginningBalance ?? 0) + cleared.reduce((s, l) => s + l.debit - l.credit, 0))
    const difference = round2((fresh?.endingBalance ?? 0) - clearedBalance)
    // Refusing to close an out-of-balance reconciliation is the whole point —
    // otherwise it records a false assertion that the bank agrees.
    if (Math.abs(difference) >= 0.01) {
      return NextResponse.json(
        { error: `Still out by ${difference.toFixed(2)}. Clear or unclear transactions until the difference is zero.` },
        { status: 400 },
      )
    }
    const session = await getServerSession(authOptions)
    await prisma.reconciliation.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), completedBy: session?.user?.email ?? null },
    })
  }

  return NextResponse.json({ ok: true })
}

/** Abandon an in-progress reconciliation, releasing its cleared lines. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const rec = await prisma.reconciliation.findUnique({ where: { id } })
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (rec.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Completed reconciliations are part of the audit trail and cannot be deleted.' }, { status: 400 })
  }

  await prisma.journalLine.updateMany({ where: { reconciliationId: id }, data: { reconciliationId: null } })
  await prisma.reconciliation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
