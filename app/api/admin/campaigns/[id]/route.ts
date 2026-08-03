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
  segmentId: z.string().nullish(),
  discountCodeId: z.string().nullish(),
  spend: z.number().nonnegative().nullish(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const d = parsed.data
  try {
    const existing = await prisma.campaign.findUnique({ where: { id }, select: { expenseId: true } })
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    // Once spend has been posted as a real Expense (on send), it's locked —
    // editing it here would desync Marketing's number from what Finance
    // already recorded, since the posted ledger entry itself never updates.
    if (d.spend !== undefined && existing.expenseId) {
      return NextResponse.json({ error: 'Spend is locked once the campaign has sent — it was posted as an expense.' }, { status: 400 })
    }
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.subject !== undefined ? { subject: d.subject } : {}),
        ...(d.body !== undefined ? { body: d.body } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.scheduledAt !== undefined ? { scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null } : {}),
        ...(d.segmentId !== undefined ? { segmentId: d.segmentId } : {}),
        ...(d.discountCodeId !== undefined ? { discountCodeId: d.discountCodeId } : {}),
        ...(d.spend !== undefined ? { spend: d.spend } : {}),
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
