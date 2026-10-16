import { describe, it, expect } from 'vitest'
import { loanDetail, monthlyIrr, monthlyPayment } from '@/lib/energy/engine'

const base = { price: 1_100_000, deposit: 100_000, annualRatePct: 12, termMonths: 60 }

describe('detailed loan', () => {
  it('without fees matches the simple loan and its true cost equals the rate', () => {
    const r = loanDetail(base)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.borrowed).toBe(1_000_000)
    expect(r.value.instalment).toBeCloseTo(22244.45, 1)
    expect(r.value.months).toBe(60)
    expect(r.value.schedule[59].balance).toBeCloseTo(0, 2)
    expect(r.value.totalInterest).toBeCloseTo(22244.45 * 60 - 1_000_000, -1)
    expect(r.value.trueAnnualRatePct).toBeCloseTo(12, 3)
  })
  it('fees raise the true yearly cost above the advertised rate, by when they are paid', () => {
    const fees = [
      { label: 'Processing', basis: 'percent' as const, value: 2, when: 'upfront' as const },
      { label: 'Legal', basis: 'flat' as const, value: 15_000, when: 'financed' as const },
      { label: 'Service', basis: 'flat' as const, value: 500, when: 'monthly' as const },
      { label: 'Equipment insurance', basis: 'flat' as const, value: 12_000, when: 'yearly' as const },
    ]
    const r = loanDetail({ ...base, fees })
    if (!r.ok) throw new Error(r.message)
    expect(r.value.upfrontCash).toBe(20_000) // 2% of 1,000,000
    expect(r.value.borrowed).toBe(1_015_000)
    expect(r.value.instalment).toBeCloseTo(monthlyPayment(1_015_000, 12, 60), 6)
    // Normal month: instalment + J$500 service (yearly fee excluded from the "normal month").
    expect(r.value.monthlyOutgoing).toBeCloseTo(r.value.instalment + 500, 6)
    expect(r.value.totalFees).toBeCloseTo(20_000 + 15_000 + 500 * 60 + 12_000 * 5, 6)
    expect(r.value.trueAnnualRatePct!).toBeGreaterThan(14)
    expect(r.value.costOfCredit).toBeCloseTo(r.value.totalInterest + r.value.totalFees, 6)
    expect(r.value.totalPaid).toBeCloseTo(100_000 + 20_000 + r.value.schedule.reduce((s, x) => s + x.payment + x.fees, 0), 4)
  })
  it('life insurance follows the falling balance', () => {
    const r = loanDetail({ ...base, lifeInsurancePctPerYear: 0.6 })
    if (!r.ok) throw new Error(r.message)
    expect(r.value.schedule[0].insurance).toBeCloseTo((1_000_000 * 0.6) / 100 / 12, 6)
    expect(r.value.schedule[59].insurance).toBeLessThan(r.value.schedule[0].insurance / 20)
  })
  it('interest-only months: interest first, then equal instalments over the rest', () => {
    const r = loanDetail({ ...base, interestOnlyMonths: 6 })
    if (!r.ok) throw new Error(r.message)
    expect(r.value.interestOnlyPayment).toBeCloseTo(10_000, 6)
    expect(r.value.schedule[5].principal).toBe(0)
    expect(r.value.instalment).toBeCloseTo(monthlyPayment(1_000_000, 12, 54), 6)
    expect(r.value.schedule[59].balance).toBeCloseTo(0, 2)
  })
  it('extra payments clear the loan sooner and save interest', () => {
    const r = loanDetail({ ...base, extraMonthly: 5_000 })
    if (!r.ok) throw new Error(r.message)
    expect(r.value.months).toBeLessThan(60)
    expect(r.value.extra!.monthsSaved).toBe(60 - r.value.months)
    expect(r.value.extra!.interestSaved).toBeGreaterThan(0)
    expect(r.value.schedule[r.value.months - 1].balance).toBe(0)
  })
  it('rate rise, saving and income share', () => {
    const r = loanDetail({ ...base, rateRisePct: 2, monthlySaving: 25_000, monthlyIncome: 200_000 })
    if (!r.ok) throw new Error(r.message)
    expect(r.value.rateRise!.instalment).toBeCloseTo(monthlyPayment(1_000_000, 14, 60), 6)
    expect(r.value.rateRise!.difference).toBeGreaterThan(0)
    expect(r.value.netMonthly).toBeCloseTo(22244.45 - 25_000, 1)
    expect(r.value.incomeSharePct).toBeCloseTo(11.12, 1)
    // Saving beats the payment by J$2,755.55/month; it covers the J$100,000 deposit in month 37.
    expect(r.value.breakEvenMonth).toBe(37)
  })
  it('refuses bad inputs', () => {
    expect(loanDetail({ ...base, deposit: 1_100_000 }).ok).toBe(false)
    expect(loanDetail({ ...base, interestOnlyMonths: 60 }).ok).toBe(false)
    expect(loanDetail({ ...base, fees: [{ label: 'x', basis: 'percent', value: 80, when: 'upfront' }] }).ok).toBe(false)
  })
  it('IRR solves a known loan', () => {
    const pmt = monthlyPayment(1000, 12, 12)
    expect(monthlyIrr([1000, ...Array(12).fill(-pmt)])! * 12 * 100).toBeCloseTo(12, 4)
  })
})
