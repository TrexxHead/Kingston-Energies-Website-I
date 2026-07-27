import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts } from '@/lib/ledger/post'
import { liveFeedStatus } from '@/lib/banking/providers'

/** Bank connections, the accounts they can feed, and the live-feed situation. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  await ensureChartOfAccounts()

  const [connections, accounts] = await Promise.all([
    prisma.bankConnection.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        account: { select: { code: true, name: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.ledgerAccount.findMany({ where: { isBank: true, archived: false }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
  ])

  // Unresolved counts drive the "needs attention" number on the tab.
  const pending = await prisma.bankStatementLine.groupBy({
    by: ['connectionId'],
    where: { status: 'UNMATCHED' },
    _count: { _all: true },
  })
  const pendingBy = new Map(pending.map((p) => [p.connectionId, p._count._all]))

  return NextResponse.json({
    connections: connections.map((c) => ({
      id: c.id,
      name: c.name,
      institution: c.institution,
      maskedNumber: c.maskedNumber,
      provider: c.provider,
      status: c.status,
      currency: c.currency,
      accountCode: c.account.code,
      accountName: c.account.name,
      lastImportAt: c.lastImportAt?.toISOString() ?? null,
      lineCount: c._count.lines,
      unmatched: pendingBy.get(c.id) ?? 0,
    })),
    accounts,
    liveFeed: liveFeedStatus(),
  })
}

const schema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1).max(120),
  institution: z.string().max(120).optional(),
  /** Last four digits only. */
  maskedNumber: z.string().max(8).optional(),
  currency: z.string().length(3).default('JMD'),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a name and choose the ledger account it feeds.' }, { status: 400 })
  const d = parsed.data

  const account = await prisma.ledgerAccount.findUnique({ where: { id: d.accountId }, select: { isBank: true } })
  if (!account) return NextResponse.json({ error: 'That ledger account does not exist.' }, { status: 400 })
  if (!account.isBank) {
    return NextResponse.json({ error: 'Only a cash or bank account can take a statement feed.' }, { status: 400 })
  }

  const connection = await prisma.bankConnection.create({
    data: {
      accountId: d.accountId,
      name: d.name,
      institution: d.institution || null,
      // Store the last four at most, whatever was pasted in.
      maskedNumber: d.maskedNumber ? d.maskedNumber.replace(/\D/g, '').slice(-4) || null : null,
      currency: d.currency.toUpperCase(),
      provider: 'FILE_IMPORT',
    },
  })

  return NextResponse.json({ id: connection.id }, { status: 201 })
}
