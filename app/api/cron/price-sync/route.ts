import { NextResponse } from 'next/server'
import { runPriceSync, readSyncState } from '@/lib/refdata/priceSync.server'
import { logActivity } from '@/lib/activityLog'

/**
 * Daily (Vercel Cron, see vercel.json; same CRON_SECRET auth as the other
 * cron routes): reads each published price sheet into reference data.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  if (!(await readSyncState()).sheets.length) return NextResponse.json({ ok: true, skipped: 'no sheets configured' })
  const last = await runPriceSync('cron')
  const added = last?.results.flatMap((r) => r.added) ?? []
  if (added.length) logActivity({ label: 'Price sync: prices updated', detail: added.join('; ').slice(0, 500), entity: 'RefData' })
  return NextResponse.json({ ok: last?.results.every((r) => r.ok) ?? true, last })
}
