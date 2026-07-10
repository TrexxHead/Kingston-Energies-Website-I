import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  contactEmail: z.string().email().nullish().or(z.literal('')),
  contactPhone: z.string().max(40).nullish(),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { purchaseOrders: { orderBy: { createdAt: 'desc' } } },
  })

  return NextResponse.json({
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      openPOs: s.purchaseOrders.filter((po) => po.status === 'OPEN').length,
      purchaseOrders: s.purchaseOrders.map((po) => ({ id: po.id, reference: po.reference, status: po.status })),
    })),
  })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid supplier' }, { status: 400 })

  const supplier = await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone ?? null,
    },
  })
  return NextResponse.json({ supplier }, { status: 201 })
}
