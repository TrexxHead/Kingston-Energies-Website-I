import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts } from '@/lib/ledger/post'
import { naturalBalance } from '@/lib/ledger/chart'

/** Reconcilable (bank/cash) accounts and their reconciliation history. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  await ensureChartOfAccounts()

  const accounts = await prisma.ledgerAccount.findMany({ where: { isBank: true, archived: false }, orderBy: { code: 'asc' } })
  const reconciliations = await prisma.reconciliation.findMany({
    orderBy: { statementDate: 'desc' },
    take: 20,
    include: { account: { select: { code: true, name: true } }, _count: { select: { lines: true } } },
  })

  // Book balance per account, so the reconcile screen can show the starting point.
  const sums = await prisma.journalLine.groupBy({
    by: ['accountId'],
    _sum: { debit: true, credit: true },
    where: { accountId: { in: accounts.map((a) => a.id) } },
  })
  const byId = new Map(sums.map((s) => [s.accountId, s]))

  return NextResponse.json({
    accounts: accounts.map((a) => {
      const s = byId.get(a.id)
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        bookBalance: Math.round(naturalBalance(a.type, s?._sum.debit ?? 0, s?._sum.credit ?? 0)),
      }
    }),
    reconciliations: reconciliations.map((r) => ({
      id: r.id,
      accountCode: r.account.code,
      accountName: r.account.name,
      statementDate: r.statementDate.toISOString(),
      endingBalance: r.endingBalance,
      status: r.status,
      clearedCount: r._count.lines,
      completedAt: r.completedAt?.toISOString() ?? null,
    })),
  })
}

const startSchema = z.object({
  accountId: z.string().min(1),
  statementDate: z.string().min(1),
  endingBalance: z.number(),
  beginningBalance: z.number().default(0),
})

/** Start reconciling an account against a statement. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = startSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid reconciliation' }, { status: 400 })
  const d = parsed.data

  const account = await prisma.ledgerAccount.findUnique({ where: { id: d.accountId } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  if (!account.isBank) return NextResponse.json({ error: 'Only bank or cash accounts can be reconciled.' }, { status: 400 })

  const open = await prisma.reconciliation.findFirst({ where: { accountId: d.accountId, status: 'IN_PROGRESS' } })
  if (open) return NextResponse.json({ error: 'This account already has a reconciliation in progress.', id: open.id }, { status: 409 })

  const statementDate = new Date(d.statementDate)
  if (Number.isNaN(statementDate.getTime())) return NextResponse.json({ error: 'Invalid statement date' }, { status: 400 })

  const rec = await prisma.reconciliation.create({
    data: {
      accountId: d.accountId,
      statementDate,
      endingBalance: d.endingBalance,
      beginningBalance: d.beginningBalance,
    },
  })
  return NextResponse.json({ id: rec.id }, { status: 201 })
}
