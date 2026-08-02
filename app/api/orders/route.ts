import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { sendOrderConfirmation, sendNewOrderAlert } from '@/lib/email'
import { bulkDiscountForLines, firstOrderDiscount } from '@/lib/pricing'
import { validatePromo } from '@/lib/promo'
import { isFirstTimeCustomer } from '@/lib/customerHistory'
import { deliveryFee, deliveryLineLabel } from '@/lib/delivery'
import { resolvePointsRedemption, redeemPointsAtomic, PointsUnavailableError } from '@/lib/pointsRedemption'
import { postOrderCogs, postOrderRevenue } from '@/lib/ledger/post'
import { validateCartPrices } from '@/lib/cartValidation'
import { trackToken } from '@/lib/trackToken'
import { fulfillOrderItems, InsufficientStockError } from '@/lib/orderFulfillment'
import { withOrderNoRetry } from '@/lib/orderNo'

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

export async function POST(request: Request) {
  // 10 orders per IP per minute — stops runaway/duplicate submissions.
  const rl = await rateLimit(`orders:${clientIp(request)}`, 10, 60_000)
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

    const gross = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const bulkDiscount = bulkDiscountForLines(items)
    // Validate + apply the promo server-side (never trust a client-sent amount).
    const promo = promoCode ? await validatePromo(promoCode, gross) : null
    const promoDiscount = promo?.valid ? (promo.discount ?? 0) : 0
    // Rewards points redeemed — re-validated against the customer's real balance server-side.
    const { pointsUsed, discount: pointsDiscount } = await resolvePointsRedemption(userId, pointsRedeemed ?? 0)
    // A genuine first order gets 10% off one unit of the first item — never a
    // sitewide code, never a cut of the whole cart. Verified against real order
    // history, not trusted from the client.
    const firstTime = await isFirstTimeCustomer(userId, contactEmail)
    const firstOrderDisc = firstOrderDiscount(items, firstTime)
    // Delivery fee is recomputed server-side from the rate sheet — never trust a client-sent amount.
    const fee = deliveryMethod && parish ? deliveryFee(deliveryMethod, parish) : 0
    const total = Math.max(0, gross - bulkDiscount - promoDiscount - pointsDiscount - firstOrderDisc) + fee
    const recordedItems = [
      ...items,
      ...(fee > 0 && deliveryMethod && parish ? [{ name: deliveryLineLabel(deliveryMethod, parish), qty: 1, price: fee }] : []),
      ...(firstOrderDisc > 0 ? [{ name: 'First order discount (10% off first item)', qty: 1, price: -firstOrderDisc }] : []),
      ...(pointsUsed > 0 ? [{ name: `Rewards points redeemed (${pointsUsed} pts)`, qty: 1, price: -pointsDiscount }] : []),
    ]

    const order = await withOrderNoRetry((orderNo) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
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
            promoCode: promo?.valid ? promo.code ?? null : null,
            total,
            items: { create: recordedItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
          },
          include: { items: true },
        })
        await fulfillOrderItems(tx, created.items.map((oi) => ({ orderItemId: oi.id, name: oi.name, qty: oi.qty })))
        // Deducted atomically inside the same transaction as the order itself —
        // re-checks the balance at commit time, not just at quote time above, so
        // a second concurrent checkout can't spend the same points twice. If the
        // balance won't actually cover it any more, the whole order rolls back
        // (safe here: no payment has cleared yet on this path).
        if (userId && pointsUsed > 0) {
          await redeemPointsAtomic(tx, userId, pointsUsed)
        }
        return created
      })
    )

    // Recognise the revenue + cost of sales in the general ledger. Best-effort:
    // the order must never fail because of a posting problem, and the backfill
    // reconciles anything that slipped through.
    void postOrderRevenue({ ...order, items: recordedItems }).catch((err) => console.error('[ledger] order revenue posting failed:', err))
    void postOrderCogs({ ...order, items: recordedItems }).catch((err) => console.error('[ledger] order COGS posting failed:', err))

    // Mark this cart as converted so it isn't counted as abandoned.
    if (cartId) {
      await prisma.cart.updateMany({ where: { id: cartId }, data: { status: 'CONVERTED' } }).catch(() => {})
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
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: `Sorry, "${err.productName}" just sold out. Please update your cart and try again.` }, { status: 409 })
    }
    if (err instanceof PointsUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    console.error('[orders] failed to create order:', err)
    return NextResponse.json({ error: 'Could not place your order. Please try again.' }, { status: 500 })
  }
}
