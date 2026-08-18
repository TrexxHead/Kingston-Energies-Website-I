import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { fulfillOrderItems } from '@/lib/orderFulfillment'

const productSchema = z.object({ productId: z.string().min(1), qty: z.number().int().positive() })
// A manual line — a discount, a fee, anything not backed by a catalog
// product. Price may be negative (a discount) or positive (a fee).
const manualSchema = z.object({ name: z.string().min(1).max(160), price: z.number(), qty: z.number().int().positive().default(1) })
const schema = z.union([productSchema, manualSchema])

/**
 * Adds a new line to an existing order — a product (decrementing stock,
 * same trust level as the admin "New order" form: never blocked by low
 * stock, just clamped and flagged) or a manual line like a one-off discount.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await getServerSession(authOptions)

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, select: { status: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status === 'CANCELLED') return NextResponse.json({ error: 'This order is cancelled.' }, { status: 409 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid item' }, { status: 400 })

  let name: string
  let price: number
  let qty: number
  let productId: string | null = null

  if ('productId' in parsed.data) {
    const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } })
    if (!product) return NextResponse.json({ error: 'That product no longer exists.' }, { status: 404 })
    name = product.name
    price = product.salePrice ?? product.price
    qty = parsed.data.qty
  } else {
    name = parsed.data.name
    price = parsed.data.price
    qty = parsed.data.qty
  }

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.orderItem.create({ data: { orderId: id, name, price, qty } })
      if ('productId' in parsed.data) {
        await fulfillOrderItems(tx, [{ orderItemId: created.id, name, qty }], { mode: 'allow' })
        productId = (await tx.orderItem.findUnique({ where: { id: created.id }, select: { productId: true } }))?.productId ?? null
      }

      const items = await tx.orderItem.findMany({ where: { orderId: id } })
      const total = items.reduce((s, i) => s + i.price * i.qty, 0)
      await tx.order.update({ where: { id }, data: { total } })

      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: 'NOTE',
          label: 'Line added to order',
          note: `${name} × ${qty} (${price})${session?.user?.email ? ` (by ${session.user.email})` : ''}`,
          adminOnly: false,
        },
      })
    })
  } catch (err) {
    console.error('[orders] add item failed:', err)
    return NextResponse.json({ error: 'Could not add that line.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, productId })
}
