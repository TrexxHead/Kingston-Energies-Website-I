import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { profileSchema, mergeProfiles } from '@/lib/energy/profileSchema'
import { loadProfile, saveProfile } from '@/lib/energy/profileStore.server'

/**
 * Merge an anonymous browser profile into the signed-in account without
 * duplicating equipment (see mergeProfiles). Safe to call repeatedly with
 * the same local profile — clientIds make it idempotent.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const parsed = profileSchema.safeParse((await request.json().catch(() => null))?.local)
  if (!parsed.success) return NextResponse.json({ error: 'That profile could not be read.' }, { status: 400 })
  const server = await loadProfile(session.user.id)
  const merged = mergeProfiles(server, parsed.data)
  await saveProfile(session.user.id, merged.profile)
  return NextResponse.json({ profile: await loadProfile(session.user.id), added: merged.added, skippedDuplicates: merged.skippedDuplicates })
}
