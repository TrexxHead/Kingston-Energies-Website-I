import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, isMissingSchemaError } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { calculatePayslip, getPayrollRates, type PayFrequency } from '@/lib/payroll'
import { migrationPendingResponse } from '@/lib/apiErrors'
import { signedUrl } from '@/lib/storage'

/** Employee register, each with a live preview of their current payslip. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  try {
    return await getEmployees()
  } catch (err) {
    if (isMissingSchemaError(err)) return migrationPendingResponse()
    throw err
  }
}

async function getEmployees() {
  const [employees, rates] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      include: { teamMember: { select: { id: true, firstName: true, lastName: true, photoPath: true } } },
    }),
    getPayrollRates(),
  ])

  const rows = await Promise.all(
    employees.map(async (e) => {
      const calc = calculatePayslip(e.grossPerPeriod, e.frequency as PayFrequency, rates)
      return {
        id: e.id,
        employeeNo: e.employeeNo,
        name: `${e.firstName} ${e.lastName}`,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        trn: e.trn,
        jobTitle: e.jobTitle,
        department: e.department,
        grossPerPeriod: e.grossPerPeriod,
        frequency: e.frequency,
        status: e.status,
        startedAt: e.startedAt.toISOString(),
        preview: { net: calc.net, deductions: calc.totalDeductions, employerCost: calc.totalEmployerCost },
        linkedPerson: e.teamMember
          ? {
              id: e.teamMember.id,
              name: `${e.teamMember.firstName} ${e.teamMember.lastName}`,
              photoUrl: await signedUrl(e.teamMember.photoPath),
            }
          : null,
      }
    }),
  )

  return NextResponse.json({ employees: rows })
}

const schema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().optional().or(z.literal('')),
  trn: z.string().max(30).optional(),
  nisNumber: z.string().max(30).optional(),
  jobTitle: z.string().max(120).optional(),
  department: z.string().max(80).optional(),
  grossPerPeriod: z.number().positive(),
  frequency: z.enum(['MONTHLY', 'FORTNIGHTLY', 'WEEKLY']),
  startedAt: z.string().min(1),
  teamMemberId: z.string().optional(),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid employee' }, { status: 400 })
  const d = parsed.data

  const startedAt = new Date(d.startedAt)
  if (Number.isNaN(startedAt.getTime())) return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })

  if (d.teamMemberId) {
    const person = await prisma.teamMember.findUnique({ where: { id: d.teamMemberId }, select: { type: true, employeeId: true } })
    if (!person) return NextResponse.json({ error: 'That HR profile could not be found.' }, { status: 404 })
    if (person.type !== 'EMPLOYEE') return NextResponse.json({ error: 'Only employees can be linked to a payroll record.' }, { status: 400 })
    if (person.employeeId) return NextResponse.json({ error: 'That HR profile is already linked to a payroll record.' }, { status: 409 })
  }

  try {
    return await createEmployee(d, startedAt)
  } catch (err) {
    if (isMissingSchemaError(err)) return migrationPendingResponse()
    throw err
  }
}

async function createEmployee(d: z.infer<typeof schema>, startedAt: Date) {
  // Sequential employee number, KE-EMP-001.
  const count = await prisma.employee.count()
  const employeeNo = `KE-EMP-${String(count + 1).padStart(3, '0')}`

  const employee = await prisma.employee.create({
    data: {
      employeeNo,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email || null,
      trn: d.trn || null,
      nisNumber: d.nisNumber || null,
      jobTitle: d.jobTitle || null,
      department: d.department || null,
      grossPerPeriod: d.grossPerPeriod,
      frequency: d.frequency,
      startedAt,
    },
  })

  if (d.teamMemberId) {
    await prisma.teamMember.update({ where: { id: d.teamMemberId }, data: { employeeId: employee.id } })
  }

  return NextResponse.json({ id: employee.id, employeeNo }, { status: 201 })
}
