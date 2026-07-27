import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts } from '@/lib/ledger/post'
import { accountBalances } from '@/lib/ledger/reports'

/** Chart of accounts, each with its current balance. */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  await ensureChartOfAccounts()
  const includeArchived = new URL(request.url).searchParams.get('archived') === '1'

  const [balances, accounts] = await Promise.all([
    accountBalances(),
    prisma.ledgerAccount.findMany({ orderBy: { code: 'asc' } }),
  ])
  const balanceById = new Map(balances.map((b) => [b.id, b]))

  return NextResponse.json({
    accounts: accounts
      .filter((a) => includeArchived || !a.archived)
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        isBank: a.isBank,
        isSystem: a.isSystem,
        archived: a.archived,
        balance: balanceById.get(a.id)?.balance ?? 0,
      })),
  })
}

const createSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[0-9A-Za-z.\-]+$/, 'Use numbers, letters, dots or dashes'),
  name: z.string().min(1).max(120),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  subtype: z.string().max(60).nullish(),
  isBank: z.boolean().optional(),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid account' }, { status: 400 })

  const existing = await prisma.ledgerAccount.findUnique({ where: { code: parsed.data.code } })
  if (existing) return NextResponse.json({ error: `Account code ${parsed.data.code} is already in use.` }, { status: 409 })

  const account = await prisma.ledgerAccount.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      type: parsed.data.type,
      subtype: parsed.data.subtype ?? null,
      isBank: parsed.data.isBank ?? false,
    },
  })
  return NextResponse.json({ account }, { status: 201 })
}
