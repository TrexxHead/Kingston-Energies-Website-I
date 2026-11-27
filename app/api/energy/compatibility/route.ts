import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { propertySchema, scenarioDevices } from '@/lib/energy/profileSchema'
import { evaluateScenario, CALC_ENGINE_VERSION } from '@/lib/energy/engine'
import { evaluateBackupMatch } from '@/lib/catalogue/backupMatch'
import { toEvidenceRecords } from '@/lib/catalogue/records'

const bodySchema = z.object({
  catalogId: z.string().min(1).max(64),
  property: propertySchema,
  scenarioClientId: z.string().min(1).max(64),
  targetHours: z.number().positive().max(24 * 14),
})

/**
 * POST /api/energy/compatibility — "Will this power station run my devices
 * for N hours?" for ONE product (roadmap M4): the visitor's My Energy
 * scenario against that product's catalogue evidence, using the same
 * Backup Match as My Energy. Unverified or missing specs come back as
 * "needs review" / "unknown" checks — never as a pass. Only published SKUs
 * (staff-reviewed) are checked publicly. Nothing is stored.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(`energy-compat:${clientIp(request)}`, 30, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many checks — try again shortly.' }, { status: 429 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'That check could not be read.' }, { status: 400 })
  const { catalogId, property, scenarioClientId, targetHours } = parsed.data
  const scenario = property.scenarios.find((s) => s.clientId === scenarioClientId)
  if (!scenario) return NextResponse.json({ error: 'Scenario not found.' }, { status: 400 })

  const sku = await prisma.catalogueSku.findFirst({ where: { catalogId, kind: 'power_station', status: 'published' }, include: { evidence: true } })
  if (!sku) return NextResponse.json({ error: 'This product’s specifications haven’t been added to our verified catalogue yet.' }, { status: 404 })

  const result = evaluateScenario(scenarioDevices(property, scenario))
  if (!result.ok) return NextResponse.json({ error: result.message, fields: result.fields }, { status: 422 })
  const match = evaluateBackupMatch({ scenario: result.value, scenarioBasis: result.basis, targetHours, reserveFraction: scenario.reserveFraction }, toEvidenceRecords(sku.evidence), new Date())
  return NextResponse.json({
    engineVersion: CALC_ENGINE_VERSION,
    product: { displayName: sku.displayName },
    scenario: { averageWatts: result.value.averageWatts, simultaneousWatts: result.value.simultaneousWatts, unresolved: result.value.unresolved.map((u) => ({ name: u.name, message: u.message })), basis: result.basis },
    match,
    warnings: result.warnings,
  })
}
