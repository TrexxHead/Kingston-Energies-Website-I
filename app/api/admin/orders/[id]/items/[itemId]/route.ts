import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { fulfillOrderItems, releaseOrderItems } from '@/lib/orderFulfillment'

const swapSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().optional(),
})
// A manual line (delivery fee, a one-off discount, "special handling") has no
// catalog product behind it, so editing it means rewriting its label and
// price directly rather than swapping to something else.
const manualSchema = z.object({
  name: z.string().min(1).max(160),
  price: z.number(),
})
const schema = z.union([swapSchema, manualSchema])

/**
 * Edits a single line item two ways:
 *  - {productId, qty?}: swap which product it bills, or just change quantity
 *    (send the item's current productId back unchanged). Restocks and frees
 *    the old product's serials, decrements and claims serials for the new
 *    one, and recomputes the order total.
 *  - {name, price}: rewrite a manual line's label/price directly — only
 *    valid when the line isn't already product-backed, since a catalog
 *    product's name and price come from the product, not free text.
 * Never edits silently: an OrderEvent records exactly what changed, visible
 * to the customer like any other order update.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await getServerSession(authOptions)

  const { id, itemId } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid item update' }, { status: 400 })

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
  if (!item || item.orderId !== id) return NextResponse.json({ error: 'Order item not found' }, { status: 404 })

  if ('name' in parsed.data) {
    if (item.productId) {
      return NextResponse.json({ error: 'This is a catalog product — swap it to a different product instead of editing it directly.' }, { status: 400 })
    }
    const { name, price } = parsed.data
    const oldLabel = `${item.name} (${item.qty > 1 ? `× ${item.qty}, ` : ''}${item.price})`
    const newLabel = `${name} (${item.qty > 1 ? `× ${item.qty}, ` : ''}${price})`
    try {
      await prisma.$transaction(async (tx) => {
        await tx.orderItem.update({ where: { id: item.id }, data: { name, price } })
        const items = await tx.orderItem.findMany({ where: { orderId: id } })
        const total = items.reduce((s, i) => s + i.price * i.qty, 0)
        await tx.order.update({ where: { id }, data: { total } })
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: 'NOTE',
            label: 'Order line edited',
            note: `${oldLabel} → ${newLabel}${session?.user?.email ? ` (by ${session.user.email})` : ''}`,
            adminOnly: false,
          },
        })
      })
    } catch (err) {
      console.error('[orders] manual line edit failed:', err)
      return NextResponse.json({ error: 'Could not update that line.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  const { productId } = parsed.data
  const newProduct = await prisma.product.findUnique({ where: { id: productId } })
  if (!newProduct) return NextResponse.json({ error: 'That product no longer exists.' }, { status: 404 })

  const qty = parsed.data.qty ?? item.qty
  const oldLabel = `${item.name} × ${item.qty}`
  const newLabel = `${newProduct.name} × ${qty}`

  try {
    await prisma.$transaction(async (tx) => {
      if (item.productId) {
        await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.qty } } })
        await releaseOrderItems(tx, [{ orderItemId: item.id }])
      }

      await tx.orderItem.update({
        where: { id: item.id },
        data: { name: newProduct.name, price: newProduct.price, qty, productId: null },
      })

      await fulfillOrderItems(tx, [{ orderItemId: item.id, name: newProduct.name, qty }], { mode: 'allow' })

      const items = await tx.orderItem.findMany({ where: { orderId: id } })
      const total = items.reduce((s, i) => s + i.price * i.qty, 0)
      await tx.order.update({ where: { id }, data: { total } })

      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: 'NOTE',
          label: 'Order item changed',
          note: `${oldLabel} → ${newLabel}${session?.user?.email ? ` (by ${session.user.email})` : ''}`,
          adminOnly: false,
        },
      })
    })
  } catch (err) {
    console.error('[orders] item swap failed:', err)
    return NextResponse.json({ error: 'Could not swap that item — check stock and try again.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * Remove a single line from an order — restocking and freeing its serials
 * first if it was a real product line. Refuses to remove an order's only
 * item; cancel the order instead of leaving it with nothing in it.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await getServerSession(authOptions)

  const { id, itemId } = await params
  const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
  if (!item || item.orderId !== id) return NextResponse.json({ error: 'Order item not found' }, { status: 404 })

  const siblingCount = await prisma.orderItem.count({ where: { orderId: id } })
  if (siblingCount <= 1) {
    return NextResponse.json({ error: "This is the order's only item — cancel the order instead of emptying it." }, { status: 409 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (item.productId) {
        await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.qty } } })
        await releaseOrderItems(tx, [{ orderItemId: item.id }])
      }
      await tx.orderItem.delete({ where: { id: item.id } })

      const items = await tx.orderItem.findMany({ where: { orderId: id } })
      const total = items.reduce((s, i) => s + i.price * i.qty, 0)
      await tx.order.update({ where: { id }, data: { total } })

      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: 'NOTE',
          label: 'Order item removed',
          note: `${item.name} × ${item.qty}${session?.user?.email ? ` (by ${session.user.email})` : ''}`,
          adminOnly: false,
        },
      })
    })
  } catch (err) {
    console.error('[orders] item removal failed:', err)
    return NextResponse.json({ error: 'Could not remove that item.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
