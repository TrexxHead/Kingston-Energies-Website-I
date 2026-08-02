import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { segmentSize, type SegmentCriteria } from '@/lib/segments'

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

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(300).nullish(),
  criteria: criteriaSchema,
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const segments = await prisma.segment.findMany({ orderBy: { createdAt: 'desc' } })
  const withSize = await Promise.all(
    segments.map(async (s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      criteria: s.criteria as SegmentCriteria,
      size: await segmentSize(s.criteria as SegmentCriteria),
    })),
  )
  return NextResponse.json({ segments: withSize })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Provide a name and at least one filter.' }, { status: 400 })

  const d = parsed.data
  const segment = await prisma.segment.create({
    data: { name: d.name, description: d.description ?? null, criteria: d.criteria as Prisma.InputJsonValue },
  })
  return NextResponse.json({ id: segment.id }, { status: 201 })
}
