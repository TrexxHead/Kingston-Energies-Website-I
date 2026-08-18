import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const schema = z.object({
  keepId: z.string().min(1),
  mergeIds: z.array(z.string().min(1)).min(1).max(10),
})

/**
 * Folds one or more duplicate orders into a single surviving order — the fix
 * for the WiPay-retry duplicate bug, and for a customer who genuinely placed
 * the same order twice by mistake.
 *
 * This moves each merged order's line items onto the keeper and cancels the
 * merged order, but — unlike a normal cancellation — never restocks: the
 * items aren't being returned to inventory, they're still committed, just
 * under a different order number. It also never touches the ledger: revenue/
 * COGS were already posted per-order at creation time (accrual basis), and
 * since neither order's original posting is reversed, their sum still equals
 * the keeper's new combined total — reposting or reversing here would either
 * double- or zero-count it.
 */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { keepId, mergeIds } = parsed.data
  const ids = Array.from(new Set(mergeIds.filter((id) => id !== keepId)))
  if (ids.length === 0) return NextResponse.json({ error: 'Nothing to merge' }, { status: 400 })

  try {
    const [keep, merging] = await Promise.all([
      prisma.order.findUnique({ where: { id: keepId } }),
      prisma.order.findMany({ where: { id: { in: ids } }, include: { items: true } }),
    ])
    if (!keep) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (merging.length !== ids.length) return NextResponse.json({ error: 'One of those orders no longer exists' }, { status: 404 })

    // Only PENDING orders — nothing physically packed or shipped yet, so
    // combining line items is still a purely bookkeeping change.
    const notPending = [keep, ...merging].filter((o) => o.status !== 'PENDING')
    if (notPending.length > 0) {
      return NextResponse.json({ error: `${notPending[0].orderNo} is past Pending and can't be merged.` }, { status: 409 })
    }

    const merged = await prisma.$transaction(async (tx) => {
      for (const source of merging) {
        await tx.orderItem.updateMany({ where: { orderId: source.id }, data: { orderId: keepId } })
        await tx.order.update({
          where: { id: source.id },
          data: { status: 'CANCELLED', cancelReason: `Merged into ${keep.orderNo}`, cancelledAt: new Date() },
        })
        await tx.orderEvent.create({
          data: { orderId: source.id, type: 'CANCELLED', label: `Merged into ${keep.orderNo}`, adminOnly: false },
        })
        await tx.orderEvent.create({
          data: { orderId: keepId, type: 'NOTE', label: `Merged in ${source.orderNo}`, adminOnly: true },
        })
      }

      const items = await tx.orderItem.findMany({ where: { orderId: keepId } })
      const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
      // Fill gaps from a merged order rather than overwrite anything the
      // keeper already has; a paid duplicate should never make the survivor
      // look unpaid.
      const paid = keep.paid || merging.some((o) => o.paid)
      const email = keep.email ?? merging.find((o) => o.email)?.email ?? null
      const phone = keep.phone ?? merging.find((o) => o.phone)?.phone ?? null
      const paymentMethod = keep.paymentMethod ?? merging.find((o) => o.paymentMethod)?.paymentMethod ?? null

      return tx.order.update({
        where: { id: keepId },
        data: { total, paid, email, phone, paymentMethod },
        include: { items: true },
      })
    })

    return NextResponse.json({ order: merged })
  } catch (err) {
    console.error('[admin/orders/merge] failed:', err)
    return NextResponse.json({ error: 'Could not merge those orders.' }, { status: 500 })
  }
}
