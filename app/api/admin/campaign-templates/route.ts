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
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const templates = await prisma.campaignTemplate.findMany({ orderBy: { updatedAt: 'desc' } })
  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Give the template a name and channel.' }, { status: 400 })

  const d = parsed.data
  const template = await prisma.campaignTemplate.create({
    data: {
      name: d.name,
      channel: d.channel,
      category: d.category ?? null,
      subject: d.subject ?? null,
      body: d.body ?? null,
    },
  })
  return NextResponse.json({ id: template.id }, { status: 201 })
}
