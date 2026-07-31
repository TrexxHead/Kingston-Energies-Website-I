import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { sendNewOrderAlert } from '@/lib/email'
import { postOrderCogs, postOrderPayment, postOrderRevenue } from '@/lib/ledger/post'
import { fulfillOrderItems } from '@/lib/orderFulfillment'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true, events: { orderBy: { createdAt: 'asc' } } },
  })

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      customerName: o.customerName,
      status: o.status,
      source: o.source,
      contact: o.contact,
      registered: Boolean(o.userId),
      email: o.email,
      phone: o.phone,
      shippingAddress: o.shippingAddress,
      cancelReason: o.cancelReason,
      stage: o.stage,
      estimatedDelivery: o.estimatedDelivery ? o.estimatedDelivery.toISOString() : null,
      events: o.events.map((e) => ({
        id: e.id,
        type: e.type,
        label: e.label,
        note: e.note,
        adminOnly: e.adminOnly,
        at: e.createdAt.toISOString(),
      })),
      paymentMethod: o.paymentMethod,
      paid: o.paid,
      invoiced: Boolean(o.invoicedAt),
      hasProofOfPayment: Boolean(o.proofOfPaymentPath),
      total: o.total,
      itemCount: o.items.reduce((sum, i) => sum + i.qty, 0),
      date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    })),
  })
}

const MANUAL_SOURCES = ['WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'FACE_TO_FACE', 'PHONE', 'OTHER'] as const

const manualOrderSchema = z.object({
  customerName: z.string().min(1).max(120),
  contact: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  source: z.enum(MANUAL_SOURCES),
  paymentMethod: z.enum(['bank', 'lynk', 'paypal', 'cod', 'card']).optional(),
  paid: z.boolean().optional(),
  shippingAddress: z.string().max(400).optional(),
  items: z
    .array(z.object({ name: z.string().min(1).max(160), price: z.number().min(0), qty: z.number().int().min(1).max(999) }))
    .min(1),
})

async function nextOrderNo(): Promise<string> {
  const orders = await prisma.order.findMany({ select: { orderNo: true } })
  let max = 1023
  for (const o of orders) {
    const n = Number.parseInt(o.orderNo.replace(/[^\d]/g, ''), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `KE-${max + 1}`
}

/**
 * Record an order the admin took manually (Instagram DM, face to face, a
 * phone call, etc). It lands in the exact same table as website orders, so
 * it flows through the normal pipeline — status changes, invoicing, delivery
 * tracking all work identically. It's always recorded guest-style (no userId)
 * regardless of source: a manual sale doesn't create a customer account or
 * accrue loyalty points, since the "customer" here didn't go through the site.
 */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = manualOrderSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })

  const { customerName, contact, email, phone, source, paymentMethod, paid, shippingAddress, items } = parsed.data
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const orderNo = await nextOrderNo()

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNo,
        customerName,
        status: 'PENDING',
        source,
        contact: contact ?? null,
        email: email ?? null,
        phone: phone ?? null,
        shippingAddress: shippingAddress ?? null,
        paymentMethod: paymentMethod ?? null,
        paid: paid ?? false,
        total,
        items: { create: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
      },
      include: { items: true },
    })
    await fulfillOrderItems(tx, created.items.map((oi) => ({ orderItemId: oi.id, name: oi.name, qty: oi.qty })))
    return created
  })

  // A manual order is a real sale — it hits the ledger exactly like a website
  // order, which is what keeps off-site revenue inside the financial statements.
  void postOrderRevenue({ ...order, items }).catch((err) => console.error('[ledger] manual order revenue posting failed:', err))
  void postOrderCogs({ ...order, items }).catch((err) => console.error('[ledger] manual order COGS posting failed:', err))
  if (order.paid) {
    void postOrderPayment(order, order.createdAt).catch((err) => console.error('[ledger] manual order payment posting failed:', err))
  }

  void sendNewOrderAlert({ orderNo: order.orderNo, customerName, total, paymentMethod: paymentMethod ?? null, items })

  return NextResponse.json({ id: order.id, orderNo: order.orderNo }, { status: 201 })
}
