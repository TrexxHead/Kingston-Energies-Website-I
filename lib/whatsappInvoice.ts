/**
 * Sending an invoice or receipt from the business's own WhatsApp: a wa.me
 * click-to-chat link to the CUSTOMER's number with the message filled in.
 * Staff check it and press send in their WhatsApp Business app — nothing is
 * sent automatically and no WhatsApp API account is involved.
 */

/**
 * The customer's number as WhatsApp wants it (country code + number, digits
 * only). Jamaican local formats get +1 (876/658); other North
 * American 10-digit numbers get 1; anything starting with + or 00 is taken as
 * international. Null for things that aren't a phone number, e.g. an
 * Instagram handle in the order's contact field.
 */
/** Jamaican local formats → digits-only +1 876/658, or null. */
function jamaicanNumber(s: string): string | null {
  const d = s.replace(/\D/g, '')
  if (d.length === 7) return `1876${d}`
  if (d.length === 10 && /^(876|658)/.test(d)) return `1${d}`
  if (d.length === 11 && /^1(876|658)/.test(d)) return d
  return null
}

export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s || /[a-z@]/i.test(s)) return null
  const jm = jamaicanNumber(s)
  if (jm && !s.startsWith('+') && !s.startsWith('00')) return jm
  let d = s.replace(/\D/g, '')
  if (s.startsWith('00')) d = d.slice(2)
  if (s.startsWith('+') || s.startsWith('00')) return d.length >= 8 && d.length <= 15 ? d : null
  if (d.length === 10) return `1${d}`
  if (d.length === 11 && d.startsWith('1')) return d
  return null
}

/** +1 876 484 9702 style, for showing staff where it's going. */
export function formatWhatsAppNumber(n: string): string {
  if (n.length === 11 && n.startsWith('1')) return `+1 ${n.slice(1, 4)} ${n.slice(4, 7)} ${n.slice(7)}`
  return `+${n}`
}

export function whatsAppSendUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

const jmd = (n: number) => 'J$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export interface InvoiceMessageInput {
  customerName: string
  orderNo: string
  total: number
  paid: boolean
  /** Human label, e.g. "Cash on delivery". */
  paymentLabel?: string | null
  link: string
  expiresAt: Date
  /** Overrides the greeting, e.g. "Island Logistics team" for a company order with no contact name. */
  greeting?: string
}

const TITLES = /^(mr|mrs|ms|miss|mx|dr|rev|pastor|sir|madam)\.?$/i

/**
 * How to greet the customer on file: their first name ("Joleen Ellis" →
 * "Joleen"); with a title, title + surname ("Mrs. Brown", "Dr Clarke");
 * "there" when no name was taken.
 */
export function greetingName(customerName: string | null | undefined): string {
  const parts = (customerName ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'there'
  if (TITLES.test(parts[0]) && parts.length > 1) return `${parts[0]} ${parts[parts.length - 1]}`
  return parts[0]
}

/** The prefilled message: an invoice while unpaid, a receipt once paid. */
export function invoiceMessage(m: InvoiceMessageInput): string {
  const first = m.greeting?.trim() || greetingName(m.customerName)
  const until = m.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Jamaica' })
  const lines = m.paid
    ? [`Hi ${first}, thank you for your purchase from Kingston Energies.`, '', `Payment received for order ${m.orderNo} (${jmd(m.total)}). Here is your receipt:`, m.link]
    : [`Hi ${first}, thank you for your order with Kingston Energies.`, '', `Here is your invoice for order ${m.orderNo}: ${jmd(m.total)}${m.paymentLabel ? `, ${m.paymentLabel.toLowerCase()}` : ''}.`, m.link]
  lines.push('', `Open it to view, print or save it as a PDF (the link works until ${until}). Reply here with any questions.`)
  return lines.join('\n')
}
