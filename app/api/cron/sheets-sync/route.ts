import { NextResponse } from 'next/server'
import { syncBusinessDataToSheet, isSheetsConfigured } from '@/lib/sheets'

/**
 * Triggered by Vercel Cron (see vercel.json). Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set as an env var,
 * so this route is safe to leave public — it only does anything with a valid secret.
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

  if (!isSheetsConfigured()) {
    return NextResponse.json({ ok: false, error: 'not_configured' })
  }

  const result = await syncBusinessDataToSheet()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
