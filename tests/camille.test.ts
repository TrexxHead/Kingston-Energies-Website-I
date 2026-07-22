import { describe, it, expect } from 'vitest'
import { fallbackAnswer, JORDYN_SYSTEM, jordynSystem } from '@/lib/camille'

describe('jordynSystem', () => {
  it('returns the base prompt unchanged when no need is provided', () => {
    expect(jordynSystem(null)).toBe(JORDYN_SYSTEM)
    expect(jordynSystem()).toBe(JORDYN_SYSTEM)
  })

  it('appends a customer-context block when a need is known', () => {
    const prompt = jordynSystem('BACKUP')
    expect(prompt.startsWith(JORDYN_SYSTEM)).toBe(true)
    expect(prompt).toContain('CUSTOMER CONTEXT')
    expect(prompt).toContain('Home backup')
    // Backup leans to power stations first
    expect(prompt).toContain('stations')
  })
})

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
