import { prisma } from '@/lib/prisma'
import { sendPersonalizedBulkEmail, wrapEmailHtml } from '@/lib/email'
import { filterSuppressed } from '@/lib/suppression'
import { segmentMembers } from '@/lib/segments'
import { unsubscribeToken } from '@/lib/unsubscribeToken'
import { postExpense } from '@/lib/ledger/post'
import type { SegmentCriteria } from '@/lib/segments'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kingstonenergies.com'

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function unsubscribeUrl(email: string): string {
  return `${siteUrl}/api/marketing/unsubscribe?email=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`
}

function campaignHtml(subject: string, body: string, recipientEmail: string): string {
  const paras = body.split('\n').filter(Boolean).map((p) => `<p style="margin:0 0 14px;color:#1c2a25;line-height:1.6">${escapeHtml(p)}</p>`).join('')
  return wrapEmailHtml(
    'Kingston Energies news',
    `<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(subject)}</h1>` +
      paras +
      `<a href="${siteUrl}/shop" style="display:inline-block;margin-top:8px;background:#1f6b45;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Shop now</a>` +
      `<p style="margin:22px 0 0;font-size:11.5px;color:#7a8983"><a href="${unsubscribeUrl(recipientEmail)}" style="color:#7a8983">Unsubscribe from marketing emails</a></p>`,
  )
}

/** Every subscriber-eligible email: verified accounts + guest-checkout emails — the audience when a campaign has no segment. */
async function allSubscriberEmails(): Promise<string[]> {
  const recipients = await prisma.user.findMany({
    where: { emailVerified: { not: null }, NOT: { email: { contains: 'example' } } },
    select: { email: true },
  })
  const guestOrders = await prisma.order.findMany({
    where: { userId: null, email: { not: null }, NOT: { email: { contains: 'example' } } },
    select: { email: true },
    distinct: ['email'],
  })
  return Array.from(new Set([...recipients.map((r) => r.email), ...guestOrders.map((g) => g.email as string)]))
}

/** The audience a campaign would send to right now — used both for the pre-send preview and the actual send. */
export async function campaignAudience(campaign: { segmentId: string | null; segment: { criteria: unknown } | null }): Promise<string[]> {
  const raw = campaign.segment
    ? await segmentMembers(campaign.segment.criteria as SegmentCriteria)
    : (await allSubscriberEmails()).map((email) => ({ id: email, email, name: null }))
  const emails = raw.map((m) => m.email)
  return filterSuppressed(emails)
}

export interface SendResult {
  recipientCount: number
  note: string
}

/**
 * Actions a campaign for real. EMAIL sends via Resend to its audience (a
 * segment if one's linked, otherwise every subscriber-eligible customer),
 * filtered against the suppression list, with a working per-recipient
 * unsubscribe link. Other channels are marked sent for tracking — delivery
 * runs through external tooling (n8n / WhatsApp / social), same as before.
 * Shared by the manual "Send now" button and the scheduled-send cron so
 * both paths behave identically.
 */
export async function sendCampaign(campaignId: string): Promise<SendResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { segment: { select: { criteria: true } } },
  })
  if (!campaign) throw new Error('Campaign not found')

  let recipientCount = 0
  let note = ''

  if (campaign.channel === 'EMAIL') {
    if (!campaign.subject || !campaign.body) {
      throw new Error('Add a subject and body before sending.')
    }
    const emails = await campaignAudience(campaign)
    recipientCount = await sendPersonalizedBulkEmail(emails, campaign.subject, (to) => campaignHtml(campaign.subject as string, campaign.body as string, to))
    note = recipientCount > 0 ? `Emailed ${recipientCount} customers.` : 'No emails sent (check Resend is configured and you have eligible, non-suppressed customers).'
  } else {
    note = `${campaign.channel} campaigns are actioned via your external tooling (n8n / WhatsApp / social). Marked as sent.`
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'SENT', sentAt: new Date(), recipientCount },
  })

  // A spend figure entered before sending is now a real cost incurred, so
  // it's logged as an actual Expense and posted to the ledger — Marketing's
  // ROI number and Finance's P&L then agree, instead of Marketing carrying
  // a spend nobody else can see. Best-effort: a posting failure must never
  // block the send itself.
  if (campaign.spend && campaign.spend > 0 && !campaign.expenseId) {
    try {
      const expense = await prisma.expense.create({
        data: { category: 'Marketing', description: `Campaign: ${campaign.name}`, amount: campaign.spend, spentAt: new Date() },
      })
      await postExpense(expense)
      await prisma.campaign.update({ where: { id: campaignId }, data: { expenseId: expense.id } })
    } catch (err) {
      console.error('[campaigns] spend-to-expense posting failed:', err)
    }
  }

  return { recipientCount, note }
}

/** Every SCHEDULED campaign whose time has come — for the cron to pick up. */
export async function dueCampaigns(): Promise<{ id: string }[]> {
  return prisma.campaign.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    select: { id: true },
  })
}
