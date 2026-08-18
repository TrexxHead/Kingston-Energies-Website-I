import crypto from 'crypto'

/**
 * Fygaro — a Caribbean payment gateway settling in JMD, same shape of
 * integration as WiPay: hand the browser a link to a hosted payment page,
 * then trust a signed server-to-server webhook (not a redirect back) to
 * confirm the money actually arrived before fulfilling anything.
 *
 * Setup (see DEPLOY.md):
 *   FYGARO_LINK_URL        the base URL of a Fygaro Link (payment button) you
 *                           create in your Fygaro dashboard
 *   FYGARO_WEBHOOK_SECRET   the signing secret shown when you add a webhook
 *                           endpoint in your Fygaro dashboard, pointed at
 *                           /api/payments/fygaro/webhook
 *
 * IMPORTANT — verify before relying on this in production: the redirect URL
 * parameters below (amount / client_reference) come from Fygaro's published
 * help docs. The webhook signature scheme (Fygaro-Signature: t=…,v1=…, HMAC-
 * SHA256 over the raw body) is documented too, but the exact JSON field names
 * Fygaro sends in the webhook body were not confirmed against a live payload
 * — parseFygaroWebhookEvent below is intentionally defensive (tries several
 * plausible field names) and returns null rather than guessing wrong. Send
 * one real test payment once you have an account, check the server logs for
 * the raw payload, and adjust the field names there if they don't match.
 */

export function fygaroConfigured(): boolean {
  return Boolean(process.env.FYGARO_LINK_URL && process.env.FYGARO_WEBHOOK_SECRET)
}

/** Build the URL to send the customer to for a specific order's amount. */
export function buildFygaroRedirectUrl(opts: { orderNo: string; total: number }): string {
  const base = process.env.FYGARO_LINK_URL ?? ''
  const url = new URL(base)
  url.searchParams.set('amount', opts.total.toFixed(2))
  url.searchParams.set('client_reference', opts.orderNo)
  return url.toString()
}

const REPLAY_WINDOW_SECONDS = 300

/**
 * Verifies the Fygaro-Signature header against the raw request body.
 * Header shape: "t=<unix timestamp>,v1=<hex hmac>[,v1=<hex hmac>…]" — accept
 * if any v1 matches and the timestamp is recent (replay protection).
 */
export function verifyFygaroSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.FYGARO_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false

  const parts = signatureHeader.split(',').map((p) => p.trim())
  const tPart = parts.find((p) => p.startsWith('t='))
  const timestamp = tPart?.slice(2)
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
  if (!timestamp || signatures.length === 0) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > REPLAY_WINDOW_SECONDS) return false

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const expectedBuf = Buffer.from(expected)

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig)
    if (sigBuf.length !== expectedBuf.length) return false
    return crypto.timingSafeEqual(sigBuf, expectedBuf)
  })
}

export interface FygaroWebhookEvent {
  orderNo: string
  paid: boolean
  amount: number | null
}

/**
 * Best-effort parse of the webhook JSON — see the file-level note above.
 * Never throws; returns null if it can't confidently identify the order
 * reference and a success status, so an unrecognized payload safely does
 * nothing rather than guessing an order into "paid".
 */
export function parseFygaroWebhookEvent(body: unknown): FygaroWebhookEvent | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  // Fygaro's own event may nest the transaction under a "data" or "payment" key.
  const candidate = (b.data ?? b.payment ?? b.transaction ?? b) as Record<string, unknown>

  const orderNo = firstString(candidate.client_reference, candidate.reference, candidate.custom_reference, candidate.order_id)
  if (!orderNo) return null

  const status = firstString(candidate.status, candidate.state, b.event, b.type)
  const paid = typeof status === 'string' && /^(completed|success|succeeded|paid|approved)$/i.test(status)

  const amountRaw = candidate.amount ?? candidate.total
  const amount = typeof amountRaw === 'string' || typeof amountRaw === 'number' ? Number(amountRaw) : null

  return { orderNo, paid, amount: Number.isFinite(amount) ? amount : null }
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}
