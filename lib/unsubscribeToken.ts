import crypto from 'crypto'

/**
 * A per-email unsubscribe credential, derived rather than stored (same
 * approach as lib/trackToken.ts) — anyone with the link in their own inbox
 * can unsubscribe themselves in one click; nobody can unsubscribe someone
 * else's address by guessing it, since the token is an HMAC only the server
 * can compute.
 */
const SECRET = process.env.NEXTAUTH_SECRET ?? 'kingston-energies-unsubscribe-token-fallback'

export function unsubscribeToken(email: string): string {
  return crypto.createHmac('sha256', SECRET).update(`unsubscribe:${email.toLowerCase()}`).digest('hex')
}

export function verifyUnsubscribeToken(email: string, token: string | null | undefined): boolean {
  if (!token) return false
  const expected = unsubscribeToken(email)
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
