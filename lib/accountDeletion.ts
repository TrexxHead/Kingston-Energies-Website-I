import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { suppress } from '@/lib/suppression'

/**
 * Deactivates a customer's own account. Everything they've generated —
 * orders, points, reviews, addresses, devices — stays exactly as it is; only
 * the ability to sign in and to be reached by automated marketing is
 * removed. The password is overwritten with a random, properly-hashed value
 * (never a plain string) so login stays impossible even if the deletedAt
 * check were ever bypassed.
 */
export async function deactivateAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (!user) return

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), password: await hashPassword(randomBytes(32).toString('hex')) },
  })

  // Rides the same suppression list every marketing send already checks
  // (campaigns, lifecycle automations, abandoned-cart recovery) — one write
  // stops every automated channel at once.
  await suppress(user.email, 'DELETED')
}
