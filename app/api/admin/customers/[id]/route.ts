import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  segment: z.enum(['VIP', 'REPEAT', 'NEW']).nullish(),
  loyaltyTier: z.string().max(40).nullish(),
  phone: z.string().max(40).nullish(),
  name: z.string().min(1).max(120).optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: 'desc' }, include: { items: true } },
      tickets: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!user) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const ltv = user.orders.reduce((sum, o) => sum + o.total, 0)

  return NextResponse.json({
    customer: {
      id: user.id,
      name: user.name ?? user.email,
      email: user.email,
      phone: user.phone,
      segment: user.segment,
      loyaltyTier: user.loyaltyTier,
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
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  try {
    await prisma.user.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }
}
