import { describe, it, expect, vi, beforeEach } from 'vitest'

const findManyMock = vi.fn()
const deleteManyMock = vi.fn()
const sendMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    restockRequest: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
    },
  },
}))
vi.mock('@/lib/email', () => ({
  sendBulkEmail: (...args: unknown[]) => sendMock(...args),
  wrapEmailHtml: (_status: string, body: string) => body,
}))

/**
 * Regression coverage: the back-in-stock waitlist must be notified and
 * cleared regardless of which admin action actually moved stock from 0 to
 * positive — this used to only fire from the product-edit form, silently
 * missing the "adjust stock" (receiving inventory) path, which is the more
 * common real-world trigger.
 */
describe('notifyRestockWaitlist', () => {
  beforeEach(() => {
    findManyMock.mockReset()
    deleteManyMock.mockReset().mockResolvedValue({})
    sendMock.mockReset().mockResolvedValue(1)
  })

  it('emails every waiter and clears their requests', async () => {
    findManyMock.mockResolvedValueOnce([{ email: 'a@example.com' }, { email: 'b@example.com' }])
    const { notifyRestockWaitlist } = await import('@/lib/restockNotify')
    await notifyRestockWaitlist('Charmast 10,400', 20, 'pb10')
    expect(sendMock).toHaveBeenCalledWith(['a@example.com', 'b@example.com'], expect.stringContaining('back in stock'), expect.any(String))
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { productId: 'pb10' } })
  })

  it('does nothing when nobody is waiting', async () => {
    findManyMock.mockResolvedValueOnce([])
    const { notifyRestockWaitlist } = await import('@/lib/restockNotify')
    await notifyRestockWaitlist('Charmast 10,400', 20, 'pb10')
    expect(sendMock).not.toHaveBeenCalled()
    expect(deleteManyMock).not.toHaveBeenCalled()
  })
})
