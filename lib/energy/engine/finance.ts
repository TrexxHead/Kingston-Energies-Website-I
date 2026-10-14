import { type CalcResult, refuse, isPositive, isNonNegative } from './result'

/**
 * Loan repayment for an energy purchase (roadmap W2). Standard amortising
 * loan with monthly payments; the rate is the lender's ADVERTISED annual
 * rate (or the visitor's own), converted to a monthly rate by dividing by
 * 12 — how Jamaican lenders typically quote instalment loans. A lender's
 * actual offer (rate, fees, insurance) depends on their own assessment.
 */

export interface LoanInput {
  price: number
  deposit: number
  annualRatePct: number
  termMonths: number
  /** One-off fees added to the amount borrowed (e.g. a processing fee), if known. */
  financedFees?: number
  /** Optional: monthly saving on the electricity bill from the purchase, to show the net monthly effect. */
  monthlySaving?: number
}

export interface LoanResult {
  borrowed: number
  monthlyPayment: number
  totalRepaid: number
  totalInterest: number
  /** Payment minus the monthly saving (positive = costs more each month than it saves). */
  netMonthly: number | null
  /** Month (1-based) the cumulative saving first covers deposit + repayments so far, if within 25 years. */
  breakEvenMonth: number | null
}

export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / months
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}

export function loanCost(i: LoanInput): CalcResult<LoanResult> {
  if (!isPositive(i.price)) return refuse('missing_input', ['price'], 'Enter the price of the system.')
  if (!isNonNegative(i.deposit) || i.deposit >= i.price) return refuse('invalid_input', ['deposit'], 'The deposit must be less than the price.')
  if (!isNonNegative(i.annualRatePct) || i.annualRatePct > 60) return refuse('missing_input', ['annualRatePct'], 'Enter an annual interest rate.')
  if (!Number.isInteger(i.termMonths) || i.termMonths < 1 || i.termMonths > 360) return refuse('invalid_input', ['termMonths'], 'Choose a term between 1 and 360 months.')
  const fees = isNonNegative(i.financedFees) ? i.financedFees : 0
  const borrowed = i.price - i.deposit + fees
  const pay = monthlyPayment(borrowed, i.annualRatePct, i.termMonths)
  const totalRepaid = pay * i.termMonths
  const saving = isPositive(i.monthlySaving) ? i.monthlySaving : null

  let breakEven: number | null = null
  if (saving) {
    let paid = i.deposit
    let saved = 0
    for (let m = 1; m <= 300; m++) {
      if (m <= i.termMonths) paid += pay
      saved += saving
      if (saved >= paid) {
        breakEven = m
        break
      }
    }
  }
  return {
    ok: true,
    value: { borrowed, monthlyPayment: pay, totalRepaid, totalInterest: totalRepaid - borrowed, netMonthly: saving == null ? null : pay - saving, breakEvenMonth: breakEven },
    basis: 'customer_entered',
    assumptions: [
      { id: 'finance.monthly_rate', description: 'Monthly rate = annual rate ÷ 12, fixed for the whole term; equal monthly payments.' },
      ...(saving ? [{ id: 'finance.flat_saving', description: 'The monthly bill saving is treated as constant; tariff changes and panel ageing are not modelled.' }] : []),
    ],
    warnings: ['Advertised rates are not offers: the lender sets your rate, fees and any required insurance after assessing your application.'],
  }
}
