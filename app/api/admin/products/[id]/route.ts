import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const specItem = z.object({ label: z.string().max(80), value: z.string().max(200) })

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  price: z.number().min(0).optional(),
  salePrice: z.number().min(0).nullish(),
  cost: z.number().min(0).nullish(),
  stock: z.number().int().min(0).optional(),
  threshold: z.number().int().min(0).optional(),
  category: z.enum(['POWERBANKS', 'CHARGERS', 'STATIONS', 'ACCESSORIES']).nullish(),
  badge: z.string().max(60).nullish(),
  spec: z.string().max(160).nullish(),
  barcode: z.string().max(60).nullish(),
  description: z.string().max(4000).nullish(),
  shortDescription: z.string().max(600).nullish(),
  brand: z.string().max(80).nullish(),
  weight: z.string().max(60).nullish(),
  dimensions: z.string().max(120).nullish(),
  warranty: z.string().max(120).nullish(),
  images: z.array(z.string().max(600)).max(12).optional(),
  features: z.array(z.string().max(200)).max(20).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  specs: z.array(specItem).max(40).optional(),
  archived: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  // `description` is a required column — drop it from the update if cleared,
  // rather than trying to write null. Everything else may be nulled.
  const { description, ...rest } = parsed.data
  const data = { ...rest, ...(description != null ? { description } : {}) }

  try {
    const product = await prisma.product.update({ where: { id }, data })
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
