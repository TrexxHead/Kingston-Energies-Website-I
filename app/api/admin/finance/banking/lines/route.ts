import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { postEntry } from '@/lib/ledger/post'
import { suggestMatches, CONFIDENT, type BookLine } from '@/lib/banking/match'

/**
 * Statement lines awaiting a decision, each with suggested matches.
 *
 * Suggestions are computed live rather than stored, so correcting a journal
 * entry immediately changes what's suggested instead of leaving a stale hint
 * pointing at the old version.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const connectionId = url.searchParams.get('connectionId')
  const status = url.searchParams.get('status') ?? 'UNMATCHED'
  if (!connectionId) return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })

  const connection = await prisma.bankConnection.findUnique({ where: { id: connectionId }, select: { accountId: true, account: { select: { code: true, name: true } } } })
  if (!connection) return NextResponse.json({ error: 'Bank connection not found' }, { status: 404 })

  const lines = await prisma.bankStatementLine.findMany({
    where: { connectionId, ...(status === 'ALL' ? {} : { status: status as 'UNMATCHED' }) },
    orderBy: { postedAt: 'desc' },
    take: 200,
  })

  // Candidate book lines: movements on this bank account not already claimed by
  // another statement line.
  const claimed = await prisma.bankStatementLine.findMany({
    where: { journalLineId: { not: null } },
    select: { journalLineId: true },
  })
  const claimedIds = claimed.map((c) => c.journalLineId as string)

  const journalLines = await prisma.journalLine.findMany({
    where: {
      accountId: connection.accountId,
      ...(claimedIds.length ? { id: { notIn: claimedIds } } : {}),
    },
    orderBy: { entry: { date: 'desc' } },
    take: 400,
    include: { entry: { select: { id: true, date: true, memo: true, entryNo: true } } },
  })

  const books: BookLine[] = journalLines.map((l) => ({
    id: l.id,
    entryId: l.entryId,
    date: l.entry.date,
    memo: l.memo,
    entryMemo: l.entry.memo,
    // Debit to a bank account is money in, which is the sign convention the
    // statement uses.
    amount: Math.round((l.debit - l.credit) * 100) / 100,
  }))
  const bookById = new Map(journalLines.map((l) => [l.id, l]))

  const categories = await prisma.ledgerAccount.findMany({
    where: { archived: false },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, type: true },
  })

  return NextResponse.json({
    account: connection.account,
    categories,
    lines: lines.map((line) => {
      const suggestions =
        line.status === 'UNMATCHED'
          ? suggestMatches({ id: line.id, postedAt: line.postedAt, description: line.description, amount: line.amount }, books)
          : []
      return {
        id: line.id,
        postedAt: line.postedAt.toISOString(),
        description: line.description,
        reference: line.reference,
        amount: line.amount,
        runningBalance: line.runningBalance,
        status: line.status,
        note: line.note,
        resolvedAt: line.resolvedAt ? line.resolvedAt.toISOString() : null,
        resolvedBy: line.resolvedBy,
        journalLineId: line.journalLineId,
        suggestions: suggestions.map((s) => {
          const b = bookById.get(s.journalLineId)
          return {
            journalLineId: s.journalLineId,
            score: s.score,
            confident: s.score >= CONFIDENT,
            reasons: s.reasons,
            entryNo: b?.entry.entryNo ?? '',
            date: b?.entry.date.toISOString() ?? '',
            memo: b?.memo ?? b?.entry.memo ?? '',
          }
        }),
      }
    }),
  })
}

const schema = z.object({
  lineId: z.string().min(1),
  action: z.enum(['match', 'unmatch', 'exclude', 'post']),
  journalLineId: z.string().optional(),
  /** For 'post': the account the other side of the entry goes to. */
  categoryAccountId: z.string().optional(),
  note: z.string().max(500).optional(),
})

