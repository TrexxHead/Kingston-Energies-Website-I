import { describe, expect, it } from 'vitest'
import { normalizeWhatsAppNumber, formatWhatsAppNumber, whatsAppSendUrl, invoiceMessage, greetingName } from '@/lib/whatsappInvoice'
import { invoiceLink, checkInvoiceLink, invoiceToken } from '@/lib/invoiceLink'

describe('normalizeWhatsAppNumber', () => {
  it('reads Jamaican local formats', () => {
    expect(normalizeWhatsAppNumber('876 484 9702')).toBe('18764849702')
    expect(normalizeWhatsAppNumber('(876) 484-9702')).toBe('18764849702')
    expect(normalizeWhatsAppNumber('484-9702')).toBe('18764849702')
    expect(normalizeWhatsAppNumber('1-876-484-9702')).toBe('18764849702')
    expect(normalizeWhatsAppNumber('658 555 1234')).toBe('16585551234')
    expect(normalizeWhatsAppNumber('+1 876 484 9702')).toBe('18764849702')
  })
  it('keeps international numbers and other North American numbers', () => {
    expect(normalizeWhatsAppNumber('+44 7700 900123')).toBe('447700900123')
    expect(normalizeWhatsAppNumber('0044 7700 900123')).toBe('447700900123')
    expect(normalizeWhatsAppNumber('305 555 0100')).toBe('13055550100')
  })
  it('rejects things that are not phone numbers', () => {
    expect(normalizeWhatsAppNumber('@joleen.ellis')).toBeNull()
    expect(normalizeWhatsAppNumber('joleen')).toBeNull()
    expect(normalizeWhatsAppNumber('12345')).toBeNull()
    expect(normalizeWhatsAppNumber('')).toBeNull()
    expect(normalizeWhatsAppNumber(null)).toBeNull()
  })
  it('formats for display and builds the wa.me link', () => {
    expect(formatWhatsAppNumber('18764849702')).toBe('+1 876 484 9702')
    expect(whatsAppSendUrl('18764849702', 'Hi & thanks')).toBe('https://wa.me/18764849702?text=Hi%20%26%20thanks')
  })
})

describe('invoice links', () => {
  const now = Date.UTC(2026, 10, 26)
  it('verifies its own link and expires it', () => {
    const { url, expiresAt } = invoiceLink('KE-1048', now)
    const u = new URL(url)
    expect(u.pathname).toBe('/invoice/KE-1048')
    const e = u.searchParams.get('e')
    const t = u.searchParams.get('t')
    expect(checkInvoiceLink('KE-1048', e, t, now)).toBe('ok')
    expect(checkInvoiceLink('KE-1048', e, t, expiresAt.getTime() + 1000)).toBe('expired')
  })
  it('rejects another order, a changed expiry or a bad token', () => {
    const u = new URL(invoiceLink('KE-1048', now).url)
    const e = u.searchParams.get('e')!
    const t = u.searchParams.get('t')!
    expect(checkInvoiceLink('KE-1049', e, t, now)).toBe('invalid')
    expect(checkInvoiceLink('KE-1048', String(Number(e) + 86400 * 365), t, now)).toBe('invalid')
    expect(checkInvoiceLink('KE-1048', e, t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), now)).toBe('invalid')
    expect(checkInvoiceLink('KE-1048', e, null, now)).toBe('invalid')
    expect(checkInvoiceLink('KE-1048', 'soon', invoiceToken('KE-1048', 1), now)).toBe('invalid')
  })
})

describe('invoiceMessage', () => {
  const base = { customerName: 'Joleen Ellis', orderNo: 'KE-1048', total: 3500, link: 'https://example.test/invoice/KE-1048?e=1&t=x', expiresAt: new Date(Date.UTC(2027, 1, 24, 12)) }
  it('sends an invoice while unpaid', () => {
    const m = invoiceMessage({ ...base, paid: false, paymentLabel: 'Cash on delivery' })
    expect(m).toContain('Hi Joleen,')
    expect(m).toContain('invoice for order KE-1048: J$3,500, cash on delivery.')
    expect(m).toContain(base.link)
    expect(m).toContain('until 24 Feb 2027')
  })
  it('sends a receipt once paid', () => {
    const m = invoiceMessage({ ...base, paid: true })
    expect(m).toContain('Payment received for order KE-1048 (J$3,500)')
    expect(m).toContain('receipt')
  })
})

describe('greetingName', () => {
  it('uses the name on file', () => {
    expect(greetingName('Joleen Ellis')).toBe('Joleen')
    expect(greetingName('  marcus  ')).toBe('marcus')
    expect(greetingName('Mrs. Brown')).toBe('Mrs. Brown')
    expect(greetingName('Dr Andre Clarke')).toBe('Dr Clarke')
    expect(greetingName('')).toBe('there')
    expect(greetingName(null)).toBe('there')
  })
})
