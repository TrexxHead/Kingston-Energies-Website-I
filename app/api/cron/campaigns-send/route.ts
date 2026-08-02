import { NextResponse } from 'next/server'
import { dueCampaigns, sendCampaign } from '@/lib/campaigns'

/**
 * Triggered by Vercel Cron (see vercel.json), same auth pattern as
 * app/api/cron/sheets-sync. Actually fires every Campaign whose
 * status is SCHEDULED and whose scheduledAt has passed — before this
 * existed, "Scheduled" only changed a badge; nothing ever sent until an
 * admin manually clicked Send.
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
  const results = await Promise.all(
    due.map(async (c) => {
      try {
        const { recipientCount } = await sendCampaign(c.id)
        return { id: c.id, ok: true, recipientCount }
      } catch (err) {
        console.error(`[cron/campaigns-send] failed to send campaign ${c.id}:`, err)
        return { id: c.id, ok: false, error: err instanceof Error ? err.message : 'unknown error' }
      }
    }),
  )

  return NextResponse.json({ ok: true, processed: results.length, results })
}
