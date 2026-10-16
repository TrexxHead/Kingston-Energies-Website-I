import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { sendQuoteRequestEmails } from '@/lib/email'
import { logServerError } from '@/lib/clientLog'
import { PARISHES } from '@/lib/map/parishes'
import { CALC_ENGINE_VERSION } from '@/lib/energy/engine/version'
import { ROOF_LABEL } from '@/lib/energy/engine/solar'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  note: z.string().max(1000).optional(),
  estimate: z.object({
    lat: z.number(),
    lng: z.number(),
    parish: z.string().max(40).nullable(),
    roofType: z.enum(['flat', 'zinc', 'pitched']),
    roofCondition: z.enum(['good', 'worn', 'unsure']).nullable().optional(),
    footprintM2: z.number().positive().max(50_000),
    modules: z.number().int().positive().max(5000),
    kwp: z.number().positive().max(2000),
    annualKwhBase: z.number().nonnegative().nullable(),
    monthlyUsageKwh: z.number().nonnegative().nullable(),
    roofSource: z.enum(['map_footprint', 'drawn']),
  }),
})

/**
 * POST /api/solar/quote — a rooftop-solar estimate becomes a Lead the team
 * can follow up. The estimate is stored as written by the calculator, with
 * the engine version, so the follow-up can explain it.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(`solar-quote:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please check your name and e-mail.' }, { status: 400 })
  const { name, email, phone, note, estimate: e } = parsed.data
  const parishName = PARISHES.find((p) => p.id === e.parish)?.name ?? null
  const lines = [
    'Rooftop solar estimate request.',
    `Location: ${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}${parishName ? ` (${parishName})` : ''} — https://www.google.com/maps?q=${e.lat},${e.lng}`,
    `Roof: ${ROOF_LABEL[e.roofType]}${e.roofCondition ? ` — condition: ${{ good: 'good, no rust or leaks', worn: 'rusty or leaking (likely needs re-roofing first)', unsure: 'customer not sure' }[e.roofCondition]}` : ''}, ~${Math.round(e.footprintM2)} m² footprint (${e.roofSource === 'map_footprint' ? 'map building outline' : 'drawn by customer'}).`,
    `Estimated system: ${e.modules} panels, ${e.kwp.toFixed(2)} kWp${e.annualKwhBase != null ? `, ~${Math.round(e.annualKwhBase).toLocaleString('en-JM')} kWh/yr (PVGIS)` : ''}.`,
    e.monthlyUsageKwh != null ? `Customer's usage: ${Math.round(e.monthlyUsageKwh)} kWh/month.` : 'Customer did not enter usage.',
    `Calculator version ${CALC_ENGINE_VERSION}. Estimate only — needs a site visit (shading, roof condition, structure).`,
    note ? `Customer note: ${note}` : null,
  ].filter(Boolean)
  try {
    await prisma.lead.create({
      data: { name, email, phone: phone || null, message: lines.join('\n'), quoteShoppingFor: 'Rooftop solar', quoteInterests: ['Rooftop solar'], quoteArea: parishName },
    })
  } catch (err) {
    logServerError(err, { path: '/api/solar/quote' })
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500 })
  }
  void sendQuoteRequestEmails({ toCustomer: email, customerName: name, shoppingFor: 'Rooftop solar', interests: ['Rooftop solar'], items: [], area: parishName, timeframe: 'Not specified' })
  return NextResponse.json({ success: true })
}
