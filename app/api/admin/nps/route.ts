import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { npsScore, type NpsSource } from '@/lib/crm'

/**
 * Admin NPS rollup — overall plus a per-source breakdown (order vs support),
 * and the most recent responses with comments for qualitative follow-up.
 */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  let responses: { score: number; source: NpsSource; comment: string | null; createdAt: Date; orderNo: string | null }[] = []
  try {
    responses = await prisma.npsResponse.findMany({
      orderBy: { createdAt: 'desc' },
      select: { score: true, source: true, comment: true, createdAt: true, orderNo: true },
    })
  } catch {
    // DB unavailable — return an empty rollup rather than erroring the dashboard.
  }

  const overall = npsScore(responses.map((r) => r.score))
  const order = npsScore(responses.filter((r) => r.source === 'ORDER').map((r) => r.score))
  const support = npsScore(responses.filter((r) => r.source === 'SUPPORT').map((r) => r.score))

  const recent = responses
    .filter((r) => r.comment && r.comment.trim().length > 0)
    .slice(0, 8)
    .map((r) => ({
      score: r.score,
      source: r.source,
      comment: r.comment,
      orderNo: r.orderNo,
      date: new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }))

  return NextResponse.json({ overall, order, support, recent })
}
