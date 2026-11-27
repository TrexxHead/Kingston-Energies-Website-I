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

// ─────────────────────────────────────────────────────────────────────────
// Detailed loan (engine 1.5.0): fees, insurance, interest-only months,
// extra payments, a rate-rise check, a month-by-month schedule and the
// "true yearly cost" (an APR-style rate that includes every fee).
// ─────────────────────────────────────────────────────────────────────────

/**
 * A charge on the loan, entered as the lender states it.
 * - basis 'flat' = J$; 'percent' = % of the amount borrowed (before any financed fees).
 * - when: 'upfront' paid in cash at the start; 'financed' added to the loan;
 *   'monthly' every month while the loan runs; 'yearly' once a year (months 1, 13, 25…).
 */
export interface LoanFee {
  label: string
  basis: 'flat' | 'percent'
  value: number
  when: 'upfront' | 'financed' | 'monthly' | 'yearly'
}

export interface LoanDetailInput {
  price: number
  deposit: number
  annualRatePct: number
  termMonths: number
  fees?: LoanFee[]
  /** Creditor life insurance as % a year of the outstanding balance, charged monthly. */
  lifeInsurancePctPerYear?: number
  /** Months at the start when only interest is paid (a grace / moratorium period). */
  interestOnlyMonths?: number
  /** Paid on top of the instalment every month to clear the loan sooner. */
  extraMonthly?: number
  /** For a variable rate: show payments if the rate rises by this many points. */
  rateRisePct?: number
  monthlySaving?: number
  monthlyIncome?: number
}

export interface ScheduleRow {
  month: number
  payment: number
  interest: number
  principal: number
  fees: number
  insurance: number
  balance: number
}

export interface LoanDetailResult {
  /** Price minus deposit — what the loan pays for. */
  amountNeeded: number
  financedFees: number
  borrowed: number
  upfrontCash: number
  /** Regular instalment (after any interest-only months), excluding fees and insurance. */
  instalment: number
  interestOnlyPayment: number | null
  /** Instalment + extra + monthly fees + first-month insurance — what leaves the account in a normal month. */
  monthlyOutgoing: number
  months: number
  totalInterest: number
  totalFees: number
  totalInsurance: number
  /** Interest + all fees + insurance. */
  costOfCredit: number
  /** Deposit + upfront cash + every payment. */
  totalPaid: number
  /** APR-style annual rate including every fee and insurance (null if it can't be solved). */
  trueAnnualRatePct: number | null
  schedule: ScheduleRow[]
  extra: { monthsSaved: number; interestSaved: number } | null
  rateRise: { ratePct: number; instalment: number; difference: number } | null
  netMonthly: number | null
  breakEvenMonth: number | null
  incomeSharePct: number | null
}

const feeAmount = (f: LoanFee, base: number) => (f.basis === 'percent' ? (base * f.value) / 100 : f.value)

function simulate(borrowed: number, monthlyRate: number, term: number, io: number, extra: number, monthlyFees: number, yearlyFees: number, lifePct: number) {
  const rows: ScheduleRow[] = []
  let bal = borrowed
  const instalment = io < term ? monthlyPayment(borrowed, monthlyRate * 1200, term - io) : 0
  for (let m = 1; m <= term && bal > 0.005; m++) {
    const interest = bal * monthlyRate
    const insurance = (bal * lifePct) / 100 / 12
    const fees = monthlyFees + (m % 12 === 1 ? yearlyFees : 0)
    let principal = m <= io ? 0 : Math.min(bal, instalment - interest + extra)
    if (principal < 0) principal = 0
    const payment = interest + principal
    bal -= principal
    rows.push({ month: m, payment, interest, principal, fees, insurance, balance: Math.max(0, bal) })
  }
  return { rows, instalment }
}

/** Monthly internal rate of return of cashflows (index = month), by bisection; null if not bracketed. */
export function monthlyIrr(flows: number[]): number | null {
  const npv = (r: number) => flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0)
  let lo = 0
  let hi = 0.2
  if (npv(lo) * npv(hi) > 0) return npv(lo) === 0 ? 0 : null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (npv(lo) * npv(mid) <= 0) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

