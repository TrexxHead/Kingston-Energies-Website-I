import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { createManualOrder } from '@/lib/manualOrder'

/**
 * Converts a quote-bearing Lead into a real Order — the "funnel a quote
 * request through to a sale" action. Reuses createManualOrder() so the
 * resulting order is indistinguishable from any other manually-recorded
 * sale: same ledger postings, same fulfillment, same pipeline. The Lead is
 * marked CONVERTED and linked to the order it became, so the quote's
 * origin stays traceable from either side.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (lead.convertedOrderId) return NextResponse.json({ error: 'This quote has already been converted to an order.' }, { status: 409 })

  const items = (lead.quoteItems as { name: string; price: number; qty: number }[] | null) ?? []
  if (items.length === 0) {
    return NextResponse.json({ error: 'This lead has no itemized quote to convert — it came in as a plain enquiry.' }, { status: 400 })
  }

  const order = await createManualOrder({
    customerName: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: 'OTHER',
    shippingAddress: lead.quoteArea || undefined,
    items,
  })

  await prisma.lead.update({
    where: { id },
    data: { status: 'CONVERTED', convertedOrderId: order.id, convertedAt: new Date() },
  })

  return NextResponse.json({ orderId: order.id, orderNo: order.orderNo }, { status: 201 })
}
