import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

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
    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.paid !== undefined ? { paid: parsed.data.paid } : {}),
      },
    })
    return NextResponse.json({ order })
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
}
