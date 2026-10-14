import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { recordInputSchema } from '@/lib/refdata/types'
import { updateDraft, setStatus, deleteDraft, RefDataConflict } from '@/lib/refdata/store.server'

const patchSchema = z.union([
  z.object({ status: z.enum(['approved', 'retired']) }),
  z.object({ record: recordInputSchema.omit({ kind: true }) }),
])

/** PATCH — approve / retire, or edit a draft. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  try {
    const record =
      'status' in parsed.data
        ? await setStatus(id, parsed.data.status, session.user?.email ?? null)
        : await updateDraft(id, { ...parsed.data.record, effectiveTo: parsed.data.record.effectiveTo ?? null })
    logActivity({
      label: `Reference data: ${'status' in parsed.data ? parsed.data.status : 'draft edited'}`,
      detail: `${record.kind}: ${record.name}`,
      entity: 'RefData',
      entityId: id,
      actorEmail: session.user?.email,
    })
    return NextResponse.json({ record })
  } catch (e) {
    const msg = (e as Error).message
    return NextResponse.json({ error: msg }, { status: e instanceof RefDataConflict ? 409 : msg === 'Not found.' ? 404 : 400 })
  }
}

/** DELETE — remove a draft entered by mistake. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  try {
    await deleteDraft(id)
    logActivity({ label: 'Reference data: draft deleted', detail: id, entity: 'RefData', entityId: id, actorEmail: session.user?.email })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
