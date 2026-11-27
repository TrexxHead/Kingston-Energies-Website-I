import { describe, it, expect } from 'vitest'
import { loanCost, monthlyPayment, CALC_ENGINE_VERSION } from '@/lib/energy/engine'

describe('loan repayment', () => {
  it('matches the standard amortisation formula', () => {
    // J$1,000,000 at 12% for 60 months → J$22,244.45 (textbook value).
    expect(monthlyPayment(1_000_000, 12, 60)).toBeCloseTo(22244.45, 1)
    expect(monthlyPayment(120_000, 0, 12)).toBe(10_000)
  })
  it('computes totals, net monthly and break-even', () => {
    const r = loanCost({ price: 1_200_000, deposit: 200_000, annualRatePct: 12, termMonths: 60, financedFees: 0, monthlySaving: 25_000 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.borrowed).toBe(1_000_000)
    expect(r.value.totalInterest).toBeCloseTo(22244.45 * 60 - 1_000_000, -1)
    expect(r.value.netMonthly).toBeCloseTo(22244.45 - 25_000, 1)
    // Deposit 200k + 60 × 22,244 = 1,534,667 → covered by 25k/month in month 62.
    expect(r.value.breakEvenMonth).toBe(62)
  })
  it('adds financed fees to the amount borrowed and has no break-even without a saving', () => {
    const r = loanCost({ price: 500_000, deposit: 0, annualRatePct: 10, termMonths: 36, financedFees: 5_000 })
    expect(r.ok && r.value.borrowed).toBe(505_000)
    expect(r.ok && r.value.breakEvenMonth).toBeNull()
    expect(r.ok && r.value.netMonthly).toBeNull()
  })
  it('refuses impossible inputs', () => {
    expect(loanCost({ price: 0, deposit: 0, annualRatePct: 10, termMonths: 12 }).ok).toBe(false)
    expect(loanCost({ price: 100, deposit: 100, annualRatePct: 10, termMonths: 12 }).ok).toBe(false)
    expect(loanCost({ price: 100, deposit: 0, annualRatePct: 10, termMonths: 0 }).ok).toBe(false)
    expect(loanCost({ price: 100, deposit: 0, annualRatePct: 10, termMonths: 12.5 }).ok).toBe(false)
  })
  it('engine version bumped for the finance formula', () => {
    const [maj, min] = CALC_ENGINE_VERSION.split('.').map(Number)
    expect(maj > 1 || (maj === 1 && min >= 3)).toBe(true)
  })
})
