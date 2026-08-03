import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const schema = z.object({ note: z.string().trim().min(1).max(400) })

/**
 * A plain internal note on an order, independent of the delivery pipeline —
 * unlike the stage endpoint, this works on any order regardless of status
 * (including cancelled), since a note ("customer asked for a refund by
 * cheque", "called twice, no answer") is often needed exactly when an order
 * isn't moving through the normal flow.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a note.' }, { status: 400 })

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const event = await prisma.orderEvent.create({
    data: { orderId: id, type: 'NOTE', label: 'Internal note', note: parsed.data.note, adminOnly: true },
  })
  return NextResponse.json({ ok: true, event: { id: event.id, type: event.type, label: event.label, note: event.note, adminOnly: event.adminOnly, at: event.createdAt } }, { status: 201 })
}
