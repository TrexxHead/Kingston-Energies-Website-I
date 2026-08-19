import { describe, it, expect } from 'vitest'
import { wattsFromVoltsAndAmps } from '@/lib/energyCheckup/applianceLabel'

describe('wattsFromVoltsAndAmps', () => {
  it('multiplies volts by amps', () => {
    expect(wattsFromVoltsAndAmps(120, 5)).toBe(600)
  })

  it('returns null when either value is missing', () => {
    expect(wattsFromVoltsAndAmps(null, 5)).toBeNull()
    expect(wattsFromVoltsAndAmps(120, null)).toBeNull()
  })

  it('returns null for non-positive values', () => {
    expect(wattsFromVoltsAndAmps(0, 5)).toBeNull()
    expect(wattsFromVoltsAndAmps(120, -1)).toBeNull()
  })
})
