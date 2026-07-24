import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).nullish(),
  stock: z.number().int().min(0).optional(),
  threshold: z.number().int().min(0).optional(),
  category: z.enum(['POWERBANKS', 'CHARGERS', 'STATIONS', 'ACCESSORIES']).nullish(),
  badge: z.string().max(60).nullish(),
  spec: z.string().max(160).nullish(),
  archived: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  try {
    const product = await prisma.product.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ product })
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
}
