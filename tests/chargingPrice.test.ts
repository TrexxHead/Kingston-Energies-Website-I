import { describe, it, expect } from 'vitest'
import { priceAt, jamaicaClock, priceSummary, sameOperator } from '@/lib/refdata/chargingPrice'

// Jamaica is UTC−5: 17:30 Jamaica = 22:30Z.
const jm = (iso: string) => new Date(`${iso}-05:00`)
const evening = { operator: 'TEST Op', pricePerKwh: 60, periods: [{ label: 'Evening', start: '18:00', end: '06:00', pricePerKwh: 120 }], sessionFee: 100 }

describe('time-of-day charging prices', () => {
  it('reads the Jamaica clock', () => {
    expect(jamaicaClock(jm('2026-10-17T17:30:00'))).toEqual({ day: 6, minute: 17 * 60 + 30 })
  })
  it('applies a band that wraps midnight, and says when the price changes', () => {
    const before = priceAt(evening, jm('2026-10-17T17:30:00'))
    expect(before.pricePerKwh).toBe(60)
    expect(before.label).toBeNull()
    expect(before.next?.pricePerKwh).toBe(120)
    expect(before.next?.at.toISOString()).toBe(jm('2026-10-17T18:00:00').toISOString())
    expect(priceAt(evening, jm('2026-10-17T23:00:00')).pricePerKwh).toBe(120)
    const early = priceAt(evening, jm('2026-10-18T03:00:00'))
    expect(early.pricePerKwh).toBe(120)
    expect(early.next?.at.toISOString()).toBe(jm('2026-10-18T06:00:00').toISOString())
    expect(priceAt(evening, jm('2026-10-18T06:00:00')).pricePerKwh).toBe(60)
  })
  it('respects weekday-only bands, including the after-midnight tail', () => {
    const weekdays = { ...evening, periods: [{ ...evening.periods[0], days: [1, 2, 3, 4, 5] }] }
    expect(priceAt(weekdays, jm('2026-10-16T19:00:00')).pricePerKwh).toBe(120) // Friday evening
    expect(priceAt(weekdays, jm('2026-10-17T03:00:00')).pricePerKwh).toBe(120) // Saturday early = Friday's band
    expect(priceAt(weekdays, jm('2026-10-17T19:00:00')).pricePerKwh).toBe(60) // Saturday evening
  })
  it('has no next change without bands, and summarises', () => {
    expect(priceAt({ operator: 'X', pricePerKwh: 75 }, new Date()).next).toBeNull()
    expect(priceSummary(evening)).toBe('J$60/kWh standard · Evening (6 pm–6 am) J$120/kWh · J$100 per session')
    expect(priceSummary({ operator: 'X', pricePerKwh: null, periods: [{ label: 'Peak', start: '17:30', end: '22:00', days: [5, 1, 2, 3, 4], pricePerKwh: 90 }] })).toBe('Peak (5:30 pm–10 pm, Mon–Fri) J$90/kWh')
    expect(sameOperator('JPS Charge  n Go', 'jps charge n go')).toBe(true)
    expect(sameOperator('Evergo', null)).toBe(false)
  })
})
