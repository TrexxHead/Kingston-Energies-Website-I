import { describe, it, expect } from 'vitest'
import { calculatePayslip, summarise, DEFAULT_RATES, PERIODS_PER_YEAR } from '../lib/payroll'

const R = DEFAULT_RATES

describe('calculatePayslip', () => {
  it('charges no PAYE below the threshold', () => {
    // Annual threshold / 12 ≈ 149,948 monthly. Well under it:
    const s = calculatePayslip(100_000, 'MONTHLY', R)
    expect(s.paye).toBe(0)
    // Other statutory deductions still apply.
    expect(s.nisEmployee).toBeGreaterThan(0)
    expect(s.nhtEmployee).toBeGreaterThan(0)
    expect(s.edTaxEmployee).toBeGreaterThan(0)
  })

  it('charges PAYE only on income above the threshold', () => {
    const gross = 250_000
    const s = calculatePayslip(gross, 'MONTHLY', R)
    const thresholdPerPeriod = R.payeThresholdAnnual / 12
    const expected = Math.round(((gross - s.nisEmployee - thresholdPerPeriod) * R.payeRate) * 100) / 100
    expect(s.paye).toBeCloseTo(expected, 2)
  })

  it('caps NIS at the annual insurable ceiling', () => {
    const ceilingPerMonth = R.nisCeilingAnnual / 12
    // Well above the ceiling — NIS should be charged on the ceiling, not gross.
    const s = calculatePayslip(ceilingPerMonth * 3, 'MONTHLY', R)
    expect(s.nisEmployee).toBeCloseTo(Math.round(ceilingPerMonth * R.nisEmployeeRate * 100) / 100, 2)
  })

  it('net = gross less every employee deduction', () => {
    const s = calculatePayslip(180_000, 'MONTHLY', R, 5_000)
    const manual = s.gross - (s.paye + s.nisEmployee + s.nhtEmployee + s.edTaxEmployee + s.otherDeductions)
    expect(s.net).toBeCloseTo(manual, 2)
  })

  it('never returns a negative PAYE', () => {
    const s = calculatePayslip(1_000, 'WEEKLY', R)
    expect(s.paye).toBe(0)
    expect(s.net).toBeGreaterThan(0)
  })

  it('employer cost exceeds gross by exactly the employer contributions', () => {
    const s = calculatePayslip(200_000, 'MONTHLY', R)
    const contributions = s.nisEmployer + s.nhtEmployer + s.edTaxEmployer + s.heartEmployer
    expect(s.totalEmployerCost).toBeCloseTo(s.gross + contributions, 2)
  })

  it('employer contributions are not deducted from the employee', () => {
    const s = calculatePayslip(200_000, 'MONTHLY', R)
    // Net must be unaffected by employer-side amounts.
    const employeeSide = s.paye + s.nisEmployee + s.nhtEmployee + s.edTaxEmployee
    expect(s.gross - employeeSide).toBeCloseTo(s.net, 2)
  })

  it('pro-rates the PAYE threshold by pay frequency', () => {
    // The same annual pay should attract roughly the same annual PAYE however
    // it is sliced, otherwise weekly staff would be over-taxed.
    const annual = 2_400_000
    const monthly = calculatePayslip(annual / 12, 'MONTHLY', R)
    const weekly = calculatePayslip(annual / 52, 'WEEKLY', R)
    expect(monthly.paye * 12).toBeCloseTo(weekly.paye * 52, 0)
  })

  it('exempts small employers from HEART', () => {
    const small = calculatePayslip(50_000, 'MONTHLY', R)
    expect(small.heartEmployer).toBe(0)
    const large = calculatePayslip(300_000, 'MONTHLY', R)
    expect(large.heartEmployer).toBeGreaterThan(0)
  })
})

describe('summarise', () => {
  it('totals a run across employees', () => {
    const slips = [
      calculatePayslip(150_000, 'MONTHLY', R),
      calculatePayslip(90_000, 'MONTHLY', R),
    ]
    const t = summarise(slips)
    expect(t.headcount).toBe(2)
    expect(t.gross).toBeCloseTo(240_000, 2)
    expect(t.net).toBeCloseTo(slips[0].net + slips[1].net, 2)
  })

  it('is zero for an empty run rather than NaN', () => {
    const t = summarise([])
    expect(t.gross).toBe(0)
    expect(t.net).toBe(0)
    expect(t.headcount).toBe(0)
  })
})

describe('pay frequency', () => {
  it('knows how many periods fall in a year', () => {
    expect(PERIODS_PER_YEAR.MONTHLY).toBe(12)
    expect(PERIODS_PER_YEAR.FORTNIGHTLY).toBe(26)
    expect(PERIODS_PER_YEAR.WEEKLY).toBe(52)
  })
})

describe('payroll journal entry', () => {
  // Mirrors postPayrollRun in lib/ledger/post.ts. If the calculator ever drifts
  // out of this identity the ledger will refuse the entry, so it is worth
  // catching here rather than at approval time.
  it('debits equal credits for the posted entry', () => {
    const slips = [
      calculatePayslip(320_000, 'MONTHLY', R, 4_000),
      calculatePayslip(85_000, 'MONTHLY', R),
      calculatePayslip(25_000, 'WEEKLY', R, 1_250),
    ]
    const t = summarise(slips)

    const employerContributions = t.nisEmployer + t.nhtEmployer + t.edTaxEmployer + t.heartEmployer
    const debits = t.gross + employerContributions
    const credits =
      t.paye +
      (t.nisEmployee + t.nisEmployer) +
      (t.nhtEmployee + t.nhtEmployer) +
      (t.edTaxEmployee + t.edTaxEmployer) +
      t.heartEmployer +
      t.otherDeductions +
      t.net

    expect(credits).toBeCloseTo(debits, 2)
  })

  it('gross fully accounts for deductions plus net', () => {
    const s = calculatePayslip(275_000, 'MONTHLY', R, 7_500)
    expect(s.paye + s.nisEmployee + s.nhtEmployee + s.edTaxEmployee + s.otherDeductions + s.net).toBeCloseTo(s.gross, 2)
  })
})
