import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { deleteProperty } from '@/lib/energy/profileStore.server'

/** Delete a property and, by cascade, its devices, measurements, scenarios and saved calculation runs. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const { clientId } = await params
  const deleted = await deleteProperty(session.user.id, clientId)
  if (!deleted) return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
  return NextResponse.json({ deleted: true })
}
