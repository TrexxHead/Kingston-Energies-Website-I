import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

const schema = z.object({ contact: z.string().trim().min(3).max(160) })

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

/**
 * The report gate — the Checkup's lead-generation mechanism. Every
 * submission writes to the same Lead table used everywhere else in the
 * business, never a parallel list, per the build spec's integration
 * requirement.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter an email or WhatsApp number.' }, { status: 400 })

  const checkup = await prisma.energyCheckup.findUnique({ where: { id } })
  if (!checkup) return NextResponse.json({ error: 'That checkup no longer exists.' }, { status: 404 })

  const contact = parsed.data.contact
  const channel = looksLikeEmail(contact) ? 'email' : 'whatsapp'

  const lead = await prisma.lead.create({
    data: {
      userId: session?.user?.id ?? null,
      email: channel === 'email' ? contact : (session?.user?.email ?? 'no-email-supplied@kingstonenergies.com'),
      name: session?.user?.name ?? 'Energy Checkup lead',
      phone: channel === 'whatsapp' ? contact : null,
      message: `Energy Usage Checkup report requested (${checkup.mode === 'HOME' ? 'household' : 'business'}, ${Math.round(checkup.estimatedKwh)} kWh/month estimated).`,
    },
  })

  await prisma.energyCheckup.update({
    where: { id },
    data: { leadContact: contact, leadChannel: channel, reportSentAt: new Date(), leadId: lead.id },
  })

  return NextResponse.json({ ok: true, channel })
}
