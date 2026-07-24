import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { buildInvoiceHtml, invoiceDataForOrder } from '@/lib/invoice'

/** Customer-facing invoice: printable HTML for an order the caller owns. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, select: { userId: true } })
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const info = await invoiceDataForOrder(id)
  if (!info) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return new Response(buildInvoiceHtml(info.data), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
