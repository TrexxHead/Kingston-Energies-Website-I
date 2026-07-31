import crypto from 'crypto'

/**
 * A per-order tracking credential, derived rather than stored.
 *
 * /api/orders/track used to accept an order number alone — fine for the
 * "just paid, redirect straight to the tracking page" flow, but order
 * numbers are sequential (KE-####), so it also let anyone enumerate every
 * order on the site. This closes that without a schema change or any new
 * friction for a real customer: the token is HMAC(orderNo) under a secret
 * only the server has, computed fresh wherever it's needed rather than
 * stored on the Order row. It rides along automatically in the checkout →
 * confirm → track redirect chain and in the confirmation email link, so
 * the customer never sees or types it — anyone else hitting /track with a
 * guessed order number and no token gets nothing.
 */

const SECRET = process.env.NEXTAUTH_SECRET ?? 'kingston-energies-track-token-fallback'

export function trackToken(orderNo: string): string {
  return crypto.createHmac('sha256', SECRET).update(`track:${orderNo}`).digest('hex')
}

export function verifyTrackToken(orderNo: string, token: string | null | undefined): boolean {
  if (!token) return false
  const expected = trackToken(orderNo)
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
