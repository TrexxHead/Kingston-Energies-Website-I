import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { propertySchema, scenarioDevices } from '@/lib/energy/profileSchema'
import { evaluateScenario, CALC_ENGINE_VERSION } from '@/lib/energy/engine'
import { buildRun } from '@/lib/energy/engine/run'
import { evaluateBackupMatch } from '@/lib/catalogue/backupMatch'
import { toEvidenceRecords } from '@/lib/catalogue/records'
import type { Prisma } from '@prisma/client'

const bodySchema = z.object({
  property: propertySchema,
  scenarioClientId: z.string().min(1).max(64),
  save: z.boolean().optional(),
})

/**
 * POST /api/energy/scenarios/calculate — the authoritative server-side run of
 * the shared engine for one scenario, plus Backup Match against every
 * catalogue power station. Works without an account (nothing is stored);
 * signed-in customers can save the run against their stored property.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(`energy-calc:${clientIp(request)}`, 30, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many calculations — try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'That scenario could not be read.', issues: parsed.error.issues.slice(0, 5) }, { status: 400 })
  const { property, scenarioClientId, save } = parsed.data
  const scenario = property.scenarios.find((s) => s.clientId === scenarioClientId)
  if (!scenario) return NextResponse.json({ error: 'Scenario not found in that property.' }, { status: 400 })

  const devices = scenarioDevices(property, scenario)
  const result = evaluateScenario(devices)
  if (!result.ok) return NextResponse.json({ error: result.message, fields: result.fields }, { status: 422 })

  // Backup Match against the catalogue — only when the customer set a target runtime.
  let matches: unknown[] = []
  let catalogueNote: string | null = null
  if (scenario.targetHours) {
    const skus = await prisma.catalogueSku
      .findMany({ where: { kind: 'power_station', status: { not: 'retired' } }, include: { evidence: true } })
      .catch(() => null)
    if (skus === null) catalogueNote = 'The product catalogue could not be reached, so products were not checked. Your result above is unaffected.'
    else if (!skus.length) catalogueNote = 'No power stations are in the verified catalogue yet, so no product can be matched.'
    const now = new Date()
    matches = (skus ?? []).map((sku) => {
      const evidence = toEvidenceRecords(sku.evidence)
      const m = evaluateBackupMatch(
        { scenario: result.value, scenarioBasis: result.basis, targetHours: scenario.targetHours as number, reserveFraction: scenario.reserveFraction },
        evidence,
        now,
      )
      return { skuId: sku.id, catalogId: sku.catalogId, displayName: sku.displayName, ...m }
    })
  }

  const outputs = { scenario: result.value, basis: result.basis, assumptions: result.assumptions, warnings: result.warnings, matches, catalogueNote }
  const run = buildRun('scenario', { property: { kind: property.kind, devices: property.devices }, scenario }, outputs)

  let savedRunId: string | null = null
  if (save) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Sign in to save this result.' }, { status: 401 })
    const stored = await prisma.energyProperty.findUnique({
      where: { userId_clientId: { userId: session.user.id, clientId: property.clientId } },
      include: { scenarios: { where: { clientId: scenarioClientId }, select: { id: true } } },
    })
    if (!stored) return NextResponse.json({ error: 'Save your profile before saving a result.' }, { status: 409 })
    const row = await prisma.calculationRun.create({
      data: {
        userId: session.user.id,
        propertyId: stored.id,
        scenarioId: stored.scenarios[0]?.id ?? null,
        kind: run.kind,
        engineVersion: run.engineVersion,
        inputHash: run.inputHash,
        inputSnapshot: run.inputSnapshot as unknown as Prisma.InputJsonValue,
        outputs: run.outputs as unknown as Prisma.InputJsonValue,
      },
    })
    savedRunId = row.id
  }

  return NextResponse.json({ engineVersion: CALC_ENGINE_VERSION, inputHash: run.inputHash, savedRunId, ...outputs })
}
