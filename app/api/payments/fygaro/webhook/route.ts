import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFygaroSignature, parseFygaroWebhookEvent } from '@/lib/fygaro'
import { markPointsRedeemed } from '@/lib/pointsRedemption'
import { postOrderPayment } from '@/lib/ledger/post'
import { sendOrderConfirmation } from '@/lib/email'
import { trackToken } from '@/lib/trackToken'
import { fulfillOrderItems } from '@/lib/orderFulfillment'

const POINTS_LINE_RE = /^Rewards points redeemed \((\d+) pts\)$/

/**
 * Fygaro confirms payment server-to-server here, not via a customer-facing
 * redirect (see lib/fygaro.ts for why). Mirrors the WiPay callback: verify
 * the signature, cross-check the amount against our own order record, only
 * then mark it paid and claim stock — an unsigned or mismatched request
 * changes nothing.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('fygaro-signature')

  if (!verifyFygaroSignature(rawBody, signature)) {
    console.error('[fygaro webhook] signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const event = parseFygaroWebhookEvent(json)
  if (!event) {
    // Signature was genuine but the payload shape didn't match what we
    // expect — log it so the field-name mapping in lib/fygaro.ts can be
    // corrected against a real payload, without ever guessing an order paid.
    console.error('[fygaro webhook] could not parse event, raw payload:', rawBody)
    return NextResponse.json({ ok: true })
  }
  if (!event.paid) {
    return NextResponse.json({ ok: true })
  }

  try {
    const existing = await prisma.order.findUnique({ where: { orderNo: event.orderNo }, select: { total: true, paid: true, paymentMethod: true } })
    if (!existing || existing.paymentMethod !== 'fygaro' || existing.paid) {
      return NextResponse.json({ ok: true })
    }
    if (event.amount !== null && Math.abs(event.amount - existing.total) > 1) {
      console.error(`[fygaro webhook] total mismatch on ${event.orderNo}: reported ${event.amount}, order total ${existing.total}`)
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 409 })
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { orderNo: event.orderNo }, data: { paid: true }, include: { items: true } })
      // Stock/serials are only claimed once payment actually clears — same
      // safety property as the WiPay callback.
      await fulfillOrderItems(tx, updated.items.map((oi) => ({ orderItemId: oi.id, name: oi.name, qty: oi.qty })), { mode: 'allow' })
      return updated
    })

    void postOrderPayment(order, new Date()).catch((err) => console.error('[ledger] fygaro payment posting failed:', err))

    if (order.userId) {
      const pointsLine = order.items.find((i) => POINTS_LINE_RE.test(i.name))
      const match = pointsLine ? POINTS_LINE_RE.exec(pointsLine.name) : null
      if (match) await markPointsRedeemed(order.userId, Number(match[1]))
    }

    // Unlike WiPay, Fygaro doesn't reliably land the customer back on our
    // site, so email is the confirmation here.
    if (order.email) {
      void sendOrderConfirmation({
        to: order.email,
        customerName: order.customerName,
        orderNo: order.orderNo,
        total: order.total,
        items: order.items,
        trackToken: trackToken(order.orderNo),
      })
    }
  } catch (err) {
    console.error('[fygaro webhook] failed to process:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
