import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { runRevenueRecognition, scheduleProgress } from '@/lib/ledger/schedules'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const r = await prisma.revenueSchedule.findUnique({ where: { id } })
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: r.id,
    description: r.description,
    customerName: r.customerName,
    totalAmount: r.totalAmount,
    months: r.months,
    startDate: r.startDate.toISOString(),
    ...(await scheduleProgress('REVENUE_RECOGNITION', r.id, r.totalAmount, r.months, r.startDate)),
  })
}

/** Recognise this schedule's outstanding periods. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const session = await getServerSession(authOptions)
  const posted = await runRevenueRecognition(id, session?.user?.email ?? null)
  return NextResponse.json({ posted })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const runs = await prisma.scheduleRun.count({ where: { kind: 'REVENUE_RECOGNITION', refId: id } })
  if (runs > 0) {
    return NextResponse.json(
      { error: `This schedule has ${runs} recognised period(s) and can't be deleted. That would break the audit trail.` },
      { status: 400 },
    )
  }
  await prisma.revenueSchedule.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
