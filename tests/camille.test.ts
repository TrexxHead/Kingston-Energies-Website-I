import { describe, it, expect } from 'vitest'
import { fallbackAnswer, JORDYN_SYSTEM } from '@/lib/camille'

describe('fallbackAnswer', () => {
  it('routes power bank questions to the powerbanks category', () => {
    expect(fallbackAnswer('where can I get a power bank?')).toContain('/shop?category=powerbanks')
  })

  it('mentions accepted payment methods for checkout questions', () => {
    const answer = fallbackAnswer('how do I pay at checkout?').toLowerCase()
    expect(answer).toMatch(/paypal|google pay/)
  })

  it('quotes prices in JMD, never GBP', () => {
    const answer = fallbackAnswer('how much is a power bank?')
    expect(answer).toContain('J$')
    expect(answer).not.toContain('£')
  })

  it('falls back to a generic help message pointing at the shop', () => {
    expect(fallbackAnswer('zxcvbnm qwerty')).toContain('/shop')
  })
})

describe('JORDYN_SYSTEM prompt', () => {
  it('identifies the assistant as Jordyn (not Camille)', () => {
    expect(JORDYN_SYSTEM).toContain('You are Jordyn')
    expect(JORDYN_SYSTEM).not.toContain('Camille')
  })
})
