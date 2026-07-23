import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      customerName: o.customerName,
      status: o.status,
      source: o.source,
      contact: o.contact,
      paymentMethod: o.paymentMethod,
      paid: o.paid,
      total: o.total,
      itemCount: o.items.reduce((sum, i) => sum + i.qty, 0),
      date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    })),
  })
}
