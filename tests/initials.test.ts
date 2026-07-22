import { describe, it, expect } from 'vitest'
import { initials } from '@/lib/initials'

describe('initials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initials('JoWayne Fearon')).toBe('JF')
    expect(initials('renee b')).toBe('RB')
  })

  it('handles a single word', () => {
    expect(initials('Cher')).toBe('C')
  })
})
