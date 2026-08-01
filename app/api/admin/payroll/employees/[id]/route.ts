import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  grossPerPeriod: z.number().positive().optional(),
  frequency: z.enum(['MONTHLY', 'FORTNIGHTLY', 'WEEKLY']).optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
  jobTitle: z.string().max(120).nullish(),
  department: z.string().max(80).nullish(),
  email: z.string().max(160).nullish(),
  endedAt: z.string().nullish(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const { endedAt, ...rest } = parsed.data
  const employee = await prisma.employee.update({
    where: { id },
    data: { ...rest, ...(endedAt !== undefined ? { endedAt: endedAt ? new Date(endedAt) : null } : {}) },
  }).catch(() => null)
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

/** Remove an employee who has never been paid. Anyone with payslips is terminated instead. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const slips = await prisma.payslip.count({ where: { employeeId: id } })
  if (slips > 0) {
    return NextResponse.json(
      { error: `This employee has ${slips} payslip(s). Set them to Terminated instead. Deleting would break the payroll record.` },
      { status: 400 },
    )
  }
  await prisma.employee.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
