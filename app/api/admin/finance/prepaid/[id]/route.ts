import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { runPrepaidAmortization, scheduleProgress } from '@/lib/ledger/schedules'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const p = await prisma.prepaidExpense.findUnique({ where: { id } })
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: p.id,
    description: p.description,
    totalAmount: p.totalAmount,
    months: p.months,
    startDate: p.startDate.toISOString(),
    ...(await scheduleProgress('AMORTIZATION', p.id, p.totalAmount, p.months, p.startDate)),
  })
}

/** Post this prepaid's outstanding amortization periods. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const session = await getServerSession(authOptions)
  const posted = await runPrepaidAmortization(id, session?.user?.email ?? null)
  return NextResponse.json({ posted })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const runs = await prisma.scheduleRun.count({ where: { kind: 'AMORTIZATION', refId: id } })
  if (runs > 0) {
    return NextResponse.json(
      { error: `This prepaid has ${runs} posted period(s) and can't be deleted — that would break the audit trail.` },
      { status: 400 },
    )
  }
  await prisma.prepaidExpense.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
