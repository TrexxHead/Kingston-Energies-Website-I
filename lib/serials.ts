import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

/**
 * Generate `count` new serial numbers for a product, one ProductUnit row per
 * physical unit, and return the serials. Must be called inside the same
 * transaction as the stock increase it corresponds to. The global counter
 * (rather than a per-product one) means every serial issued is unique across
 * the whole catalog and safe under concurrent stock additions.
 */
export async function generateSerials(tx: Tx, productId: string, count: number): Promise<string[]> {
  if (count <= 0) return []

  const counter = await tx.serialCounter.upsert({
    where: { id: 'global' },
    create: { id: 'global', value: count },
    update: { value: { increment: count } },
  })
  const startSeq = counter.value - count + 1
  const year = new Date().getFullYear()
  const serials = Array.from({ length: count }, (_, i) => `KE-${year}-${String(startSeq + i).padStart(5, '0')}`)

  await tx.productUnit.createMany({
    data: serials.map((serial) => ({ productId, serial, status: 'IN_STOCK' })),
  })
  return serials
}

/**
 * Claim up to `qty` in-stock units for a product, marking them SOLD and
 * linking them to the order item they were sold on. Returns the claimed
 * serials — may be fewer than `qty` (or empty) if inventory was never
 * serialized for this product (e.g. it predates this feature), which must
 * never block placing the order.
 */
export async function claimSerialsForOrderItem(
  tx: Tx,
  productId: string | null | undefined,
  orderItemId: string,
  qty: number,
): Promise<string[]> {
  if (!productId || qty <= 0) return []

  const units = await tx.productUnit.findMany({
    where: { productId, status: 'IN_STOCK' },
    orderBy: { createdAt: 'asc' },
    take: qty,
  })
  if (units.length === 0) return []

  await tx.productUnit.updateMany({
    where: { id: { in: units.map((u) => u.id) } },
    data: { status: 'SOLD', orderItemId },
  })
  return units.map((u) => u.serial)
}

/** Release any units tied to an order item back to IN_STOCK — used on cancellation. */
export async function releaseSerialsForOrderItem(tx: Tx, orderItemId: string): Promise<void> {
  await tx.productUnit.updateMany({
    where: { orderItemId, status: 'SOLD' },
    data: { status: 'IN_STOCK', orderItemId: null },
  })
}
