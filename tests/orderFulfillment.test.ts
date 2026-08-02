import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/serials', () => ({
  claimSerialsForOrderItem: vi.fn().mockResolvedValue(undefined),
  releaseSerialsForOrderItem: vi.fn().mockResolvedValue(undefined),
}))

function makeTx(opts: { stockGte1Count: number }) {
  return {
    product: {
      findFirst: vi.fn().mockResolvedValue({ id: 'prod-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: opts.stockGte1Count }),
    },
    orderItem: { update: vi.fn().mockResolvedValue({}) },
  } as unknown as Parameters<typeof import('@/lib/orderFulfillment').fulfillOrderItems>[0]
}

/**
 * Regression coverage for a real, previously-unflagged race condition: stock
 * used to be decremented via read-then-write (`Math.max(0, product.stock -
 * item.qty)`), which lets two concurrent orders both read stock=1 and both
 * write stock=0 — overselling the last unit. The fix is a single conditional
 * UPDATE (`stock -= qty WHERE stock >= qty`), which this exercises via the
 * mocked `updateMany` call shape rather than real concurrency.
 */
describe('fulfillOrderItems', () => {
  it('decrements atomically via a conditional updateMany, not a read-then-write', async () => {
    const { fulfillOrderItems } = await import('@/lib/orderFulfillment')
    const tx = makeTx({ stockGte1Count: 1 })
    await fulfillOrderItems(tx, [{ orderItemId: 'oi-1', name: 'Widget', qty: 2 }])

    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    })
  })

  it('rejects (default mode) when the conditional update affects 0 rows — insufficient stock', async () => {
    const { fulfillOrderItems, InsufficientStockError } = await import('@/lib/orderFulfillment')
    const tx = makeTx({ stockGte1Count: 0 })
    await expect(fulfillOrderItems(tx, [{ orderItemId: 'oi-1', name: 'Widget', qty: 5 }])).rejects.toBeInstanceOf(InsufficientStockError)
  })

  it("mode 'allow' clamps to 0 instead of throwing, for paths where payment already cleared", async () => {
    const { fulfillOrderItems } = await import('@/lib/orderFulfillment')
    const tx = makeTx({ stockGte1Count: 0 })
    await expect(
      fulfillOrderItems(tx, [{ orderItemId: 'oi-1', name: 'Widget', qty: 5 }], { mode: 'allow' })
    ).resolves.toBeUndefined()
    expect(tx.product.updateMany).toHaveBeenLastCalledWith({ where: { id: 'prod-1', stock: { gt: 0 } }, data: { stock: 0 } })
  })

  it('skips line items that match no product, without error', async () => {
    const { fulfillOrderItems } = await import('@/lib/orderFulfillment')
    const tx = {
      product: { findFirst: vi.fn().mockResolvedValue(null), updateMany: vi.fn() },
      orderItem: { update: vi.fn() },
    } as unknown as Parameters<typeof fulfillOrderItems>[0]
    await expect(fulfillOrderItems(tx, [{ orderItemId: 'oi-1', name: 'Delivery fee', qty: 1 }])).resolves.toBeUndefined()
    expect(tx.orderItem.update).not.toHaveBeenCalled()
  })

  it('skips zero/negative-qty lines entirely', async () => {
    const { fulfillOrderItems } = await import('@/lib/orderFulfillment')
    const tx = makeTx({ stockGte1Count: 1 })
    await fulfillOrderItems(tx, [{ orderItemId: 'oi-1', name: 'Widget', qty: 0 }])
    expect(tx.product.findFirst).not.toHaveBeenCalled()
  })
})
