import { describe, it, expect, vi } from 'vitest'
import { Prisma } from '@prisma/client'

const queryRawMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: (...args: unknown[]) => queryRawMock(...args) },
}))

function conflictError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' })
}

describe('nextOrderNo', () => {
  it('starts numbering at KE-1024 when the table is empty', async () => {
    queryRawMock.mockResolvedValueOnce([{ max: null }])
    const { nextOrderNo } = await import('@/lib/orderNo')
    expect(await nextOrderNo()).toBe('KE-1024')
  })

  it('increments one past the highest existing order number', async () => {
    queryRawMock.mockResolvedValueOnce([{ max: 2050 }])
    const { nextOrderNo } = await import('@/lib/orderNo')
    expect(await nextOrderNo()).toBe('KE-2051')
  })
})

/**
 * Regression coverage for a real race condition: nextOrderNo() has no lock,
 * so two concurrent checkouts can compute the same KE-#### number. The DB's
 * orderNo @unique constraint catches the collision as a P2002 — previously
 * that surfaced straight to the customer as a failed checkout. withOrderNoRetry
 * recovers by recomputing a fresh number and trying again.
 */
describe('withOrderNoRetry', () => {
  it('succeeds on the first attempt when there is no collision', async () => {
    queryRawMock.mockResolvedValue([{ max: 1023 }])
    const { withOrderNoRetry } = await import('@/lib/orderNo')
    const attempt = vi.fn().mockResolvedValue({ orderNo: 'KE-1024' })
    const result = await withOrderNoRetry(attempt)
    expect(result).toEqual({ orderNo: 'KE-1024' })
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('retries with a new order number after a P2002 collision, then succeeds', async () => {
    queryRawMock.mockResolvedValue([{ max: 1023 }])
    const { withOrderNoRetry } = await import('@/lib/orderNo')
    const attempt = vi.fn().mockRejectedValueOnce(conflictError()).mockResolvedValueOnce({ orderNo: 'KE-1025' })
    const result = await withOrderNoRetry(attempt)
    expect(result).toEqual({ orderNo: 'KE-1025' })
    expect(attempt).toHaveBeenCalledTimes(2)
  })

  it('does not retry (and rethrows immediately) on a non-collision error', async () => {
    queryRawMock.mockResolvedValue([{ max: 1023 }])
    const { withOrderNoRetry } = await import('@/lib/orderNo')
    const boom = new Error('database is down')
    const attempt = vi.fn().mockRejectedValue(boom)
    await expect(withOrderNoRetry(attempt)).rejects.toBe(boom)
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('gives up after maxAttempts consecutive collisions', async () => {
    queryRawMock.mockResolvedValue([{ max: 1023 }])
    const { withOrderNoRetry } = await import('@/lib/orderNo')
    const attempt = vi.fn().mockRejectedValue(conflictError())
    await expect(withOrderNoRetry(attempt, 3)).rejects.toThrow()
    expect(attempt).toHaveBeenCalledTimes(3)
  })
})
