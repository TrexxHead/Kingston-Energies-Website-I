import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { postPayrollRun, postPayrollPayment } from '@/lib/ledger/post'
import { summarise, type PayslipCalc } from '@/lib/payroll'

/** Full run detail: every payslip, the frozen rates, and the run totals. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      payslips: {
        include: { employee: { select: { employeeNo: true, firstName: true, lastName: true, jobTitle: true, frequency: true } } },
        orderBy: { employee: { lastName: 'asc' } },
      },
    },
  })
  if (!run) return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })

  const totals = summarise(run.payslips.map((p) => toCalc(p)))

  return NextResponse.json({
    run: {
      id: run.id,
      runNo: run.runNo,
      periodStart: run.periodStart.toISOString(),
      periodEnd: run.periodEnd.toISOString(),
      payDate: run.payDate.toISOString(),
      status: run.status,
      approvedAt: run.approvedAt?.toISOString() ?? null,
      paidAt: run.paidAt?.toISOString() ?? null,
      entryId: run.entryId,
      notes: run.notes,
      rateSnapshot: run.rateSnapshot,
    },
    totals,
    payslips: run.payslips.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeNo: p.employee.employeeNo,
      name: `${p.employee.firstName} ${p.employee.lastName}`,
      jobTitle: p.employee.jobTitle,
      frequency: p.employee.frequency,
      gross: p.gross,
      paye: p.paye,
      nisEmployee: p.nisEmployee,
      nhtEmployee: p.nhtEmployee,
      edTaxEmployee: p.edTaxEmployee,
      otherDeductions: p.otherDeductions,
      net: p.net,
      nisEmployer: p.nisEmployer,
      nhtEmployer: p.nhtEmployer,
      edTaxEmployer: p.edTaxEmployer,
      heartEmployer: p.heartEmployer,
    })),
  })
}

/** Payslip rows carry the same shape the calculator returns, minus the derived totals. */
function toCalc(p: {
  gross: number
  paye: number
  nisEmployee: number
  nhtEmployee: number
  edTaxEmployee: number
  otherDeductions: number
  net: number
  nisEmployer: number
  nhtEmployer: number
  edTaxEmployer: number
  heartEmployer: number
}): PayslipCalc {
  return {
    ...p,
    totalDeductions: p.paye + p.nisEmployee + p.nhtEmployee + p.edTaxEmployee + p.otherDeductions,
    totalEmployerCost: p.gross + p.nisEmployer + p.nhtEmployer + p.edTaxEmployer + p.heartEmployer,
  }
}

const patchSchema = z.object({
  action: z.enum(['approve', 'markPaid', 'note']),
  notes: z.string().max(2000).optional(),
  /** Date the staff were actually paid; defaults to now. */
  paidAt: z.string().optional(),
})

/**
 * Approve or settle a run.
 *
 * Approval is the point the run hits the books — it posts the journal entry and
 * becomes immutable. Marking it paid records the cash leaving the bank; the
 * payment itself happens outside this system.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { action } = parsed.data

  const run = await prisma.payrollRun.findUnique({ where: { id }, include: { payslips: true } })
  if (!run) return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })

  if (action === 'note') {
    await prisma.payrollRun.update({ where: { id }, data: { notes: parsed.data.notes ?? null } })
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve') {
    if (run.status !== 'DRAFT') {
      return NextResponse.json({ error: `This run is already ${run.status.toLowerCase()}.` }, { status: 409 })
    }
    if (run.payslips.length === 0) {
      return NextResponse.json({ error: 'There is nothing to approve — this run has no payslips.' }, { status: 400 })
    }

    const entry = await postPayrollRun(
      { id: run.id, runNo: run.runNo, payDate: run.payDate, payslips: run.payslips },
      session.user?.email ?? null,
    )

    await prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: session.user?.email ?? null,
        // postPayrollRun returns null when this run was already posted — keep
        // whatever entry is on the run rather than clearing the link.
        entryId: entry?.id ?? run.entryId,
        notes: parsed.data.notes ?? run.notes,
      },
    })
    return NextResponse.json({ ok: true, entryNo: entry?.entryNo ?? null })
  }

  // markPaid
  if (run.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Approve the run before marking it paid.' }, { status: 409 })
  }
  const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date()
  if (Number.isNaN(paidAt.getTime())) return NextResponse.json({ error: 'Invalid payment date' }, { status: 400 })

  const net = Math.round(run.payslips.reduce((s, p) => s + p.net, 0) * 100) / 100
  await postPayrollPayment({ id: run.id, runNo: run.runNo, net }, paidAt, session.user?.email ?? null)
  await prisma.payrollRun.update({ where: { id }, data: { status: 'PAID', paidAt } })

  return NextResponse.json({ ok: true })
}

/** Discard a draft run. Approved runs are on the books and cannot be deleted. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const run = await prisma.payrollRun.findUnique({ where: { id }, select: { status: true } })
  if (!run) return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
  if (run.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'This run has been approved and posted to the ledger. Reverse the journal entry instead of deleting it.' },
      { status: 409 },
    )
  }

  await prisma.payrollRun.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
