import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { issueInvoiceForOrder } from '@/lib/invoice'
import { stageForStatus } from '@/lib/pipeline'

const patchSchema = z
  .object({
    status: z.enum(['PENDING', 'PACKED', 'OUT', 'DONE', 'CANCELLED']).optional(),
    paid: z.boolean().optional(),
  })
  .refine((d) => d.status !== undefined || d.paid !== undefined, { message: 'Nothing to update' })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  try {
    const before = await prisma.order.findUnique({ where: { id }, select: { paid: true, invoicedAt: true, status: true, items: true } })
    const order = await prisma.order.update({
      where: { id },
      data: {
        // Moving between kanban columns also snaps the fine-grained pipeline
        // stage to a representative position (unless it's a cancellation).
        ...(parsed.data.status !== undefined
          ? { status: parsed.data.status, ...(parsed.data.status !== 'CANCELLED' ? { stage: stageForStatus(parsed.data.status) } : {}) }
          : {}),
        ...(parsed.data.paid !== undefined ? { paid: parsed.data.paid } : {}),
      },
    })

    // Cancelling restocks inventory, same as a customer-initiated cancel.
    if (parsed.data.status === 'CANCELLED' && before && before.status !== 'CANCELLED') {
      await Promise.all(
        before.items.map((it) =>
          prisma.product.updateMany({ where: { name: it.name }, data: { stock: { increment: it.qty } } }).catch(() => {}),
        ),
      )
      await prisma.orderEvent.create({
        data: { orderId: id, type: 'CANCELLED', label: 'Cancelled by admin', adminOnly: false },
      }).catch(() => {})
    }

    // Auto-issue the invoice the first time an order becomes paid.
    let invoice: { sent: boolean; to: string | null } | undefined
    if (parsed.data.paid === true && before && !before.paid && !before.invoicedAt) {
      invoice = await issueInvoiceForOrder(id)
    }

    return NextResponse.json({ order, invoice })
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
}

/** Permanently remove an order — for erroneous/duplicate/test entries. Prefer the CANCELLED status for anything a customer or admin needs to keep a record of. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    await prisma.order.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
}
