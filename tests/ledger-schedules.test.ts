import { describe, it, expect } from 'vitest'
import { straightLine, periodOf, addMonths } from '../lib/ledger/schedules'

const sum = (rows: { amount: number }[]) => Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100

describe('straightLine', () => {
  it('splits evenly when it divides cleanly', () => {
    const rows = straightLine(1200, 12, new Date('2026-01-15'))
    expect(rows).toHaveLength(12)
    expect(rows.every((r) => r.amount === 100)).toBe(true)
    expect(sum(rows)).toBe(1200)
  })

  it('always sums to the exact total despite rounding', () => {
    // 1000 / 3 = 333.333… — the remainder must land in the final period so the
    // asset fully depreciates rather than stranding cents on the balance sheet.
    const rows = straightLine(1000, 3, new Date('2026-01-01'))
    expect(sum(rows)).toBe(1000)
    expect(rows[0].amount).toBe(333.33)
    expect(rows[2].amount).toBe(333.34)
  })

  it('handles awkward totals over long lives', () => {
    const rows = straightLine(74999.99, 60, new Date('2026-03-31'))
    expect(rows).toHaveLength(60)
    expect(sum(rows)).toBe(74999.99)
  })

  it('starts at the month of the start date and advances one month per period', () => {
    const rows = straightLine(300, 3, new Date('2026-07-20'))
    expect(rows[0].periodDate.toISOString().slice(0, 7)).toBe('2026-07')
    expect(rows[1].periodDate.toISOString().slice(0, 7)).toBe('2026-08')
    expect(rows[2].periodDate.toISOString().slice(0, 7)).toBe('2026-09')
  })

  it('returns nothing for a zero or negative schedule', () => {
    expect(straightLine(0, 12, new Date())).toHaveLength(0)
    expect(straightLine(1000, 0, new Date())).toHaveLength(0)
    expect(straightLine(-500, 12, new Date())).toHaveLength(0)
  })
})

describe('period helpers', () => {
  it('normalises any date to the first of its month, in UTC', () => {
    expect(periodOf(new Date('2026-07-27T23:45:00Z')).toISOString()).toBe('2026-07-01T00:00:00.000Z')
  })

  it('rolls over year boundaries', () => {
    expect(addMonths(periodOf(new Date('2026-11-01')), 3).toISOString().slice(0, 7)).toBe('2027-02')
  })
})
