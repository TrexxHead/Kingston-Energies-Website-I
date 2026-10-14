import { NextResponse } from 'next/server'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'
import { servicesConfigSchema } from '@/lib/bookings/config'
import { getServicesConfig, saveServicesConfig } from '@/lib/bookings/store.server'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json({ config: await getServicesConfig() })
}

/** PUT — replace the bookable services, capacity and deposit terms. */
export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const parsed = servicesConfigSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: `${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}` }, { status: 400 })
  const ids = parsed.data.services.map((s) => s.id)
  if (new Set(ids).size !== ids.length) return NextResponse.json({ error: 'Two services share an id.' }, { status: 400 })
  await saveServicesConfig(parsed.data)
  logActivity({ label: 'Bookings: services updated', detail: `${parsed.data.services.length} services`, entity: 'SiteSetting', entityId: 'services:v1', actorEmail: session.user?.email })
  return NextResponse.json({ config: parsed.data })
}
