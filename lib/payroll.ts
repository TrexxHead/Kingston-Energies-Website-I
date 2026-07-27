import { prisma } from '@/lib/prisma'

/**
 * Jamaican payroll statutory rates.
 *
 * IMPORTANT: these are editable defaults, not authoritative figures. Rates,
 * thresholds and ceilings are set by Tax Administration Jamaica and change —
 * often annually. They are stored per payroll run (rateSnapshot) so historic
 * payslips always reproduce exactly, and the UI states plainly that they must
 * be confirmed against current TAJ guidance before a run is approved.
 *
 * Getting these wrong has real legal and financial consequences, so nothing
 * here is presented as verified.
 */
export interface PayrollRates {
  /** Annual income exempt from PAYE. */
  payeThresholdAnnual: number
  /** PAYE rate below the higher-rate ceiling. */
  payeRate: number
  /** Annual income above which the higher PAYE rate applies. */
  payeHigherThresholdAnnual: number
  payeHigherRate: number

  nisEmployeeRate: number
  nisEmployerRate: number
  /** Annual insurable wage ceiling for NIS. */
  nisCeilingAnnual: number

  nhtEmployeeRate: number
  nhtEmployerRate: number

  edTaxEmployeeRate: number
  edTaxEmployerRate: number

  heartEmployerRate: number
  /** Monthly payroll below which HEART is not payable. */
  heartMonthlyThreshold: number
}

/**
 * Defaults reflecting commonly published JM rates. Treat every one as
 * "needs confirming" — see the warning above.
 */
export const DEFAULT_RATES: PayrollRates = {
  payeThresholdAnnual: 1_799_376,
  payeRate: 0.25,
  payeHigherThresholdAnnual: 6_000_000,
  payeHigherRate: 0.3,

  nisEmployeeRate: 0.03,
  nisEmployerRate: 0.03,
  nisCeilingAnnual: 5_000_000,

  nhtEmployeeRate: 0.02,
  nhtEmployerRate: 0.03,

  edTaxEmployeeRate: 0.0225,
  edTaxEmployerRate: 0.035,

  heartEmployerRate: 0.03,
  heartMonthlyThreshold: 173_067,
}

const SETTINGS_KEY = 'payrollRates'

export async function getPayrollRates(): Promise<PayrollRates> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: SETTINGS_KEY } })
    return row ? { ...DEFAULT_RATES, ...(JSON.parse(row.value) as Partial<PayrollRates>) } : DEFAULT_RATES
  } catch {
    return DEFAULT_RATES
  }
}

export async function savePayrollRates(rates: PayrollRates): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(rates) },
    update: { value: JSON.stringify(rates) },
  })
}

export type PayFrequency = 'MONTHLY' | 'FORTNIGHTLY' | 'WEEKLY'

/** How many pay periods of a given frequency fall in a year. */
export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  MONTHLY: 12,
  FORTNIGHTLY: 26,
  WEEKLY: 52,
}

const round2 = (n: number) => Math.round(n * 100) / 100

export interface PayslipCalc {
  gross: number
  // Employee deductions
  nisEmployee: number
  nhtEmployee: number
  edTaxEmployee: number
  paye: number
  otherDeductions: number
  totalDeductions: number
  net: number
  // Employer contributions (cost to the business, not deducted from pay)
  nisEmployer: number
  nhtEmployer: number
  edTaxEmployer: number
  heartEmployer: number
  totalEmployerCost: number
}

/**
 * Calculate one payslip.
 *
 * Order matters and follows JM practice: NIS is deducted first and is
 * deductible for PAYE purposes, so PAYE is charged on gross less NIS less the
 * annual threshold. Education tax is charged on gross less NIS.
 */
export function calculatePayslip(
  gross: number,
  frequency: PayFrequency,
  rates: PayrollRates,
  otherDeductions = 0,
): PayslipCalc {
  const periods = PERIODS_PER_YEAR[frequency]

  // NIS is capped at an annual insurable ceiling, pro-rated per period.
  const nisCeilingPerPeriod = rates.nisCeilingAnnual / periods
  const nisBase = Math.min(gross, nisCeilingPerPeriod)
  const nisEmployee = round2(nisBase * rates.nisEmployeeRate)
  const nisEmployer = round2(nisBase * rates.nisEmployerRate)

  // NHT and education tax are charged on gross (education tax net of NIS).
  const nhtEmployee = round2(gross * rates.nhtEmployeeRate)
  const nhtEmployer = round2(gross * rates.nhtEmployerRate)

  const edTaxBase = round2(gross - nisEmployee)
  const edTaxEmployee = round2(edTaxBase * rates.edTaxEmployeeRate)
  const edTaxEmployer = round2(edTaxBase * rates.edTaxEmployerRate)

  // PAYE on statutory income (gross less NIS) above the pro-rated threshold.
  const statutoryIncome = round2(gross - nisEmployee)
  const thresholdPerPeriod = rates.payeThresholdAnnual / periods
  const higherThresholdPerPeriod = rates.payeHigherThresholdAnnual / periods

  let paye = 0
  if (statutoryIncome > thresholdPerPeriod) {
    const taxable = statutoryIncome - thresholdPerPeriod
    if (statutoryIncome > higherThresholdPerPeriod) {
      const atLowerRate = higherThresholdPerPeriod - thresholdPerPeriod
      const atHigherRate = statutoryIncome - higherThresholdPerPeriod
      paye = atLowerRate * rates.payeRate + atHigherRate * rates.payeHigherRate
    } else {
      paye = taxable * rates.payeRate
    }
  }
  paye = round2(Math.max(0, paye))

  // HEART is employer-only and only above a monthly payroll threshold.
  const monthlyEquivalent = (gross * periods) / 12
  const heartEmployer = monthlyEquivalent >= rates.heartMonthlyThreshold ? round2(gross * rates.heartEmployerRate) : 0

  const totalDeductions = round2(nisEmployee + nhtEmployee + edTaxEmployee + paye + otherDeductions)
  const net = round2(gross - totalDeductions)
  const totalEmployerCost = round2(gross + nisEmployer + nhtEmployer + edTaxEmployer + heartEmployer)

  return {
    gross: round2(gross),
    nisEmployee,
    nhtEmployee,
    edTaxEmployee,
    paye,
    otherDeductions: round2(otherDeductions),
    totalDeductions,
    net,
    nisEmployer,
    nhtEmployer,
    edTaxEmployer,
    heartEmployer,
    totalEmployerCost,
  }
}

/** Totals across a whole run, for the journal entry and the summary header. */
export function summarise(slips: PayslipCalc[]) {
  const sum = (pick: (s: PayslipCalc) => number) => round2(slips.reduce((t, s) => t + pick(s), 0))
  return {
    gross: sum((s) => s.gross),
    paye: sum((s) => s.paye),
    nisEmployee: sum((s) => s.nisEmployee),
    nhtEmployee: sum((s) => s.nhtEmployee),
    edTaxEmployee: sum((s) => s.edTaxEmployee),
    otherDeductions: sum((s) => s.otherDeductions),
    net: sum((s) => s.net),
    nisEmployer: sum((s) => s.nisEmployer),
    nhtEmployer: sum((s) => s.nhtEmployer),
    edTaxEmployer: sum((s) => s.edTaxEmployer),
    heartEmployer: sum((s) => s.heartEmployer),
    employerCost: sum((s) => s.totalEmployerCost),
    headcount: slips.length,
  }
}
