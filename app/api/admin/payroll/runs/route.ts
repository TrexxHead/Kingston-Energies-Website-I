import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { calculatePayslip, getPayrollRates, summarise, type PayFrequency, type PayslipCalc } from '@/lib/payroll'

/** Payroll run history with totals. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const runs = await prisma.payrollRun.findMany({
    orderBy: { periodStart: 'desc' },
    take: 24,
    include: { payslips: true },
  })

  return NextResponse.json({
    runs: runs.map((r) => {
      const gross = r.payslips.reduce((s, p) => s + p.gross, 0)
      const net = r.payslips.reduce((s, p) => s + p.net, 0)
      const employerCost = r.payslips.reduce(
        (s, p) => s + p.gross + p.nisEmployer + p.nhtEmployer + p.edTaxEmployer + p.heartEmployer,
        0,
      )
      return {
        id: r.id,
        runNo: r.runNo,
        periodStart: r.periodStart.toISOString(),
        periodEnd: r.periodEnd.toISOString(),
        payDate: r.payDate.toISOString(),
        status: r.status,
        headcount: r.payslips.length,
        gross: Math.round(gross),
        net: Math.round(net),
        employerCost: Math.round(employerCost),
        posted: Boolean(r.entryId),
      }
    }),
  })
}

const schema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  payDate: z.string().min(1),
  /** Restrict to specific employees; defaults to everyone active. */
  employeeIds: z.array(z.string()).optional(),
})

/**
 * Draft a payroll run. Calculates every payslip against the rates in force
 * right now and freezes them onto the run, so a historic payslip always
 * reproduces exactly even after rates change.
 */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payroll run' }, { status: 400 })
  const d = parsed.data

  const periodStart = new Date(d.periodStart)
  const periodEnd = new Date(d.periodEnd)
  const payDate = new Date(d.payDate)
  if ([periodStart, periodEnd, payDate].some((x) => Number.isNaN(x.getTime()))) {
    return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
  }
  if (periodEnd < periodStart) return NextResponse.json({ error: 'The period end must fall after the start.' }, { status: 400 })

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE', ...(d.employeeIds?.length ? { id: { in: d.employeeIds } } : {}) },
  })
  if (employees.length === 0) return NextResponse.json({ error: 'No active employees to pay.' }, { status: 400 })

  const rates = await getPayrollRates()
  const count = await prisma.payrollRun.count()
  const runNo = `PR-${String(count + 1).padStart(4, '0')}`

  const calcs: { employeeId: string; calc: PayslipCalc }[] = employees.map((e) => ({
    employeeId: e.id,
    calc: calculatePayslip(e.grossPerPeriod, e.frequency as PayFrequency, rates),
  }))

  const run = await prisma.payrollRun.create({
    data: {
      runNo,
      periodStart,
      periodEnd,
      payDate,
      rateSnapshot: rates as unknown as object,
      payslips: {
        create: calcs.map(({ employeeId, calc }) => ({
          employeeId,
          gross: calc.gross,
          paye: calc.paye,
          nisEmployee: calc.nisEmployee,
          nhtEmployee: calc.nhtEmployee,
          edTaxEmployee: calc.edTaxEmployee,
          otherDeductions: calc.otherDeductions,
          net: calc.net,
          nisEmployer: calc.nisEmployer,
          nhtEmployer: calc.nhtEmployer,
          edTaxEmployer: calc.edTaxEmployer,
          heartEmployer: calc.heartEmployer,
        })),
      },
    },
  })

  return NextResponse.json({ id: run.id, runNo, totals: summarise(calcs.map((c) => c.calc)) }, { status: 201 })
}
