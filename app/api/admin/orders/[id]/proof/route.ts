import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { signedUrl } from '@/lib/storage'

/** Redirect to a short-lived signed URL for a customer's uploaded proof of payment. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, select: { proofOfPaymentPath: true } })
  if (!order?.proofOfPaymentPath) return NextResponse.json({ error: 'No proof of payment on file.' }, { status: 404 })

  const url = await signedUrl(order.proofOfPaymentPath)
  if (!url) return NextResponse.json({ error: 'Could not generate a link — storage may be unavailable.' }, { status: 503 })

  return NextResponse.redirect(url)
}
