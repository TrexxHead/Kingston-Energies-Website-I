import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts, postEntry } from '@/lib/ledger/post'
import { ACC } from '@/lib/ledger/chart'
import { accountBalances } from '@/lib/ledger/reports'

/**
 * Opening balances.
 *
 * Books that start mid-life have no history for what the business already
 * owned or owed, which is why a fresh Balance Sheet looks lopsided. This posts
 * a single OPENING entry with the difference balanced to Opening Balance
 * Equity — the standard way to bring existing books onto a new system.
 */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  await ensureChartOfAccounts()
  const existing = await prisma.journalEntry.findFirst({ where: { source: 'OPENING' }, select: { id: true, date: true } })
  const balances = await accountBalances()

  return NextResponse.json({
    alreadySet: Boolean(existing),
    setAt: existing?.date?.toISOString() ?? null,
    // Only accounts it makes sense to open a balance on.
    accounts: balances
      .filter((b) => b.type === 'ASSET' || b.type === 'LIABILITY')
      .map((b) => ({ code: b.code, name: b.name, type: b.type, currentBalance: b.balance })),
  })
}

const schema = z.object({
  asOf: z.string().min(1),
  // { "1020": 150000, "1200": 80000, … } — natural-direction amounts.
  balances: z.record(z.string(), z.number()),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid opening balances' }, { status: 400 })

  const existing = await prisma.journalEntry.findFirst({ where: { source: 'OPENING' } })
  if (existing) {
    return NextResponse.json(
      { error: 'Opening balances have already been set. Post an adjusting journal entry instead. Rewriting them would break the audit trail.' },
      { status: 400 },
    )
  }

  const asOf = new Date(parsed.data.asOf)
  if (Number.isNaN(asOf.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  await ensureChartOfAccounts()
  const accounts = await prisma.ledgerAccount.findMany({ select: { code: true, type: true } })
  const typeByCode = new Map(accounts.map((a) => [a.code, a.type]))

  const lines: { code: string; debit?: number; credit?: number; memo?: string }[] = []
  let net = 0
  for (const [code, amount] of Object.entries(parsed.data.balances)) {
    if (!amount) continue
    const type = typeByCode.get(code)
    if (!type) continue
    // Assets are debit-natural, liabilities credit-natural.
    if (type === 'ASSET') {
      lines.push({ code, debit: amount, memo: 'Opening balance' })
      net += amount
    } else {
      lines.push({ code, credit: amount, memo: 'Opening balance' })
      net -= amount
    }
  }

  if (lines.length === 0) return NextResponse.json({ error: 'Enter at least one opening balance.' }, { status: 400 })

  // Whatever the assets and liabilities don't account for is the owner's stake.
  if (Math.abs(net) > 0.01) {
    lines.push(
      net > 0
        ? { code: ACC.OPENING_BALANCE_EQUITY, credit: net, memo: 'Opening balance equity' }
        : { code: ACC.OPENING_BALANCE_EQUITY, debit: -net, memo: 'Opening balance equity' },
    )
  }

  const session = await getServerSession(authOptions)
  try {
    const entry = await postEntry({
      date: asOf,
      source: 'OPENING',
      sourceId: 'opening-balances',
      memo: 'Opening balances',
      createdBy: session?.user?.email ?? null,
      lines,
    })
    return NextResponse.json({ entry, equity: Math.round(net * 100) / 100 }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not post opening balances' }, { status: 400 })
  }
}
