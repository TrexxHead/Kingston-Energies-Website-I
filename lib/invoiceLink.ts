import { orderToken, verifyOrderToken } from './trackToken'

/**
 * A shareable invoice link for customers without an account (face-to-face,
 * phone and WhatsApp orders): /invoice/KE-1048?e=<expiry>&t=<token>.
 *
 * The token is an HMAC of the order number and the expiry under the server
 * secret (same derivation as order tracking, its own scope), so it can't be
 * guessed from the sequential order number, only opens that one invoice, and
 * stops working after the expiry. Nothing is stored; sending again mints a
 * fresh link.
 */

export const INVOICE_LINK_DAYS = 90
const SCOPE = 'invoice'
/** 128 bits of the HMAC is plenty and keeps the link short in a chat. */
const TOKEN_LEN = 32

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kingstonenergies.com').replace(/\/$/, '')

export function invoiceToken(orderNo: string, expiresAt: number): string {
  return orderToken(SCOPE, `${orderNo}:${expiresAt}`).slice(0, TOKEN_LEN)
}

export function invoiceLink(orderNo: string, now = Date.now(), days = INVOICE_LINK_DAYS): { url: string; expiresAt: Date } {
  const e = Math.floor(now / 1000) + days * 86400
  const url = `${siteUrl()}/invoice/${encodeURIComponent(orderNo)}?e=${e}&t=${invoiceToken(orderNo, e)}`
  return { url, expiresAt: new Date(e * 1000) }
}

export type InvoiceLinkCheck = 'ok' | 'expired' | 'invalid'

export function checkInvoiceLink(orderNo: string, e: string | null, t: string | null, now = Date.now()): InvoiceLinkCheck {
  const exp = Number(e)
  if (!e || !t || !Number.isInteger(exp) || t.length !== TOKEN_LEN) return 'invalid'
  // Compare against the full-length token's prefix in constant time.
  const full = orderToken(SCOPE, `${orderNo}:${exp}`)
  if (!verifyOrderToken(SCOPE, `${orderNo}:${exp}`, t + full.slice(TOKEN_LEN))) return 'invalid'
  return exp * 1000 < now ? 'expired' : 'ok'
}
