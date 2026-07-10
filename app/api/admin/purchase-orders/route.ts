import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const createSchema = z.object({
  supplierId: z.string().min(1),
  reference: z.string().min(1).max(60),
  notes: z.string().max(300).nullish(),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid purchase order' }, { status: 400 })

  const supplier = await prisma.supplier.findUnique({ where: { id: parsed.data.supplierId } })
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

  const po = await prisma.purchaseOrder.create({
    data: { supplierId: parsed.data.supplierId, reference: parsed.data.reference, notes: parsed.data.notes ?? null },
  })
  return NextResponse.json({ purchaseOrder: po }, { status: 201 })
}
