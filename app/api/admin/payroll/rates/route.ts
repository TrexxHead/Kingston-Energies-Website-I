import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin, guardSuperAdmin } from '@/lib/requireAdmin'
import { getPayrollRates, savePayrollRates, DEFAULT_RATES, type PayrollRates } from '@/lib/payroll'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  const rates = await getPayrollRates()
  return NextResponse.json({
    rates,
    defaults: DEFAULT_RATES,
    // Surfaced so the UI can say plainly that these are unverified defaults.
    customised: JSON.stringify(rates) !== JSON.stringify(DEFAULT_RATES),
  })
}

const rate = z.number().min(0).max(1)
const amount = z.number().min(0)

const schema = z.object({
  payeThresholdAnnual: amount,
  payeRate: rate,
  payeHigherThresholdAnnual: amount,
  payeHigherRate: rate,
  nisEmployeeRate: rate,
  nisEmployerRate: rate,
  nisCeilingAnnual: amount,
  nhtEmployeeRate: rate,
  nhtEmployerRate: rate,
  edTaxEmployeeRate: rate,
  edTaxEmployerRate: rate,
  heartEmployerRate: rate,
  heartMonthlyThreshold: amount,
})

/**
 * Statutory rates are what turn gross pay into a legal obligation, so changing
 * them is restricted to a super admin. Existing approved runs are unaffected —
 * each one froze its own rates at approval.
 */
export async function PUT(request: Request) {
  const denied = await guardSuperAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Every rate must be a number; rates are fractions between 0 and 1.' }, { status: 400 })
  }
  const rates = parsed.data as PayrollRates

  if (rates.payeHigherThresholdAnnual < rates.payeThresholdAnnual) {
    return NextResponse.json({ error: 'The higher-rate threshold must sit above the tax-free threshold.' }, { status: 400 })
  }

  await savePayrollRates(rates)
  return NextResponse.json({ ok: true, rates })
}
