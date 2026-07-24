import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { buildInvoiceHtml, invoiceDataForOrder, issueInvoiceForOrder } from '@/lib/invoice'

/** View the invoice as a printable HTML page. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const info = await invoiceDataForOrder(id)
  if (!info) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return new Response(buildInvoiceHtml(info.data), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/** Email the invoice to the customer (manual send). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const result = await issueInvoiceForOrder(id)
  return NextResponse.json(result)
}
