import { z } from 'zod'

/**
 * Bookable services (roadmap W5). Everything here is owner-entered in
 * Admin → Bookings: no service, price, deposit or capacity is assumed.
 * Until a service is added and switched on, /book says bookings aren't open.
 */

export const WINDOWS = ['morning', 'afternoon'] as const
export type BookingWindow = (typeof WINDOWS)[number]
export const WINDOW_LABEL: Record<BookingWindow, string> = { morning: 'Morning (8 am – 12 pm)', afternoon: 'Afternoon (12 – 5 pm)' }

export const serviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/, 'Use lowercase letters, numbers and dashes.'),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(''),
  /** What the visitor should expect to pay overall, in words (e.g. "Quoted after the visit"). */
  priceNote: z.string().trim().max(160).default(''),
  /** Deposit taken online when booking, J$ (0 = none). Deducted from the final bill per the terms shown. */
  depositJmd: z.number().min(0).max(1_000_000),
  active: z.boolean().default(true),
})

export const servicesConfigSchema = z.object({
  services: z.array(serviceSchema).max(30),
  /** Bookings per window per day (0 = that window isn't offered). */
  capacity: z.object({ morning: z.number().int().min(0).max(50), afternoon: z.number().int().min(0).max(50) }),
  /** Days of the week with no bookings, 0 = Sunday … 6 = Saturday. */
  closedWeekdays: z.array(z.number().int().min(0).max(6)).max(7),
  /** Earliest booking: this many days from today. */
  leadDays: z.number().int().min(0).max(30),
  /** Latest booking: this many days from today. */
  horizonDays: z.number().int().min(1).max(120),
  /** Deposit terms shown before paying (refunds, what it covers). */
  depositTerms: z.string().trim().max(800).default(''),
})

export type Service = z.infer<typeof serviceSchema>
export type ServicesConfig = z.infer<typeof servicesConfigSchema>

export const EMPTY_SERVICES_CONFIG: ServicesConfig = { services: [], capacity: { morning: 0, afternoon: 0 }, closedWeekdays: [0], leadDays: 1, horizonDays: 30, depositTerms: '' }

/** Today's date in Jamaica (UTC−5, no daylight saving) as YYYY-MM-DD. */
export function jamaicaToday(now = new Date()): string {
  return new Date(now.getTime() - 5 * 3600_000).toISOString().slice(0, 10)
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export interface DaySlots {
  date: string
  remaining: Record<BookingWindow, number>
}

/** Bookable days from lead to horizon, with the places left per window. `taken` maps "date|window" → active bookings. */
export function availableDays(cfg: ServicesConfig, taken: Map<string, number>, today: string): DaySlots[] {
  const out: DaySlots[] = []
  for (let i = cfg.leadDays; i <= cfg.horizonDays; i++) {
    const date = addDays(today, i)
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay()
    if (cfg.closedWeekdays.includes(dow)) continue
    const remaining = {
      morning: Math.max(0, cfg.capacity.morning - (taken.get(`${date}|morning`) ?? 0)),
      afternoon: Math.max(0, cfg.capacity.afternoon - (taken.get(`${date}|afternoon`) ?? 0)),
    }
    if (remaining.morning + remaining.afternoon > 0) out.push({ date, remaining })
  }
  return out
}

/** Can this date/window be booked under the config (ignoring capacity)? */
export function dateAllowed(cfg: ServicesConfig, date: string, window: BookingWindow, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (date < addDays(today, cfg.leadDays) || date > addDays(today, cfg.horizonDays)) return false
  if (cfg.closedWeekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay())) return false
  return cfg.capacity[window] > 0
}

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export function newBookingNo(rand: () => number = Math.random): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)]
  return `BK-${s}`
}
export const isBookingNo = (ref: string) => /^BK-[2-9A-HJ-NP-Z]{6}$/.test(ref)
