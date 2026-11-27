import { NextResponse } from 'next/server'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { recordInputSchema } from '@/lib/refdata/types'
import { listRecords, createRecord, RefDataConflict } from '@/lib/refdata/store.server'

/** GET — every reference-data record, newest first. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  const records = await listRecords()
  return NextResponse.json({ records: [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
}

/** POST — create a draft record (approved separately). */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const parsed = recordInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: `${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}` }, { status: 400 })
  try {
    const record = await createRecord({ ...parsed.data, effectiveTo: parsed.data.effectiveTo ?? null }, session.user?.email ?? null)
    logActivity({ label: 'Reference data: draft added', detail: `${record.kind}: ${record.name}`, entity: 'RefData', entityId: record.id, actorEmail: session.user?.email })
    return NextResponse.json({ record }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof RefDataConflict ? 409 : 400 })
  }
}
