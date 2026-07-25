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
  email: string | null
  shippingAddress: string | null
  billingAddress: string | null
  date: string
  items: { name: string; qty: number; price: number }[]
  total: number
  paid: boolean
  paymentMethod: string | null
}

/** A self-contained, letter-sized HTML invoice — used for both the emailed
 *  copy and the in-browser "view / print" page. Prints cleanly on 8.5×11. */
export function buildInvoiceHtml(d: InvoiceData): string {
  const subtotal = d.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const discount = Math.max(0, subtotal - d.total)

  const rows = d.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:11px 0;border-bottom:1px solid #e8ece9;color:#1c2a25">${escapeHtml(i.name)}</td>
          <td style="padding:11px 0;border-bottom:1px solid #e8ece9;text-align:right;color:#5b655f">${fmt(i.price)}</td>
          <td style="padding:11px 0;border-bottom:1px solid #e8ece9;text-align:center;color:#5b655f">${i.qty}</td>
          <td style="padding:11px 0;border-bottom:1px solid #e8ece9;text-align:right;color:#1c2a25;font-weight:600">${fmt(i.price * i.qty)}</td>
        </tr>`,
    )
    .join('')

  const addressBlock = (label: string, value: string | null) =>
    value
      ? `<div style="margin-bottom:16px">
          <div style="color:#8a968c;text-transform:uppercase;font-size:9.5px;letter-spacing:.1em;font-weight:700">${label}</div>
          <div style="color:#1c2a25;margin-top:5px;white-space:pre-line">${escapeHtml(value)}</div>
        </div>`
      : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${d.orderNo}</title>
  <style>
    @page { size: letter; margin: 0; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #eef1ee; font-family: Arial, Helvetica, sans-serif; }
    @media print {
      html, body { background: #fff; }
      .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; }
    }
    .sheet {
      width: 8.5in;
      min-height: 11in;
      margin: 28px auto;
      background: #fff;
      box-shadow: 0 1px 3px rgba(20,30,24,.08), 0 12px 32px -16px rgba(20,30,24,.25);
    }
  </style></head>
  <body>
    <div class="sheet">
      <div style="background:linear-gradient(120deg,#173d29,#0d1714);padding:34px 46px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="color:#fff;font-size:21px;font-weight:800;letter-spacing:.01em">${BUSINESS.name}</div>
          <div style="color:#a9c2ae;font-size:11px;margin-top:4px;letter-spacing:.06em;text-transform:uppercase">Powering Progress</div>
        </div>
        <div style="text-align:right;color:#c9d8cd;font-size:11.5px;line-height:1.6">
          <div>${BUSINESS.location}</div>
          <div>${BUSINESS.phone}</div>
          <div>${BUSINESS.email}</div>
        </div>
      </div>

      <div style="padding:34px 46px 0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:26px;border-bottom:1px solid #e8ece9">
          <div>
            <div style="font-size:26px;font-weight:800;color:#0d1714;letter-spacing:-.01em">Receipt / Invoice</div>
            <div style="color:#8a968c;font-size:12.5px;margin-top:6px">${d.date}</div>
          </div>
          <div style="text-align:right">
            <div style="color:#173d29;font-size:16px;font-weight:800;letter-spacing:.02em">${d.orderNo}</div>
            <div style="color:#8a968c;font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-top:4px">Invoice / Order number</div>
            <div style="display:inline-block;margin-top:9px;padding:3px 11px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.04em;background:${d.paid ? '#e1f3e6' : '#fdeccd'};color:${d.paid ? '#1b7a49' : '#9a6b12'}">${d.paid ? 'PAID' : 'UNPAID'}</div>
          </div>
        </div>

        <div style="display:flex;gap:36px;padding:26px 0;border-bottom:1px solid #e8ece9">
          <div style="flex:1.1;min-width:0">
            ${addressBlock('Billed to', [d.customerName, d.billingAddress].filter(Boolean).join('\n'))}
            ${d.shippingAddress && d.shippingAddress !== d.billingAddress ? addressBlock('Ship to', d.shippingAddress) : ''}
            ${addressBlock('Contact', [d.email, d.contact].filter(Boolean).join(' · ') || null)}
          </div>
          <div style="width:230px;flex-shrink:0;background:#f5f8f5;border:1px solid #e8ece9;border-radius:12px;padding:18px 20px">
            <div style="display:flex;justify-content:space-between;font-size:12.5px;color:#5b655f;padding:5px 0">
              <span>Payment method</span>
              <span style="color:#1c2a25;font-weight:600">${d.paymentMethod ? (PAYMENT_LABEL[d.paymentMethod] ?? d.paymentMethod) : '—'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;color:#5b655f;padding:5px 0">
              <span>Status</span>
              <span style="color:${d.paid ? '#1b7a49' : '#9a6b12'};font-weight:700">${d.paid ? 'Paid' : 'Unpaid'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding-top:11px;margin-top:6px;border-top:1px solid #e0e6e1">
              <span style="font-weight:800;color:#0d1714;font-size:13px">Total</span>
              <span style="font-weight:800;color:#0d1714;font-size:16px">${fmt(d.total)}</span>
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:22px">
          <thead><tr>
            <th style="text-align:left;padding:0 0 9px;border-bottom:2px solid #0d1714;color:#8a968c;font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700">Description</th>
            <th style="text-align:right;padding:0 0 9px;border-bottom:2px solid #0d1714;color:#8a968c;font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700">Price</th>
            <th style="text-align:center;padding:0 0 9px;border-bottom:2px solid #0d1714;color:#8a968c;font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700">Qty</th>
            <th style="text-align:right;padding:0 0 9px;border-bottom:2px solid #0d1714;color:#8a968c;font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700">Amount</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <table style="width:100%;margin-top:4px;font-size:13px"><tr>
          <td></td>
          <td style="text-align:right;width:230px;padding-top:14px">
            <div style="display:flex;justify-content:space-between;padding:5px 0;color:#5b655f">
              <span>Subtotal</span><span>${fmt(subtotal)}</span>
            </div>
            ${discount > 0.5 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#1b7a49"><span>You save</span><span>-${fmt(discount)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:6px;border-top:2px solid #0d1714">
              <span style="font-weight:800;color:#0d1714">Total</span>
              <span style="font-weight:800;color:#0d1714;font-size:17px">${fmt(d.total)}</span>
            </div>
          </td>
        </tr></table>

        <div style="margin-top:52px;padding:20px 0 30px;border-top:1px solid #e8ece9;color:#8a968c;font-size:11.5px;text-align:center">
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
  const email = order.user?.email ?? order.email ?? null
  return {
    data: {
      orderNo: order.orderNo,
      customerName: order.customerName,
      contact: order.contact ?? order.phone,
      email,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      date: new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      items: order.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      total: order.total,
      paid: order.paid,
      paymentMethod: order.paymentMethod,
    },
    email,
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
