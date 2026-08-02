import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import type { SegmentCriteria } from '@/lib/segments'

const criteriaSchema: z.ZodType<SegmentCriteria> = z.object({
  tiers: z.array(z.string()).optional(),
  needs: z.array(z.string()).optional(),
  minTotalSpent: z.number().nonnegative().optional(),
  minOrders: z.number().int().nonnegative().optional(),
  signedUpAfter: z.string().optional(),
  signedUpBefore: z.string().optional(),
  lastPurchaseWithinDays: z.number().int().positive().optional(),
  neverPurchased: z.boolean().optional(),
})

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(300).nullish(),
  criteria: criteriaSchema.optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const d = parsed.data
  try {
    const segment = await prisma.segment.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.criteria !== undefined ? { criteria: d.criteria as Prisma.InputJsonValue } : {}),
      },
    })
    return NextResponse.json({ segment })
  } catch {
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    // Campaigns linking this segment fall back to "everyone" (Campaign.segmentId is optional, onDelete: SetNull).
    await prisma.segment.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
  }
}
