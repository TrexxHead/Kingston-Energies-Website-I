import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { campaignStats } from '@/lib/campaignAttribution'
import { campaignTrackingLink } from '@/lib/campaignClick'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'SOCIAL']),
  category: z.string().max(60).nullish(),
  subject: z.string().max(160).nullish(),
  body: z.string().max(5000).nullish(),
  scheduledAt: z.string().nullish(),
  segmentId: z.string().nullish(),
  discountCodeId: z.string().nullish(),
  spend: z.number().nonnegative().nullish(),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: { segment: { select: { id: true, name: true } }, discountCode: { select: { id: true, code: true } } },
  })

  const withStats = await Promise.all(
    campaigns.map(async (c) => {
      const stats = await campaignStats(c.id)
      return {
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
        segment: c.segment,
        discountCode: c.discountCode,
        spend: c.spend,
        expenseId: c.expenseId,
        // Always real — every campaign has a tracking link the moment it's
        // created, so 0 here is a genuine "nothing attributed yet," not "we
        // can't measure this."
        attributedOrders: stats.orders,
        attributedRevenue: stats.revenue,
        trackingLink: campaignTrackingLink(siteUrl, c.id),
      }
    }),
  )

  return NextResponse.json({ campaigns: withStats })
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
      segmentId: d.segmentId ?? null,
      discountCodeId: d.discountCodeId ?? null,
      spend: d.spend ?? null,
    },
  })
  return NextResponse.json({ id: campaign.id }, { status: 201 })
}
