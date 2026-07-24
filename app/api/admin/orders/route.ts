import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

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
      total: o.total,
      itemCount: o.items.reduce((sum, i) => sum + i.qty, 0),
      date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    })),
  })
}
