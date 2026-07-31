import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackToken } from '@/lib/trackToken'

/**
 * Regression test for the /track IDOR flagged in SECURITY-REMEDIATION.md §C.5:
 * order numbers are sequential, so a lookup by number alone must not work for
 * everyone — only for whoever can prove they're the owner (the tracking
 * token, a session that owns the order, or the order's own email).
 */

const order = {
  id: 'order-1',
  orderNo: 'KE-1042',
  status: 'PACKED',
  stage: 1,
  estimatedDelivery: null,
  createdAt: new Date('2026-07-01T00:00:00Z'),
  total: 5500,
  userId: 'real-owner-id',
  email: 'owner@example.com',
  items: [{ name: 'Charmast 10,400', qty: 1 }],
  events: [],
}

const findUniqueMock = vi.fn()
const findFirstMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}))

let sessionValue: { user: { id: string } } | null = null
vi.mock('next-auth', () => ({
  getServerSession: () => Promise.resolve(sessionValue),
}))
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }))

describe('GET /api/orders/track — order-number lookup requires proof of ownership', () => {
  beforeEach(() => {
    findUniqueMock.mockReset().mockResolvedValue(order)
    findFirstMock.mockReset()
    sessionValue = null
  })

  it('rejects a bare order-number lookup with no token, session, or email', async () => {
    const { GET } = await import('@/app/api/orders/track/route')
    const res = await GET(new Request('http://x/api/orders/track?no=KE-1042'))
    expect(res.status).toBe(404)
  })

  it('accepts the correct tracking token', async () => {
    const { GET } = await import('@/app/api/orders/track/route')
    const t = trackToken('KE-1042')
    const res = await GET(new Request(`http://x/api/orders/track?no=KE-1042&t=${t}`))
    expect(res.status).toBe(200)
  })

  it('rejects a token minted for a different order number', async () => {
    const { GET } = await import('@/app/api/orders/track/route')
    const t = trackToken('KE-9999')
    const res = await GET(new Request(`http://x/api/orders/track?no=KE-1042&t=${t}`))
    expect(res.status).toBe(404)
  })

  it('accepts a session that owns the order, with no token at all', async () => {
    sessionValue = { user: { id: 'real-owner-id' } }
    const { GET } = await import('@/app/api/orders/track/route')
    const res = await GET(new Request('http://x/api/orders/track?no=KE-1042'))
    expect(res.status).toBe(200)
  })

  it("rejects a signed-in session that doesn't own the order", async () => {
    sessionValue = { user: { id: 'someone-else' } }
    const { GET } = await import('@/app/api/orders/track/route')
    const res = await GET(new Request('http://x/api/orders/track?no=KE-1042'))
    expect(res.status).toBe(404)
  })

  it('accepts a matching email with no token or session', async () => {
    const { GET } = await import('@/app/api/orders/track/route')
    const res = await GET(new Request('http://x/api/orders/track?no=KE-1042&email=owner@example.com'))
    expect(res.status).toBe(200)
  })

  it('rejects a non-matching email', async () => {
    const { GET } = await import('@/app/api/orders/track/route')
    const res = await GET(new Request('http://x/api/orders/track?no=KE-1042&email=attacker@example.com'))
    expect(res.status).toBe(404)
  })
})
