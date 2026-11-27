import { NextResponse } from 'next/server'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { importStationList } from '@/lib/map/stationImport.server'
import { planStationImport, type StationList } from '@/lib/map/stationImport'
import list from '@/lib/map/data/station-list-2026-10-14.json'

const LIST = list as StationList

/** GET — preview what the bundled station list would add (no writes). */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  const plan = planStationImport(LIST)
  return NextResponse.json({
    list: `${LIST.list} (${LIST.listDate})`,
    note: LIST.note,
    total: plan.length,
    publishable: plan.filter((p) => p.publish).length,
    drafts: plan.filter((p) => !p.publish).length,
    entries: plan.map((p) => ({ ref: p.ref, name: p.input.name, publish: p.publish, warnings: p.warnings })),
  })
}

/** POST — import the bundled station list into this deployment's registry. */
export async function POST() {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const result = await importStationList(LIST)
  logActivity({
    label: 'Energy map: station list imported',
    detail: `${LIST.list} (${LIST.listDate}): ${result.created.length} added, ${result.skipped.length} already present`,
    entity: 'EvStation',
    actorEmail: session.user?.email,
  })
  return NextResponse.json(result)
}
