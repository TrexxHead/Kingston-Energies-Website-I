import { describe, it, expect, vi } from 'vitest'

const findUniqueMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: { discountCode: { findUnique: (...args: unknown[]) => findUniqueMock(...args) } },
}))

/**
 * Regression test: the PERCENT branch used to have no upper bound (unlike the
 * sibling FIXED branch, which clamps to subtotal). A misconfigured code —
 * e.g. an admin typo entering value=100 meaning 10% — could discount at or
 * above the full subtotal on its own. Both branches must clamp the same way.
 */
describe('validatePromo', () => {
  it('caps a PERCENT discount at the subtotal, same as FIXED', async () => {
    findUniqueMock.mockResolvedValueOnce({ code: 'OOPS100', active: true, type: 'PERCENT', value: 100, expiresAt: null, minSpend: null })
    const { validatePromo } = await import('@/lib/promo')
    const result = await validatePromo('OOPS100', 1000)
    expect(result.valid).toBe(true)
    expect(result.discount).toBe(1000)
  })

  it('applies a normal PERCENT discount below subtotal unchanged', async () => {
    findUniqueMock.mockResolvedValueOnce({ code: 'TEN', active: true, type: 'PERCENT', value: 10, expiresAt: null, minSpend: null })
    const { validatePromo } = await import('@/lib/promo')
    const result = await validatePromo('TEN', 1000)
    expect(result.discount).toBe(100)
  })

  it('still caps FIXED at the subtotal', async () => {
    findUniqueMock.mockResolvedValueOnce({ code: 'BIGFIXED', active: true, type: 'FIXED', value: 5000, expiresAt: null, minSpend: null })
    const { validatePromo } = await import('@/lib/promo')
    const result = await validatePromo('BIGFIXED', 1000)
    expect(result.discount).toBe(1000)
  })
})
