// Server-only: touches the database, so this stays separate from
// lib/pricing.ts (which is imported by client components like CartContext).
import { prisma } from '@/lib/prisma'

/**
 * A genuine first-time customer: no prior order tied to their account or
 * email, of any status (a cancelled order still counts as "not new" — this
 * only unlocks once, not once per cancel-and-reorder). Requires at least one
 * identifier; with neither, we can't verify history, so default to false
 * rather than hand out an unverifiable discount.
 */
export async function isFirstTimeCustomer(userId: string | null, email: string | null): Promise<boolean> {
  if (!userId && !email) return false
  const existing = await prisma.order.findFirst({
    where: userId ? { userId } : { email: { equals: email!, mode: 'insensitive' } },
    select: { id: true },
  })
  return !existing
}
