import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { PAYMENT_LABEL } from '@/lib/invoice'
import { invoiceLink } from '@/lib/invoiceLink'
import { formatWhatsAppNumber, invoiceMessage, normalizeWhatsAppNumber, whatsAppSendUrl } from '@/lib/whatsappInvoice'

/**
 * Prepare an invoice (or receipt, once paid) to send from the business's own
 * WhatsApp: mints a fresh signed invoice link, builds the message, and returns
 * the wa.me link that opens WhatsApp on the customer's chat with it filled in.
 * Staff press send in WhatsApp. Logged on the order's history.
 *
 * Body (optional): { phone } — a number to use when the order has none (or
 * a different one); saved on the order if it had no phone. { via: 'link' }
 * when staff only copied the link (logged as such).
 */
const bodySchema = z.object({ phone: z.string().trim().max(40).optional(), via: z.enum(['whatsapp', 'link']).optional() }).optional()

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => undefined))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const override = parsed.data?.phone
  const copied = parsed.data?.via === 'link'

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, orderNo: true, customerName: true, company: true, phone: true, contact: true, total: true, paid: true, paymentMethod: true, invoicedAt: true },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const number = normalizeWhatsAppNumber(override) ?? (override ? null : (normalizeWhatsAppNumber(order.phone) ?? normalizeWhatsAppNumber(order.contact)))
  if (!number && !copied) {
    return NextResponse.json({ error: override ? 'That doesn’t look like a phone number. Use e.g. 876 555 1234.' : 'No phone number on this order.', needsPhone: true }, { status: 422 })
  }

  const link = invoiceLink(order.orderNo)
  const message = invoiceMessage({
    customerName: order.customerName,
    // A company order billed to the company alone greets the company, not "Hi Island".
    greeting: order.company && order.customerName.trim() === order.company.trim() ? `${order.company} team` : undefined,
    orderNo: order.orderNo,
    total: order.total,
    paid: order.paid,
    paymentLabel: order.paymentMethod ? (PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod) : null,
    link: link.url,
    expiresAt: link.expiresAt,
  })
  const to = number ? formatWhatsAppNumber(number) : null
  const kind = order.paid ? 'Receipt' : 'Invoice'

  await prisma.$transaction([
    prisma.orderEvent.create({ data: { orderId: order.id, type: 'NOTE', label: copied ? `${kind} link copied` : `${kind} shared on WhatsApp`, note: `${copied ? 'Link to share by hand' : `Opened WhatsApp to ${to} with a link`}, valid until ${link.expiresAt.toISOString().slice(0, 10)}.`, adminOnly: true } }),
    prisma.order.update({ where: { id: order.id }, data: { ...(order.invoicedAt ? {} : { invoicedAt: new Date() }), ...(override && !order.phone ? { phone: override } : {}) } }),
  ])

  return NextResponse.json({ url: number ? whatsAppSendUrl(number, message) : null, link: link.url, message, to, kind: kind.toLowerCase() })
}
