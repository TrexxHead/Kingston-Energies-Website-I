import { prisma } from '@/lib/prisma'

/**
 * A signed-in customer's solar projects: those on their account, plus any
 * sent with their (verified) e-mail before they signed in — which are then
 * attached to the account.
 */
export async function customerProjects(user: { id: string; email?: string | null }) {
  const email = user.email?.toLowerCase()
  if (email) await prisma.solarProject.updateMany({ where: { userId: null, email }, data: { userId: user.id } }).catch(() => {})
  return prisma.solarProject.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
}

/** One project, only if it belongs to this customer — with what they may see of it. */
export async function customerProject(user: { id: string; email?: string | null }, projectNo: string) {
  await customerProjects(user)
  return prisma.solarProject.findFirst({
    where: { projectNo, userId: user.id },
    include: {
      events: { where: { customerVisible: true }, orderBy: { createdAt: 'desc' } },
      documents: { where: { customerVisible: true }, orderBy: { createdAt: 'desc' } },
    },
  })
}
