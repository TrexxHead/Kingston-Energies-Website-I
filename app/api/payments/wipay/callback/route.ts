import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWiPayCallback } from '@/lib/wipay'
import { markPointsRedeemed } from '@/lib/pointsRedemption'
import { postOrderPayment } from '@/lib/ledger/post'
import { trackToken } from '@/lib/trackToken'
import { fulfillOrderItems } from '@/lib/orderFulfillment'

const POINTS_LINE_RE = /^Rewards points redeemed \((\d+) pts\)$/

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * WiPay redirects the customer back here after payment. We verify the hash,
 * mark the order paid on success, then bounce the customer to the confirmation
 * (or back to checkout on failure). WiPay may use GET or POST — handle both.
 */
async function handle(params: URLSearchParams): Promise<NextResponse> {
  const orderNo = params.get('order_id') ?? ''
  const status = (params.get('status') ?? '').toLowerCase()
  const verified = verifyWiPayCallback({
    transaction_id: params.get('transaction_id') ?? undefined,
    total: params.get('total') ?? undefined,
    currency: params.get('currency') ?? undefined,
    hash: params.get('hash') ?? undefined,
  })

  if (orderNo && status === 'success' && verified) {
    try {
      const existing = await prisma.order.findUnique({ where: { orderNo }, select: { total: true } })
      // The hash proves this total genuinely came from WiPay, but not that it's
      // the amount we actually billed for — cross-check against our own record
      // before trusting it (within a cent for float rounding).
      const paidTotal = Number(params.get('total') ?? NaN)
      if (!existing || !Number.isFinite(paidTotal) || Math.abs(paidTotal - existing.total) > 1) {
        console.error(`[wipay] total mismatch on ${orderNo}: charged ${paidTotal}, order total ${existing?.total}`)
        return NextResponse.redirect(`${siteUrl}/checkout?payment=failed`, 303)
      }

      const order = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({ where: { orderNo }, data: { paid: true }, include: { items: true } })
        // Stock/serials are only claimed once the card payment actually clears —
        // an abandoned or failed WiPay attempt never touches inventory.
        // Payment already cleared with WiPay by this point — never roll back and
        // leave a charged customer without an order over a stock race.
        await fulfillOrderItems(tx, updated.items.map((oi) => ({ orderItemId: oi.id, name: oi.name, qty: oi.qty })), { mode: 'allow' })
        return updated
      })
      // Journal the cash receipt against the receivable now that it cleared.
      void postOrderPayment(order, new Date()).catch((err) => console.error('[ledger] wipay payment posting failed:', err))
      // Card payments only deduct redeemed points once payment actually
      // clears, so an abandoned WiPay checkout never costs the customer points.
      if (order.userId) {
        const pointsLine = order.items.find((i) => POINTS_LINE_RE.test(i.name))
        const match = pointsLine ? POINTS_LINE_RE.exec(pointsLine.name) : null
        if (match) await markPointsRedeemed(order.userId, Number(match[1]))
      }
    } catch {
      // Order not found — still send the customer somewhere sensible below.
    }
    return NextResponse.redirect(`${siteUrl}/confirm?order=${encodeURIComponent(orderNo)}&paid=1&t=${trackToken(orderNo)}`, 303)
  }

  // Failed / unverified — send them back to checkout with a flag.
  return NextResponse.redirect(`${siteUrl}/checkout?payment=failed`, 303)
}

export async function GET(request: Request) {
  return handle(new URL(request.url).searchParams)
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const params = new URLSearchParams()
  if (form) for (const [k, v] of form.entries()) params.set(k, String(v))
  return handle(params)
}
