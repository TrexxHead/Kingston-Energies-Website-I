import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { postEntry } from '@/lib/ledger/post'

/** Journal — every posted entry, newest first, with search + paging. */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 25))
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)
  const q = (url.searchParams.get('q') ?? '').trim()
  const source = url.searchParams.get('source')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const where = {
    ...(source ? { source: source as never } : {}),
    ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            { entryNo: { contains: q, mode: 'insensitive' as const } },
            { memo: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [total, entries] = await Promise.all([
    prisma.journalEntry.count({ where }),
    prisma.journalEntry.findMany({
      where,
      orderBy: [{ date: 'desc' }, { entryNo: 'desc' }],
      skip: offset,
      take: pageSize,
      include: { lines: { include: { account: { select: { code: true, name: true, type: true } } } } },
    }),
  ])

  return NextResponse.json({
    total,
    offset,
    pageSize,
    entries: entries.map((e) => ({
      id: e.id,
      entryNo: e.entryNo,
      date: e.date.toISOString(),
      memo: e.memo,
      source: e.source,
      createdBy: e.createdBy,
      reversed: Boolean(e.reversedById),
      totalDebit: Math.round(e.lines.reduce((s, l) => s + l.debit, 0) * 100) / 100,
      lines: e.lines.map((l) => ({
        id: l.id,
        code: l.account.code,
        name: l.account.name,
        type: l.account.type,
        debit: l.debit,
        credit: l.credit,
        memo: l.memo,
      })),
    })),
  })
}

const createSchema = z.object({
  date: z.string().min(1),
  memo: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        code: z.string().min(1),
        debit: z.number().min(0).optional(),
        credit: z.number().min(0).optional(),
        memo: z.string().max(200).optional(),
      }),
    )
    .min(2, 'A journal entry needs at least two lines'),
})

/** Hand-written journal entry. Rejected unless debits equal credits. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid entry' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const date = new Date(parsed.data.date)
  if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  try {
    const entry = await postEntry({
      date,
      memo: parsed.data.memo,
      source: 'MANUAL',
      createdBy: session?.user?.email ?? null,
      lines: parsed.data.lines,
    })
    return NextResponse.json({ entry }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not post entry' }, { status: 400 })
  }
}
