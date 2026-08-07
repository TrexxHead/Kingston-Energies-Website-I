import { prisma } from '@/lib/prisma'

/**
 * A TeamMember ↔ Employee link is only ever valid when the Employee is real
 * and not already claimed by a different TeamMember — checked here so a
 * conflict comes back as a clean 409, not the DB's unique constraint on
 * TeamMember.employeeId throwing an unhandled 500. Shared by the HR people
 * routes and the Payroll employee routes, since either side can initiate
 * the link.
 */
export async function validateEmployeeLink(employeeId: string, currentTeamMemberId?: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, teamMember: { select: { id: true } } } })
  if (!employee) return 'That payroll record could not be found.'
  if (employee.teamMember && employee.teamMember.id !== currentTeamMemberId) {
    return 'That payroll record is already linked to another person.'
  }
  return null
}
