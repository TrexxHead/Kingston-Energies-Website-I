import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { solarOrientation } from '@/lib/energyCheckup/calc'
import { sendConsultationRequestAlert } from '@/lib/email'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional(),
  interest: z.enum(['Solar', 'Backup power / outage protection', 'Both solar and backup', 'Not sure yet']),
  contactMethod: z.enum(['Email', 'Phone call', 'WhatsApp']),
  bestTime: z.enum(['Morning', 'Afternoon', 'Evening', 'Anytime']),
  timeline: z.enum(['This month', 'Next few months', 'Just exploring']),
  notes: z.string().trim().max(1000).optional(),
})

/**
 * The Energy Checkup's "Talk to us" consultation request — a more detailed,
 * personalized quote/consulting intake than a generic contact form. Writes
 * to the same Lead table as every other lead source, and alerts admins by
 * email with the customer's own checkup numbers attached so a rep can call
 * prepared rather than starting from zero.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please check the form and try again.' }, { status: 400 })
  const d = parsed.data

  const checkup = await prisma.energyCheckup.findUnique({ where: { id } })
  if (!checkup) return NextResponse.json({ error: 'That checkup no longer exists.' }, { status: 404 })

  const solar =
    checkup.estimatedKwh > 0
      ? solarOrientation(checkup.estimatedKwh, checkup.billJmd && checkup.billJmd > 0 ? checkup.billJmd : checkup.estimatedKwh * checkup.effectiveRate)
      : null

  const message = [
    `Energy Checkup consultation request (${checkup.mode === 'HOME' ? 'household' : 'business'}).`,
    `Interested in: ${d.interest}.`,
    `Prefers: ${d.contactMethod}, ${d.bestTime}.`,
    `Timeline: ${d.timeline}.`,
    `Estimated usage: ${Math.round(checkup.estimatedKwh)} kWh/month at J$${checkup.effectiveRate.toFixed(1)}/kWh.`,
    solar ? `Indicative solar: ~${solar.kw.toFixed(1)} kW, J$${solar.costLow.toLocaleString()}–J$${solar.costHigh.toLocaleString()}.` : null,
    d.notes ? `Notes: ${d.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const lead = await prisma.lead.create({
    data: {
      userId: session?.user?.id ?? null,
      email: d.email,
      name: d.name,
      phone: d.phone || null,
      message,
    },
  })

  await sendConsultationRequestAlert({
    name: d.name,
    email: d.email,
    phone: d.phone ?? '',
    interest: d.interest,
    contactMethod: d.contactMethod,
    bestTime: d.bestTime,
    timeline: d.timeline,
    notes: d.notes ?? null,
    mode: checkup.mode,
    estimatedKwh: checkup.estimatedKwh,
    effectiveRate: checkup.effectiveRate,
    solarKw: solar?.kw ?? null,
    solarCostLow: solar?.costLow ?? null,
    solarCostHigh: solar?.costHigh ?? null,
  })

  return NextResponse.json({ ok: true, leadId: lead.id })
}
