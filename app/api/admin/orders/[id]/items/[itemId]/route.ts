import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { fulfillOrderItems, releaseOrderItems } from '@/lib/orderFulfillment'

const schema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().optional(),
})

/**
 * Swap which product a line item bills — for when a customer wants a
 * different item after placing the order. Restocks and frees the old
 * product's serials, decrements and claims serials for the new one, and
 * recomputes the order total. Never edits silently: an OrderEvent records
 * exactly what changed, visible to the customer like any other order update.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await getServerSession(authOptions)

  const { id, itemId } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Choose a product to swap to.' }, { status: 400 })
  const { productId } = parsed.data

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
  if (!item || item.orderId !== id) return NextResponse.json({ error: 'Order item not found' }, { status: 404 })

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
