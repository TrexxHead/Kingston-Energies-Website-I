import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { sendBulkEmail } from '@/lib/email'

function campaignHtml(subject: string, body: string): string {
  const paras = body.split('\n').filter(Boolean).map((p) => `<p style="margin:0 0 14px;color:#1c2a25;line-height:1.6">${escapeHtml(p)}</p>`).join('')
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c2a25">
    <div style="background:linear-gradient(135deg,#04547c,#1c4a44);padding:24px 26px;border-radius:16px 16px 0 0">
      <div style="color:#fff;font-size:20px;font-weight:800">Kingston Energies</div>
    </div>
    <div style="padding:26px;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(subject)}</h1>
      ${paras}
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kingstonenergies.com'}/shop" style="display:inline-block;margin-top:8px;background:#1f6b45;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Shop now</a>
    </div>
  </div>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/**
 * Action a campaign. EMAIL sends for real to verified customers via Resend.
 * Other channels (SMS/PUSH/SOCIAL) are marked sent for tracking — the actual
 * delivery runs through your external tooling (n8n / WhatsApp / social).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  let recipientCount = 0
  let note = ''

  if (campaign.channel === 'EMAIL') {
    if (!campaign.subject || !campaign.body) {
      return NextResponse.json({ error: 'Add a subject and body before sending.' }, { status: 400 })
    }
    // Real, verified customer emails (skip seeded example.com contacts).
    const recipients = await prisma.user.findMany({
      where: { emailVerified: { not: null }, NOT: { email: { contains: 'example' } } },
      select: { email: true },
    })
    const emails = recipients.map((r) => r.email)
    recipientCount = await sendBulkEmail(emails, campaign.subject, campaignHtml(campaign.subject, campaign.body))
    note = recipientCount > 0 ? `Emailed ${recipientCount} customers.` : 'No emails sent (check Resend is configured and you have verified customers).'
  } else {
    note = `${campaign.channel} campaigns are actioned via your external tooling (n8n / WhatsApp / social). Marked as sent.`
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: 'SENT', sentAt: new Date(), recipientCount },
  })

  return NextResponse.json({ ok: true, recipientCount, note })
}