export function loanDetail(i: LoanDetailInput): CalcResult<LoanDetailResult> {
  if (!isPositive(i.price)) return refuse('missing_input', ['price'], 'Enter the price from your quote.')
  if (!isNonNegative(i.deposit) || i.deposit >= i.price) return refuse('invalid_input', ['deposit'], 'The deposit must be less than the price.')
  if (!isNonNegative(i.annualRatePct) || i.annualRatePct > 60) return refuse('missing_input', ['annualRatePct'], 'Enter the interest rate.')
  if (!Number.isInteger(i.termMonths) || i.termMonths < 1 || i.termMonths > 360) return refuse('invalid_input', ['termMonths'], 'Choose a loan length between 1 month and 30 years.')
  const io = Math.max(0, Math.floor(i.interestOnlyMonths ?? 0))
  if (io >= i.termMonths) return refuse('invalid_input', ['interestOnlyMonths'], 'Interest-only months must be shorter than the loan.')
  const fees = (i.fees ?? []).filter((f) => isNonNegative(f.value) && f.value > 0)
  if (fees.some((f) => f.basis === 'percent' && f.value > 50)) return refuse('invalid_input', ['fees'], 'A percentage fee over 50% looks wrong — check it.')
  const life = isNonNegative(i.lifeInsurancePctPerYear) ? i.lifeInsurancePctPerYear : 0
  const extra = isNonNegative(i.extraMonthly) ? i.extraMonthly : 0

  const amountNeeded = i.price - i.deposit
  const sum = (when: LoanFee['when']) => fees.filter((f) => f.when === when).reduce((s, f) => s + feeAmount(f, amountNeeded), 0)
  const financedFees = sum('financed')
  const upfrontCash = sum('upfront')
  const monthlyFees = sum('monthly')
  const yearlyFees = sum('yearly')
  const borrowed = amountNeeded + financedFees
  const r = i.annualRatePct / 100 / 12

  const base = simulate(borrowed, r, i.termMonths, io, 0, monthlyFees, yearlyFees, life)
  const run = extra > 0 ? simulate(borrowed, r, i.termMonths, io, extra, monthlyFees, yearlyFees, life) : base
  const rows = run.rows
  const tot = (k: keyof ScheduleRow) => rows.reduce((s, x) => s + (x[k] as number), 0)
  const totalInterest = tot('interest')
  const totalInsurance = tot('insurance')
  const totalFees = tot('fees') + financedFees + upfrontCash
  const paid = rows.reduce((s, x) => s + x.payment + x.fees + x.insurance, 0)

  // True yearly cost: the borrower receives what the loan pays for, minus cash fees; then pays every month.
  const flows = [amountNeeded - upfrontCash, ...rows.map((x) => -(x.payment + x.fees + x.insurance))]
  const irr = monthlyIrr(flows)

  const saving = isPositive(i.monthlySaving) ? i.monthlySaving : null
  let breakEven: number | null = null
  if (saving) {
    let out = i.deposit + upfrontCash
    let saved = 0
    for (let m = 1; m <= 300; m++) {
      const row = rows[m - 1]
      if (row) out += row.payment + row.fees + row.insurance
      saved += saving
      if (saved >= out) {
        breakEven = m
        break
      }
    }
  }
  const first = rows[Math.min(io, rows.length - 1)]
  const monthlyOutgoing = first.payment + first.fees - (first.month % 12 === 1 ? yearlyFees : 0) + first.insurance
  const rise = isPositive(i.rateRisePct) ? monthlyPayment(borrowed, i.annualRatePct + i.rateRisePct, i.termMonths - io) : null

  const assumptions = [
    { id: 'finance.monthly_rate', description: 'Interest is charged monthly at the annual rate ÷ 12 on what is still owed; equal instalments after any interest-only months.' },
    { id: 'finance.true_cost', description: '“True yearly cost” spreads every fee and insurance charge into one yearly rate — like the APR in a loan agreement — so loans with different fees can be compared.' },
    ...(life > 0 ? [{ id: 'finance.life', description: `Life insurance at ${life}% a year of the balance, charged monthly as the balance falls.` }] : []),
    ...(saving ? [{ id: 'finance.flat_saving', description: 'The bill saving is treated as the same every month; tariff changes are not modelled.' }] : []),
  ]
  return {
    ok: true,
    value: {
      amountNeeded,
      financedFees,
      borrowed,
      upfrontCash,
      instalment: run.instalment,
      interestOnlyPayment: io > 0 ? borrowed * r : null,
      monthlyOutgoing,
      months: rows.length,
      totalInterest,
      totalFees,
      totalInsurance,
      costOfCredit: totalInterest + totalFees + totalInsurance,
      totalPaid: i.deposit + upfrontCash + paid,
      trueAnnualRatePct: irr == null ? null : irr * 1200,
      schedule: rows,
      extra: extra > 0 ? { monthsSaved: base.rows.length - rows.length, interestSaved: base.rows.reduce((s, x) => s + x.interest, 0) - totalInterest } : null,
      rateRise: rise != null ? { ratePct: i.annualRatePct + (i.rateRisePct as number), instalment: rise, difference: rise - run.instalment } : null,
      netMonthly: saving == null ? null : monthlyOutgoing - saving,
      breakEvenMonth: breakEven,
      incomeSharePct: isPositive(i.monthlyIncome) ? (monthlyOutgoing / i.monthlyIncome) * 100 : null,
    },
    basis: 'customer_entered',
    assumptions,
    warnings: ['Advertised rates and fees are not offers: the lender sets your rate, fees and any required insurance after assessing your application.'],
  }
}
