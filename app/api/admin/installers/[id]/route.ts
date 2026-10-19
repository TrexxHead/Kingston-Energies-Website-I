import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { installerInputSchema, publishProblem } from '@/lib/installers'

const actionSchema = z.object({ action: z.enum(['verify', 'publish', 'suspend', 'unpublish']) })

/**
 * PATCH — edit details (any edit to licence facts clears verification and
 * takes the listing down), or an action: verify (records who checked the
 * evidence), publish (only when publishProblem() is clear), suspend/unpublish.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const who = session.user?.email ?? null
  const { id } = await params
  const existing = await prisma.installer.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await request.json().catch(() => null)

  const action = actionSchema.safeParse(body)
  if (action.success) {
    const a = action.data.action
    let data: Record<string, unknown>
    if (a === 'verify') {
      if (!existing.licenceType || !existing.evidenceNote) return NextResponse.json({ error: 'Record the licence type and the evidence you saw before verifying.' }, { status: 400 })
      data = { verifiedBy: who, verifiedAt: new Date() }
    } else if (a === 'publish') {
      const problem = publishProblem(existing)
      if (problem) return NextResponse.json({ error: problem }, { status: 400 })
      data = { status: 'published' }
    } else data = { status: a === 'suspend' ? 'suspended' : 'draft' }
    const installer = await prisma.installer.update({ where: { id }, data })
    logActivity({ label: `Installer ${a}`, detail: installer.name, entity: 'Installer', entityId: id, actorEmail: who })
    // Same person entering and verifying is allowed (small team) but flagged, as with reference data.
    const selfVerified = a === 'verify' && existing.createdBy && existing.createdBy === who
    return NextResponse.json({ installer, warning: selfVerified ? 'You verified a listing you entered — a second person checking is better.' : null })
  }

  const parsed = installerInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: `${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}` }, { status: 400 })
  const d = parsed.data
  const expires = d.licenceExpires ? new Date(`${d.licenceExpires}T00:00:00Z`) : null
  const licenceChanged =
    (d.licenceType ?? null) !== existing.licenceType || (d.licenceNumber ?? null) !== existing.licenceNumber || (d.evidenceNote ?? null) !== existing.evidenceNote || (expires?.getTime() ?? null) !== (existing.licenceExpires?.getTime() ?? null)
  const installer = await prisma.installer.update({
    where: { id },
    data: { ...d, licenceExpires: expires, ...(licenceChanged ? { verifiedBy: null, verifiedAt: null, status: existing.status === 'published' ? 'draft' : existing.status } : {}) },
  })
  logActivity({ label: 'Installer edited', detail: `${installer.name}${licenceChanged ? ' (licence details changed — re-verify)' : ''}`, entity: 'Installer', entityId: id, actorEmail: who })
  return NextResponse.json({ installer, warning: licenceChanged && existing.verifiedAt ? 'Licence details changed, so verification was cleared and the listing taken down until it is re-verified.' : null })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const gone = await prisma.installer.delete({ where: { id } }).catch(() => null)
  if (!gone) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  logActivity({ label: 'Installer deleted', detail: gone.name, entity: 'Installer', entityId: id, actorEmail: session.user?.email })
  return NextResponse.json({ ok: true })
}
