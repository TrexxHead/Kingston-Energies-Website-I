import { describe, it, expect } from 'vitest'
import { ruleMatches, firstMatch } from '../lib/banking/rules'
import type { BankRule } from '@prisma/client'

const rule = (over: Partial<BankRule> = {}): BankRule =>
  ({
    id: 'r1',
    name: 'Utilities',
    contains: 'FLOW',
    direction: 'ANY',
    accountId: 'acc-utilities',
    priority: 100,
    enabled: true,
    autoPost: false,
    matchCount: 0,
    lastMatchAt: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as BankRule

describe('ruleMatches', () => {
  it('matches on a case-insensitive substring', () => {
    expect(ruleMatches(rule(), { description: 'POS Flow Jamaica Ltd', amount: -3500 })).toBe(true)
  })

  it('does not match a different payee', () => {
    expect(ruleMatches(rule(), { description: 'DIGICEL PAYMENT', amount: -3500 })).toBe(false)
  })

  it('respects a money-out direction', () => {
    const out = rule({ direction: 'OUT' })
    expect(ruleMatches(out, { description: 'FLOW refund', amount: 3500 })).toBe(false)
    expect(ruleMatches(out, { description: 'FLOW bill', amount: -3500 })).toBe(true)
  })

  it('respects a money-in direction', () => {
    const incoming = rule({ direction: 'IN' })
    expect(ruleMatches(incoming, { description: 'FLOW refund', amount: 3500 })).toBe(true)
    expect(ruleMatches(incoming, { description: 'FLOW bill', amount: -3500 })).toBe(false)
  })

  it('never fires while disabled', () => {
    expect(ruleMatches(rule({ enabled: false }), { description: 'FLOW', amount: -100 })).toBe(false)
  })

  it('ignores a rule with an empty match string rather than matching everything', () => {
    expect(ruleMatches(rule({ contains: '   ' }), { description: 'anything at all', amount: -100 })).toBe(false)
  })
})

describe('firstMatch', () => {
  const line = { description: 'FLOW JAMAICA BUSINESS BROADBAND', amount: -8400 }

  it('returns null when nothing matches', () => {
    expect(firstMatch([rule({ contains: 'DIGICEL' })], line)).toBeNull()
  })

  it('prefers the lower priority number', () => {
    const winner = rule({ id: 'high', contains: 'FLOW', priority: 10, accountId: 'acc-a' })
    const loser = rule({ id: 'low', contains: 'FLOW', priority: 200, accountId: 'acc-b' })
    expect(firstMatch([loser, winner], line)?.ruleId).toBe('high')
  })

  it('breaks a priority tie on the more specific rule', () => {
    // A later broad rule must not silently override the precise one.
    const broad = rule({ id: 'broad', contains: 'FLOW' })
    const specific = rule({ id: 'specific', contains: 'FLOW JAMAICA BUSINESS' })
    expect(firstMatch([broad, specific], line)?.ruleId).toBe('specific')
  })

  it('carries the auto-post flag through, so suggestion stays the default', () => {
    expect(firstMatch([rule()], line)?.autoPost).toBe(false)
    expect(firstMatch([rule({ autoPost: true })], line)?.autoPost).toBe(true)
  })

  it('skips disabled rules even when they would otherwise win', () => {
    const disabled = rule({ id: 'off', priority: 1, enabled: false })
    const active = rule({ id: 'on', priority: 50 })
    expect(firstMatch([disabled, active], line)?.ruleId).toBe('on')
  })
})
