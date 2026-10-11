import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, signedUrl, uploadAdminFile } from '@/lib/storage'
import { compressImageToLimit, isCompressibleImage, MAX_UPLOAD_BYTES } from '@/lib/imageCompress'
import { logActivity } from '@/lib/activityLog'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

/** Redirect to a short-lived signed URL for an order's uploaded proof of payment. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, select: { proofOfPaymentPath: true } })
  if (!order?.proofOfPaymentPath) return NextResponse.json({ error: 'No proof of payment on file.' }, { status: 404 })

  const url = await signedUrl(order.proofOfPaymentPath)
  if (!url) return NextResponse.json({ error: 'Could not generate a link. Storage may be unavailable.' }, { status: 503 })

  return NextResponse.redirect(url)
}

/**
 * Attach proof of payment on the customer's behalf — e.g. they sent a
 * screenshot over WhatsApp instead of uploading it themselves. Overwrites
 * whatever was there before, same as a customer re-uploading.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, orderNo: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: 'File storage is not set up. Add the Supabase storage keys first.' }, { status: 503 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Choose a file to attach.' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Upload a JPEG, PNG, WEBP, GIF or PDF.' }, { status: 400 })

  let bytes: Buffer = Buffer.from(await file.arrayBuffer())
  let contentType = file.type
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    if (!isCompressibleImage(contentType)) return NextResponse.json({ error: 'That file is over 5MB. Compress it first.' }, { status: 400 })
    const compressed = await compressImageToLimit(bytes, contentType).catch(() => null)
    if (!compressed || compressed.buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'That image is over 5MB and could not be compressed enough.' }, { status: 400 })
    }
    bytes = compressed.buffer
    contentType = compressed.contentType
  }

  const path = buildPath(`proof-of-payment/${order.id}`, file.name)
  await uploadAdminFile(path, bytes, contentType)

  await prisma.order.update({ where: { id: order.id }, data: { proofOfPaymentPath: path, proofOfPaymentAt: new Date() } })

  logActivity({
    label: `Proof of payment attached to ${order.orderNo}`,
    detail: 'Uploaded by an admin',
    entity: 'order',
    entityId: order.id,
    actorEmail: session.user?.email ?? null,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
