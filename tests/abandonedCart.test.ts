import { describe, it, expect, vi, beforeEach } from 'vitest'

const findManyCartMock = vi.fn()
const updateCartMock = vi.fn()
const findManySuppressionMock = vi.fn()
const deliverMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cart: { findMany: (...args: unknown[]) => findManyCartMock(...args), update: (...args: unknown[]) => updateCartMock(...args) },
    suppression: { findMany: (...args: unknown[]) => findManySuppressionMock(...args) },
  },
}))

vi.mock('@/lib/email', () => ({
  sendBulkEmail: (...args: unknown[]) => deliverMock(...args),
  wrapEmailHtml: (_status: string, body: string) => body,
}))

/**
 * Regression coverage for the abandoned-cart recovery job: it should only
 * email carts that are genuinely eligible (has an email, not suppressed, has
 * items), and it must mark recoveryEmailSentAt so the same abandonment never
 * gets emailed twice.
 */
describe('runAbandonedCartRecovery', () => {
  beforeEach(() => {
    findManyCartMock.mockReset()
    updateCartMock.mockReset().mockResolvedValue({})
    findManySuppressionMock.mockReset()
    deliverMock.mockReset()
  })

  it('emails an eligible cart once and marks it sent', async () => {
    findManyCartMock.mockResolvedValueOnce([
      { id: 'cart-1', email: 'a@example.com', items: [{ name: 'Power bank', price: 5000, qty: 1 }], total: 5000 },
    ])
    findManySuppressionMock.mockResolvedValueOnce([])
    deliverMock.mockResolvedValueOnce(1)

    const { runAbandonedCartRecovery } = await import('@/lib/abandonedCart')
    const result = await runAbandonedCartRecovery()

    expect(result.sent).toBe(1)
    expect(deliverMock).toHaveBeenCalledWith(['a@example.com'], expect.any(String), expect.any(String))
    expect(updateCartMock).toHaveBeenCalledWith({ where: { id: 'cart-1' }, data: { recoveryEmailSentAt: expect.any(Date) } })
  })

  it('skips a suppressed email entirely', async () => {
    findManyCartMock.mockResolvedValueOnce([
      { id: 'cart-2', email: 'unsub@example.com', items: [{ name: 'Cable', price: 1000, qty: 1 }], total: 1000 },
    ])
    findManySuppressionMock.mockResolvedValueOnce([{ email: 'unsub@example.com' }])

    const { runAbandonedCartRecovery } = await import('@/lib/abandonedCart')
    const result = await runAbandonedCartRecovery()

    expect(result.sent).toBe(0)
    expect(deliverMock).not.toHaveBeenCalled()
    expect(updateCartMock).not.toHaveBeenCalled()
  })

  it('only queries active, non-empty, not-yet-recovered carts with an email on file', async () => {
    findManyCartMock.mockResolvedValueOnce([])
    const { runAbandonedCartRecovery } = await import('@/lib/abandonedCart')
    await runAbandonedCartRecovery()
    const call = findManyCartMock.mock.calls[0][0]
    expect(call.where.status).toBe('ACTIVE')
    expect(call.where.itemCount).toEqual({ gt: 0 })
    expect(call.where.recoveryEmailSentAt).toBeNull()
    expect(call.where.email).toEqual({ not: null })
  })

  it('does nothing when no carts are eligible', async () => {
    findManyCartMock.mockResolvedValueOnce([])
    const { runAbandonedCartRecovery } = await import('@/lib/abandonedCart')
    const result = await runAbandonedCartRecovery()
    expect(result.sent).toBe(0)
    expect(findManySuppressionMock).not.toHaveBeenCalled()
  })

  it('does not mark the cart sent if delivery failed (0 recipients accepted)', async () => {
    findManyCartMock.mockResolvedValueOnce([
      { id: 'cart-3', email: 'a@example.com', items: [{ name: 'Charger', price: 2000, qty: 1 }], total: 2000 },
    ])
    findManySuppressionMock.mockResolvedValueOnce([])
    deliverMock.mockResolvedValueOnce(0)

    const { runAbandonedCartRecovery } = await import('@/lib/abandonedCart')
    const result = await runAbandonedCartRecovery()

    expect(result.sent).toBe(0)
    expect(updateCartMock).not.toHaveBeenCalled()
  })
})
