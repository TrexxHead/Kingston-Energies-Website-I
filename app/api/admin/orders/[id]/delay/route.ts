import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const schema = z.object({
  delayed: z.boolean(),
  reason: z.string().trim().max(400).optional(),
})

/**
 * Defer an order (stock-out, a supplier delay, anything) or clear a delay
 * that's since resolved. Independent of status/stage — a delayed order still
 * shows exactly where it is in the pipeline, just with a visible reason
 * attached. Always logs a customer-facing OrderEvent, so the delay (and its
 * resolution) is part of the order's own history, not just a flag no one
 * can see why was set.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { delayed, reason } = parsed.data

  if (delayed && !reason) return NextResponse.json({ error: 'Enter a reason for the delay.' }, { status: 400 })

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  await prisma.order.update({
    where: { id },
    data: delayed
      ? { delayed: true, delayReason: reason, delayedAt: new Date() }
      : { delayed: false, delayReason: null, delayedAt: null },
  })

  await prisma.orderEvent.create({
    data: {
      orderId: id,
      type: delayed ? 'DELAYED' : 'NOTE',
      label: delayed ? 'Order delayed' : 'Delay resolved',
      note: delayed ? reason : null,
      adminOnly: false,
    },
  })

  return NextResponse.json({ ok: true })
}
