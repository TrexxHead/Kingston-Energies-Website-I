import { describe, it, expect } from 'vitest'
import {
  CUSTOMER_NEEDS,
  isCustomerNeed,
  customerNeedLabel,
  customerValueTier,
  monthsSince,
  VALUE_TIER_CONFIG,
  npsBucket,
  npsScore,
  isValidNpsScore,
  recommendProductsForNeed,
  paretoShare,
} from '@/lib/crm'

describe('paretoShare', () => {
  it('returns 0 when there is no value', () => {
    expect(paretoShare([])).toBe(0)
    expect(paretoShare([0, 0, 0])).toBe(0)
  })

  it('reports the top-fraction share of total value', () => {
    // top 1 of 5 (ceil(5*0.2)=1) holds 60 of 100 => 0.6
    expect(paretoShare([60, 10, 10, 10, 10], 0.2)).toBeCloseTo(0.6, 5)
  })

  it('always counts at least one customer in the top fraction', () => {
    expect(paretoShare([50, 50], 0.01)).toBeCloseTo(0.5, 5)
  })
})

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

describe('npsBucket', () => {
  it('buckets scores per the 0-6 / 7-8 / 9-10 rule', () => {
    expect(npsBucket(0)).toBe('detractor')
    expect(npsBucket(6)).toBe('detractor')
    expect(npsBucket(7)).toBe('passive')
    expect(npsBucket(8)).toBe('passive')
    expect(npsBucket(9)).toBe('promoter')
    expect(npsBucket(10)).toBe('promoter')
  })
})

describe('npsScore', () => {
  it('returns a zeroed summary for no responses', () => {
    expect(npsScore([])).toEqual({ score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 })
  })

  it('computes NPS as %promoters - %detractors, passives excluded', () => {
    // 6 promoters, 2 passives, 2 detractors of 10 => 60% - 20% = 40
    const scores = [10, 10, 9, 9, 9, 9, 8, 7, 3, 5]
    const summary = npsScore(scores)
    expect(summary.total).toBe(10)
    expect(summary.promoters).toBe(6)
    expect(summary.passives).toBe(2)
    expect(summary.detractors).toBe(2)
    expect(summary.score).toBe(40)
  })

  it('handles an all-detractor set as -100', () => {
    expect(npsScore([0, 1, 2, 3]).score).toBe(-100)
  })
})

describe('isValidNpsScore', () => {
  it('accepts integers 0-10 and rejects everything else', () => {
    expect(isValidNpsScore(0)).toBe(true)
    expect(isValidNpsScore(10)).toBe(true)
    expect(isValidNpsScore(11)).toBe(false)
    expect(isValidNpsScore(-1)).toBe(false)
    expect(isValidNpsScore(5.5)).toBe(false)
    expect(isValidNpsScore('7')).toBe(false)
  })
})

describe('recommendProductsForNeed', () => {
  const sample = [
    { id: 'a', cat: 'powerbanks' },
    { id: 'b', cat: 'chargers' },
    { id: 'c', cat: 'stations' },
    { id: 'd', cat: 'accessories' },
    { id: 'e', cat: 'powerbanks' },
  ]

  it('prioritises stations first for BACKUP', () => {
    const result = recommendProductsForNeed(sample, 'BACKUP', 3)
    expect(result[0].cat).toBe('stations')
  })

  it('drops categories outside the need priority', () => {
    // OFFGRID priority = stations, powerbanks, accessories (no chargers)
    const result = recommendProductsForNeed(sample, 'OFFGRID', 10)
    expect(result.some((p) => p.cat === 'chargers')).toBe(false)
  })

  it('preserves catalog order within the same category rank', () => {
    // EVERYDAY: powerbanks first — a and e, in original order
    const result = recommendProductsForNeed(sample, 'EVERYDAY', 2)
    expect(result.map((p) => p.id)).toEqual(['a', 'e'])
  })

  it('returns the first N unchanged when no need is set', () => {
    const result = recommendProductsForNeed(sample, null, 2)
    expect(result.map((p) => p.id)).toEqual(['a', 'b'])
  })
})
