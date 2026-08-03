import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { generateSerials } from '@/lib/serials'
import { generateSku, generateBarcode } from '@/lib/productCodes'
import { CATALOG } from '@/lib/catalog'

const specItem = z.object({ label: z.string().max(80), value: z.string().max(200) })

const productSchema = z.object({
  name: z.string().min(1).max(160),
  price: z.number().min(0),
  salePrice: z.number().min(0).nullish(),
  cost: z.number().min(0).nullish(),
  stock: z.number().int().min(0),
  threshold: z.number().int().min(0),
  category: z.enum(['POWERBANKS', 'CHARGERS', 'COMPONENTS', 'STATIONS', 'ACCESSORIES']).nullish(),
  sku: z.string().max(60).nullish(),
  barcode: z.string().max(60).nullish(),
  spec: z.string().max(160).nullish(),
  badge: z.string().max(60).nullish(),
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

  // Two products sharing a name is worse than a rejected save: the
  // storefront can't tell them apart (same generated id) and checkout's
  // price re-check can end up validating against a different one than the
  // customer actually saw, failing every attempt to buy either one.
  const nameClash = await prisma.product.findFirst({ where: { name: { equals: d.name, mode: 'insensitive' }, archived: false }, select: { id: true } })
  if (nameClash || CATALOG.some((c) => c.name.toLowerCase() === d.name.toLowerCase())) {
    return NextResponse.json({ error: `A product named "${d.name}" already exists. Edit that one instead, or use a different name.` }, { status: 409 })
  }

  if (d.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: d.sku } })
    if (existing) return NextResponse.json({ error: 'A product with this SKU already exists' }, { status: 409 })
  }

  if (d.barcode) {
    const clash = await prisma.product.findFirst({ where: { barcode: d.barcode }, select: { name: true } })
    if (clash) return NextResponse.json({ error: `That barcode is already used by "${clash.name}".` }, { status: 409 })
  }

  // Every product needs a code to scan/reorder by — assign one when the
  // admin didn't type one in, rather than leaving it "N/A".
  const sku = d.sku ?? (await generateSku(d.category ?? null))
  const barcode = d.barcode ?? (await generateBarcode())

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: d.name,
        description: d.description ?? d.spec ?? d.name,
        shortDescription: d.shortDescription ?? null,
        price: d.price,
        salePrice: d.salePrice ?? null,
        cost: d.cost ?? null,
        features: d.features ?? [],
        images: d.images ?? [],
        tags: d.tags ?? [],
        specs: d.specs ?? undefined,
        brand: d.brand ?? null,
        weight: d.weight ?? null,
        dimensions: d.dimensions ?? null,
        warranty: d.warranty ?? null,
        stock: d.stock,
        threshold: d.threshold,
        category: d.category ?? null,
        sku,
        barcode,
        spec: d.spec ?? null,
        badge: d.badge ?? null,
      },
    })
    if (d.stock > 0) await generateSerials(tx, created.id, d.stock)
    return created
  })

  return NextResponse.json({ product }, { status: 201 })
}
