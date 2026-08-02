import { describe, it, expect } from 'vitest'
import { rateLimit, clientIp } from '@/lib/rateLimit'

describe('rateLimit', () => {
  it('allows up to max requests then blocks', async () => {
    const key = `test-${Math.random()}`
    for (let i = 0; i < 3; i++) {
      expect((await rateLimit(key, 3, 60_000)).ok).toBe(true)
    }
    const blocked = await rateLimit(key, 3, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('uses independent buckets per key', async () => {
    const a = `a-${Math.random()}`
    const b = `b-${Math.random()}`
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(true)
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false)
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true) // b unaffected by a's limit
  })

  it('falls back to the in-memory limiter when Upstash env vars are unset (the default today)', async () => {
    expect(process.env.UPSTASH_REDIS_REST_URL).toBeUndefined()
    expect(process.env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined()
    const key = `nomstash-${Math.random()}`
    expect((await rateLimit(key, 1, 60_000)).ok).toBe(true)
    expect((await rateLimit(key, 1, 60_000)).ok).toBe(false)
  })
})

describe('clientIp', () => {
  it('parses the first x-forwarded-for entry', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(clientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to a shared bucket when no proxy header is present', () => {
    expect(clientIp(new Request('http://x'))).toBe('anon')
  })
})
