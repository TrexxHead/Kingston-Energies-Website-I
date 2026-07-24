import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { PIPELINE, clampStage } from '@/lib/pipeline'

/**
 * Public-ish tracking lookup by order number. Returns only low-sensitivity
 * delivery info (stage, customer-facing timeline, ETA, item names) — never the
 * customer's name, address or payment details.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const no = url.searchParams.get('no')?.trim().toUpperCase()
  const session = await getServerSession(authOptions)

  const order = no
    ? await prisma.order.findUnique({
        where: { orderNo: no },
        include: { items: { select: { name: true, qty: true } }, events: { where: { adminOnly: false }, orderBy: { createdAt: 'asc' } } },
      })
    : session?.user?.id
      ? await prisma.order.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          include: { items: { select: { name: true, qty: true } }, events: { where: { adminOnly: false }, orderBy: { createdAt: 'asc' } } },
        })
      : null

  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  const cancelled = order.status === 'CANCELLED'
  const stage = clampStage(order.stage)

  return NextResponse.json({
    orderNo: order.orderNo,
    cancelled,
    stage,
    lastStage: PIPELINE.length - 1,
    estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
    placedAt: order.createdAt.toISOString(),
    items: order.items,
    stages: PIPELINE.map((s, i) => {
      // Attach the timestamp of the matching STAGE event, if any.
      const ev = order.events.find((e) => e.type === 'STAGE' && e.label === s.label)
      return {
        key: s.key,
        label: s.label,
        headline: s.headline,
        blurb: s.blurb,
        done: !cancelled && i <= stage,
        current: !cancelled && i === stage,
        at: i === 0 ? order.createdAt.toISOString() : ev ? ev.createdAt.toISOString() : null,
      }
    }),
    updates: order.events
      .filter((e) => e.note)
      .map((e) => ({ label: e.label, note: e.note, at: e.createdAt.toISOString() })),
  })
}
