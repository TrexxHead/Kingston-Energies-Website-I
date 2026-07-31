import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regression test for the ZAP "SQL Injection" finding on POST /api/chat.
 *
 * Verdict: FALSE POSITIVE. The only database call this route makes is a
 * lookup by the signed-in session's own id (`prisma.user.findUnique({ where:
 * { id: session.user.id } })`) — the user-supplied message text never reaches
 * a query anywhere. This test proves that property directly: it posts a
 * SQL-metacharacter-laden message through an authenticated session and
 * asserts the mocked Prisma call only ever sees the session id, never the
 * message content, plus a normal 200 response with no error leakage.
 */

const findUniqueMock = vi.fn().mockResolvedValue({ primaryNeed: null })
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) } },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: 'session-user-id' } }),
}))

vi.mock('@/lib/authOptions', () => ({ authOptions: {} }))

// Fake the streaming Anthropic client so no real network call happens.
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class FakeAnthropic {
      messages = {
        stream: () => ({
          on: (event: string, cb: (delta: string) => void) => {
            if (event === 'text') cb('a normal assistant reply')
          },
          finalMessage: () => Promise.resolve({}),
        }),
      }
    },
  }
})

describe('POST /api/chat — SQL injection false-positive regression', () => {
  beforeEach(() => {
    findUniqueMock.mockClear()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  it('never lets message content reach the database query', async () => {
    const { POST } = await import('@/app/api/chat/route')

    const payload = "user' AND '1'='1' --"
    const res = await POST(
      new Request('http://x/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: payload }] }),
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.text()
    // No DB error markers of any kind should ever appear in the response.
    expect(body.toLowerCase()).not.toMatch(/syntax error|sql|postgres|prisma/)

    // The only DB call made — confirm it's keyed by session id, never the message.
    expect(findUniqueMock).toHaveBeenCalledTimes(1)
    const [call] = findUniqueMock.mock.calls[0] as [{ where: { id: string } }]
    expect(call.where.id).toBe('session-user-id')
    expect(JSON.stringify(call)).not.toContain(payload)
  })
})
