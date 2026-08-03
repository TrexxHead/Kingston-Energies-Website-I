import { describe, it, expect, vi, beforeEach } from 'vitest'

const findManyUserMock = vi.fn()
const findManyOrderMock = vi.fn()
const findUniqueSendMock = vi.fn()
const createSendMock = vi.fn()
const findManySuppressionMock = vi.fn()
const deliverMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: (...args: unknown[]) => findManyUserMock(...args) },
    order: { findMany: (...args: unknown[]) => findManyOrderMock(...args) },
    automationSend: {
      findUnique: (...args: unknown[]) => findUniqueSendMock(...args),
      create: (...args: unknown[]) => createSendMock(...args),
    },
    suppression: { findMany: (...args: unknown[]) => findManySuppressionMock(...args) },
  },
}))
vi.mock('@/lib/email', () => ({
  sendBulkEmail: (...args: unknown[]) => deliverMock(...args),
  wrapEmailHtml: (_status: string, body: string) => body,
}))

describe('runWelcomeSeries', () => {
  beforeEach(() => {
    findManyUserMock.mockReset()
    findUniqueSendMock.mockReset()
    createSendMock.mockReset().mockResolvedValue({})
    findManySuppressionMock.mockReset()
    deliverMock.mockReset()
  })

  it('emails an eligible new signup once and records the send', async () => {
    findManyUserMock.mockResolvedValueOnce([{ id: 'u1', email: 'new@example.com', name: 'New Customer' }])
    findManySuppressionMock.mockResolvedValueOnce([])
    findUniqueSendMock.mockResolvedValueOnce(null)
    deliverMock.mockResolvedValueOnce(1)

    const { runWelcomeSeries } = await import('@/lib/lifecycleAutomations')
    const result = await runWelcomeSeries()

    expect(result.sent).toBe(1)
    expect(createSendMock).toHaveBeenCalledWith({ data: { key: 'welcome:u1', email: 'new@example.com' } })
  })

  it('skips a signup that already got the welcome email', async () => {
    findManyUserMock.mockResolvedValueOnce([{ id: 'u1', email: 'new@example.com', name: null }])
    findManySuppressionMock.mockResolvedValueOnce([])
    findUniqueSendMock.mockResolvedValueOnce({ id: 'existing' })

    const { runWelcomeSeries } = await import('@/lib/lifecycleAutomations')
    const result = await runWelcomeSeries()

    expect(result.sent).toBe(0)
    expect(deliverMock).not.toHaveBeenCalled()
  })

  it('skips a suppressed signup', async () => {
    findManyUserMock.mockResolvedValueOnce([{ id: 'u1', email: 'unsub@example.com', name: null }])
    findManySuppressionMock.mockResolvedValueOnce([{ email: 'unsub@example.com' }])

    const { runWelcomeSeries } = await import('@/lib/lifecycleAutomations')
    const result = await runWelcomeSeries()

    expect(result.sent).toBe(0)
    expect(deliverMock).not.toHaveBeenCalled()
  })
})

describe('runReviewRequests', () => {
  beforeEach(() => {
    findManyOrderMock.mockReset()
    findUniqueSendMock.mockReset()
    createSendMock.mockReset().mockResolvedValue({})
    findManySuppressionMock.mockReset()
    deliverMock.mockReset()
  })

  it('emails a delivered order once and records the send keyed by order id', async () => {
    findManyOrderMock.mockResolvedValueOnce([{ id: 'o1', orderNo: 'KE-1050', customerName: 'A', email: 'a@example.com' }])
    findManySuppressionMock.mockResolvedValueOnce([])
    findUniqueSendMock.mockResolvedValueOnce(null)
    deliverMock.mockResolvedValueOnce(1)

    const { runReviewRequests } = await import('@/lib/lifecycleAutomations')
    const result = await runReviewRequests()

    expect(result.sent).toBe(1)
    expect(createSendMock).toHaveBeenCalledWith({ data: { key: 'review-request:o1', email: 'a@example.com' } })
  })

  it('only queries delivered (DONE) orders with an email on file', async () => {
    findManyOrderMock.mockResolvedValueOnce([])
    const { runReviewRequests } = await import('@/lib/lifecycleAutomations')
    await runReviewRequests()
    const call = findManyOrderMock.mock.calls[0][0]
    expect(call.where.status).toBe('DONE')
    expect(call.where.email).toEqual({ not: null })
  })
})
