import { fmt } from '@/lib/catalog'

/**
 * Transactional email seam.
 *
 * If EMAIL_API_KEY + EMAIL_FROM are set, order confirmations are sent via the
 * Resend REST API (https://resend.com — no SDK dependency, just fetch). Without
 * them, this no-ops gracefully so checkout still works in development / before
 * an email provider is chosen. Swap the transport in `deliver()` for any provider.
 */

interface OrderEmailInput {
  to: string
  customerName: string
  orderNo: string
  total: number
  items: { name: string; qty: number; price: number }[]
}

const FROM = process.env.EMAIL_FROM // e.g. "Kingston Energies <orders@kingstonenergies.com>"
const API_KEY = process.env.EMAIL_API_KEY

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY && FROM)
}

export async function sendOrderConfirmation(input: OrderEmailInput): Promise<void> {
  const subject = `Your Kingston Energies order ${input.orderNo}`
  const html = renderOrderHtml(input)

  if (!isEmailConfigured()) {
    // Visible in server logs so it's obvious an email *would* have been sent.
    console.info(`[email] skipped (no provider configured): "${subject}" → ${input.to}`)
    return
  }

  try {
    await deliver({ to: input.to, subject, html })
  } catch (err) {
    // Never let email failure break the order flow.
    console.error('[email] failed to send order confirmation:', err)
  }
}

async function deliver({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    throw new Error(`Email provider returned ${res.status}: ${await res.text()}`)
  }
}

function renderOrderHtml(input: OrderEmailInput): string {
  const rows = input.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#1c2a25">${i.name} × ${i.qty}</td><td style="padding:6px 0;text-align:right;color:#1c2a25">${fmt(
          i.price * i.qty
        )}</td></tr>`
    )
    .join('')

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1c2a25">
    <div style="background:linear-gradient(135deg,#04547c,#1c4a44);padding:28px 24px;border-radius:16px 16px 0 0">
      <div style="color:#fff;font-size:20px;font-weight:800">Kingston Energies</div>
      <div style="color:rgba(234,242,236,.8);font-size:13px;margin-top:4px">Order confirmed</div>
    </div>
    <div style="border:1px solid #e2e8e4;border-top:none;padding:24px;border-radius:0 0 16px 16px">
      <p>Hi ${input.customerName}, thanks for your order.</p>
      <p style="font-size:14px;color:#556059">Order number <strong style="color:#1c2a25">${input.orderNo}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px">${rows}
        <tr><td style="padding:12px 0 0;border-top:1px solid #e2e8e4;font-weight:700">Total</td>
        <td style="padding:12px 0 0;border-top:1px solid #e2e8e4;text-align:right;font-weight:700">${fmt(input.total)}</td></tr>
      </table>
      <p style="font-size:13px;color:#556059;margin-top:20px">We'll let you know when it's on the way. Track your order any time at kingstonenergies.com/track.</p>
    </div>
  </div>`
}
