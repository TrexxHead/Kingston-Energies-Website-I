import { prisma } from '@/lib/prisma'
import { publishBlockers } from './registry'
import { stationData, groupRows } from './adminStore.server'
import { planStationImport, entryTag, OPERATOR_SITES, type StationList } from './stationImport'

export interface ImportResult {
  created: { ref: number; name: string; status: 'published' | 'draft' }[]
  skipped: { ref: number; name: string; reason: string }[]
  warnings: { ref: number; name: string; warnings: string[] }[]
}

/**
 * Import an owner-supplied station list into the registry. Safe to run
 * again: an entry already imported (matched by its source record) is
 * skipped, so later admin edits are never overwritten.
 */
export async function importStationList(list: StationList, now = new Date()): Promise<ImportResult> {
  const plan = planStationImport(list)
  const result: ImportResult = { created: [], skipped: [], warnings: [] }

  const existing = await prisma.evSourceRecord.findMany({
    where: { sourceName: plan[0]?.source.sourceName ?? '' },
    select: { notes: true },
  })
  const done = new Set(existing.map((e) => e.notes?.match(/^List entry #(\d+)\./)?.[1]).filter(Boolean))

  for (const [name, website] of Object.entries(OPERATOR_SITES)) {
    await prisma.evOperator.upsert({ where: { name }, create: { name, website }, update: {} })
    await prisma.evOperator.updateMany({ where: { name, website: null }, data: { website } })
  }

  for (const p of plan) {
    if (done.has(String(p.ref))) {
      result.skipped.push({ ref: p.ref, name: p.input.name, reason: 'Already imported' })
      continue
    }
    const sourceRow = {
      sourceName: p.source.sourceName,
      sourceType: 'staff_list',
      url: p.source.url,
      contact: p.source.contact,
      observedAt: new Date(`${list.listDate}T12:00:00Z`),
      retrievedAt: now,
      verifiedAt: now,
      reviewState: 'verified',
      notes: p.source.notes,
    }
    const blockers = publishBlockers({ ...p.input, sources: [{ reviewState: 'verified' }] }, now)
    const publish = p.publish && blockers.length === 0
    const station = await prisma.evStation.create({
      data: {
        ...(await stationData(p.input)),
        status: publish ? 'published' : 'draft',
        verifiedAt: publish ? now : null,
        connectorGroups: { create: groupRows(p.input) },
        sources: { create: [sourceRow] },
      },
    })
    result.created.push({ ref: p.ref, name: station.name, status: publish ? 'published' : 'draft' })
    if (p.warnings.length) result.warnings.push({ ref: p.ref, name: station.name, warnings: p.warnings })
  }
  return result
}

export { entryTag }
