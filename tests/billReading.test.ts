import { describe, it, expect } from 'vitest'
import { billReadingSchema, checkReading, type BillReading } from '@/lib/bills/billReading'

const f = <T,>(value: T, confidence: 'high' | 'medium' | 'low' = 'high') => ({ value, confidence, seen: value == null ? null : String(value) })
const base = (): BillReading => ({
  isUtilityBill: true,
  provider: 'TEST utility',
  periodStart: f('2026-08-14'),
  periodEnd: f('2026-09-13'),
  kwh: f(300),
  readingType: f('actual' as const),
  currentCharges: f(18_000),
  fixedCharges: f(600),
  arrears: f(2_000),
  credits: f(2_000),
  amountDue: f(18_000),
  fuelRatePerKwh: f(null, 'low'),
  notes: null,
})

describe('bill reading checks', () => {
  it('accepts a consistent bill unchanged', () => {
    const { reading, checks } = checkReading(base())
    expect(checks).toEqual([])
    expect(reading.kwh.confidence).toBe('high')
    expect(billReadingSchema.safeParse(reading).success).toBe(true)
  })
  it('flags totals that don’t add up and unusual prices per kWh', () => {
    const r = base()
    r.amountDue.value = 25_000
    r.kwh.value = 30
    const { reading, checks } = checkReading(r)
    expect(checks).toHaveLength(2)
    expect(reading.amountDue.confidence).toBe('medium')
    expect(reading.kwh.confidence).toBe('low')
  })
  it('clears impossible dates and numbers', () => {
    const r = base()
    r.periodStart.value = '14/08/2026'
    r.credits.value = -50
    const { reading } = checkReading(r)
    expect(reading.periodStart.value).toBeNull()
    expect(reading.credits.value).toBeNull()
    const bad = base()
    bad.periodEnd.value = '2026-08-01'
    expect(checkReading(bad).checks[0]).toMatch(/dates/)
  })
})
