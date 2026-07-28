import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, isMissingSchemaError } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts, postEntry } from '@/lib/ledger/post'
import { firstMatch, ruleMatches } from '@/lib/banking/rules'
import { migrationPendingResponse } from '@/lib/apiErrors'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  try {
    return await getRules()
  } catch (err) {
    if (isMissingSchemaError(err)) return migrationPendingResponse()
    throw err
  }
}

async function getRules() {
  await ensureChartOfAccounts()

  const [rules, accounts, pending] = await Promise.all([
    prisma.bankRule.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }], include: { account: { select: { code: true, name: true } } } }),
    prisma.ledgerAccount.findMany({ where: { archived: false }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, type: true } }),
    prisma.bankStatementLine.count({ where: { status: 'UNMATCHED' } }),
  ])

  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      contains: r.contains,
      direction: r.direction,
      priority: r.priority,
      enabled: r.enabled,
      autoPost: r.autoPost,
      matchCount: r.matchCount,
      lastMatchAt: r.lastMatchAt?.toISOString() ?? null,
      accountCode: r.account.code,
      accountName: r.account.name,
      accountId: r.accountId,
    })),
    accounts,
    unreviewedLines: pending,
  })
}

const schema = z.object({
  name: z.string().min(1).max(80),
  contains: z.string().min(2).max(120),
  direction: z.enum(['ANY', 'IN', 'OUT']).default('ANY'),
  accountId: z.string().min(1),
  priority: z.number().int().min(1).max(999).default(100),
  autoPost: z.boolean().default(false),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Give the rule a name, at least two characters to match on, and a category.' }, { status: 400 })
  }
  const d = parsed.data

  const account = await prisma.ledgerAccount.findUnique({ where: { id: d.accountId }, select: { isBank: true } })
  if (!account) return NextResponse.json({ error: 'That category no longer exists.' }, { status: 400 })
  if (account.isBank) {
    return NextResponse.json({ error: 'A rule cannot categorise a bank line back to a bank account — that would be an entry to itself.' }, { status: 400 })
  }

  const rule = await prisma.bankRule.create({ data: { ...d, createdBy: session.user?.email ?? null } })
  return NextResponse.json({ id: rule.id }, { status: 201 })
}

const patchSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().optional(),
  autoPost: z.boolean().optional(),
  priority: z.number().int().min(1).max(999).optional(),
})

export async function PATCH(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid rule' }, { status: 400 })
  const { id, ...changes } = parsed.data

  await prisma.bankRule.update({ where: { id }, data: changes })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Which rule?' }, { status: 400 })

  await prisma.bankRule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

/**
 * Run the rules over everything still unreviewed.
 *
 * Only rules explicitly marked auto-post actually post. Everything else is
 * counted and reported so the operator can see what the rules WOULD have done
 * before trusting any of them with the books.
 */
export async function PUT() {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const who = session.user?.email ?? null

  const [rules, lines] = await Promise.all([
    prisma.bankRule.findMany({ where: { enabled: true } }),
    prisma.bankStatementLine.findMany({
      where: { status: 'UNMATCHED' },
      include: { connection: { select: { name: true, account: { select: { code: true, isBank: true } } } } },
      take: 500,
    }),
  ])

  if (rules.length === 0) return NextResponse.json({ posted: 0, suggested: 0, unmatched: lines.length })

  const accounts = await prisma.ledgerAccount.findMany({
    where: { id: { in: rules.map((r) => r.accountId) } },
    select: { id: true, code: true },
  })
  const codeById = new Map(accounts.map((a) => [a.id, a.code]))

  let posted = 0
  let suggested = 0
  const firedAt = new Date()
  const fired = new Map<string, number>()

  for (const line of lines) {
    const match = firstMatch(rules, line)
    if (!match) continue

    fired.set(match.ruleId, (fired.get(match.ruleId) ?? 0) + 1)

    if (!match.autoPost) {
      suggested++
      continue
    }

    const code = codeById.get(match.accountId)
    if (!code) continue

    const magnitude = Math.abs(line.amount)
    const moneyIn = line.amount > 0
    const entry = await postEntry({
      date: line.postedAt,
      source: 'MANUAL',
      sourceId: `bankline:${line.id}`,
      createdBy: who,
      memo: `${line.description} — auto-categorised by rule "${match.ruleName}"`,
      lines: moneyIn
        ? [
            { code: line.connection.account.code, debit: magnitude },
            { code, credit: magnitude },
          ]
        : [
            { code, debit: magnitude },
            { code: line.connection.account.code, credit: magnitude },
          ],
    })

    await prisma.bankStatementLine.update({
      where: { id: line.id },
      data: {
        status: 'POSTED',
        entryId: entry?.id ?? null,
        note: `Auto-categorised by rule "${match.ruleName}"`,
        resolvedAt: firedAt,
        resolvedBy: who,
      },
    })
    posted++
  }

  // Record what actually fired, so a rule that never matches shows up as dead
  // weight rather than being assumed to be working.
  for (const [ruleId, count] of fired) {
    await prisma.bankRule.update({
      where: { id: ruleId },
      data: { matchCount: { increment: count }, lastMatchAt: firedAt },
    })
  }

  return NextResponse.json({
    posted,
    suggested,
    unmatched: lines.filter((l) => !rules.some((r) => ruleMatches(r, l))).length,
  })
}
