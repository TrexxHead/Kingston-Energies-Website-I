import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { buildPath, isStorageConfigured, uploadAdminFile } from '@/lib/storage'
import { compressImageToLimit, isCompressibleImage, MAX_UPLOAD_BYTES } from '@/lib/imageCompress'
import { sendProofOfPaymentAlert } from '@/lib/email'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

/**
 * Customer uploads proof of payment for an order they own. Images over the
 * 5 MB limit are re-compressed automatically; other file types over the limit
 * are rejected with a clear message (we can't safely compress a PDF here).
 * Stored in the private admin bucket — only ever opened via a signed URL from
 * the admin dashboard.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(`proof:${clientIp(request)}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please try again in a moment.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: 'File uploads are not set up yet. Please email your proof of payment instead.' }, { status: 503 })
  }

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, select: { userId: true, orderNo: true, customerName: true } })
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Please upload a JPEG, PNG, WEBP, GIF or PDF file.' }, { status: 400 })
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer())
  let contentType = file.type

  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    if (!isCompressibleImage(contentType)) {
      return NextResponse.json({ error: 'That PDF is over 5 MB. Please compress it or upload a photo instead.' }, { status: 400 })
    }
    const compressed = await compressImageToLimit(bytes, contentType).catch(() => null)
    if (!compressed || compressed.buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'That image is over 5 MB and could not be compressed enough. Please try a smaller photo.' }, { status: 400 })
    }
    bytes = compressed.buffer
    contentType = compressed.contentType
  }

  const path = buildPath(`proof-of-payment/${id}`, file.name)
  try {
    await uploadAdminFile(path, bytes, contentType)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 500 })
  }

  await prisma.order.update({ where: { id }, data: { proofOfPaymentPath: path, proofOfPaymentAt: new Date() } })

  void sendProofOfPaymentAlert({ orderNo: order.orderNo, customerName: order.customerName })

  return NextResponse.json({ ok: true })
}
