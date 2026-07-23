import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { sendOrderConfirmation } from '@/lib/email'
import { bulkRateForQty } from '@/lib/pricing'

const orderSchema = z.object({
  customerName: z.string().min(1).max(120),
  paymentMethod: z.enum(['bank', 'lynk', 'paypal', 'cod', 'card']).optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        price: z.number().min(0),
        qty: z.number().int().min(1),
      })
    )
    .min(1),
})

// Generate the next KE-#### order number by incrementing the current max.
async function nextOrderNo(): Promise<string> {
  const orders = await prisma.order.findMany({ select: { orderNo: true } })
  let max = 1023
  for (const o of orders) {
    const n = Number.parseInt(o.orderNo.replace(/[^\d]/g, ''), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `KE-${max + 1}`
}

export async function POST(request: Request) {
  // 10 orders per IP per minute — stops runaway/duplicate submissions.
  const rl = rateLimit(`orders:${clientIp(request)}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const parsed = orderSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? null
  const email = session?.user?.email ?? null

  const { customerName, paymentMethod, items } = parsed.data
  const units = items.reduce((sum, i) => sum + i.qty, 0)
  const gross = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const total = Math.round(gross * (1 - bulkRateForQty(units))) // apply bulk discount
  const orderNo = await nextOrderNo()

  const order = await prisma.order.create({
    data: {
      orderNo,
      userId,
      customerName,
      status: 'PENDING',
      paymentMethod: paymentMethod ?? null,
      total,
      items: { create: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
    },
  })

  // Fire-and-forget confirmation email (no-ops gracefully if no email provider is configured).
  if (email) {
    void sendOrderConfirmation({ to: email, customerName, orderNo: order.orderNo, total, items })
  }

  return NextResponse.json({ orderNo: order.orderNo }, { status: 201 })
}
