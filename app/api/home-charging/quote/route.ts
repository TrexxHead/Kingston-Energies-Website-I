import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { sendQuoteRequestEmails } from '@/lib/email'
import { logServerError } from '@/lib/clientLog'
import { PARISHES } from '@/lib/map/parishes'
import { CALC_ENGINE_VERSION } from '@/lib/energy/engine/version'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  parish: z.string().max(40).optional(),
  note: z.string().max(1000).optional(),
  plan: z.object({
    vehicle: z.string().max(140),
    option: z.string().max(80),
    dailyKwh: z.number().nonnegative().max(500),
    carAcKw: z.number().positive().max(50).nullable(),
    parking: z.enum(['garage', 'driveway', 'street', 'apartment']),
    panelDistanceM: z.number().nonnegative().max(200).nullable(),
  }),
})

/** POST /api/home-charging/quote — a home-charger plan becomes a Lead for an installation survey. */
export async function POST(request: Request) {
  const rl = await rateLimit(`home-charging-quote:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please check your name and e-mail.' }, { status: 400 })
  const { name, email, phone, parish, note, plan: p } = parsed.data
  const parishName = PARISHES.find((x) => x.id === parish)?.name ?? null
  const lines = [
    'Home EV charger installation request.',
    `Vehicle: ${p.vehicle}${p.carAcKw ? ` (onboard AC charger ${p.carAcKw} kW)` : ''}.`,
    `Chosen option: ${p.option}. Daily charging need ≈ ${p.dailyKwh.toFixed(1)} kWh.`,
    `Parking: ${{ garage: 'garage / carport', driveway: 'driveway', street: 'street parking', apartment: 'apartment / shared parking' }[p.parking]}${p.panelDistanceM != null ? `, about ${p.panelDistanceM} m from the electrical panel` : ''}.`,
    `Calculator version ${CALC_ENGINE_VERSION}. Needs a site survey (panel capacity, JPS service, cable route).`,
    note ? `Customer note: ${note}` : null,
  ].filter(Boolean)
  try {
    await prisma.lead.create({ data: { name, email, phone: phone || null, message: lines.join('\n'), quoteShoppingFor: 'Home EV charger', quoteInterests: ['Home EV charger'], quoteArea: parishName } })
  } catch (err) {
    logServerError(err, { path: '/api/home-charging/quote' })
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500 })
  }
  void sendQuoteRequestEmails({ toCustomer: email, customerName: name, shoppingFor: 'Home EV charger', interests: ['Home EV charger'], items: [], area: parishName, timeframe: 'Not specified' })
  return NextResponse.json({ success: true })
}
