import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts, postEntry } from '@/lib/ledger/post'
import { runPrepaidAmortization, scheduleProgress } from '@/lib/ledger/schedules'
import { ACC, EXPENSE_CATEGORY_ACCOUNT } from '@/lib/ledger/chart'

/** Prepaid expense register with amortization progress. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const rows = await prisma.prepaidExpense.findMany({ orderBy: { startDate: 'desc' } })
  const items = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      description: p.description,
      totalAmount: p.totalAmount,
      months: p.months,
      startDate: p.startDate.toISOString(),
      expenseAccountCode: p.expenseAccountCode,
      ...(await scheduleProgress('AMORTIZATION', p.id, p.totalAmount, p.months, p.startDate)),
    })),
  )

  return NextResponse.json({
    items,
    totals: {
      remaining: Math.round(items.reduce((s, i) => s + i.remaining, 0)),
      periodsDue: items.reduce((s, i) => s + i.periodsDue, 0),
    },
  })
}

const createSchema = z.object({
  description: z.string().min(1).max(200),
  totalAmount: z.number().positive(),
  months: z.number().int().min(1).max(120),
  startDate: z.string().min(1),
  /** Expense category this eventually lands in (mapped to its ledger account). */
  category: z.string().max(60).optional(),
  /** Post the upfront payment (Dr Prepaid / Cr Bank). */
  recordPayment: z.boolean().optional(),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid prepaid expense' }, { status: 400 })
  const d = parsed.data

  const startDate = new Date(d.startDate)
  if (Number.isNaN(startDate.getTime())) return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })

  await ensureChartOfAccounts()
  const session = await getServerSession(authOptions)
  const expenseAccountCode = (d.category && EXPENSE_CATEGORY_ACCOUNT[d.category]) || '6900'

  const prepaid = await prisma.prepaidExpense.create({
    data: {
      description: d.description,
      totalAmount: d.totalAmount,
      months: d.months,
      startDate,
      expenseAccountCode,
    },
  })

  if (d.recordPayment) {
    await postEntry({
      date: startDate,
      source: 'MANUAL',
      memo: `Prepaid — ${d.description}`,
      createdBy: session?.user?.email ?? null,
      lines: [
        { code: ACC.PREPAID, debit: d.totalAmount },
        { code: ACC.BANK, credit: d.totalAmount },
      ],
    }).catch((err) => console.error('[ledger] prepaid payment posting failed:', err))
  }

  return NextResponse.json({ id: prepaid.id }, { status: 201 })
}

/** Amortize every prepaid with periods due. */
export async function PUT() {
  const denied = await guardAdmin()
  if (denied) return denied

  const session = await getServerSession(authOptions)
  const rows = await prisma.prepaidExpense.findMany({ select: { id: true } })
  let posted = 0
  for (const p of rows) posted += await runPrepaidAmortization(p.id, session?.user?.email ?? null)
  return NextResponse.json({ posted })
}
