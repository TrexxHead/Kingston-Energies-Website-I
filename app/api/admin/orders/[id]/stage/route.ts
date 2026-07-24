import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { sendBulkEmail } from '@/lib/email'
import { PIPELINE, clampStage, statusForStage, LAST_STAGE } from '@/lib/pipeline'

const schema = z.object({
  // Either set an absolute stage or advance by one.
  stage: z.number().int().min(0).max(LAST_STAGE).optional(),
  advance: z.boolean().optional(),
  // Optional customer-facing update + internal (admin-only) note.
  customerNote: z.string().max(400).optional(),
  internalNote: z.string().max(400).optional(),
  estimatedDelivery: z.string().datetime().optional().nullable(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const order = await prisma.order.findUnique({ where: { id }, include: { user: { select: { email: true } } } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status === 'CANCELLED') return NextResponse.json({ error: 'This order has been cancelled.' }, { status: 409 })

  const { stage, advance, customerNote, internalNote, estimatedDelivery } = parsed.data
  const target = advance ? clampStage(order.stage + 1) : stage !== undefined ? clampStage(stage) : order.stage
  const moved = target !== order.stage
  const def = PIPELINE[target]

  await prisma.order.update({
    where: { id },
    data: {
      stage: target,
      status: statusForStage(target),
      ...(estimatedDelivery !== undefined ? { estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null } : {}),
    },
  })

  // Log timeline events: the stage change (customer-facing) and any notes.
  const events: { orderId: string; type: string; label?: string | null; note?: string | null; adminOnly?: boolean }[] = []
  if (moved) {
    events.push({ orderId: id, type: 'STAGE', label: def.label, note: customerNote?.trim() || def.blurb, adminOnly: false })
  } else if (customerNote?.trim()) {
    events.push({ orderId: id, type: 'NOTE', label: def.label, note: customerNote.trim(), adminOnly: false })
  }
  if (internalNote?.trim()) {
    events.push({ orderId: id, type: 'NOTE', label: 'Internal note', note: internalNote.trim(), adminOnly: true })
  }
  if (events.length) {
    await prisma.orderEvent.createMany({ data: events }).catch(() => {})
  }

  // Notify the customer when the stage moves (best-effort).
  if (moved) {
    const to = order.user?.email ?? order.email
    if (to) {
      void sendBulkEmail(
        [to],
        `Order ${order.orderNo}: ${def.headline}`,
        `<p><strong>${escapeHtml(def.headline)}</strong> — ${escapeHtml(customerNote?.trim() || def.blurb)}</p>` +
          `<p>Track your order any time at Kingston Energies.</p>`,
      )
    }
  }

  return NextResponse.json({ ok: true, stage: target, status: statusForStage(target) })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
