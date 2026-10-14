import { describe, it, expect } from 'vitest'
import { availableDays, dateAllowed, newBookingNo, isBookingNo, jamaicaToday, servicesConfigSchema, type ServicesConfig } from '@/lib/bookings/config'
import { parseFygaroWebhookEvent } from '@/lib/fygaro'

const cfg: ServicesConfig = {
  services: [{ id: 'site-survey', name: 'Site survey', description: '', priceNote: '', depositJmd: 5000, active: true }],
  capacity: { morning: 2, afternoon: 1 },
  closedWeekdays: [0], // Sunday
  leadDays: 1,
  horizonDays: 7,
  depositTerms: '',
}
const today = '2026-10-14' // a Wednesday

describe('booking availability', () => {
  it('lists days from lead to horizon, skipping closed weekdays and full days', () => {
    const taken = new Map([
      ['2026-10-15|morning', 2],
      ['2026-10-15|afternoon', 1], // Thursday fully booked
      ['2026-10-16|morning', 1],
    ])
    const days = availableDays(cfg, taken, today)
    expect(days.map((d) => d.date)).toEqual(['2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20', '2026-10-21'])
    expect(days[0].remaining).toEqual({ morning: 1, afternoon: 1 })
  })
  it('rejects dates outside the window, closed days and windows with no capacity', () => {
    expect(dateAllowed(cfg, '2026-10-16', 'morning', today)).toBe(true)
    expect(dateAllowed(cfg, '2026-10-14', 'morning', today)).toBe(false) // before lead time
    expect(dateAllowed(cfg, '2026-10-18', 'morning', today)).toBe(false) // Sunday
    expect(dateAllowed(cfg, '2026-10-30', 'morning', today)).toBe(false) // past horizon
    expect(dateAllowed({ ...cfg, capacity: { morning: 2, afternoon: 0 } }, '2026-10-16', 'afternoon', today)).toBe(false)
    expect(dateAllowed(cfg, 'not-a-date', 'morning', today)).toBe(false)
  })
  it('uses Jamaica’s date, not UTC, near midnight', () => {
    expect(jamaicaToday(new Date('2026-10-15T03:00:00Z'))).toBe('2026-10-14')
    expect(jamaicaToday(new Date('2026-10-15T06:00:00Z'))).toBe('2026-10-15')
  })
})

describe('booking references and deposits', () => {
  it('makes unambiguous references the webhook can tell apart from orders', () => {
    const ref = newBookingNo()
    expect(isBookingNo(ref)).toBe(true)
    expect(ref).not.toMatch(/[01IO]/)
    expect(isBookingNo('KE-123456')).toBe(false)
  })
  it('a Fygaro event with a booking reference parses like an order event', () => {
    const e = parseFygaroWebhookEvent({ data: { client_reference: 'BK-ABC234', status: 'completed', amount: '5000.00' } })
    expect(e).toEqual({ orderNo: 'BK-ABC234', paid: true, amount: 5000 })
    expect(isBookingNo(e!.orderNo)).toBe(true)
  })
  it('the services config refuses negative deposits and bad ids', () => {
    expect(servicesConfigSchema.safeParse({ ...cfg, services: [{ ...cfg.services[0], depositJmd: -1 }] }).success).toBe(false)
    expect(servicesConfigSchema.safeParse({ ...cfg, services: [{ ...cfg.services[0], id: 'Bad Id' }] }).success).toBe(false)
    expect(servicesConfigSchema.safeParse(cfg).success).toBe(true)
  })
})
