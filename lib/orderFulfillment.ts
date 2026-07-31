import type { Prisma } from '@prisma/client'
import { claimSerialsForOrderItem, releaseSerialsForOrderItem } from './serials'

type Tx = Prisma.TransactionClient

export interface FulfillableItem {
  orderItemId: string
  name: string
  qty: number
}

/**
 * For each line item that matches a real Product (by name), decrements
 * stock, backfills OrderItem.productId (checkout doesn't resolve it — see
 * lib/cartValidation.ts), and claims that many serial numbers for the sale.
 * Non-product lines (delivery fees, points-redemption adjustments) are
 * silently skipped since their name won't match any product. Call inside the
 * same transaction as the Order/OrderItem creation.
 */
export async function fulfillOrderItems(tx: Tx, items: FulfillableItem[]): Promise<void> {
  for (const item of items) {
    if (item.qty <= 0) continue
    const product = await tx.product.findFirst({
      where: { name: { equals: item.name, mode: 'insensitive' } },
      select: { id: true, stock: true },
    })
    if (!product) continue

    await tx.product.update({
      where: { id: product.id },
      data: { stock: Math.max(0, product.stock - item.qty) },
    })
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
