import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, uploadAdminFile } from '@/lib/storage'
import { compressImageToLimit, isCompressibleImage, MAX_UPLOAD_BYTES } from '@/lib/imageCompress'
import { DOC_KINDS } from '@/lib/solarProjects'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

/** POST — attach a document: multipart (file, kind, name, customerVisible) or JSON ({ url, kind, name, customerVisible }). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const project = await prisma.solarProject.findUnique({ where: { id }, select: { id: true, projectNo: true } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isJson = (request.headers.get('content-type') ?? '').includes('application/json')
  let kind = 'other'
  let name = ''
  let visible = true
  let path: string | null = null
  let url: string | null = null
  if (isJson) {
    const j = await request.json().catch(() => null)
    url = typeof j?.url === 'string' && /^https:\/\//.test(j.url) ? j.url.slice(0, 1000) : null
    if (!url) return NextResponse.json({ error: 'Paste an https:// link.' }, { status: 400 })
    kind = j.kind
    name = String(j.name ?? '').trim()
    visible = j.customerVisible !== false
  } else {
    if (!isStorageConfigured()) return NextResponse.json({ error: 'File storage is not set up. Add the Supabase storage keys, or attach a link instead.' }, { status: 503 })
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Choose a file.' }, { status: 400 })
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Upload a PDF, JPEG, PNG or WEBP.' }, { status: 400 })
    let bytes: Buffer = Buffer.from(await file.arrayBuffer())
    let type = file.type
    if (bytes.byteLength > MAX_UPLOAD_BYTES) {
      if (!isCompressibleImage(type)) return NextResponse.json({ error: 'That file is over 5 MB.' }, { status: 400 })
      const c = await compressImageToLimit(bytes, type)
      bytes = c.buffer
      type = c.contentType
    }
    kind = String(form?.get('kind') ?? 'other')
    name = String(form?.get('name') ?? '').trim() || file.name
    visible = form?.get('customerVisible') !== 'false'
    path = await uploadAdminFile(buildPath(`solar-projects/${project.projectNo}`, file.name), bytes, type)
  }
  if (!(kind in DOC_KINDS)) kind = 'other'
  if (!name) name = DOC_KINDS[kind as keyof typeof DOC_KINDS]
  const doc = await prisma.solarProjectDocument.create({ data: { projectId: project.id, kind, name: name.slice(0, 160), path, url, customerVisible: visible, uploadedBy: session.user?.email ?? null } })
  return NextResponse.json({ document: doc }, { status: 201 })
}
