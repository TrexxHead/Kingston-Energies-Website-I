import { prisma } from '@/lib/prisma'
import { buildInvoiceHtml, invoiceDataForOrder } from '@/lib/invoice'
import { checkInvoiceLink } from '@/lib/invoiceLink'
import { clientIp, rateLimit } from '@/lib/rateLimit'

/**
 * The invoice/receipt a customer opens from a shared link (WhatsApp, SMS):
 * no account needed, but only with a valid, unexpired signed link for that
 * order (lib/invoiceLink.ts). Never indexed or cached.
 */
const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
}

function notice(title: string, body: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · Kingston Energies</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f3;font-family:Arial,Helvetica,sans-serif;color:#0d1714">
<div style="max-width:420px;padding:28px;text-align:center"><h1 style="font-size:22px;margin:0 0 10px">${title}</h1><p style="margin:0;line-height:1.5;color:#46534d">${body}</p></div></body></html>`
  return new Response(html, { status, headers: HEADERS })
}

export async function GET(request: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const rl = await rateLimit(`invoice-link:${clientIp(request)}`, 30, 60_000)
  if (!rl.ok) return notice('Too many requests', 'Please wait a minute and try again.', 429)

  const { orderNo: raw } = await params
  const orderNo = decodeURIComponent(raw).trim().toUpperCase()
  const url = new URL(request.url)
  const check = checkInvoiceLink(orderNo, url.searchParams.get('e'), url.searchParams.get('t'))
  if (check === 'expired') return notice('This link has expired', 'Message us on WhatsApp and we’ll send you a fresh link to your invoice.', 410)
  if (check !== 'ok') return notice('Invoice not found', 'This link isn’t valid. Please use the exact link we sent you, or message us for a new one.', 404)

  const order = await prisma.order.findUnique({ where: { orderNo }, select: { id: true } })
  const info = order ? await invoiceDataForOrder(order.id) : null
  if (!info) return notice('Invoice not found', 'We couldn’t find this order. Please message us and we’ll help.', 404)

  // The invoice is a fixed letter-size sheet: on a phone, show the whole page
  // fitted to the screen (like opening a PDF) instead of scrolling sideways.
  const html = buildInvoiceHtml(info.data).replace('content="width=device-width,initial-scale=1"', 'content="width=860"')
  return new Response(html, { headers: HEADERS })
}
