import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PARISHES, isParishId, type CoverageState } from '@/lib/map/parishes'
import { loadPublicStations } from '@/lib/map/publicStations.server'

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

  const [stations, coverage] = await Promise.all([
    loadPublicStations({ ...(parish && isParishId(parish) ? { parish } : {}), ...(access ? { access: access === 'public' ? { in: ['public', 'unknown'] } : access } : {}) }),
    prisma.mapCoverageReview.findMany(),
  ])
  const result = stations
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
        verifiedLocations: stations.filter((s) => !s.closed).length,
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
