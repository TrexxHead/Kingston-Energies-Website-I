/**
 * Shared pricing rules used by the cart, the checkout order APIs and the
 * product page, so the discount a customer is shown is the discount they
 * actually get.
 *
 * Bulk discount is based on the total number of units in the order.
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

/** The bulk-discount rate (fraction) for a given total unit count. */
export function bulkRateForQty(totalUnits: number): number {
  for (const t of BULK_TIERS) if (totalUnits >= t.minUnits) return t.rate
  return 0
}

/** Short, honest one-liner for the product page / marketing. */
export const BULK_SUMMARY = 'Buy 3+ save 5% · 10+ save 10%'
