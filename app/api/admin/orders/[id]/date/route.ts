import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'

const schema = z.object({ date: z.string().date() })

/**
 * Backdate/postdate when an order was placed — for a sale that was entered
 * late, or a timestamp that was simply wrong. Only touches Order.createdAt;
 * it deliberately does NOT move the revenue/COGS ledger entries already
 * posted for this order (lib/ledger/post.ts snapshots the date at posting
 * time), so the admin UI has to say so — this endpoint trusts the caller
 * already confirmed that trade-off.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, orderNo: true, createdAt: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const newDate = new Date(parsed.data.date)
  if (Number.isNaN(newDate.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  // Keep the original time-of-day — only the calendar day is being corrected.
  newDate.setHours(order.createdAt.getHours(), order.createdAt.getMinutes(), order.createdAt.getSeconds(), order.createdAt.getMilliseconds())

  const updated = await prisma.order.update({ where: { id }, data: { createdAt: newDate } })

  logActivity({
    label: `Order date adjusted: ${order.orderNo}`,
    detail: `${order.createdAt.toISOString().slice(0, 10)} → ${newDate.toISOString().slice(0, 10)} (ledger entries already posted were not moved)`,
    entity: 'order',
    entityId: order.id,
    actorEmail: session.user?.email ?? null,
  })

  return NextResponse.json({ ok: true, createdAt: updated.createdAt.toISOString() })
}
