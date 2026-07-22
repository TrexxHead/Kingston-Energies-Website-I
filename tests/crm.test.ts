import { describe, it, expect } from 'vitest'
import {
  CUSTOMER_NEEDS,
  isCustomerNeed,
  customerNeedLabel,
  customerValueTier,
  monthsSince,
  VALUE_TIER_CONFIG,
} from '@/lib/crm'

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

describe('customerValueTier', () => {
  const HIGH = VALUE_TIER_CONFIG.highValueLtv
  const ACTIVE = VALUE_TIER_CONFIG.activeMonths

  it('classifies a high-value, recently-active customer as Super-Growth (SGC)', () => {
    expect(customerValueTier({ ltv: HIGH + 1, orderCount: 4, monthsSinceLastOrder: 1 })).toBe('SGC')
  })

  it('classifies a high-value but dormant customer as Most Valuable (MVC)', () => {
    expect(customerValueTier({ ltv: HIGH + 1, orderCount: 4, monthsSinceLastOrder: ACTIVE + 3 })).toBe('MVC')
  })

  it('classifies a low-value but active customer as Most Growable (MGC)', () => {
    expect(customerValueTier({ ltv: 3000, orderCount: 1, monthsSinceLastOrder: 2 })).toBe('MGC')
  })

  it('classifies a low-value dormant customer as Low Maintenance (LMC)', () => {
    expect(customerValueTier({ ltv: 3000, orderCount: 1, monthsSinceLastOrder: ACTIVE + 6 })).toBe('LMC')
  })

  it('treats a never-ordered customer as Low Maintenance', () => {
    expect(customerValueTier({ ltv: 0, orderCount: 0, monthsSinceLastOrder: null })).toBe('LMC')
  })

  it('flags a zero-revenue, support-consuming contact as Below Zero (BZC)', () => {
    expect(customerValueTier({ ltv: 0, orderCount: 0, monthsSinceLastOrder: null, openTickets: 2 })).toBe('BZC')
  })
})

describe('monthsSince', () => {
  it('returns null for a missing date', () => {
    expect(monthsSince(null)).toBeNull()
  })

  it('computes roughly the right number of months', () => {
    const now = new Date('2026-07-01T00:00:00Z')
    const threeMonthsAgo = new Date('2026-04-01T00:00:00Z')
    const result = monthsSince(threeMonthsAgo, now)
    expect(result).not.toBeNull()
    expect(result as number).toBeGreaterThan(2.8)
    expect(result as number).toBeLessThan(3.2)
  })

  it('clamps a future date to 0', () => {
    const now = new Date('2026-07-01T00:00:00Z')
    const future = new Date('2026-09-01T00:00:00Z')
    expect(monthsSince(future, now)).toBe(0)
  })
})
