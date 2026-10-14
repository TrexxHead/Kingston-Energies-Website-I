import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { deriveGroupStatus, stationStatusSummary, type StatusObservation, type CommunitySignal, type StatusSource } from './status'

/**
 * Published (and closed) registry stations with derived status — the one
 * place the public map API and the station pages read stations from, so
 * both always say the same thing.
 */
export async function loadPublicStations(where: Prisma.EvStationWhereInput = {}, now = new Date()) {
  const stations = await prisma.evStation.findMany({
    where: { status: { in: ['published', 'closed'] }, ...where },
    include: {
      operator: { select: { name: true, website: true, appInfo: true } },
      connectorGroups: { include: { observations: { orderBy: { observedAt: 'desc' }, take: 5 } } },
      sources: { where: { reviewState: 'verified' }, select: { sourceName: true, sourceType: true, verifiedAt: true, observedAt: true, url: true } },
      reports: { where: { moderation: 'approved', observedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } }, select: { kind: true, observedAt: true, moderation: true } },
    },
    orderBy: { name: 'asc' },
  })
  return stations.map((s) => {
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
      updatedAt: s.updatedAt,
      googlePlaceId: s.googlePlaceId,
      sources: s.sources,
      connectorGroups: groups,
      statusSummary: s.status === 'closed' ? 'Closed' : stationStatusSummary(groups.map((g) => ({ connectorType: g.connectorType, status: g.status! }))),
    }
  })
}

export type PublicStation = Awaited<ReturnType<typeof loadPublicStations>>[number]

export { stationSlug, idFromSlug } from './stationSlug'
