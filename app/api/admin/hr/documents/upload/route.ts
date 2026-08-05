import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, unauthorized, AdminAuthError } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, uploadAdminFile } from '@/lib/storage'

// 25 MB ceiling — contracts, scans, exports; comfortable without inviting misuse.
const MAX_BYTES = 25 * 1024 * 1024

export async function POST(request: Request) {
  let session
  try {
    session = await requireAdmin()
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized()
    throw e
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: 'File storage is not set up yet. Configure Supabase Storage to upload documents.' }, { status: 503 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected a file upload.' }, { status: 400 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const folderId = String(form?.get('folderId') ?? '') || null
  const ownerId = String(form?.get('ownerId') ?? '') || null
  const name = String(form?.get('name') ?? '').trim()

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That file is over the 25 MB limit.' }, { status: 400 })
  }

  const path = buildPath('hr/documents', file.name)
  try {
    await uploadAdminFile(path, await file.arrayBuffer(), file.type || 'application/octet-stream')
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 500 })
  }

  const doc = await prisma.hrDocument.create({
    data: {
      folderId,
      ownerId,
      name: name || file.name,
      storagePath: path,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploadedBy: session.user?.email ?? session.user?.name ?? null,
    },
  })

  return NextResponse.json({ id: doc.id }, { status: 201 })
}
