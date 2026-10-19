import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { profileSchema } from '@/lib/energy/profileSchema'
import { loadProfile, saveProfile } from '@/lib/energy/profileStore.server'

/**
 * The signed-in customer's shared energy profile (F03). Anonymous visitors
 * keep theirs in the browser and merge it via /api/energy/profile/merge.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  return NextResponse.json({ profile: await loadProfile(session.user.id) }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Replace the stored profile. Anything not in the body is deleted. */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const parsed = profileSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'That profile could not be read.', issues: parsed.error.issues.slice(0, 5) }, { status: 400 })
  await saveProfile(session.user.id, parsed.data)
  return NextResponse.json({ profile: await loadProfile(session.user.id) })
}
