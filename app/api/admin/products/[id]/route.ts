import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { productIdForName } from '@/lib/products'
import { sendBulkEmail, wrapEmailHtml } from '@/lib/email'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const specItem = z.object({ label: z.string().max(80), value: z.string().max(200) })

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  price: z.number().min(0).optional(),
  salePrice: z.number().min(0).nullish(),
  cost: z.number().min(0).nullish(),
  stock: z.number().int().min(0).optional(),
  threshold: z.number().int().min(0).optional(),
  category: z.enum(['POWERBANKS', 'CHARGERS', 'COMPONENTS', 'STATIONS', 'ACCESSORIES']).nullish(),
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

  // A shared barcode between two products is a real scanning/fulfillment risk
  // — catch it here rather than letting it slip into inventory.
  if (data.barcode) {
    const clash = await prisma.product.findFirst({ where: { barcode: data.barcode, id: { not: id } }, select: { name: true } })
    if (clash) return NextResponse.json({ error: `That barcode is already used by "${clash.name}".` }, { status: 409 })
  }

  try {
    // If stock is moving up from 0, capture the "before" so we know whether
    // to clear the back-in-stock waitlist after the update.
    const before = data.stock !== undefined ? await prisma.product.findUnique({ where: { id }, select: { stock: true, name: true } }) : null

    const product = await prisma.product.update({ where: { id }, data })

    if (before && before.stock === 0 && product.stock > 0) {
      void notifyRestockWaitlist(before.name, product.stock)
    }

    return NextResponse.json({ product })
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
}

/** Email everyone waiting on a now-restocked product, then clear their requests. */
async function notifyRestockWaitlist(productName: string, stock: number): Promise<void> {
  const catalogId = productIdForName(productName)
  const waiters = await prisma.restockRequest.findMany({ where: { productId: catalogId }, select: { email: true } })
  if (waiters.length === 0) return

  await sendBulkEmail(
    waiters.map((w) => w.email),
    `${productName} is back in stock`,
    wrapEmailHtml(
      'Back in stock',
      `<p><strong>${escapeHtml(productName)}</strong> is back in stock${stock <= 5 ? ` — only ${stock} left` : ''}. Grab yours before it sells out again.</p>
       <p><a href="${siteUrl}/product/${catalogId}" style="color:#4a7c2c;font-weight:600;">Shop ${escapeHtml(productName)} &rarr;</a></p>`,
    ),
  ).catch(() => {})

  await prisma.restockRequest.deleteMany({ where: { productId: catalogId } }).catch(() => {})
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
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
