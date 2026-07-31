import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regression test: /api/auth/forgot-password was rate-limited per IP (5/15min)
 * but not per email, so an attacker spread across enough IPs could still
 * flood one victim's inbox. A 4th request for the same email within an hour
 * must not trigger another email send — but must still answer {ok:true}, the
 * same as it would for an unregistered address, so this can't be used to
 * fingerprint whether someone hit their own limit vs. doesn't have an account.
 */

const sendMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => sendMock(...args),
}))

const findUniqueMock = vi.fn().mockResolvedValue({ id: 'u1', name: 'Test', password: 'hashed' })
const deleteManyMock = vi.fn().mockResolvedValue({ count: 0 })
const createMock = vi.fn().mockResolvedValue({})
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    verificationToken: {
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}))

describe('POST /api/auth/forgot-password — per-email rate limit', () => {
  beforeEach(() => {
    sendMock.mockClear()
  })

  // Each request carries a distinct fake x-forwarded-for so the (separate,
  // already-existing) per-IP limiter never interferes with what's under test
  // here — an attacker spread across many IPs is exactly the scenario the
  // per-email limit exists to cover.
  const req = (email: string, ip: string) =>
    new Request('http://x', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      body: JSON.stringify({ email }),
    })

  it('sends up to 3 reset emails for the same address, then silently stops', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const email = `flood-target-${Math.random()}@example.com`

    for (let i = 0; i < 3; i++) {
      const res = await POST(req(email, `10.0.1.${i}`))
      expect(res.status).toBe(200)
    }
    expect(sendMock).toHaveBeenCalledTimes(3)

    // 4th request, from yet another IP — still answers ok (never reveals the
    // limit was hit), but must not send a 4th email.
    const res4 = await POST(req(email, '10.0.1.99'))
    const body4 = await res4.json()
    expect(res4.status).toBe(200)
    expect(body4).toEqual({ ok: true })
    expect(sendMock).toHaveBeenCalledTimes(3)
  })

  it("doesn't let one email's limit affect a different email", async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const emailA = `a-${Math.random()}@example.com`
    const emailB = `b-${Math.random()}@example.com`

    for (let i = 0; i < 3; i++) {
      await POST(req(emailA, `10.0.2.${i}`))
    }
    sendMock.mockClear()

    const res = await POST(req(emailB, '10.0.2.50'))
    expect(res.status).toBe(200)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })
})
