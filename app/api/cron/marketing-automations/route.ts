import { NextResponse } from 'next/server'
import { dueCampaigns, sendCampaign } from '@/lib/campaigns'
import { runAbandonedCartRecovery } from '@/lib/abandonedCart'
import { runWelcomeSeries, runReviewRequests } from '@/lib/lifecycleAutomations'

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
 * - Welcome series (2 days after a verified signup).
 * - Review requests (5 days after an order is marked delivered).
 *
 * Each job is independent and failure-isolated — one throwing never stops
 * the others from running.
 */
async function safely<T>(label: string, job: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await job()
  } catch (err) {
    console.error(`[cron/marketing-automations] ${label} failed:`, err)
    return { error: err instanceof Error ? err.message : 'unknown error' }
  }
}

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

  const [abandonedCart, welcomeSeries, reviewRequests] = await Promise.all([
    safely('abandoned-cart recovery', runAbandonedCartRecovery),
    safely('welcome series', runWelcomeSeries),
    safely('review requests', runReviewRequests),
  ])

  return NextResponse.json({
    ok: true,
    campaigns: { processed: campaignResults.length, results: campaignResults },
    abandonedCart,
    welcomeSeries,
    reviewRequests,
  })
}
