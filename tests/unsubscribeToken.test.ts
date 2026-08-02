import { describe, it, expect } from 'vitest'
import { unsubscribeToken, verifyUnsubscribeToken } from '@/lib/unsubscribeToken'

describe('unsubscribeToken', () => {
  it('is deterministic for the same email', () => {
    expect(unsubscribeToken('a@example.com')).toBe(unsubscribeToken('a@example.com'))
  })

  it('is case-insensitive', () => {
    expect(unsubscribeToken('A@Example.com')).toBe(unsubscribeToken('a@example.com'))
  })

  it('differs between emails', () => {
    expect(unsubscribeToken('a@example.com')).not.toBe(unsubscribeToken('b@example.com'))
  })

  it('verifies a token generated for the same email', () => {
    expect(verifyUnsubscribeToken('a@example.com', unsubscribeToken('a@example.com'))).toBe(true)
  })

  it("rejects a token generated for someone else's email", () => {
    expect(verifyUnsubscribeToken('a@example.com', unsubscribeToken('b@example.com'))).toBe(false)
  })

  it('rejects a missing, empty, or garbage token', () => {
    expect(verifyUnsubscribeToken('a@example.com', null)).toBe(false)
    expect(verifyUnsubscribeToken('a@example.com', undefined)).toBe(false)
    expect(verifyUnsubscribeToken('a@example.com', '')).toBe(false)
    expect(verifyUnsubscribeToken('a@example.com', 'not-a-real-token')).toBe(false)
  })
})
