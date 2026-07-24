import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'SOCIAL']),
  category: z.string().max(60).nullish(),
  subject: z.string().max(160).nullish(),
  body: z.string().max(5000).nullish(),
  scheduledAt: z.string().nullish(),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      category: c.category,
      subject: c.subject,
      body: c.body,
      status: c.status,
      scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : null,
      recipientCount: c.recipientCount,
      sentAt: c.sentAt ? new Date(c.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null,
    })),
  })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Provide a name and channel.' }, { status: 400 })

  const d = parsed.data
  const campaign = await prisma.campaign.create({
    data: {
      name: d.name,
      channel: d.channel,
      category: d.category ?? null,
      subject: d.subject ?? null,
      body: d.body ?? null,
      scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
      status: d.scheduledAt ? 'SCHEDULED' : 'DRAFT',
    },
  })
  return NextResponse.json({ id: campaign.id }, { status: 201 })
}
