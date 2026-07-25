import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, uploadPublicImage } from '@/lib/storage'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

/**
 * Upload one or more product images to the public bucket and return their
 * permanent public URLs. Used by the Inventory CMS image manager (drag & drop).
 */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'Image storage is not set up. Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, and create a public "product-images" bucket. You can still paste image URLs.' },
      { status: 503 },
    )
  }

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 })

  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })

  const urls: string[] = []
  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: `${file.name}: only JPEG, PNG, WEBP, GIF or AVIF images are allowed.` }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `${file.name} is over the 8 MB limit.` }, { status: 400 })
    }
    const path = buildPath('products', file.name)
    try {
      const url = await uploadPublicImage(path, await file.arrayBuffer(), file.type)
      urls.push(url)
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 500 })
    }
  }

  return NextResponse.json({ urls }, { status: 201 })
}