/** Resolve one statement line: match it, exclude it, or post a new entry from it. */
export async function PATCH(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { lineId, action } = parsed.data

  const line = await prisma.bankStatementLine.findUnique({
    where: { id: lineId },
    include: { connection: { select: { accountId: true, name: true, account: { select: { code: true } } } } },
  })
  if (!line) return NextResponse.json({ error: 'Statement line not found' }, { status: 404 })

  const who = session.user?.email ?? null

  if (action === 'unmatch') {
    if (line.status === 'POSTED') {
      return NextResponse.json(
        { error: 'This line created a journal entry. Reverse that entry rather than unlinking it, so the books keep a trail.' },
        { status: 409 },
      )
    }
    await prisma.bankStatementLine.update({
      where: { id: lineId },
      data: { status: 'UNMATCHED', journalLineId: null, resolvedAt: null, resolvedBy: null },
    })
    return NextResponse.json({ ok: true })
  }

  if (line.status !== 'UNMATCHED') {
    return NextResponse.json({ error: 'This line has already been dealt with.' }, { status: 409 })
  }

  if (action === 'exclude') {
    // A real bank line excluded with no reason on record is exactly the kind
    // of gap an auditor flags — completeness requires knowing why it was
    // deliberately left out, not just that it was.
    if (!parsed.data.note?.trim()) {
      return NextResponse.json({ error: 'Say why this is being excluded (duplicate, already booked elsewhere, etc).' }, { status: 400 })
    }
    await prisma.bankStatementLine.update({
      where: { id: lineId },
      data: { status: 'EXCLUDED', note: parsed.data.note.trim(), resolvedAt: new Date(), resolvedBy: who },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'match') {
    const journalLineId = parsed.data.journalLineId
    if (!journalLineId) return NextResponse.json({ error: 'Choose which book entry this matches.' }, { status: 400 })

    const book = await prisma.journalLine.findUnique({ where: { id: journalLineId }, select: { accountId: true, debit: true, credit: true } })
    if (!book) return NextResponse.json({ error: 'That book entry no longer exists.' }, { status: 400 })
    if (book.accountId !== line.connection.accountId) {
      return NextResponse.json({ error: 'That entry belongs to a different account.' }, { status: 400 })
    }
    const bookAmount = Math.round((book.debit - book.credit) * 100) / 100
    if (Math.abs(bookAmount - line.amount) > 0.01) {
      // Refusing here rather than warning: a match between different amounts
      // silently misstates the bank balance, and there is no reading of it that
      // is correct.
      return NextResponse.json(
        { error: `Amounts differ: the statement says ${line.amount.toFixed(2)} and the entry says ${bookAmount.toFixed(2)}.` },
        { status: 400 },
      )
    }

    const already = await prisma.bankStatementLine.findFirst({ where: { journalLineId, NOT: { id: lineId } }, select: { id: true } })
    if (already) return NextResponse.json({ error: 'Another statement line is already matched to that entry.' }, { status: 409 })

    await prisma.bankStatementLine.update({
      where: { id: lineId },
      data: { status: 'MATCHED', journalLineId, note: parsed.data.note || null, resolvedAt: new Date(), resolvedBy: who },
    })
    return NextResponse.json({ ok: true })
  }

  // action === 'post' — the bank shows something the books have never seen.
  const categoryAccountId = parsed.data.categoryAccountId
  if (!categoryAccountId) return NextResponse.json({ error: 'Choose a category for this transaction.' }, { status: 400 })

  const category = await prisma.ledgerAccount.findUnique({ where: { id: categoryAccountId }, select: { code: true } })
  if (!category) return NextResponse.json({ error: 'That category no longer exists.' }, { status: 400 })
  if (category.code === line.connection.account.code) {
    return NextResponse.json({ error: 'The other side of the entry cannot be the bank account itself.' }, { status: 400 })
  }

  const magnitude = Math.abs(line.amount)
  const moneyIn = line.amount > 0
  const entry = await postEntry({
    date: line.postedAt,
    source: 'MANUAL',
    sourceId: `bankline:${line.id}`,
    createdBy: who,
    memo: `${line.description}: from ${line.connection.name} statement`,
    lines: moneyIn
      ? [
          { code: line.connection.account.code, debit: magnitude },
          { code: category.code, credit: magnitude },
        ]
      : [
          { code: category.code, debit: magnitude },
          { code: line.connection.account.code, credit: magnitude },
        ],
  })

  await prisma.bankStatementLine.update({
    where: { id: lineId },
    data: { status: 'POSTED', entryId: entry?.id ?? null, note: parsed.data.note || null, resolvedAt: new Date(), resolvedBy: who },
  })

  return NextResponse.json({ ok: true, entryNo: entry?.entryNo ?? null })
}
