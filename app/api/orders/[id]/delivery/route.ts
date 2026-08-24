import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { deliveryFee, deliveryLineLabel, PICKUP_LOCATIONS } from '@/lib/delivery'
import { orderEditable } from '@/lib/orderEditability'
import { getPaymentConfig, toPublicMethods } from '@/lib/payments'
import { sendBulkEmail, wrapEmailHtml } from '@/lib/email'

const schema = z.object({
  deliveryMethod: z.enum(['standard', 'express', 'pickup']),
  street: z.string().max(200).optional(),
  parish: z.string().min(1).max(60).optional(),
  pickupLocationIndex: z.number().int().min(0).max(PICKUP_LOCATIONS.length - 1).optional(),
  // Gateway methods (card/fygaro) aren't offered here — switching to one
  // means starting a new hosted-payment session, which this simple edit
  // doesn't do. A customer on a failed card attempt can switch to a direct
  // method instead, just not back onto a gateway through this endpoint.
  paymentMethod: z.enum(['bank', 'lynk', 'paypal', 'cod']).optional(),
})

/**
 * Lets a customer change their own order's delivery method/address or
 * payment method, as long as it hasn't been paid yet and isn't already out
 * for delivery (see lib/orderEditability.ts). Recomputes the delivery line
 * item and order total server-side from the real rate sheet — the same
 * math checkout itself uses — never trusting a client-sent fee.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  const { deliveryMethod, paymentMethod } = parsed.data

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, user: { select: { email: true } } } })
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }
  if (!orderEditable(order)) {
    return NextResponse.json({
      error: order.paid
        ? 'This order has already been paid, so delivery and payment details can no longer be changed.'
        : 'This order is already out for delivery and can no longer be changed.',
    }, { status: 409 })
  }

  let shippingAddress: string
  let fee: number
  if (deliveryMethod === 'pickup') {
    if (parsed.data.pickupLocationIndex == null) return NextResponse.json({ error: 'Pick a pickup location.' }, { status: 400 })
    const loc = PICKUP_LOCATIONS[parsed.data.pickupLocationIndex]
    shippingAddress = `Pickup: ${loc.name}, ${loc.address}`
    fee = 0
  } else {
    const street = parsed.data.street?.trim()
    const parish = parsed.data.parish
    if (!street || !parish) return NextResponse.json({ error: 'A delivery address and parish are required.' }, { status: 400 })
    shippingAddress = `${street}, ${parish}`
    fee = deliveryFee(deliveryMethod, parish)
  }

  if (paymentMethod) {
    const config = await getPaymentConfig()
    const enabled = toPublicMethods(config).some((m) => m.id === paymentMethod)
    if (!enabled) return NextResponse.json({ error: 'That payment method isn’t available right now.' }, { status: 400 })
  }

  const oldSummary = `${order.shippingAddress ?? 'no address on file'}${order.paymentMethod ? ` · ${order.paymentMethod}` : ''}`

  try {
    await prisma.$transaction(async (tx) => {
      const nonDeliveryItems = order.items.filter((i) => !i.name.startsWith('Delivery:'))
      const deliveryItem = order.items.find((i) => i.name.startsWith('Delivery:') && !i.productId)

      if (fee > 0) {
        const label = deliveryLineLabel(deliveryMethod, parsed.data.parish ?? '')
        if (deliveryItem) {
          await tx.orderItem.update({ where: { id: deliveryItem.id }, data: { name: label, price: fee } })
        } else {
          await tx.orderItem.create({ data: { orderId: id, name: label, qty: 1, price: fee } })
        }
      } else if (deliveryItem) {
        await tx.orderItem.delete({ where: { id: deliveryItem.id } })
      }

      const total = nonDeliveryItems.reduce((s, i) => s + i.price * i.qty, 0) + fee

      await tx.order.update({
        where: { id },
        data: {
          shippingAddress,
          total,
          ...(paymentMethod ? { paymentMethod } : {}),
        },
      })

      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: 'NOTE',
          label: 'Delivery/payment updated by customer',
          note: `${oldSummary} → ${shippingAddress}${paymentMethod ? ` · ${paymentMethod}` : ''}`,
          adminOnly: false,
        },
      })
    })
  } catch (err) {
    console.error('[orders] customer delivery edit failed:', err)
    return NextResponse.json({ error: 'Could not update your order. Please try again.' }, { status: 400 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    void sendBulkEmail(
      [adminEmail],
      `Order ${order.orderNo} delivery/payment updated by customer`,
      wrapEmailHtml(
        'Order updated by customer',
        `<p><strong>${escapeHtml(order.customerName)}</strong> updated ${order.orderNo}'s delivery/payment details.</p><p>New address: ${escapeHtml(shippingAddress)}${paymentMethod ? `<br>New payment method: ${escapeHtml(paymentMethod)}` : ''}</p>`,
      ),
    )
  }

  return NextResponse.json({ ok: true })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
