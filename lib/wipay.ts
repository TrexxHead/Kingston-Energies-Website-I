import crypto from 'crypto'

/**
 * WiPay (Caribbean) hosted card-payment gateway — Jamaica.
 *
 * Flow: we create the order, then hand the browser a form that POSTs to WiPay's
 * hosted page. The customer pays there; WiPay redirects back to our callback
 * with the result, which we verify by hash before marking the order paid.
 *
 * Setup (see DEPLOY.md): open a WiPay merchant account, then set —
 *   WIPAY_ACCOUNT_NUMBER   your WiPay account number
 *   WIPAY_API_KEY          your WiPay API key (used to verify callbacks)
 *   WIPAY_ENVIRONMENT      "sandbox" (default) or "live"
 *
 * Field names / hash formula follow WiPay's public "Request A Transaction"
 * docs; if your merchant dashboard specifies different values, adjust here.
 */

const REQUEST_URL = 'https://jm.wipayfinancial.com/plugins/payments/request'

export function wipayConfigured(): boolean {
  return Boolean(process.env.WIPAY_ACCOUNT_NUMBER && process.env.WIPAY_API_KEY)
}

export function wipayEnvironment(): 'sandbox' | 'live' {
  return process.env.WIPAY_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
}

export interface WiPayRequest {
  action: string
  fields: Record<string, string>
}

/** Build the hosted-payment form fields for an order. */
export function buildWiPayRequest(opts: {
  orderNo: string
  total: number
  responseUrl: string
  customerName?: string
  email?: string
}): WiPayRequest {
  const fields: Record<string, string> = {
    account_number: process.env.WIPAY_ACCOUNT_NUMBER ?? '',
    total: opts.total.toFixed(2),
    currency: 'JMD',
    country_code: 'JM',
    environment: wipayEnvironment(),
    method: 'credit_card',
    fee_structure: 'customer_pay', // customer covers the gateway fee
    order_id: opts.orderNo,
    origin: 'kingston-energies',
    response_url: opts.responseUrl,
  }
  if (opts.customerName) fields.name = opts.customerName
  if (opts.email) fields.email = opts.email
  return { action: REQUEST_URL, fields }
}

/**
 * Verify a WiPay callback. Returns true when the hash matches our API key, so a
 * forged "success" can't mark an order paid. If WiPay didn't send a hash we
 * conservatively return false (never trust an unsigned "paid").
 */
export function verifyWiPayCallback(params: {
  transaction_id?: string
  total?: string
  currency?: string
  hash?: string
}): boolean {
  const apiKey = process.env.WIPAY_API_KEY
  if (!apiKey || !params.hash || !params.transaction_id) return false
  // WiPay documents the response hash as md5(transaction_id + currency + total + API key).
  const expected = crypto
    .createHash('md5')
    .update(`${params.transaction_id}${params.currency ?? 'JMD'}${params.total ?? ''}${apiKey}`)
    .digest('hex')
  return expected.toLowerCase() === params.hash.toLowerCase()
}
