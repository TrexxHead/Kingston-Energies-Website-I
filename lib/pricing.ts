/**
 * Shared pricing rules used by the cart, the checkout order APIs and the
 * product page, so the discount a customer is shown is the discount they
 * actually get.
 *
 * Bulk discount qualifies per product line — buying 3 of the same item earns
 * that line 5% off, but 3 different items in a cart do not stack toward it.
 * Every discount here (bulk, first-order) is computed against product price
 * only; delivery is always added on top, after discounts.
 */

export const FREE_DELIVERY_THRESHOLD = 10000 // J$ — free delivery at/above this
export const DELIVERY_FEE = 800 // J$ — flat fee below the threshold

export interface BulkTier {
  minUnits: number
  rate: number // fraction off, e.g. 0.05 = 5%
}

// Highest threshold first — bulkRateForQty returns the first that matches.
export const BULK_TIERS: BulkTier[] = [
  { minUnits: 10, rate: 0.1 },
  { minUnits: 3, rate: 0.05 },
]

/** The bulk-discount rate (fraction) for a given quantity of the *same* product. */
export function bulkRateForQty(sameItemQty: number): number {
  for (const t of BULK_TIERS) if (sameItemQty >= t.minUnits) return t.rate
  return 0
}

export interface CartLine {
  price: number
  qty: number
}

/** Total bulk discount across a cart — each line qualifies only by its own quantity. */
export function bulkDiscountForLines(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + Math.round(l.price * l.qty * bulkRateForQty(l.qty)), 0)
}

/** Short, honest one-liner for the product page / marketing. */
export const BULK_SUMMARY = 'Buy 3+ of the same item save 5% · 10+ save 10%'

// A genuine first order gets 10% off a single unit of one item — never a
// sitewide code, never a percentage of the whole cart.
export const FIRST_ORDER_DISCOUNT_RATE = 0.1

/** 10% off one unit of the first cart line, only for a verified first-time customer. */
export function firstOrderDiscount(lines: CartLine[], eligible: boolean): number {
  if (!eligible) return 0
  const first = lines[0]
  if (!first || first.qty < 1) return 0
  return Math.round(first.price * FIRST_ORDER_DISCOUNT_RATE)
}
