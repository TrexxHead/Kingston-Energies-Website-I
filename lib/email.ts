import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kingstonenergies.com'
const logoUrl = `${siteUrl}/images/logo-mark.png`

/** Shared branded header for every transactional email — logo, wordmark,
 *  slogan, and a status line specific to the email (e.g. "Order confirmed").
 *  Deliberately a different gradient/layout from the invoice header so the
 *  two don't read as the same document. */
function emailHeader(status: string): string {
  return `
    <div style="background:linear-gradient(135deg,#04547c,#1c4a44);padding:26px 24px;border-radius:16px 16px 0 0">
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
        <td style="vertical-align:middle;padding-right:12px"><img src="${logoUrl}" width="38" height="38" alt="" style="display:block" /></td>
        <td style="vertical-align:middle">
          <div style="color:#fff;font-size:19px;font-weight:800">Kingston Energies</div>
          <div style="color:rgba(234,242,236,.75);font-size:10.5px;margin-top:2px;letter-spacing:.02em">Powering Progress, <span style="font-style:italic">Charging Initiatives</span></div>
        </td>
      </tr></table>
      <div style="color:rgba(234,242,236,.9);font-size:13px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.14)">${status}</div>
    </div>`
}

/**
 * Wrap arbitrary email body HTML in the standard Kingston Energies branded
 * shell (logo, wordmark, slogan, status line). Use this for every outgoing
 * email — order updates, cancellations, campaigns, NPS invites — so nothing
 * goes out as plain unbranded text.
 */
