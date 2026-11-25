import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { customerProject } from '@/lib/solarProjects.server'
import { signedUrl } from '@/lib/storage'

/** GET — a short-lived link to one of the customer's own project documents. */
export async function GET(_request: Request, { params }: { params: Promise<{ projectNo: string; docId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { projectNo, docId } = await params
  const p = await customerProject({ id: session.user.id, email: session.user.email }, projectNo)
  const doc = p?.documents.find((d) => d.id === docId)
  if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  if (doc.url) return NextResponse.redirect(doc.url)
  const url = await signedUrl(doc.path, 600)
  if (!url) return NextResponse.json({ error: 'The document isn’t available right now.' }, { status: 503 })
  return NextResponse.redirect(url)
}
