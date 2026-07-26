import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { customerValueTier, monthsSince } from '@/lib/crm'

const patchSchema = z.object({
  segment: z.enum(['VIP', 'REPEAT', 'NEW']).nullish(),
  loyaltyTier: z.string().max(40).nullish(),
  primaryNeed: z.enum(['EVERYDAY', 'BACKUP', 'OFFGRID', 'BUSINESS']).nullish(),
  phone: z.string().max(40).nullish(),
  name: z.string().min(1).max(120).optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params

  // Guest customer: build the record from their orders (grouped by email).
  if (id.startsWith('guest:')) {
    const email = id.slice('guest:'.length)
    const orders = await prisma.order.findMany({
      where: { userId: null, email: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    if (orders.length === 0) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    const valid = orders.filter((o) => o.status !== 'CANCELLED')
    const ltv = valid.reduce((s, o) => s + o.total, 0)
    const latest = orders[0]
    return NextResponse.json({
      customer: {
        id,
        registered: false,
        name: latest.customerName || email,
        email,
        phone: orders.find((o) => o.phone)?.phone ?? null,
        shippingAddress: orders.find((o) => o.shippingAddress)?.shippingAddress ?? null,
        billingAddress: orders.find((o) => o.billingAddress)?.billingAddress ?? null,
        segment: null,
        loyaltyTier: null,
        primaryNeed: null,
        valueTier: customerValueTier({ ltv, orderCount: valid.length, monthsSinceLastOrder: monthsSince(latest.createdAt), openTickets: 0 }),
        since: new Date(orders[orders.length - 1].createdAt).getFullYear(),
        ltv,
        orderCount: valid.length,
        orders: orders.map((o) => ({
          orderNo: o.orderNo,
          status: o.status,
          total: o.total,
          date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          items: o.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`),
        })),
        tickets: [],
      },
    })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: 'desc' }, include: { items: true } },
      tickets: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!user) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const ltv = user.orders.reduce((sum, o) => sum + o.total, 0)
  const lastOrder = user.orders[0]?.createdAt ?? null // orders are ordered desc
  const openTickets = user.tickets.filter((t) => t.status !== 'RESOLVED').length
  const valueTier = customerValueTier({
    ltv,
    orderCount: user.orders.length,
    monthsSinceLastOrder: monthsSince(lastOrder),
    openTickets,
  })

  return NextResponse.json({
    customer: {
      id: user.id,
      registered: true,
      name: user.name ?? user.email,
      email: user.email,
      phone: user.phone,
      shippingAddress: user.orders.find((o) => o.shippingAddress)?.shippingAddress ?? null,
      billingAddress: user.orders.find((o) => o.billingAddress)?.billingAddress ?? null,
      segment: user.segment,
      loyaltyTier: user.loyaltyTier,
      primaryNeed: user.primaryNeed,
      valueTier,
      since: new Date(user.createdAt).getFullYear(),
      ltv,
      orderCount: user.orders.length,
      orders: user.orders.map((o) => ({
        orderNo: o.orderNo,
        status: o.status,
        total: o.total,
        date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        items: o.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`),
      })),
      tickets: user.tickets.map((t) => ({ id: t.id, subject: t.subject, status: t.status })),
    },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  if (id.startsWith('guest:')) {
    return NextResponse.json({ error: 'Guest customers have no editable profile until they register.' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  try {
    await prisma.user.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }
}

/**
 * Remove a customer. Registered accounts are deleted outright — their orders
 * stay (Order.userId is set null, per schema), preserving revenue history
 * while the account itself goes away. Guest "customers" have no real row; a
 * guest delete request instead cancels/refund-flags their non-final orders so
 * their outstanding history doesn't keep counting toward live metrics.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params

  if (id.startsWith('guest:')) {
    const email = id.slice('guest:'.length)
    await prisma.order.updateMany({
      where: { userId: null, email: { equals: email, mode: 'insensitive' }, status: { notIn: ['CANCELLED', 'DONE'] } },
      data: { status: 'CANCELLED', cancelReason: 'Customer record removed by admin', cancelledAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }
}
