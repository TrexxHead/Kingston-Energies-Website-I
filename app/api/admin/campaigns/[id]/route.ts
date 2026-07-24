import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.string().max(60).nullish(),
  subject: z.string().max(160).nullish(),
  body: z.string().max(5000).nullish(),
  scheduledAt: z.string().nullish(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT']).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const d = parsed.data
  try {
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.subject !== undefined ? { subject: d.subject } : {}),
        ...(d.body !== undefined ? { body: d.body } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.scheduledAt !== undefined ? { scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null } : {}),
      },
    })
    return NextResponse.json({ campaign })
  } catch {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    await prisma.campaign.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }
}
