import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { liveOperatorLocations, configuredFeeds } from './operatorFeeds.server'
import { groupObservation } from './ocpi'
import { listRecords } from '@/lib/refdata/store.server'
import { inEffect, type RefRecord } from '@/lib/refdata/types'
import { sameOperator, type OperatorPrice } from '@/lib/refdata/chargingPrice'
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
  // The operator's approved price record (owner-entered, sourced, dated) — matched by operator name.
  const today = new Date(now.getTime() - 5 * 3_600_000).toISOString().slice(0, 10)
  const records: RefRecord[] = await listRecords().catch(() => [])
  const prices = records.filter(
    (r): r is RefRecord<'charging_price'> => r.kind === 'charging_price' && r.status === 'approved' && inEffect(r, today),
  )
  const priceFor = (operator: string | undefined): OperatorPrice | null => {
    const r = operator ? prices.filter((p) => sameOperator(p.data.operator, operator)).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] : undefined
    return r ? { name: r.name, effectiveFrom: r.effectiveFrom, source: r.source, data: r.data } : null
  }
  // Live operator status, only when a feed is configured and a station is linked to it.
  const live = configuredFeeds().length && stations.some((s) => s.operatorLocationId) ? await liveOperatorLocations() : null

  return stations.map((s) => {
    const liveLoc = live && s.operatorLocationId && s.operator ? live.locations.get(s.operator.name.trim().toLowerCase())?.get(s.operatorLocationId) : undefined
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
      const feed = liveLoc && live ? groupObservation(liveLoc, g.connectorType, live.retrievedAt) : null
      if (feed) observations.unshift(feed)
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
      price: s.status === 'closed' ? null : priceFor(s.operator?.name),
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
