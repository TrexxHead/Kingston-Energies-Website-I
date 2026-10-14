import { NextResponse } from 'next/server'
import { listRecords } from '@/lib/refdata/store.server'
import { REF_KINDS, activeRecord, publicView, type RefKind } from '@/lib/refdata/types'

/**
 * GET /api/refdata?kind=tariff[&match=Residential][&date=YYYY-MM-DD]
 * The approved record in effect (or null) — what every public calculator
 * reads. Never returns drafts or who entered the data.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const kind = url.searchParams.get('kind') as RefKind | null
  if (!kind || !(REF_KINDS as readonly string[]).includes(kind)) return NextResponse.json({ error: 'Unknown kind.' }, { status: 400 })
  const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const match = url.searchParams.get('match')?.toLowerCase()
  const records = await listRecords()
  const all = url.searchParams.get('all') === '1'
  if (all) {
    const list = records.filter((r) => r.kind === kind && r.status === 'approved' && r.effectiveFrom <= date && (!r.effectiveTo || date < r.effectiveTo))
    return NextResponse.json({ records: list.map(publicView) }, { headers: { 'Cache-Control': 'public, max-age=300' } })
  }
  const rec = activeRecord(records, kind, date, match ? (r) => JSON.stringify(r.data).toLowerCase().includes(match) || r.name.toLowerCase().includes(match) : undefined)
  return NextResponse.json({ record: rec ? publicView(rec) : null }, { headers: { 'Cache-Control': 'public, max-age=300' } })
}
