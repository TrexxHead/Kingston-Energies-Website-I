import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { readSyncState, saveSheets, runPriceSync } from '@/lib/refdata/priceSync.server'
import { SHEET_KINDS } from '@/lib/refdata/priceSheets'

/** GET — configured price sheets and the last sync. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json(await readSyncState())
}

const putSchema = z.object({ sheets: z.array(z.object({ id: z.string().optional(), kind: z.enum(SHEET_KINDS), url: z.string(), autoApprove: z.boolean() })).max(20) })

/** PUT — replace the sheet list. */
export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const body = putSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid sheet list.' }, { status: 400 })
  try {
    const sheets = await saveSheets(body.data.sheets)
    logActivity({ label: 'Price sync: sheets updated', detail: sheets.map((s) => `${s.kind}${s.autoApprove ? ' (auto-approve)' : ''}`).join(', '), entity: 'RefData', actorEmail: session.user?.email })
    return NextResponse.json({ sheets })
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : (e as Error).message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

/** POST — sync now. */
export async function POST() {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const last = await runPriceSync('manual')
  const added = last?.results.flatMap((r) => r.added) ?? []
  logActivity({ label: 'Price sync: run now', detail: added.length ? added.join('; ').slice(0, 500) : 'No changes', entity: 'RefData', actorEmail: session.user?.email })
  return NextResponse.json({ last })
}
