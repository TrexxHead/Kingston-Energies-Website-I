import type { Prisma } from '@prisma/client'
import { claimSerialsForOrderItem, releaseSerialsForOrderItem } from './serials'

type Tx = Prisma.TransactionClient

export interface FulfillableItem {
  orderItemId: string
  name: string
  qty: number
}

/** Thrown when a line can't be fulfilled from current stock and the caller asked to reject rather than allow it. */
export class InsufficientStockError extends Error {
  constructor(public readonly productName: string) {
    super(`Not enough stock for "${productName}".`)
    this.name = 'InsufficientStockError'
  }
}

export interface FulfillOptions {
  /**
   * 'reject' (default): if stock can't cover the line, throw InsufficientStockError
   * so the caller's transaction rolls back — safe whenever no payment has cleared
   * yet (direct checkout, WhatsApp/Instagram orders), since nothing was ever
   * promised to the customer. 'allow': clamp to 0 and continue — for paths where
   * money has already changed hands (the WiPay callback, after the card is
   * charged) or a staff member is deliberately recording a sale, where rolling
   * back would leave a paid customer with no order.
   */
  mode?: 'reject' | 'allow'
}

/**
 * For each line item that matches a real Product (by name), decrements
 * stock, backfills OrderItem.productId (checkout doesn't resolve it — see
 * lib/cartValidation.ts), and claims that many serial numbers for the sale.
 * Non-product lines (delivery fees, points-redemption adjustments) are
 * silently skipped since their name won't match any product. Call inside the
 * same transaction as the Order/OrderItem creation.
 *
 * The decrement is a single conditional UPDATE (stock -= qty WHERE stock >= qty),
 * not a read-then-write — so two concurrent orders racing for the last unit
 * can't both succeed the way a JS-computed `Math.max(0, stock - qty)` write
 * would allow (a classic lost-update: both reads see stock=1, both writes land
 * on stock=0, and both orders got created for a unit that only existed once).
 */
export async function fulfillOrderItems(tx: Tx, items: FulfillableItem[], options: FulfillOptions = {}): Promise<void> {
  const mode = options.mode ?? 'reject'
  for (const item of items) {
    if (item.qty <= 0) continue
    const product = await tx.product.findFirst({
      where: { name: { equals: item.name, mode: 'insensitive' } },
      select: { id: true },
    })
    if (!product) continue

    const decremented = await tx.product.updateMany({
      where: { id: product.id, stock: { gte: item.qty } },
      data: { stock: { decrement: item.qty } },
    })

    if (decremented.count === 0) {
      if (mode === 'reject') throw new InsufficientStockError(item.name)
      // Payment already cleared (or a trusted staff entry) — don't leave the
      // customer paid-but-orderless. Clamp to 0 and let staff sort out the backorder.
      await tx.product.updateMany({ where: { id: product.id, stock: { gt: 0 } }, data: { stock: 0 } })
      console.error(`[orderFulfillment] oversold "${item.name}" (order item ${item.orderItemId}) — clamped to 0, needs manual follow-up`)
    }

    await tx.orderItem.update({ where: { id: item.orderItemId }, data: { productId: product.id } })
    await claimSerialsForOrderItem(tx, product.id, item.orderItemId, item.qty)
  }
}

/**
 * Reverses fulfillOrderItems on cancellation: restocks each product-backed
 * line and frees its claimed serials back to IN_STOCK so they can be sold
 * again. Call inside the same transaction as the cancellation's stock
 * restore.
 */
export async function releaseOrderItems(tx: Tx, items: { orderItemId: string }[]): Promise<void> {
  for (const item of items) {
    await releaseSerialsForOrderItem(tx, item.orderItemId)
  }
}
