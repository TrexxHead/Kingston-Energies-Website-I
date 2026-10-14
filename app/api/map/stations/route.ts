import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PARISHES, isParishId, type CoverageState } from '@/lib/map/parishes'
import { deriveGroupStatus, stationStatusSummary, type StatusObservation, type CommunitySignal, type StatusSource } from '@/lib/map/status'

/**
 * GET /api/map/stations — published registry stations with source metadata
 * and derived status, plus the coverage summary the page must show instead
 * of any claim of national completeness. Filters: parish, connector,
 * current (AC|DC), minKw, access (access=public keeps 'unknown' access, shown
 * as not confirmed). Stations with unknown values for a filter
 * are kept when includeUnknown=1 (the default) and flagged.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const parish = url.searchParams.get('parish')
  const connector = url.searchParams.get('connector')
  const current = url.searchParams.get('current')
  const minKw = Number(url.searchParams.get('minKw') ?? '') || null
  const access = url.searchParams.get('access')
  const includeUnknown = url.searchParams.get('includeUnknown') !== '0'

  const now = new Date()
  const [stations, coverage] = await Promise.all([
    prisma.evStation.findMany({
      where: { status: { in: ['published', 'closed'] }, ...(parish && isParishId(parish) ? { parish } : {}), ...(access ? { access: access === 'public' ? { in: ['public', 'unknown'] } : access } : {}) },
      include: {
        operator: { select: { name: true, website: true, appInfo: true } },
        connectorGroups: { include: { observations: { orderBy: { observedAt: 'desc' }, take: 5 } } },
        sources: { where: { reviewState: 'verified' }, select: { sourceName: true, sourceType: true, verifiedAt: true, observedAt: true, url: true } },
        reports: { where: { moderation: 'approved', observedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } }, select: { kind: true, observedAt: true, moderation: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.mapCoverageReview.findMany(),
  ])

  const result = stations
    .map((s) => {
      const community: CommunitySignal[] = s.reports.map((r) => ({ kind: r.kind as CommunitySignal['kind'], observedAt: r.observedAt.toISOString(), moderation: 'approved' }))
      const groups = s.connectorGroups.map((g) => {
        const observations: StatusObservation[] = g.observations.map((o) => ({
          source: o.source as StatusSource,
          observedAt: o.observedAt?.toISOString() ?? null,
          retrievedAt: o.retrievedAt.toISOString(),
          availableCount: o.availableCount,
          outOfServiceCount: o.outOfServiceCount,
          inUseCount: o.inUseCount,
          supportsInUse: o.supportsInUse,
        }))
        return {
          id: g.id,
          connectorType: g.connectorType,
          currentType: g.currentType,
          maxPowerKw: g.maxPowerKw,
          count: g.count,
          portsShared: g.portsShared,
          status: s.status === 'closed' ? null : deriveGroupStatus(g.count, observations, community, now),
        }
      })
      return {
        id: s.id,
        name: s.name,
        operator: s.operator,
        parish: s.parish,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        access: s.access,
        accessNotes: s.accessNotes,
        hours: s.hours,
        paymentNotes: s.paymentNotes,
        pricingNotes: s.pricingNotes,
        pricingObservedAt: s.pricingObservedAt,
        closed: s.status === 'closed',
        verifiedAt: s.verifiedAt,
        googlePlaceId: s.googlePlaceId,
        sources: s.sources,
        connectorGroups: groups,
        statusSummary: s.status === 'closed' ? 'Closed' : stationStatusSummary(groups.map((g) => ({ connectorType: g.connectorType, status: g.status! }))),
      }
    })
    .filter((s) => {
      const keep = (vals: (string | number | null)[], test: (v: string | number) => boolean) =>
        vals.some((v) => v != null && test(v)) || (includeUnknown && vals.every((v) => v == null))
      if (connector && !keep(s.connectorGroups.map((g) => g.connectorType), (v) => String(v).toLowerCase() === connector.toLowerCase())) return false
      if (current && !keep(s.connectorGroups.map((g) => g.currentType), (v) => v === current)) return false
      if (minKw && !keep(s.connectorGroups.map((g) => g.maxPowerKw), (v) => Number(v) >= minKw)) return false
      return true
    })

  const byParish = new Map(coverage.map((c) => [c.parish, c]))
  return NextResponse.json(
    {
      stations: result,
      coverage: {
        verifiedLocations: stations.filter((s) => s.status === 'published').length,
        parishes: PARISHES.map((p) => {
          const c = byParish.get(p.id)
          return { parish: p.id, name: p.name, state: (c?.state ?? 'unreviewed') as CoverageState, reviewedAt: c?.reviewedAt ?? null, sourcesReviewed: c?.sourcesReviewed ?? [] }
        }),
        lastReviewedAt: coverage.reduce<Date | null>((a, c) => (c.reviewedAt && (!a || c.reviewedAt > a) ? c.reviewedAt : a), null),
        statement: 'Locations we have verified from named sources. This is not a complete census of every charger in Jamaica.',
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
