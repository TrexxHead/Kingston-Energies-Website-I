import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reminderDigest } from '@/lib/map/reminders'
import { OUT_OF_SERVICE_FRESHNESS_MS } from '@/lib/map/status'
import { sendStationStatusDigest } from '@/lib/email'

/**
 * Daily (Vercel Cron, see vercel.json; same CRON_SECRET auth as the other
 * cron routes): e-mails admins the charger checks that are about to lapse,
 * have just lapsed, or are long-standing faults, plus pending fault reports.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - OUT_OF_SERVICE_FRESHNESS_MS)
  const [stations, reports] = await Promise.all([
    prisma.evStation.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        name: true,
        parish: true,
        connectorGroups: {
          select: {
            connectorType: true,
            observations: { where: { source: 'staff_check', observedAt: { gte: since } }, select: { observedAt: true, availableCount: true, outOfServiceCount: true } },
          },
        },
      },
    }),
    prisma.evCommunityReport.findMany({
      where: { moderation: 'pending', stationId: { not: null } },
      select: { stationId: true, kind: true, observedAt: true, station: { select: { name: true } } },
      orderBy: { observedAt: 'desc' },
      take: 100,
    }),
  ])

  const digest = reminderDigest(
    stations.map((s) => ({
      id: s.id,
      name: s.name,
      parish: s.parish,
      groups: s.connectorGroups.map((g) => ({
        connectorType: g.connectorType,
        checks: g.observations.filter((o) => o.observedAt).map((o) => ({ observedAt: (o.observedAt as Date).toISOString(), availableCount: o.availableCount, outOfServiceCount: o.outOfServiceCount })),
      })),
    })),
    reports.map((r) => ({ stationId: r.stationId as string, stationName: r.station?.name ?? 'Unknown station', kind: r.kind, observedAt: r.observedAt.toISOString() })),
  )
  const email = await sendStationStatusDigest(digest)
  return NextResponse.json({
    ok: true,
    counts: { faultReports: digest.faultReports.length, expiringSoon: digest.expiringSoon.length, justLapsed: digest.justLapsed.length, longFaults: digest.longFaults.length },
    email,
  })
}
