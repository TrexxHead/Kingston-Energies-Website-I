import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { installerInputSchema } from '@/lib/installers'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json({ installers: await prisma.installer.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] }) })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const parsed = installerInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: `${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}` }, { status: 400 })
  const d = parsed.data
  const installer = await prisma.installer.create({
    data: { ...d, licenceExpires: d.licenceExpires ? new Date(`${d.licenceExpires}T00:00:00Z`) : null, createdBy: session.user?.email ?? null },
  })
  logActivity({ label: 'Installer added (draft)', detail: installer.name, entity: 'Installer', entityId: installer.id, actorEmail: session.user?.email })
  return NextResponse.json({ installer }, { status: 201 })
}
