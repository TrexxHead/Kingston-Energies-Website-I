import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { buildFygaroRedirectUrl, fygaroConfigured } from '@/lib/fygaro'
import { bulkDiscountForLines, firstOrderDiscount } from '@/lib/pricing'
import { validatePromo } from '@/lib/promo'
import { isFirstTimeCustomer } from '@/lib/customerHistory'
import { deliveryFee, deliveryLineLabel } from '@/lib/delivery'
import { sendNewOrderAlert } from '@/lib/email'
import { resolvePointsRedemption } from '@/lib/pointsRedemption'
import { validateCartPrices } from '@/lib/cartValidation'
import { withOrderNoRetry } from '@/lib/orderNo'
import { orderToken, verifyOrderToken } from '@/lib/trackToken'

const bodySchema = z.object({
  customerName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  shippingAddress: z.string().max(400).optional(),
  billingAddress: z.string().max(400).optional(),
  cartId: z.string().max(60).optional(),
  parish: z.string().max(60).optional(),
  deliveryMethod: z.enum(['standard', 'express', 'pickup']).optional(),
  promoCode: z.string().max(40).optional(),
  pointsRedeemed: z.number().int().min(0).max(1_000_000).optional(),
  campaignRef: z.string().max(60).optional(),
  items: z.array(z.object({ name: z.string().min(1).max(160), price: z.number().min(0), qty: z.number().int().min(1) })).min(1),
  // A retry of a failed/abandoned attempt — see wipay/create for the same pattern.
  retryOrderNo: z.string().max(40).optional(),
  retryToken: z.string().max(200).optional(),
})

/**
 * Start a Fygaro payment: create the order (unpaid), then return the hosted
 * Fygaro Link the browser should go to. Unlike WiPay, Fygaro's redirect-back
 * behavior isn't confirmed (see lib/fygaro.ts), so the order is reconciled
 * purely by the webhook, not by anything in the URL the customer returns on.
 */
export async function POST(request: Request) {
  if (!fygaroConfigured()) {
    return NextResponse.json({ error: 'Fygaro is not available right now.' }, { status: 503 })
  }
  const rl = await rateLimit(`fygaro:${clientIp(request)}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? null
  const { customerName, email, phone, shippingAddress, billingAddress, cartId, parish, deliveryMethod, promoCode, pointsRedeemed, campaignRef, items, retryOrderNo, retryToken } = parsed.data
  const campaignId = campaignRef ? await prisma.campaign.findUnique({ where: { id: campaignRef }, select: { id: true } }).then((c) => c?.id ?? null) : null

  const priceCheck = await validateCartPrices(items)
  if (!priceCheck.ok) {
    return NextResponse.json({ error: priceCheck.error }, { status: 400 })
  }

  const gross = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const bulkDiscount = bulkDiscountForLines(items)
  const promo = promoCode ? await validatePromo(promoCode, gross) : null
  const { pointsUsed, discount: pointsDiscount } = await resolvePointsRedemption(userId, pointsRedeemed ?? 0)
  const firstTime = await isFirstTimeCustomer(userId, session?.user?.email ?? email ?? null)
  const firstOrderDisc = firstOrderDiscount(items, firstTime)
  const fee = deliveryMethod && parish ? deliveryFee(deliveryMethod, parish) : 0
  const total = Math.max(0, gross - bulkDiscount - (promo?.valid ? (promo.discount ?? 0) : 0) - pointsDiscount - firstOrderDisc) + fee
  const recordedItems = [
    ...items,
    ...(fee > 0 && deliveryMethod && parish ? [{ name: deliveryLineLabel(deliveryMethod, parish), qty: 1, price: fee }] : []),
    ...(firstOrderDisc > 0 ? [{ name: 'First order discount (10% off first item)', qty: 1, price: -firstOrderDisc }] : []),
    ...(pointsUsed > 0 ? [{ name: `Rewards points redeemed (${pointsUsed} pts)`, qty: 1, price: -pointsDiscount }] : []),
  ]

  let orderNo: string
  let isRetry = false
  try {
    const reusable =
      retryOrderNo && verifyOrderToken('fygaro-retry', retryOrderNo, retryToken)
        ? await prisma.order.findUnique({ where: { orderNo: retryOrderNo } })
        : null

    if (reusable && reusable.paymentMethod === 'fygaro' && !reusable.paid && reusable.status === 'PENDING') {
      await prisma.$transaction([
        prisma.orderItem.deleteMany({ where: { orderId: reusable.id } }),
        prisma.order.update({
          where: { id: reusable.id },
          data: {
            customerName,
            email: session?.user?.email ?? email ?? null,
            phone: phone ?? null,
            shippingAddress: shippingAddress ?? null,
            billingAddress: billingAddress ?? null,
            promoCode: promo?.valid ? promo.code ?? null : null,
            campaignId,
            total,
            items: { create: recordedItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
          },
        }),
      ])
      orderNo = reusable.orderNo
      isRetry = true
    } else {
      const created = await withOrderNoRetry((no) =>
        prisma.order.create({
          data: {
            orderNo: no,
            userId: session?.user?.id ?? null,
            customerName,
            email: session?.user?.email ?? email ?? null,
            phone: phone ?? null,
            shippingAddress: shippingAddress ?? null,
            billingAddress: billingAddress ?? null,
            status: 'PENDING',
            paymentMethod: 'fygaro',
            paid: false,
            promoCode: promo?.valid ? promo.code ?? null : null,
            campaignId,
            total,
            items: { create: recordedItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
          },
        })
      )
      orderNo = created.orderNo
    }
  } catch (err) {
    console.error('[fygaro/create] failed to create order:', err)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }

  if (cartId) {
    await prisma.cart.updateMany({ where: { id: cartId }, data: { status: 'CONVERTED' } }).catch(() => {})
  }

  if (!isRetry) {
    void sendNewOrderAlert({ orderNo, customerName, total, paymentMethod: 'fygaro', items: recordedItems })
  }

  const redirectUrl = buildFygaroRedirectUrl({ orderNo, total })
  return NextResponse.json({ orderNo, retryToken: orderToken('fygaro-retry', orderNo), redirectUrl })
}
