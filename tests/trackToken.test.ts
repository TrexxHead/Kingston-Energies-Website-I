import { describe, it, expect } from 'vitest'
import { trackToken, verifyTrackToken } from '@/lib/trackToken'

describe('trackToken', () => {
  it('is deterministic for the same order number', () => {
    expect(trackToken('KE-1042')).toBe(trackToken('KE-1042'))
  })

  it('differs between order numbers', () => {
    expect(trackToken('KE-1042')).not.toBe(trackToken('KE-1043'))
  })

  it('verifies a token generated for the same order number', () => {
    expect(verifyTrackToken('KE-1042', trackToken('KE-1042'))).toBe(true)
  })

  it('rejects a token generated for a different order number', () => {
    expect(verifyTrackToken('KE-1042', trackToken('KE-1043'))).toBe(false)
  })

  it('rejects a missing, empty, or garbage token', () => {
    expect(verifyTrackToken('KE-1042', null)).toBe(false)
    expect(verifyTrackToken('KE-1042', undefined)).toBe(false)
    expect(verifyTrackToken('KE-1042', '')).toBe(false)
    expect(verifyTrackToken('KE-1042', 'not-a-real-token')).toBe(false)
  })
})
