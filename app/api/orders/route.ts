import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { sendOrderConfirmation, sendNewOrderAlert } from '@/lib/email'
import { bulkRateForQty } from '@/lib/pricing'
import { validatePromo } from '@/lib/promo'
import { deliveryFee, deliveryLineLabel } from '@/lib/delivery'
import { resolvePointsRedemption, markPointsRedeemed } from '@/lib/pointsRedemption'
import { postOrderCogs, postOrderRevenue } from '@/lib/ledger/post'
import { validateCartPrices } from '@/lib/cartValidation'
import { trackToken } from '@/lib/trackToken'

const orderSchema = z.object({
  customerName: z.string().min(1).max(120),
  email: z.string().email().max(160).optional(),
  phone: z.string().max(40).optional(),
  shippingAddress: z.string().max(400).optional(),
  billingAddress: z.string().max(400).optional(),
  cartId: z.string().max(60).optional(),
  parish: z.string().max(60).optional(),
  deliveryMethod: z.enum(['standard', 'express', 'pickup']).optional(),
  paymentMethod: z.enum(['bank', 'lynk', 'paypal', 'cod', 'card']).optional(),
  promoCode: z.string().max(40).optional(),
  pointsRedeemed: z.number().int().min(0).max(1_000_000).optional(),
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

  let body: unknown
  try {
    body = await request.json()
  } catch (err) {
    console.error('[orders] failed to parse request body:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    console.error('[orders] validation failed:', parsed.error.flatten())
    return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
  }

  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null

    const { customerName, email, phone, shippingAddress, billingAddress, cartId, parish, deliveryMethod, paymentMethod, promoCode, pointsRedeemed, items } = parsed.data
    // Prefer the signed-in email, else the one the guest typed at checkout.
    const contactEmail = session?.user?.email ?? email ?? null

    // Item prices come from the request body — confirm every one is a real
    // product at its real current price before it becomes an order total.
    const priceCheck = await validateCartPrices(items)
    if (!priceCheck.ok) {
      return NextResponse.json({ error: priceCheck.error }, { status: 400 })
    }

    const units = items.reduce((sum, i) => sum + i.qty, 0)
    const gross = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const bulkDiscount = Math.round(gross * bulkRateForQty(units))
    // Validate + apply the promo server-side (never trust a client-sent amount).
    const promo = promoCode ? await validatePromo(promoCode, gross) : null
    const promoDiscount = promo?.valid ? (promo.discount ?? 0) : 0
    // Rewards points redeemed — re-validated against the customer's real balance server-side.
    const { pointsUsed, discount: pointsDiscount } = await resolvePointsRedemption(userId, pointsRedeemed ?? 0)
    // Delivery fee is recomputed server-side from the rate sheet — never trust a client-sent amount.
    const fee = deliveryMethod && parish ? deliveryFee(deliveryMethod, parish) : 0
    const total = Math.max(0, gross - bulkDiscount - promoDiscount - pointsDiscount) + fee
    const orderNo = await nextOrderNo()
    const recordedItems = [
      ...items,
      ...(fee > 0 && deliveryMethod && parish ? [{ name: deliveryLineLabel(deliveryMethod, parish), qty: 1, price: fee }] : []),
      ...(pointsUsed > 0 ? [{ name: `Rewards points redeemed (${pointsUsed} pts)`, qty: 1, price: -pointsDiscount }] : []),
    ]

    const order = await prisma.order.create({
      data: {
        orderNo,
        userId,
        customerName,
        email: contactEmail,
        phone: phone ?? null,
        shippingAddress: shippingAddress ?? null,
        billingAddress: billingAddress ?? null,
        status: 'PENDING',
        paymentMethod: paymentMethod ?? null,
        total,
        items: { create: recordedItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
      },
    })

    // Recognise the revenue + cost of sales in the general ledger. Best-effort:
    // the order must never fail because of a posting problem, and the backfill
    // reconciles anything that slipped through.
    void postOrderRevenue({ ...order, items: recordedItems }).catch((err) => console.error('[ledger] order revenue posting failed:', err))
    void postOrderCogs({ ...order, items: recordedItems }).catch((err) => console.error('[ledger] order COGS posting failed:', err))

    // Mark this cart as converted so it isn't counted as abandoned.
    if (cartId) {
      await prisma.cart.updateMany({ where: { id: cartId }, data: { status: 'CONVERTED' } }).catch(() => {})
    }
    // Deduct the redeemed points from the customer's balance now that the order exists.
    if (userId && pointsUsed > 0) {
      await markPointsRedeemed(userId, pointsUsed)
    }

    const token = trackToken(order.orderNo)

    // Fire-and-forget confirmation email (works for guests too, via captured email).
    if (contactEmail) {
      void sendOrderConfirmation({ to: contactEmail, customerName, orderNo: order.orderNo, total, items: recordedItems, trackToken: token })
    }
    // Alert every admin so orders needing manual follow-up (bank/Lynk/PayPal/COD) get seen promptly.
    void sendNewOrderAlert({ orderNo: order.orderNo, customerName, total, paymentMethod: paymentMethod ?? null, items: recordedItems })

    return NextResponse.json({ orderNo: order.orderNo, trackToken: token }, { status: 201 })
  } catch (err) {
    console.error('[orders] failed to create order:', err)
    return NextResponse.json({ error: 'Could not place your order. Please try again.' }, { status: 500 })
  }
}
