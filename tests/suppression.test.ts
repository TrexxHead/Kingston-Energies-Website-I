import { describe, it, expect, vi } from 'vitest'

const findUniqueMock = vi.fn()
const findManyMock = vi.fn()
const upsertMock = vi.fn()
const deleteMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    suppression: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
    },
  },
}))

describe('isSuppressed', () => {
  it('is case-insensitive', async () => {
    findUniqueMock.mockResolvedValueOnce({ id: '1' })
    const { isSuppressed } = await import('@/lib/suppression')
    expect(await isSuppressed('Someone@Example.com')).toBe(true)
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { email: 'someone@example.com' }, select: { id: true } })
  })

  it('returns false when not found', async () => {
    findUniqueMock.mockResolvedValueOnce(null)
    const { isSuppressed } = await import('@/lib/suppression')
    expect(await isSuppressed('clean@example.com')).toBe(false)
  })
})

describe('filterSuppressed', () => {
  it('removes suppressed emails from a recipient list', async () => {
    findManyMock.mockResolvedValueOnce([{ email: 'bad@example.com' }])
    const { filterSuppressed } = await import('@/lib/suppression')
    const result = await filterSuppressed(['good@example.com', 'bad@example.com'])
    expect(result).toEqual(['good@example.com'])
  })
})

describe('suppress / unsuppress', () => {
  it('upserts on suppress', async () => {
    const { suppress } = await import('@/lib/suppression')
    await suppress('Someone@Example.com', 'UNSUBSCRIBED')
    expect(upsertMock).toHaveBeenCalledWith({
      where: { email: 'someone@example.com' },
      create: { email: 'someone@example.com', reason: 'UNSUBSCRIBED' },
      update: { reason: 'UNSUBSCRIBED' },
    })
  })

  it('does not throw when unsuppressing an email that was never suppressed', async () => {
    deleteMock.mockRejectedValueOnce(new Error('not found'))
    const { unsuppress } = await import('@/lib/suppression')
    await expect(unsuppress('never@example.com')).resolves.toBeUndefined()
  })
})
