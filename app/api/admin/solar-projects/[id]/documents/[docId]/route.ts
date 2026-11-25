import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { deleteAdminFile, signedUrl } from '@/lib/storage'

/** GET — open a project document (signed link). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id, docId } = await params
  const doc = await prisma.solarProjectDocument.findFirst({ where: { id: docId, projectId: id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.url) return NextResponse.redirect(doc.url)
  const url = await signedUrl(doc.path, 600)
  return url ? NextResponse.redirect(url) : NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })
}

/** PATCH — show or hide a document from the customer. DELETE — remove it. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id, docId } = await params
  const j = await request.json().catch(() => null)
  const r = await prisma.solarProjectDocument.updateMany({ where: { id: docId, projectId: id }, data: { customerVisible: Boolean(j?.customerVisible) } })
  return r.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id, docId } = await params
  const doc = await prisma.solarProjectDocument.findFirst({ where: { id: docId, projectId: id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.solarProjectDocument.delete({ where: { id: doc.id } })
  if (doc.path) await deleteAdminFile(doc.path).catch(() => {})
  return NextResponse.json({ ok: true })
}