export function wrapEmailHtml(status: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1c2a25">
    ${emailHeader(status)}
    <div style="border:1px solid #e2e8e4;border-top:none;padding:24px;border-radius:0 0 16px 16px">
      ${bodyHtml}
    </div>
  </div>`
}

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

interface VerificationEmailInput {
  to: string
  name: string
  verifyUrl: string
}

interface PasswordResetEmailInput {
  to: string
  name: string
  resetUrl: string
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

/**
 * Alert every admin account (plus ADMIN_EMAIL, if it's not one of them
 * already) the moment a new order is placed, so orders that need manual
 * follow-up — bank transfer, Lynk, PayPal, cash on delivery — get seen
 * promptly instead of waiting for someone to check the dashboard.
 * Best-effort: never throws, never blocks the checkout response.
 */
export async function sendNewOrderAlert(input: {
  orderNo: string
  customerName: string
  total: number
  paymentMethod: string | null
  items: { name: string; qty: number; price: number }[]
}): Promise<void> {
  if (!isEmailConfigured()) {
    console.info(`[email] skipped new-order alert for ${input.orderNo} (no provider configured)`)
    return
  }

  let adminEmails: string[] = []
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { email: true },
    })
    adminEmails = admins.map((a) => a.email)
  } catch (err) {
    console.error('[email] failed to load admin recipients:', err)
  }
  const envAdmin = process.env.ADMIN_EMAIL
  const recipients = Array.from(new Set([...adminEmails, ...(envAdmin ? [envAdmin] : [])])).filter(Boolean)
  if (recipients.length === 0) return

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kingstonenergies.com'
  const rows = input.items
    .map(
      (i) =>
        `<tr><td style="padding:5px 0;color:#1c2a25">${escapeHtml(i.name)} × ${i.qty}</td><td style="padding:5px 0;text-align:right;color:#1c2a25">${fmt(i.price * i.qty)}</td></tr>`,
    )
    .join('')

  const html = wrapEmailHtml(
    'New order placed',
    `<p><strong>${escapeHtml(input.customerName)}</strong> just placed order <strong>${input.orderNo}</strong>.</p>` +
      `<table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:13.5px">${rows}
        <tr><td style="padding:8px 0 0;border-top:1px solid #e2e8e4;font-weight:700">Total</td>
        <td style="padding:8px 0 0;border-top:1px solid #e2e8e4;text-align:right;font-weight:700">${fmt(input.total)}</td></tr>
      </table>` +
      `<p style="font-size:12.5px;color:#556059;margin-top:14px">Payment method: ${escapeHtml(input.paymentMethod ?? '—')}</p>` +
      `<a href="${site}/admin/dashboard" style="display:inline-block;margin-top:12px;background:#1f6b45;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:600;font-size:13px">Open admin dashboard</a>`,
  )

  try {
    await Promise.all(recipients.map((to) => deliver({ to, subject: `New order ${input.orderNo} — ${fmt(input.total)}`, html })))
  } catch (err) {
    console.error('[email] failed to send new-order alert:', err)
  }
}

export async function sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
  const subject = 'Confirm your Kingston Energies account'
  const html = renderVerificationHtml(input)

  if (!isEmailConfigured()) {
    // Dev fallback: print the link so signup is testable without an email provider configured.
    console.info(`[email] skipped (no provider configured): "${subject}" → ${input.to}\n  verify link: ${input.verifyUrl}`)
    return
  }

  try {
    await deliver({ to: input.to, subject, html })
  } catch (err) {
    console.error('[email] failed to send verification email:', err)
  }
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  const subject = 'Reset your Kingston Energies password'
  const html = renderPasswordResetHtml(input)

  if (!isEmailConfigured()) {
    // Dev fallback: print the link so reset is testable without an email provider configured.
    console.info(`[email] skipped (no provider configured): "${subject}" → ${input.to}\n  reset link: ${input.resetUrl}`)
    return
  }

  try {
    await deliver({ to: input.to, subject, html })
  } catch (err) {
    console.error('[email] failed to send password reset email:', err)
  }
}

/** Send an invoice email. Returns whether it actually went out. */
export async function sendInvoiceEmail(input: { to: string; orderNo: string; html: string }): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.info(`[email] skipped invoice ${input.orderNo} (no provider configured) → ${input.to}`)
    return false
  }
  try {
    await deliver({ to: input.to, subject: `Invoice ${input.orderNo} — Kingston Energies`, html: input.html })
    return true
  } catch (err) {
    console.error('[email] failed to send invoice:', err)
    return false
  }
}

/**
 * Send a campaign email to many recipients. Best-effort per recipient; returns
 * how many were accepted. No-ops (returns 0) when no provider is configured.
 */
export async function sendBulkEmail(recipients: string[], subject: string, html: string): Promise<number> {
  if (!isEmailConfigured()) {
    console.info(`[email] skipped campaign "${subject}" (no provider) → ${recipients.length} recipients`)
    return 0
  }
  let sent = 0
  for (const to of recipients) {
    try {
      await deliver({ to, subject, html })
      sent++
    } catch (err) {
      console.error(`[email] campaign send failed for ${to}:`, err)
    }
  }
  return sent
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
    ${emailHeader('Order confirmed')}
    <div style="border:1px solid #e2e8e4;border-top:none;padding:24px;border-radius:0 0 16px 16px">
      <p>Hi ${input.customerName}, thanks for your order.</p>
      <p style="font-size:14px;color:#556059">Order number <strong style="color:#1c2a25">${input.orderNo}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px">${rows}
        <tr><td style="padding:12px 0 0;border-top:1px solid #e2e8e4;font-weight:700">Total</td>
        <td style="padding:12px 0 0;border-top:1px solid #e2e8e4;text-align:right;font-weight:700">${fmt(input.total)}</td></tr>
      </table>
      <p style="font-size:13px;color:#556059;margin-top:20px">We'll let you know when it's on the way. Track your order any time at kingstonenergies.com/track.</p>
      <div style="margin-top:20px;padding:14px 16px;background:#f2f7f3;border-radius:12px">
        <div style="font-weight:700;font-size:13px;color:#1c2a25">Your warranty &amp; returns</div>
        <p style="font-size:12.5px;color:#556059;margin:6px 0 0;line-height:1.5">Every item includes a <strong>14-day return window</strong> plus the manufacturer's warranty. Keep this email as proof of purchase — to make a claim, just reply or contact us at kingstonenergies.com. Care tips for your device are on each product page.</p>
      </div>
    </div>
  </div>`
}

function renderPasswordResetHtml(input: PasswordResetEmailInput): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1c2a25">
    ${emailHeader('Reset your password')}
    <div style="border:1px solid #e2e8e4;border-top:none;padding:24px;border-radius:0 0 16px 16px">
      <p>Hi ${input.name}, we got a request to reset your password.</p>
      <p style="font-size:14px;color:#556059">Click below to choose a new one. If you didn't ask for this, you can safely ignore this email — your password won't change.</p>
      <a href="${input.resetUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1c4a44;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px">Reset my password</a>
      <p style="font-size:12px;color:#8a938d;margin-top:20px">This link expires in 1 hour.</p>
    </div>
  </div>`
}

function renderVerificationHtml(input: VerificationEmailInput): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1c2a25">
    ${emailHeader('Confirm your account')}
    <div style="border:1px solid #e2e8e4;border-top:none;padding:24px;border-radius:0 0 16px 16px">
      <p>Hi ${input.name}, welcome to Kingston Energies.</p>
      <p style="font-size:14px;color:#556059">Confirm your email address to activate your account and start tracking orders.</p>
      <a href="${input.verifyUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1c4a44;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px">Confirm my email</a>
      <p style="font-size:12px;color:#8a938d;margin-top:20px">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
    </div>
  </div>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
