import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { PIPELINE, clampStage } from '@/lib/pipeline'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { verifyTrackToken } from '@/lib/trackToken'

/**
 * Public-ish tracking lookup by order number. Returns only low-sensitivity
 * delivery info (stage, customer-facing timeline, ETA, item names) — never the
 * customer's name, address or payment details.
 *
 * A lookup by number alone is only honoured when it's accompanied by proof
 * this is actually that order's owner: the tracking token minted at order
 * creation (rides along invisibly through the post-checkout redirect and the
 * confirmation email — see lib/trackToken.ts), a signed-in session that owns
 * the order, or a matching email on the order. Order numbers are sequential
 * (KE-####), so without one of those this would otherwise let anyone browse
 * every order on the site by counting.
 */
export async function GET(request: Request) {
  // Order numbers are sequential (KE-####) — rate-limit lookups so the
  // endpoint can't be used to enumerate every order on the site.
  const rl = await rateLimit(`track:${clientIp(request)}`, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a moment.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }

  const url = new URL(request.url)
  const no = url.searchParams.get('no')?.trim().toUpperCase()
  const token = url.searchParams.get('t')
  const emailParam = url.searchParams.get('email')?.trim().toLowerCase()
  const session = await getServerSession(authOptions)

  let order = no
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

  if (order && no) {
    const tokenOk = verifyTrackToken(no, token)
    const sessionOwnsIt = Boolean(session?.user?.id && order.userId === session.user.id)
    const emailOk = Boolean(emailParam && order.email && order.email.toLowerCase() === emailParam)
    // Looked up by number but couldn't prove ownership — answer the same as a
    // genuine miss, so this can't be used to confirm an order number is real.
    if (!tokenOk && !sessionOwnsIt && !emailOk) order = null
  }

  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  const cancelled = order.status === 'CANCELLED'
  const stage = clampStage(order.stage)

  return NextResponse.json({
    orderNo: order.orderNo,
    cancelled,
    stage,
    lastStage: PIPELINE.length - 1,
    delayed: order.delayed,
    delayReason: order.delayReason,
    estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
    placedAt: order.createdAt.toISOString(),
    total: order.total,
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
