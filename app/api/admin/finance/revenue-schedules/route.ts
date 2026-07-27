import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts, postEntry } from '@/lib/ledger/post'
import { runRevenueRecognition, scheduleProgress } from '@/lib/ledger/schedules'
import { ACC } from '@/lib/ledger/chart'

/** Deferred revenue schedules with recognition progress. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const rows = await prisma.revenueSchedule.findMany({ orderBy: { startDate: 'desc' } })
  const items = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      description: r.description,
      customerName: r.customerName,
      totalAmount: r.totalAmount,
      months: r.months,
      startDate: r.startDate.toISOString(),
      ...(await scheduleProgress('REVENUE_RECOGNITION', r.id, r.totalAmount, r.months, r.startDate)),
    })),
  )

  return NextResponse.json({
    items,
    totals: {
      deferred: Math.round(items.reduce((s, i) => s + i.remaining, 0)),
      recognised: Math.round(items.reduce((s, i) => s + i.recognised, 0)),
      periodsDue: items.reduce((s, i) => s + i.periodsDue, 0),
    },
  })
}

const createSchema = z.object({
  description: z.string().min(1).max(200),
  customerName: z.string().max(120).optional(),
  totalAmount: z.number().positive(),
  months: z.number().int().min(1).max(120),
  startDate: z.string().min(1),
  /** Post the cash received up front as a liability (Dr Bank / Cr Deferred revenue). */
  recordReceipt: z.boolean().optional(),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid schedule' }, { status: 400 })
  const d = parsed.data

  const startDate = new Date(d.startDate)
  if (Number.isNaN(startDate.getTime())) return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })

  await ensureChartOfAccounts()
  const session = await getServerSession(authOptions)

  const sched = await prisma.revenueSchedule.create({
    data: {
      description: d.description,
      customerName: d.customerName ?? null,
      totalAmount: d.totalAmount,
      months: d.months,
      startDate,
    },
  })

  // Money taken up front is a liability until it's earned — that's the whole
  // point of deferring it rather than booking it as revenue on day one.
  if (d.recordReceipt) {
    await postEntry({
      date: startDate,
      source: 'MANUAL',
      memo: `Deferred revenue — ${d.description}`,
      createdBy: session?.user?.email ?? null,
      lines: [
        { code: ACC.BANK, debit: d.totalAmount },
        { code: ACC.DEFERRED_REVENUE, credit: d.totalAmount },
      ],
    }).catch((err) => console.error('[ledger] deferred revenue posting failed:', err))
  }

  return NextResponse.json({ id: sched.id }, { status: 201 })
}

/** Recognise revenue for every schedule with periods due. */
export async function PUT() {
  const denied = await guardAdmin()
  if (denied) return denied

  const session = await getServerSession(authOptions)
  const rows = await prisma.revenueSchedule.findMany({ select: { id: true } })
  let posted = 0
  for (const r of rows) posted += await runRevenueRecognition(r.id, session?.user?.email ?? null)
  return NextResponse.json({ posted })
}
