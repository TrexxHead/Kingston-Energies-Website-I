import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const productSchema = z.object({
  name: z.string().min(1).max(160),
  price: z.number().min(0),
  cost: z.number().min(0).nullish(),
  stock: z.number().int().min(0),
  threshold: z.number().int().min(0),
  category: z.enum(['POWERBANKS', 'CHARGERS', 'STATIONS', 'ACCESSORIES']).nullish(),
  sku: z.string().max(60).nullish(),
  barcode: z.string().max(60).nullish(),
  spec: z.string().max(160).nullish(),
  badge: z.string().max(60).nullish(),
})

export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  // Default view shows active products; ?archived=1 lists archived ones.
  const archived = new URL(request.url).searchParams.get('archived') === '1'
  const products = await prisma.product.findMany({ where: { archived }, orderBy: { name: 'asc' } })
  return NextResponse.json({ products })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = productSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid product' }, { status: 400 })

  const d = parsed.data
  if (d.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: d.sku } })
    if (existing) return NextResponse.json({ error: 'A product with this SKU already exists' }, { status: 409 })
  }

  const product = await prisma.product.create({
    data: {
      name: d.name,
      description: d.spec ?? d.name,
      price: d.price,
      cost: d.cost ?? null,
      features: [],
      stock: d.stock,
      threshold: d.threshold,
      category: d.category ?? null,
      sku: d.sku ?? null,
      barcode: d.barcode ?? null,
      spec: d.spec ?? null,
      badge: d.badge ?? null,
    },
  })

  return NextResponse.json({ product }, { status: 201 })
}
