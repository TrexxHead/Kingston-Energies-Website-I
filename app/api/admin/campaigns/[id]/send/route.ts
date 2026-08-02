import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { sendCampaign } from '@/lib/campaigns'

/**
 * Action a campaign. EMAIL sends for real to its audience (a segment if
 * linked, otherwise every subscriber-eligible customer) via Resend, minus
 * anyone suppressed. Other channels (SMS/PUSH/SOCIAL) are marked sent for
 * tracking — the actual delivery runs through your external tooling
 * (n8n / WhatsApp / social). Shares its core with the scheduled-send cron
 * (app/api/cron/campaigns-send) so both paths behave identically.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    const { recipientCount, note } = await sendCampaign(id)
    return NextResponse.json({ ok: true, recipientCount, note })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send campaign.'
    const status = message === 'Campaign not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
