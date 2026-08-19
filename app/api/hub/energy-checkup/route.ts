import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { libraryFor } from '@/lib/energyCheckup/applianceLibrary'
import {
  allApplianceResults,
  totalEstimatedKwh,
  byCategory,
  calibration,
  effectiveRate,
  savingsRange,
  outageCost,
  solarOrientation,
  benchmarkVerdict,
  annualCostAtRate,
  TYPICAL_JA_HOME_KWH,
  type ApplianceRow,
} from '@/lib/energyCheckup/calc'
import { assembleTiers, CONTEXTUAL_TIP_BY_LEADING_CATEGORY } from '@/lib/energyCheckup/recommendations'

const advancedSchema = z.object({
  measuredWatts: z.number().min(0).max(20_000).optional(),
  surgeWatts: z.number().min(0).max(40_000).optional(),
  dutyCyclePct: z.number().min(0).max(100).optional(),
})

const rowSchema = z.object({
  count: z.number().min(0).max(50),
  hours: z.number().min(0).max(24),
  intervalDays: z.number().min(1).max(30).optional(),
  advanced: advancedSchema.optional(),
})

const schema = z.object({
  mode: z.enum(['home', 'biz']),
  parish: z.string().max(60).optional(),
  occupants: z.number().int().min(0).max(30).optional(),
  homeType: z.string().max(40).optional(),
  acType: z.enum(['none', 'window', 'split']).optional(),
  fridgeAgeBand: z.enum(['<5', '5-10', '10+']).optional(),
  waterType: z.enum(['tank', 'instant', 'solar', 'gas', 'none']).optional(),
  lightType: z.enum(['led', 'cfl', 'incandescent']).optional(),
  bizType: z.string().max(60).optional(),
  backup: z.boolean().optional(),
  rows: z.record(z.string(), rowSchema),
  billKwh: z.number().min(0).max(100_000).optional(),
  billJmd: z.number().min(0).max(50_000_000).optional(),
  month: z.string().max(20).optional(),
  revHour: z.number().min(0).max(10_000_000).optional(),
  stops: z.array(z.string().max(60)).max(10).optional(),
  utmSource: z.string().max(80).optional(),
  utmMedium: z.string().max(80).optional(),
  utmCampaign: z.string().max(80).optional(),
})

/**
 * Tells the signed-in user's dashboard whether they've ever completed an
 * Energy Checkup, and if so, what it found — a real signal for the Storm
 * Readiness score rather than a fabricated one. Returns null (not a 0/empty
 * checkup) when none exists, so callers can distinguish "hasn't done it" from
 * "did it and it came back near-zero."
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ checkup: null })

  const latest = await prisma.energyCheckup.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, mode: true, estimatedKwh: true, backup: true, createdAt: true },
  })
  if (!latest) return NextResponse.json({ checkup: null })

  return NextResponse.json({
    checkup: {
      id: latest.id,
      mode: latest.mode === 'HOME' ? 'home' : 'biz',
      estimatedKwh: latest.estimatedKwh,
      hasBackup: latest.backup ?? null,
      completedAt: latest.createdAt.toISOString(),
    },
  })
}

/**
 * Runs the whole Energy Usage Checkup calculation server-side (never trusting
 * a client-computed number for what gets stored) and saves the session. The
 * live wizard also runs this same calc engine client-side for instant
 * per-slider feedback — this endpoint is the authoritative recompute that
 * becomes the stored record and the results screen's numbers.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Could not read that checkup.' }, { status: 400 })
  const d = parsed.data

  const library = libraryFor(d.mode)
  const rows = new Map<string, ApplianceRow>(
    Object.entries(d.rows).map(([id, r]) => [id, { applianceId: id, count: r.count, hours: r.hours, intervalDays: r.intervalDays, advanced: r.advanced }]),
  )
  const ctx = { acType: d.acType, waterType: d.waterType, lightType: d.lightType, fridgeAgeBand: d.fridgeAgeBand }

  const results = allApplianceResults(library, rows, ctx)
  const totalKwh = totalEstimatedKwh(results)
  const categories = byCategory(results)
  const rate = effectiveRate(d.billKwh, d.billJmd, d.mode)
  const cal = calibration(totalKwh, d.billKwh)

  const monthlyBillJmd = d.billJmd && d.billJmd > 0 ? d.billJmd : totalKwh * rate.rate
  const coolingKwh = categories.find((c) => c.category === 'cooling')?.kwh ?? 0
  const coolingShare = totalKwh > 0 ? coolingKwh / totalKwh : 0
  const savings = savingsRange(monthlyBillJmd, coolingShare)
  const solar = solarOrientation(totalKwh, monthlyBillJmd)
  const benchmark = { verdict: benchmarkVerdict(totalKwh), typical: TYPICAL_JA_HOME_KWH, annualCost: annualCostAtRate(totalKwh, rate.rate) }
  const outage = d.mode === 'biz' && d.revHour ? outageCost(d.revHour, d.stops?.length ?? 0) : null

  const leadingCategory = categories[0]?.category ?? 'other'
  const tiers = assembleTiers({
    mode: d.mode,
    results,
    totalKwh,
    coolingShare,
    lightType: d.lightType,
    hasElectronics: (categories.find((c) => c.category === 'electronics')?.kwh ?? 0) > 0,
    hasCoolers: (d.rows['coolers']?.count ?? 0) > 0,
    solarKw: solar.kw,
  })

  const checkup = await prisma.energyCheckup.create({
    data: {
      userId: session?.user?.id ?? null,
      mode: d.mode === 'home' ? 'HOME' : 'BUSINESS',
      parish: d.parish ?? null,
      occupants: d.occupants ?? null,
      homeType: d.homeType ?? null,
      acType: d.acType ?? null,
      fridgeAge: d.fridgeAgeBand ?? null,
      waterHeating: d.waterType ?? null,
      lightType: d.lightType ?? null,
      bizType: d.bizType ?? null,
      backup: d.backup ?? null,
      rows: d.rows,
      billKwh: d.billKwh ?? null,
      billJmd: d.billJmd ?? null,
      month: d.month ?? null,
      revHour: d.revHour ?? null,
      stops: d.stops ?? undefined,
      estimatedKwh: totalKwh,
      effectiveRate: rate.rate,
      rateSource: rate.source,
      utmSource: d.utmSource ?? null,
      utmMedium: d.utmMedium ?? null,
      utmCampaign: d.utmCampaign ?? null,
    },
  })

  return NextResponse.json({
    id: checkup.id,
    totalKwh,
    categories: categories.map((c) => ({ ...c, pct: totalKwh > 0 ? Math.round((c.kwh / totalKwh) * 100) : 0 })),
    appliances: [...results].sort((a, b) => b.kwh - a.kwh).map((r) => ({ id: r.applianceId, category: r.category, kwh: r.kwh })),
    rate,
    calibration: cal,
    savings,
    solar,
    benchmark,
    outage,
    tiers,
    contextualTip: CONTEXTUAL_TIP_BY_LEADING_CATEGORY[leadingCategory],
  })
}
