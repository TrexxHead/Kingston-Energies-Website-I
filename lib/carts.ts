import { prisma } from '@/lib/prisma'
import { LAUNCH_DATE } from '@/lib/launch'
import type { Prisma } from '@prisma/client'

/**
 * A cart is "real" (a genuine visitor, not internal testing) when it was
 * synced after the public launch and isn't tied to a signed-in admin
 * account. Shared by the metrics endpoint (what gets counted) and the purge
 * endpoint (what gets deleted) so the two can never disagree about what
 * counts as test data.
 */
export async function testCartWhere(): Promise<Prisma.CartWhereInput> {
  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } })
  const adminIds = admins.map((a) => a.id)

  return {
    OR: [{ createdAt: { lt: LAUNCH_DATE } }, ...(adminIds.length ? [{ userId: { in: adminIds } }] : [])],
  }
}

export async function realCartWhere(): Promise<Prisma.CartWhereInput> {
  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } })
  const adminIds = admins.map((a) => a.id)

  return {
    createdAt: { gte: LAUNCH_DATE },
    // Explicit OR with `userId: null` rather than a bare `notIn` — a nullable
    // scalar's `notIn` filter can exclude NULL rows outright in SQL, and
    // guest carts (no account) must stay counted.
    ...(adminIds.length ? { OR: [{ userId: null }, { userId: { notIn: adminIds } }] } : {}),
  }
}
