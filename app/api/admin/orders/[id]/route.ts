import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { issueInvoiceForOrder } from '@/lib/invoice'

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
    const before = await prisma.order.findUnique({ where: { id }, select: { paid: true, invoicedAt: true } })
    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.paid !== undefined ? { paid: parsed.data.paid } : {}),
      },
    })

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
