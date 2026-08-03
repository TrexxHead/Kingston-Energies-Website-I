import { NextResponse } from 'next/server'
import { dueCampaigns, sendCampaign } from '@/lib/campaigns'
import { runAbandonedCartRecovery } from '@/lib/abandonedCart'

/**
 * Triggered by Vercel Cron (see vercel.json), same auth pattern as
 * app/api/cron/sheets-sync. Runs every scheduled marketing automation that
 * doesn't warrant its own cron slot (Vercel's Hobby tier caps the number of
 * cron jobs, so these share one):
 *
 * - Scheduled campaigns whose time has come (before this existed,
 *   "Scheduled" only changed a badge; nothing sent until an admin clicked a
 *   button).
 * - Abandoned-cart recovery emails.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const due = await dueCampaigns()
  const campaignResults = await Promise.all(
    due.map(async (c) => {
      try {
        const { recipientCount } = await sendCampaign(c.id)
        return { id: c.id, ok: true, recipientCount }
      } catch (err) {
        console.error(`[cron/marketing-automations] failed to send campaign ${c.id}:`, err)
        return { id: c.id, ok: false, error: err instanceof Error ? err.message : 'unknown error' }
      }
    }),
  )

  let abandonedCart: { sent: number } | { error: string }
  try {
    abandonedCart = await runAbandonedCartRecovery()
  } catch (err) {
    console.error('[cron/marketing-automations] abandoned-cart recovery failed:', err)
    abandonedCart = { error: err instanceof Error ? err.message : 'unknown error' }
  }

  return NextResponse.json({ ok: true, campaigns: { processed: campaignResults.length, results: campaignResults }, abandonedCart })
}
