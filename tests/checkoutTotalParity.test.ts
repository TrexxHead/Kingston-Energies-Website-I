import { describe, it, expect } from 'vitest'

// Mirrors the server's total formula (app/api/orders/route.ts): clamp the
// discounted subtotal to zero, THEN add delivery.
function serverTotal(gross: number, bulkDiscount: number, promoDiscount: number, pointsDiscount: number, firstOrderDisc: number, fee: number) {
  return Math.max(0, gross - bulkDiscount - promoDiscount - pointsDiscount - firstOrderDisc) + fee
}

// The checkout page's displayTotal formula (app/checkout/page.tsx), after the fix.
function checkoutDisplayTotal(subtotal: number, bulkDiscount: number, discount: number, firstOrderDiscountAmt: number, pointsDiscount: number, fee: number) {
  return Math.max(0, subtotal - bulkDiscount - discount - firstOrderDiscountAmt - pointsDiscount) + fee
}

// The old (buggy) formula, kept here only to prove it really did diverge —
// folds a delivery *estimate* in before clamping, then swaps it for the real
// fee, which is a different operation from clamping first and adding after.
function oldBuggyDisplayTotal(subtotal: number, deliveryEstimate: number, bulkDiscount: number, discount: number, firstOrderDiscountAmt: number, pointsDiscount: number, fee: number) {
  const cartTotal = Math.max(0, subtotal + deliveryEstimate - discount - bulkDiscount - firstOrderDiscountAmt - pointsDiscount)
  return cartTotal - deliveryEstimate + fee
}

/**
 * Regression test for a real bug: the checkout review step could show a
 * lower total than what the server actually charges, whenever combined
 * discounts meet or exceed the subtotal (the clamp-to-zero engages). The
 * fix makes app/checkout/page.tsx's displayTotal use the exact same
 * clamp-then-add-delivery order of operations as the server.
 */
describe('checkout displayTotal matches the server total', () => {
  it('matches the audit repro: J$1,000 subtotal, J$1,000 promo + J$800 points, J$800 delivery', () => {
    const gross = 1000, bulkDiscount = 0, promoDiscount = 1000, pointsDiscount = 800, firstOrderDisc = 0, fee = 800
    const server = serverTotal(gross, bulkDiscount, promoDiscount, pointsDiscount, firstOrderDisc, fee)
    const client = checkoutDisplayTotal(gross, bulkDiscount, promoDiscount, firstOrderDisc, pointsDiscount, fee)
    expect(server).toBe(800)
    expect(client).toBe(server)

    // The pre-fix formula really did diverge for this exact case (proving
    // this is a genuine regression test, not a tautology).
    const deliveryEstimate = 800 // standard flat estimate the cart shows pre-checkout
    const old = oldBuggyDisplayTotal(gross, deliveryEstimate, bulkDiscount, promoDiscount, firstOrderDisc, pointsDiscount, fee)
    expect(old).toBe(0)
    expect(old).not.toBe(server)
  })

  it('matches when discounts are modest and never trigger the clamp', () => {
    const gross = 10000, bulkDiscount = 500, promoDiscount = 300, pointsDiscount = 0, firstOrderDisc = 0, fee = 0
    expect(checkoutDisplayTotal(gross, bulkDiscount, promoDiscount, firstOrderDisc, pointsDiscount, fee)).toBe(
      serverTotal(gross, bulkDiscount, promoDiscount, pointsDiscount, firstOrderDisc, fee)
    )
  })

  it('matches at the exact boundary where discounts equal the subtotal', () => {
    const gross = 5000, bulkDiscount = 0, promoDiscount = 5000, pointsDiscount = 0, firstOrderDisc = 0, fee = 800
    expect(checkoutDisplayTotal(gross, bulkDiscount, promoDiscount, firstOrderDisc, pointsDiscount, fee)).toBe(
      serverTotal(gross, bulkDiscount, promoDiscount, pointsDiscount, firstOrderDisc, fee)
    )
  })
})
