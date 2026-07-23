import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { buildWiPayRequest, wipayConfigured } from '@/lib/wipay'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const bodySchema = z.object({
  customerName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  items: z.array(z.object({ name: z.string().min(1).max(160), price: z.number().min(0), qty: z.number().int().min(1) })).min(1),
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
 * Start a card payment: create the order (unpaid), then return the WiPay hosted
 * form fields for the browser to POST to. The order is reconciled/marked paid
 * later by the WiPay callback.
 */
export async function POST(request: Request) {
  if (!wipayConfigured()) {
    return NextResponse.json({ error: 'Card payments are not available right now.' }, { status: 503 })
  }
  const rl = rateLimit(`wipay:${clientIp(request)}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const { customerName, email, items } = parsed.data
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const orderNo = await nextOrderNo()

  await prisma.order.create({
    data: {
      orderNo,
      userId: session?.user?.id ?? null,
      customerName,
      status: 'PENDING',
      paymentMethod: 'card',
      paid: false,
      total,
      items: { create: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
    },
  })

  const req = buildWiPayRequest({
    orderNo,
    total,
    responseUrl: `${siteUrl}/api/payments/wipay/callback`,
    customerName,
    email: email ?? session?.user?.email ?? undefined,
  })

  return NextResponse.json({ orderNo, action: req.action, fields: req.fields })
}
