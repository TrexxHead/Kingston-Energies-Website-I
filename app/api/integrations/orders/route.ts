import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardIntegration } from '@/lib/integrationAuth'
import { getShopProducts } from '@/lib/products'
import { fmt } from '@/lib/catalog'
import { sendOrderConfirmation } from '@/lib/email'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const bodySchema = z.object({
  channel: z.enum(['whatsapp', 'instagram']),
  customerName: z.string().min(1).max(120),
  contact: z.string().max(120).optional(), // WA number / IG handle
  email: z.string().email().optional(),
  // 'online' → customer will pay via the website link; 'cod' → pay on delivery.
  payment: z.enum(['online', 'cod']).default('online'),
  items: z
    .array(
      z.object({
        id: z.string().optional(), // catalog id, e.g. "pb10"
        name: z.string().optional(), // or match by name
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(20),
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
 * Create an order from a WhatsApp / Instagram conversation. The order lands in
 * the same table as website orders (tagged with its `source`), so it shows in
 * the admin dashboard and the "Needs attention" feed immediately. Prices are
 * resolved server-side from the live catalog — the bot can't set its own prices.
 */
export async function POST(request: Request) {
  const denied = guardIntegration(request)
  if (denied) return denied

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order payload.' }, { status: 400 })
  }
  const { channel, customerName, contact, email, payment, items } = parsed.data

  const catalog = await getShopProducts()

  // Resolve each requested line against the live catalog.
  const resolved: { name: string; price: number; qty: number }[] = []
  const notFound: string[] = []
  const outOfStock: string[] = []

  for (const line of items) {
    const match =
      (line.id && catalog.find((p) => p.id === line.id)) ||
      (line.name && catalog.find((p) => p.name.toLowerCase() === line.name!.toLowerCase())) ||
      (line.name && catalog.find((p) => p.name.toLowerCase().includes(line.name!.toLowerCase())))

    if (!match) {
      notFound.push(line.name ?? line.id ?? 'unknown item')
      continue
    }
    if (!match.inStock) {
      outOfStock.push(match.name)
      continue
    }
    resolved.push({ name: match.name, price: match.price, qty: line.qty })
  }

  if (notFound.length) {
    return NextResponse.json(
      { error: `Couldn't find these items in the catalog: ${notFound.join(', ')}. Check /api/integrations/products for exact names/ids.`, notFound },
      { status: 400 },
    )
  }
  if (outOfStock.length) {
    return NextResponse.json(
      { error: `These items are out of stock: ${outOfStock.join(', ')}.`, outOfStock },
      { status: 409 },
    )
  }

  const total = resolved.reduce((sum, i) => sum + i.price * i.qty, 0)
  const orderNo = await nextOrderNo()
  const source = channel === 'whatsapp' ? 'WHATSAPP' : 'INSTAGRAM'

  const order = await prisma.order.create({
    data: {
      orderNo,
      customerName,
      status: 'PENDING',
      source,
      contact: contact ?? null,
      // 'online' stays unset until the customer pays; 'cod' is recorded up front.
      paymentMethod: payment === 'cod' ? 'cod' : null,
      total,
      items: { create: resolved.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
    },
  })

  // Optional confirmation email if the bot captured one.
  if (email) {
    void sendOrderConfirmation({ to: email, customerName, orderNo: order.orderNo, total, items: resolved })
  }

  const lines = resolved.map((i) => `${i.qty}× ${i.name} — ${fmt(i.price * i.qty)}`)
  const payUrl = payment === 'online' ? `${siteUrl}/track` : null

  // A ready-to-send confirmation the bot can forward verbatim.
  const reply =
    `✅ Order ${order.orderNo} received!\n\n${lines.join('\n')}\nTotal: ${fmt(total)}\n\n` +
    (payment === 'online'
      ? `To pay online, complete checkout here: ${siteUrl}/shop — reference ${order.orderNo}. We'll confirm once payment lands.`
      : `You've chosen pay on delivery. We'll be in touch to arrange delivery of ${order.orderNo}.`) +
    `\n\nTrack your order anytime at ${siteUrl}/track.`

  return NextResponse.json(
    {
      orderNo: order.orderNo,
      total,
      totalFormatted: fmt(total),
      status: 'PENDING',
      payment,
      payUrl,
      trackUrl: `${siteUrl}/track`,
      reply,
    },
    { status: 201 },
  )
}
