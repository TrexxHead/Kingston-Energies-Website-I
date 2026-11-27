import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { servicesConfigSchema, EMPTY_SERVICES_CONFIG, availableDays, dateAllowed, newBookingNo, jamaicaToday, type ServicesConfig, type BookingWindow } from './config'

const KEY = 'services:v1'

export async function getServicesConfig(): Promise<ServicesConfig> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  if (!row) return EMPTY_SERVICES_CONFIG
  const parsed = servicesConfigSchema.safeParse(JSON.parse(row.value))
  return parsed.success ? parsed.data : EMPTY_SERVICES_CONFIG
}

export async function saveServicesConfig(cfg: ServicesConfig): Promise<void> {
  const value = JSON.stringify(cfg)
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } })
}

async function takenMap(from: string, to: string, tx: Prisma.TransactionClient = prisma) {
  const rows = await tx.serviceBooking.groupBy({ by: ['date', 'window'], where: { date: { gte: from, lte: to }, status: { not: 'cancelled' } }, _count: { _all: true } })
  return new Map(rows.map((r) => [`${r.date}|${r.window}`, r._count._all]))
}

export async function availability() {
  const cfg = await getServicesConfig()
  const today = jamaicaToday()
  const days = availableDays(cfg, await takenMap(today, '9999-12-31'), today)
  return { cfg, days }
}

export class BookingUnavailable extends Error {}

export interface NewBooking {
  serviceId: string
  date: string
  window: BookingWindow
  customerName: string
  email?: string
  phone: string
  parish: string
  address?: string
  notes?: string
  userId?: string | null
  whatsappOptIn?: boolean
}

/**
 * Create a booking if the window still has room. Serializable, so two
 * people can't take the last place at once; retried on a reference clash
 * or a serialization conflict.
 */
export async function createBooking(input: NewBooking) {
  const cfg = await getServicesConfig()
  const service = cfg.services.find((s) => s.id === input.serviceId && s.active)
  if (!service) throw new BookingUnavailable('That service isn’t available to book.')
  const today = jamaicaToday()
  if (!dateAllowed(cfg, input.date, input.window, today)) throw new BookingUnavailable('That date or time isn’t available.')

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const taken = await tx.serviceBooking.count({ where: { date: input.date, window: input.window, status: { not: 'cancelled' } } })
          if (taken >= cfg.capacity[input.window]) throw new BookingUnavailable('That time has just been booked — please choose another.')
          return tx.serviceBooking.create({
            data: {
              bookingNo: newBookingNo(),
              serviceId: service.id,
              serviceName: service.name,
              date: input.date,
              window: input.window,
              customerName: input.customerName,
              email: input.email ?? null,
              phone: input.phone,
              parish: input.parish,
              address: input.address ?? null,
              notes: input.notes ?? null,
              userId: input.userId ?? null,
              whatsappOptIn: input.whatsappOptIn ?? false,
              depositAmount: service.depositJmd,
              depositStatus: service.depositJmd > 0 ? 'pending' : 'none',
            },
          })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (e) {
      if (e instanceof BookingUnavailable) throw e
      const code = (e as { code?: string }).code
      if (code === 'P2002' || code === 'P2034') continue // reference clash / serialization conflict → retry
      throw e
    }
  }
  throw new BookingUnavailable('We couldn’t save the booking just now — please try again.')
}
