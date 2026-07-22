import { describe, it, expect } from 'vitest'
import { CUSTOMER_NEEDS, isCustomerNeed, customerNeedLabel } from '@/lib/crm'

describe('CUSTOMER_NEEDS', () => {
  it('has unique ids and non-empty labels', () => {
    const ids = new Set<string>()
    for (const n of CUSTOMER_NEEDS) {
      expect(n.label.length).toBeGreaterThan(0)
      expect(ids.has(n.id)).toBe(false)
      ids.add(n.id)
    }
  })
})

describe('isCustomerNeed', () => {
  it('accepts valid need ids and rejects everything else', () => {
    expect(isCustomerNeed('BACKUP')).toBe(true)
    expect(isCustomerNeed('OFFGRID')).toBe(true)
    expect(isCustomerNeed('nonsense')).toBe(false)
    expect(isCustomerNeed(null)).toBe(false)
    expect(isCustomerNeed(undefined)).toBe(false)
  })
})

describe('customerNeedLabel', () => {
  it('maps a stored id to its label', () => {
    expect(customerNeedLabel('BUSINESS')).toBe('Small business')
    expect(customerNeedLabel('EVERYDAY')).toBe('Everyday carry')
  })

  it('returns a dash for null, undefined, or unknown values', () => {
    expect(customerNeedLabel(null)).toBe('—')
    expect(customerNeedLabel(undefined)).toBe('—')
    expect(customerNeedLabel('WHatever')).toBe('—')
  })
})
