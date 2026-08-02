// Server-only: touches the database, so this stays separate from
// lib/pricing.ts (which is imported by client components like CartContext).
import { prisma } from '@/lib/prisma'

/**
 * An order counts toward a customer's history (first-order-discount
 * eligibility, spend totals, loyalty points) once they've genuinely
 * committed to it. Every payment path except card records that commitment
 * immediately — the order row is the sale. A card order is different: it's
 * created *before* the customer ever reaches WiPay's hosted payment page
 * (see app/api/payments/wipay/create/route.ts), so it exists the moment
 * they click "pay by card," not the moment they actually pay. If the card
 * gets declined or they just close the tab, that row shouldn't count
 * against them — without this, a customer's first (failed) card attempt
 * permanently costs them the first-order discount they never actually got,
 * and any later abandoned attempt would keep inflating spend-based rewards
 * for orders that never became real sales.
 */
export function countsTowardCustomerHistory(order: { paymentMethod: string | null; paid: boolean }): boolean {
  return !(order.paymentMethod === 'card' && !order.paid)
}

/**
 * A genuine first-time customer: no prior *counted* order tied to their
 * account or email, of any status (a cancelled order still counts as "not
 * new" — this only unlocks once, not once per cancel-and-reorder). Requires
 * at least one identifier; with neither, we can't verify history, so default
 * to false rather than hand out an unverifiable discount.
 */
export async function isFirstTimeCustomer(userId: string | null, email: string | null): Promise<boolean> {
  if (!userId && !email) return false
  const existing = await prisma.order.findFirst({
    where: {
      ...(userId ? { userId } : { email: { equals: email!, mode: 'insensitive' } }),
      NOT: { paymentMethod: 'card', paid: false },
    },
    select: { id: true },
  })
  return !existing
}
