import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, signedUrl, uploadAdminFile } from '@/lib/storage'

const linkSchema = z.object({
  title: z.string().min(1).max(160),
  url: z.string().url().max(2000),
  category: z.string().max(60).optional(),
})

// 20 MB ceiling — comfortable for policies, manuals and scans.
const MAX_BYTES = 20 * 1024 * 1024

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  let documents: {
    id: string
    title: string
    url: string | null
    storagePath: string | null
    fileName: string | null
    category: string | null
    createdAt: Date
  }[] = []
  try {
    documents = await prisma.policyDoc.findMany({ orderBy: { createdAt: 'desc' } })
  } catch {
    // DB unavailable — return an empty list rather than erroring the dashboard.
  }

  const out = await Promise.all(
    documents.map(async (d) => ({
      id: d.id,
      title: d.title,
      // For uploaded files, hand back a short-lived signed URL; for links, the URL itself.
      url: d.storagePath ? await signedUrl(d.storagePath) : d.url,
      isFile: Boolean(d.storagePath),
      fileName: d.fileName,
      category: d.category,
      date: new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    })),
  )

  // Folders = the admin-managed list (incl. empty folders) plus any categories
  // already used by documents, de-duplicated and sorted.
  let stored: string[] = []
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'docFolders' } })
    if (row) stored = JSON.parse(row.value) as string[]
  } catch {
    // ignore
  }
  const used = out.map((d) => d.category).filter((c): c is string => Boolean(c))
  const folders = Array.from(new Set([...stored, ...used])).sort((a, b) => a.localeCompare(b))

  return NextResponse.json({ documents: out, storageEnabled: isStorageConfigured(), folders })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const contentType = request.headers.get('content-type') ?? ''

  // ---- File upload (multipart/form-data) ----
  if (contentType.includes('multipart/form-data')) {
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: 'File storage is not set up yet. Add a document link instead, or configure Supabase Storage.' },
        { status: 503 },
      )
    }
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    const title = String(form?.get('title') ?? '').trim()
    const category = String(form?.get('category') ?? '').trim()

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'That file is over the 20 MB limit.' }, { status: 400 })
    }

    const path = buildPath('documents', file.name)
    try {
      await uploadAdminFile(path, await file.arrayBuffer(), file.type || 'application/octet-stream')
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 500 })
    }

    const doc = await prisma.policyDoc.create({
      data: {
        title: title || file.name,
        storagePath: path,
        fileName: file.name,
        category: category || null,
      },
    })
    return NextResponse.json({ id: doc.id }, { status: 201 })
  }

  // ---- Link (JSON) ----
  const parsed = linkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Provide a title and a valid URL.' }, { status: 400 })
  }
  const { title, url, category } = parsed.data
  const doc = await prisma.policyDoc.create({ data: { title, url, category: category ?? null } })
  return NextResponse.json({ id: doc.id }, { status: 201 })
}
