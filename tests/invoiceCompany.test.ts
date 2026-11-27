import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/email', () => ({ sendInvoiceEmail: vi.fn() }))

import { buildInvoiceHtml } from '@/lib/invoice'

const base = { orderNo: 'KE-1', contact: null, email: null, shippingAddress: null, billingAddress: null, date: '1 Dec 2026', items: [{ name: 'Item', qty: 1, price: 100 }], total: 100, paid: false, paymentMethod: null }

describe('invoice billed-to', () => {
  it('bills a company, attention the contact, with its TRN', () => {
    const html = buildInvoiceHtml({ ...base, customerName: 'Andre Clarke', company: 'Island Logistics <Ltd>', companyTrn: '123-456-789' })
    expect(html).toContain('Island Logistics &lt;Ltd&gt;\nAttn: Andre Clarke\nTRN: 123-456-789')
  })
  it('omits Attn when the order is billed to the company alone', () => {
    const html = buildInvoiceHtml({ ...base, customerName: 'Island Logistics', company: 'Island Logistics', companyTrn: null })
    expect(html).not.toContain('Attn:')
  })
  it('bills a person as before', () => {
    expect(buildInvoiceHtml({ ...base, customerName: 'Joleen Ellis' })).toContain('Joleen Ellis')
  })
})
