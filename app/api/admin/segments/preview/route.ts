import { NextResponse } from 'next/server'
import { z } from 'zod'
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

/** Live audience-size estimate while building a segment, before it's saved. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = criteriaSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid criteria' }, { status: 400 })

  const size = await segmentSize(parsed.data)
  return NextResponse.json({ size })
}
