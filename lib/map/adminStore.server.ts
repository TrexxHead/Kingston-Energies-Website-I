import { prisma } from '@/lib/prisma'
import type { StationInput } from './registry'

export const STATION_INCLUDE = {
  operator: { select: { id: true, name: true } },
  connectorGroups: true,
  sources: { orderBy: { createdAt: 'asc' as const } },
  _count: { select: { reports: true } },
}

async function operatorId(name: string | null | undefined): Promise<string | null> {
  const n = name?.trim()
  if (!n) return null
  const op = await prisma.evOperator.upsert({ where: { name: n }, create: { name: n }, update: {} })
  return op.id
}

/** Station fields + full replacement of its connector groups. */
export async function stationData(input: StationInput) {
  return {
    name: input.name,
    operatorId: await operatorId(input.operatorName),
    parish: input.parish,
    address: input.address ?? null,
    lat: input.lat,
    lng: input.lng,
    access: input.access,
    accessNotes: input.accessNotes ?? null,
    hours: input.hours ?? null,
    paymentNotes: input.paymentNotes ?? null,
    pricingNotes: input.pricingNotes ?? null,
    pricingObservedAt: input.pricingObservedAt ? new Date(input.pricingObservedAt) : null,
    googlePlaceId: input.googlePlaceId?.trim() || null,
    verificationNote: input.verificationNote ?? null,
  }
}

export function groupRows(input: StationInput) {
  return input.connectorGroups.map((g) => ({
    connectorType: g.connectorType,
    currentType: g.currentType,
    maxPowerKw: g.maxPowerKw ?? null,
    count: g.count ?? null,
    portsShared: g.portsShared ?? null,
    notes: g.notes ?? null,
  }))
}
