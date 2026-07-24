import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import { sendInvoiceEmail } from '@/lib/email'

const BUSINESS = {
  name: 'Kingston Energies',
  email: 'kingstonenergygroup@outlook.com',
  phone: '876-338-9958',
  location: 'Kingston, Jamaica',
}

const PAYMENT_LABEL: Record<string, string> = {
  bank: 'Bank transfer', lynk: 'Lynk', paypal: 'PayPal', card: 'Card', cod: 'Cash on delivery',
}

export interface InvoiceData {
  orderNo: string
  customerName: string
  contact: string | null
  date: string
  items: { name: string; qty: number; price: number }[]
  total: number
  paid: boolean
  paymentMethod: string | null
}

/** A self-contained HTML invoice — used for both the emailed copy and the
 *  in-browser "view / print" page. */
export function buildInvoiceHtml(d: InvoiceData): string {
  const rows = d.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1c2a25">${i.name}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;color:#5b655f">${i.qty}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:#5b655f">${fmt(i.price)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:#1c2a25;font-weight:600">${fmt(i.price * i.qty)}</td>
        </tr>`,
    )
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${d.orderNo}</title></head>
  <body style="margin:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6ebe8">
      <div style="background:linear-gradient(135deg,#04547c,#1c4a44);padding:26px 30px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="color:#fff;font-size:20px;font-weight:800">${BUSINESS.name}</div>
          <div style="color:rgba(234,242,236,.8);font-size:12px;margin-top:4px">${BUSINESS.location} · ${BUSINESS.phone}</div>
        </div>
        <div style="text-align:right">
          <div style="color:#fff;font-size:15px;font-weight:700;letter-spacing:.05em">INVOICE</div>
          <div style="display:inline-block;margin-top:6px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${d.paid ? '#d7f5e3' : '#fdeccd'};color:${d.paid ? '#1b7a49' : '#9a6b12'}">${d.paid ? 'PAID' : 'UNPAID'}</div>
        </div>
      </div>

      <div style="padding:26px 30px">
        <table style="width:100%;font-size:13px;color:#5b655f;margin-bottom:20px"><tr>
          <td style="vertical-align:top">
            <div style="color:#98a29b;text-transform:uppercase;font-size:10px;letter-spacing:.1em">Billed to</div>
            <div style="color:#1c2a25;font-weight:600;margin-top:4px">${escapeHtml(d.customerName)}</div>
            ${d.contact ? `<div style="margin-top:2px">${escapeHtml(d.contact)}</div>` : ''}
          </td>
          <td style="vertical-align:top;text-align:right">
            <div style="color:#98a29b;text-transform:uppercase;font-size:10px;letter-spacing:.1em">Invoice #</div>
            <div style="color:#1c2a25;font-weight:600;margin-top:4px">${d.orderNo}</div>
            <div style="margin-top:6px;color:#98a29b;text-transform:uppercase;font-size:10px;letter-spacing:.1em">Date</div>
            <div style="margin-top:4px">${d.date}</div>
          </td>
        </tr></table>

        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #1c2a25;color:#98a29b;font-size:10px;letter-spacing:.1em;text-transform:uppercase">Item</th>
            <th style="text-align:center;padding:8px 0;border-bottom:2px solid #1c2a25;color:#98a29b;font-size:10px;letter-spacing:.1em;text-transform:uppercase">Qty</th>
            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #1c2a25;color:#98a29b;font-size:10px;letter-spacing:.1em;text-transform:uppercase">Price</th>
            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #1c2a25;color:#98a29b;font-size:10px;letter-spacing:.1em;text-transform:uppercase">Amount</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <table style="width:100%;margin-top:18px;font-size:14px"><tr>
          <td></td>
          <td style="text-align:right;width:220px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:2px solid #1c2a25;margin-top:6px">
              <span style="font-weight:800;color:#1c2a25">Total</span>
              <span style="font-weight:800;color:#1c2a25;font-size:18px">${fmt(d.total)}</span>
            </div>
            ${d.paymentMethod ? `<div style="text-align:right;color:#98a29b;font-size:11px;margin-top:4px">Payment: ${PAYMENT_LABEL[d.paymentMethod] ?? d.paymentMethod}</div>` : ''}
          </td>
        </tr></table>

        <div style="margin-top:26px;padding-top:18px;border-top:1px solid #eee;color:#98a29b;font-size:12px;text-align:center">
          Thank you for your business — ${BUSINESS.name} · ${BUSINESS.email}
        </div>
      </div>
    </div>
  </body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/** Load an order and turn it into invoice data. */
export async function invoiceDataForOrder(orderId: string): Promise<{ data: InvoiceData; email: string | null } | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true } } },
  })
  if (!order) return null
  return {
    data: {
      orderNo: order.orderNo,
      customerName: order.customerName,
      contact: order.contact,
      date: new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      items: order.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      total: order.total,
      paid: order.paid,
      paymentMethod: order.paymentMethod,
    },
    email: order.user?.email ?? null,
  }
}

/**
 * Issue (email) an invoice for an order and stamp invoicedAt. Best-effort:
 * returns whether it was emailed and to whom. Used by the manual "Send invoice"
 * button and by the auto-send when an order is marked paid.
 */
export async function issueInvoiceForOrder(orderId: string): Promise<{ sent: boolean; to: string | null }> {
  const info = await invoiceDataForOrder(orderId)
  if (!info) return { sent: false, to: null }

  let sent = false
  if (info.email) {
    const html = buildInvoiceHtml(info.data)
    sent = await sendInvoiceEmail({ to: info.email, orderNo: info.data.orderNo, html })
  }
  await prisma.order.update({ where: { id: orderId }, data: { invoicedAt: new Date() } }).catch(() => {})
  return { sent, to: info.email }
}
