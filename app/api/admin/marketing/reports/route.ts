import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { channelRoi, cohortRetention } from '@/lib/marketingReports'

/**
 * Deeper marketing analytics: spend-vs-revenue ROI per channel, and
 * repeat-purchase rate by signup cohort. Deliberately built to read
 * honestly at low volume (nulls/zeros instead of misleading numbers) rather
 * than waiting for traffic to "catch up" to the feature.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const days = Math.min(365, Math.max(1, Number(searchParams.get('days')) || 90))
  const since = new Date(Date.now() - days * 86_400_000)

  const [channels, cohorts] = await Promise.all([channelRoi(since), cohortRetention(12)])

  return NextResponse.json({ days, channels, cohorts })
}
