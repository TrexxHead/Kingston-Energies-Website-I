import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWiPayCallback } from '@/lib/wipay'

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
      await prisma.order.update({ where: { orderNo }, data: { paid: true } })
    } catch {
      // Order not found — still send the customer somewhere sensible below.
    }
    return NextResponse.redirect(`${siteUrl}/confirm?order=${encodeURIComponent(orderNo)}&paid=1`, 303)
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
