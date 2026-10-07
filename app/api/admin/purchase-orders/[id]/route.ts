import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  status: z.enum(['OPEN', 'RECEIVED', 'CANCELLED']).optional(),
  invoiced: z.boolean().optional(),
  paid: z.boolean().optional(),
}).refine((d) => d.status !== undefined || d.invoiced !== undefined || d.paid !== undefined, { message: 'Nothing to update' })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  try {
    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        // Invoiced/paid are independent toggles, not a one-way status climb —
        // a PO can be un-marked if it was flagged by mistake.
        ...(parsed.data.invoiced !== undefined ? { invoicedAt: parsed.data.invoiced ? new Date() : null } : {}),
        ...(parsed.data.paid !== undefined ? { paid: parsed.data.paid, paidAt: parsed.data.paid ? new Date() : null } : {}),
      },
    })
    return NextResponse.json({ purchaseOrder: po })
  } catch {
    return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
  }
}
